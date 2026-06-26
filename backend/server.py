"""VibeDeck FastAPI backend.

Routes (all under /api):
  GET  /api/health
  GET  /api/me
  GET  /api/models
  GET  /api/presentations
  POST /api/presentations/generate   (multipart PDF upload)
  POST /api/presentations/scratch    (json brief)
  GET  /api/presentations/{id}
  PUT  /api/presentations/{id}        (rename / manual slide patch)
  POST /api/presentations/{id}/edit   (LLM edit instruction)
  DELETE /api/presentations/{id}
"""
import os
import io
import uuid
import asyncio
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from pypdf import PdfReader

import llm_router
import pipeline
from auth import get_current_user

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
presentations = db.presentations
users = db.users

app = FastAPI(title="VibeDeck API")
api = APIRouter(prefix="/api")

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS.split(",")] if CORS_ORIGINS != "*" else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return uuid.uuid4().hex


async def sync_user(payload: dict):
    sub = payload.get("sub")
    if not sub:
        return
    await users.update_one(
        {"clerkUserId": sub},
        {"$set": {"clerkUserId": sub, "email": payload.get("email"), "updatedAt": now_iso()},
         "$setOnInsert": {"createdAt": now_iso()}},
        upsert=True,
    )


def public_view(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    doc.pop("sourceText", None)
    return doc


def summary_view(doc: dict) -> dict:
    slides = doc.get("slides") or []
    return {
        "id": doc.get("id"),
        "title": doc.get("title"),
        "subtitle": doc.get("subtitle"),
        "status": doc.get("status"),
        "model": doc.get("model"),
        "sourceType": doc.get("sourceType"),
        "slideCount": len(slides),
        "accent": (slides[0].get("accent") if slides else "violet"),
        "progress": doc.get("progress"),
        "error": doc.get("error"),
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt"),
    }


# ---------------------------------------------------------------- pipeline task
async def run_generation(pres_id: str, source_text: str, model: str, mode: str):
    steps = [
        (1, "Reading source material"),
        (2, "Choreographing the narrative arc"),
        (3, "Designing slides & art direction"),
        (4, "Resolving icons & polish"),
    ]
    try:
        await presentations.update_one(
            {"id": pres_id}, {"$set": {"progress": {"step": 2, "label": steps[1][1]}}}
        )
        deck = await pipeline.generate_deck(source_text, model, mode=mode)
        await presentations.update_one(
            {"id": pres_id},
            {"$set": {
                "status": "ready",
                "title": deck["title"],
                "subtitle": deck["subtitle"],
                "theme": deck["theme"],
                "arc": deck["arc"],
                "slides": deck["slides"],
                "progress": {"step": 5, "label": "Ready"},
                "error": None,
                "updatedAt": now_iso(),
            }},
        )
    except Exception as exc:
        await presentations.update_one(
            {"id": pres_id},
            {"$set": {"status": "failed", "error": str(exc)[:500], "updatedAt": now_iso()}},
        )


def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    parts = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(parts).strip()


# ---------------------------------------------------------------- routes
@api.get("/health")
async def health():
    return {"status": "ok", "service": "vibedeck"}


@api.get("/models")
async def get_models():
    return {"models": llm_router.list_models(), "default": llm_router.DEFAULT_MODEL}


@api.get("/me")
async def me(user=Depends(get_current_user)):
    await sync_user(user)
    return {"userId": user.get("sub"), "email": user.get("email")}


@api.get("/presentations")
async def list_presentations(user=Depends(get_current_user)):
    await sync_user(user)
    cursor = presentations.find({"userId": user["sub"]}).sort("createdAt", -1)
    docs = await cursor.to_list(length=200)
    return {"presentations": [summary_view(d) for d in docs]}


@api.post("/presentations/generate")
async def generate_from_pdf(
    file: UploadFile = File(...),
    model: str = Form(llm_router.DEFAULT_MODEL),
    user=Depends(get_current_user),
):
    await sync_user(user)
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")
    content = await file.read()
    text = extract_pdf_text(content)
    if len(text) < 40:
        raise HTTPException(status_code=400, detail="Could not extract readable text from this PDF")
    if model not in llm_router.MODELS:
        model = llm_router.DEFAULT_MODEL

    pres_id = new_id()
    doc = {
        "id": pres_id,
        "userId": user["sub"],
        "title": file.filename.rsplit(".", 1)[0][:80] or "Untitled Deck",
        "subtitle": "",
        "status": "processing",
        "model": model,
        "sourceType": "pdf",
        "sourceFileName": file.filename,
        "sourceText": text,
        "theme": "dark",
        "arc": [],
        "slides": [],
        "progress": {"step": 1, "label": "Reading source material"},
        "error": None,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await presentations.insert_one(doc)
    asyncio.create_task(run_generation(pres_id, text, model, "pdf"))
    return {"id": pres_id, "status": "processing"}


class ScratchBody(BaseModel):
    topic: str
    model: str = llm_router.DEFAULT_MODEL


@api.post("/presentations/scratch")
async def generate_from_scratch(body: ScratchBody, user=Depends(get_current_user)):
    await sync_user(user)
    topic = (body.topic or "").strip()
    if len(topic) < 4:
        raise HTTPException(status_code=400, detail="Please describe what the deck should be about")
    model = body.model if body.model in llm_router.MODELS else llm_router.DEFAULT_MODEL

    pres_id = new_id()
    doc = {
        "id": pres_id,
        "userId": user["sub"],
        "title": topic[:80],
        "subtitle": "",
        "status": "processing",
        "model": model,
        "sourceType": "scratch",
        "sourceFileName": None,
        "sourceText": topic,
        "theme": "dark",
        "arc": [],
        "slides": [],
        "progress": {"step": 1, "label": "Reading the brief"},
        "error": None,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await presentations.insert_one(doc)
    asyncio.create_task(run_generation(pres_id, topic, model, "scratch"))
    return {"id": pres_id, "status": "processing"}


@api.get("/presentations/{pres_id}")
async def get_presentation(pres_id: str, user=Depends(get_current_user)):
    doc = await presentations.find_one({"id": pres_id, "userId": user["sub"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return public_view(doc)


class UpdateBody(BaseModel):
    title: str | None = None
    slides: list | None = None


@api.put("/presentations/{pres_id}")
async def update_presentation(pres_id: str, body: UpdateBody, user=Depends(get_current_user)):
    doc = await presentations.find_one({"id": pres_id, "userId": user["sub"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Presentation not found")
    update = {"updatedAt": now_iso()}
    if body.title is not None:
        update["title"] = body.title[:80]
    if body.slides is not None:
        update["slides"] = body.slides
    await presentations.update_one({"id": pres_id}, {"$set": update})
    doc = await presentations.find_one({"id": pres_id})
    return public_view(doc)


class EditBody(BaseModel):
    instruction: str
    model: str | None = None


@api.post("/presentations/{pres_id}/edit")
async def edit_presentation(pres_id: str, body: EditBody, user=Depends(get_current_user)):
    doc = await presentations.find_one({"id": pres_id, "userId": user["sub"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Presentation not found")
    if not (body.instruction or "").strip():
        raise HTTPException(status_code=400, detail="Instruction is required")
    model = body.model if (body.model in llm_router.MODELS) else doc.get("model", llm_router.DEFAULT_MODEL)
    try:
        deck = await pipeline.edit_deck(doc, body.instruction, model)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Edit failed: {exc}")
    await presentations.update_one(
        {"id": pres_id},
        {"$set": {
            "title": deck["title"], "subtitle": deck["subtitle"], "arc": deck["arc"],
            "slides": deck["slides"], "updatedAt": now_iso(),
        }},
    )
    doc = await presentations.find_one({"id": pres_id})
    return public_view(doc)


@api.delete("/presentations/{pres_id}")
async def delete_presentation(pres_id: str, user=Depends(get_current_user)):
    res = await presentations.delete_one({"id": pres_id, "userId": user["sub"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return {"deleted": True}


app.include_router(api)


@app.on_event("startup")
async def startup():
    await presentations.create_index("userId")
    await presentations.create_index("id", unique=True)
    await users.create_index("clerkUserId", unique=True)
