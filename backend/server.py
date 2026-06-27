"""VibeDeck FastAPI backend.

Routes (all under /api):
  GET  /api/health
  GET  /api/me                         -> {userId, email, tier, isAdmin}
  GET  /api/models                     -> all models + tiers (public)
  GET  /api/presentations
  POST /api/presentations/generate     (multipart PDF)
  POST /api/presentations/scratch      (json brief)
  GET  /api/presentations/{id}
  PUT  /api/presentations/{id}
  POST /api/presentations/{id}/edit    (chat instruction)
  POST /api/presentations/{id}/share   (toggle public share)
  DELETE /api/presentations/{id}
  GET  /api/public/presentations/{shareId}   (no auth, read-only)
  --- admin ---
  GET  /api/admin/overview
  GET  /api/admin/users
  POST /api/admin/users/{userId}/tier
  GET  /api/admin/generations
"""
import os
import io
import uuid
import asyncio
import time
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
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
presentations = db.presentations
users = db.users
usage_logs = db.usage_logs

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


async def get_user_record(payload: dict) -> dict:
    sub = payload.get("sub")
    email = (payload.get("email") or "").lower()
    is_admin = email in ADMIN_EMAILS
    existing = await users.find_one({"clerkUserId": sub})
    default_tier = "max" if is_admin else "free"
    if not existing:
        doc = {
            "clerkUserId": sub, "email": payload.get("email"), "tier": default_tier,
            "isAdmin": is_admin, "createdAt": now_iso(), "updatedAt": now_iso(),
        }
        await users.insert_one(doc)
        return doc
    update = {"updatedAt": now_iso(), "email": payload.get("email"), "isAdmin": is_admin}
    if is_admin and existing.get("tier") != "max":
        update["tier"] = "max"
    await users.update_one({"clerkUserId": sub}, {"$set": update})
    existing.update(update)
    return existing


async def require_admin(user=Depends(get_current_user)):
    rec = await get_user_record(user)
    if not rec.get("isAdmin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return rec


def public_view(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    doc.pop("sourceText", None)
    return doc


def summary_view(doc: dict) -> dict:
    slides = doc.get("slides") or []
    return {
        "id": doc.get("id"), "title": doc.get("title"), "subtitle": doc.get("subtitle"),
        "status": doc.get("status"), "model": doc.get("model"), "sourceType": doc.get("sourceType"),
        "slideCount": len(slides), "accent": (slides[0].get("accent") if slides else "violet"),
        "progress": doc.get("progress"), "error": doc.get("error"),
        "isPublic": doc.get("isPublic", False), "shareId": doc.get("shareId"),
        "createdAt": doc.get("createdAt"), "updatedAt": doc.get("updatedAt"),
    }


async def log_usage(user_rec, pres, model, mode, tokens, duration_ms, status):
    await usage_logs.insert_one({
        "id": new_id(), "userId": user_rec.get("clerkUserId"), "email": user_rec.get("email"),
        "tier": user_rec.get("tier"), "presentationId": pres, "model": model, "mode": mode,
        "tokens": int(tokens or 0), "durationMs": int(duration_ms), "status": status,
        "createdAt": now_iso(),
    })


# ---------------------------------------------------------------- pipeline task
async def run_generation(pres_id, user_rec, source_text, model, mode, theme=None):
    started = time.time()

    async def on_progress(step, label):
        await presentations.update_one({"id": pres_id}, {"$set": {"progress": {"step": step, "label": label}}})

    try:
        deck, tokens = await pipeline.generate_deck(source_text, model, mode=mode, on_progress=on_progress, theme=theme)
        await presentations.update_one(
            {"id": pres_id},
            {"$set": {
                "status": "ready", "title": deck["title"], "subtitle": deck["subtitle"],
                "theme": deck["theme"], "arc": deck["arc"], "slides": deck["slides"],
                "tokens": tokens, "progress": {"step": 5, "label": "Ready"}, "error": None, "updatedAt": now_iso(),
            }},
        )
        await log_usage(user_rec, pres_id, model, mode, tokens, (time.time() - started) * 1000, "ready")
    except Exception as exc:
        msg = (str(exc) or f"{type(exc).__name__}").strip() or "Generation failed"
        await presentations.update_one(
            {"id": pres_id}, {"$set": {"status": "failed", "error": msg[:500], "updatedAt": now_iso()}},
        )
        await log_usage(user_rec, pres_id, model, mode, 0, (time.time() - started) * 1000, "failed")


def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    parts = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(parts).strip()


def _check_model_access(model, tier):
    if model not in llm_router.MODELS:
        return llm_router.DEFAULT_MODEL
    if not llm_router.is_model_allowed(model, tier):
        raise HTTPException(status_code=403, detail=f"{llm_router.MODELS[model]['label']} requires a higher plan")
    return model


# ---------------------------------------------------------------- routes
@api.get("/health")
async def health():
    return {"status": "ok", "service": "vibedeck"}


@api.get("/models")
async def get_models():
    return {"models": llm_router.list_models(), "default": llm_router.DEFAULT_MODEL,
            "tiers": ["free", "pro", "max"]}


@api.get("/me")
async def me(user=Depends(get_current_user)):
    rec = await get_user_record(user)
    return {"userId": rec.get("clerkUserId"), "email": rec.get("email"),
            "tier": rec.get("tier", "free"), "isAdmin": rec.get("isAdmin", False)}


@api.get("/presentations")
async def list_presentations(user=Depends(get_current_user)):
    await get_user_record(user)
    cursor = presentations.find({"userId": user["sub"]}).sort("createdAt", -1)
    docs = await cursor.to_list(length=200)
    return {"presentations": [summary_view(d) for d in docs]}


@api.post("/presentations/generate")
async def generate_from_pdf(
    file: UploadFile = File(...),
    model: str = Form(llm_router.DEFAULT_MODEL),
    tone: str = Form("formal"),
    palette: str = Form("violet"),
    slideMode: str = Form("dark"),
    user=Depends(get_current_user),
):
    rec = await get_user_record(user)
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")
    content = await file.read()
    if len(content) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF too large (max 12MB)")
    text = extract_pdf_text(content)
    if len(text) < 40:
        raise HTTPException(status_code=400, detail="Could not extract readable text from this PDF")
    model = _check_model_access(model, rec.get("tier", "free"))
    theme = {"tone": tone, "palette": palette, "mode": slideMode}

    pres_id = new_id()
    doc = _new_presentation(pres_id, user["sub"], file.filename.rsplit(".", 1)[0][:80] or "Untitled Deck",
                            model, "pdf", text, file.filename, theme)
    await presentations.insert_one(doc)
    asyncio.create_task(run_generation(pres_id, rec, text, model, "pdf", theme))
    return {"id": pres_id, "status": "processing"}


class ScratchBody(BaseModel):
    topic: str
    model: str = llm_router.DEFAULT_MODEL
    theme: dict | None = None


@api.post("/presentations/scratch")
async def generate_from_scratch(body: ScratchBody, user=Depends(get_current_user)):
    rec = await get_user_record(user)
    topic = (body.topic or "").strip()
    if len(topic) < 4:
        raise HTTPException(status_code=400, detail="Please describe what the deck should be about")
    model = _check_model_access(body.model, rec.get("tier", "free"))

    pres_id = new_id()
    doc = _new_presentation(pres_id, user["sub"], topic[:80], model, "scratch", topic, None, body.theme)
    await presentations.insert_one(doc)
    asyncio.create_task(run_generation(pres_id, rec, topic, model, "scratch", body.theme))
    return {"id": pres_id, "status": "processing"}


def _new_presentation(pres_id, user_sub, title, model, source_type, source_text, file_name, theme=None):
    return {
        "id": pres_id, "userId": user_sub, "title": title, "subtitle": "",
        "status": "processing", "model": model, "sourceType": source_type,
        "sourceFileName": file_name, "sourceText": source_text,
        "theme": pipeline._norm_theme(theme),
        "arc": [], "slides": [], "messages": [], "isPublic": False, "shareId": None, "tokens": 0,
        "progress": {"step": 1, "label": "Reading source material"},
        "error": None, "createdAt": now_iso(), "updatedAt": now_iso(),
    }


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
    rec = await get_user_record(user)
    doc = await presentations.find_one({"id": pres_id, "userId": user["sub"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Presentation not found")
    instruction = (body.instruction or "").strip()
    if not instruction:
        raise HTTPException(status_code=400, detail="Instruction is required")
    model = body.model if (body.model in llm_router.MODELS) else doc.get("model", llm_router.DEFAULT_MODEL)
    model = _check_model_access(model, rec.get("tier", "free"))

    started = time.time()
    try:
        deck, tokens = await pipeline.edit_deck(doc, instruction, model)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Edit failed: {exc}")

    messages = (doc.get("messages") or []) + [
        {"role": "user", "content": instruction, "createdAt": now_iso()},
        {"role": "assistant", "content": "Done — I updated your deck.", "createdAt": now_iso()},
    ]
    await presentations.update_one(
        {"id": pres_id},
        {"$set": {"title": deck["title"], "subtitle": deck["subtitle"], "arc": deck["arc"],
                  "slides": deck["slides"], "messages": messages[-40:], "updatedAt": now_iso()}},
    )
    await log_usage(rec, pres_id, model, "edit", tokens, (time.time() - started) * 1000, "ready")
    doc = await presentations.find_one({"id": pres_id})
    return public_view(doc)


class SlideEditBody(BaseModel):
    instruction: str
    model: str | None = None


@api.post("/presentations/{pres_id}/slides/{index}/edit")
async def edit_single_slide(pres_id: str, index: int, body: SlideEditBody, user=Depends(get_current_user)):
    rec = await get_user_record(user)
    doc = await presentations.find_one({"id": pres_id, "userId": user["sub"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Presentation not found")
    slides = doc.get("slides") or []
    if index < 0 or index >= len(slides):
        raise HTTPException(status_code=400, detail="Slide index out of range")
    instruction = (body.instruction or "").strip()
    if not instruction:
        raise HTTPException(status_code=400, detail="Instruction is required")
    model = body.model if (body.model in llm_router.MODELS) else doc.get("model", llm_router.DEFAULT_MODEL)
    model = _check_model_access(model, rec.get("tier", "free"))

    deck_ctx = f"title='{doc.get('title')}' arc={doc.get('arc')}"
    started = time.time()
    try:
        updated, tokens = await pipeline.edit_slide(slides[index], deck_ctx, instruction, model, theme=doc.get("theme"))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Edit failed: {exc}")

    slides[index] = updated
    messages = (doc.get("messages") or []) + [
        {"role": "user", "content": instruction, "slide": index + 1, "createdAt": now_iso()},
        {"role": "assistant", "content": f"Updated slide {index + 1}.", "slide": index + 1, "createdAt": now_iso()},
    ]
    await presentations.update_one(
        {"id": pres_id},
        {"$set": {"slides": slides, "messages": messages[-60:], "updatedAt": now_iso()}},
    )
    await log_usage(rec, pres_id, model, "slide-edit", tokens, (time.time() - started) * 1000, "ready")
    doc = await presentations.find_one({"id": pres_id})
    return public_view(doc)


@api.post("/presentations/{pres_id}/share")
async def toggle_share(pres_id: str, user=Depends(get_current_user)):
    doc = await presentations.find_one({"id": pres_id, "userId": user["sub"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Presentation not found")
    is_public = not doc.get("isPublic", False)
    share_id = doc.get("shareId") or new_id()
    await presentations.update_one({"id": pres_id}, {"$set": {"isPublic": is_public, "shareId": share_id, "updatedAt": now_iso()}})
    return {"isPublic": is_public, "shareId": share_id}


@api.get("/public/presentations/{share_id}")
async def public_presentation(share_id: str):
    doc = await presentations.find_one({"shareId": share_id, "isPublic": True})
    if not doc:
        raise HTTPException(status_code=404, detail="This presentation is not shared")
    return {
        "id": doc.get("id"), "title": doc.get("title"), "subtitle": doc.get("subtitle"),
        "arc": doc.get("arc"), "slides": doc.get("slides"), "status": doc.get("status"),
        "theme": doc.get("theme"),
    }


@api.delete("/presentations/{pres_id}")
async def delete_presentation(pres_id: str, user=Depends(get_current_user)):
    res = await presentations.delete_one({"id": pres_id, "userId": user["sub"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Presentation not found")
    return {"deleted": True}


# ---------------------------------------------------------------- admin
@api.get("/admin/overview")
async def admin_overview(admin=Depends(require_admin)):
    total_users = await users.count_documents({})
    total_decks = await presentations.count_documents({})
    total_gens = await usage_logs.count_documents({})
    pipeline_agg = [{"$group": {"_id": None, "tokens": {"$sum": "$tokens"}}}]
    agg = await usage_logs.aggregate(pipeline_agg).to_list(1)
    total_tokens = agg[0]["tokens"] if agg else 0
    by_model = await usage_logs.aggregate([
        {"$group": {"_id": "$model", "count": {"$sum": 1}, "tokens": {"$sum": "$tokens"}}},
        {"$sort": {"count": -1}},
    ]).to_list(50)
    by_tier = await users.aggregate([{"$group": {"_id": "$tier", "count": {"$sum": 1}}}]).to_list(10)
    return {
        "totalUsers": total_users, "totalDecks": total_decks, "totalGenerations": total_gens,
        "totalTokens": total_tokens,
        "byModel": [{"model": m["_id"], "count": m["count"], "tokens": m["tokens"]} for m in by_model],
        "byTier": [{"tier": t["_id"], "count": t["count"]} for t in by_tier],
    }


@api.get("/admin/users")
async def admin_users(admin=Depends(require_admin)):
    docs = await users.find({}).sort("createdAt", -1).to_list(500)
    out = []
    for u in docs:
        uid = u.get("clerkUserId")
        deck_count = await presentations.count_documents({"userId": uid})
        tok = await usage_logs.aggregate([
            {"$match": {"userId": uid}}, {"$group": {"_id": None, "tokens": {"$sum": "$tokens"}, "gens": {"$sum": 1}}},
        ]).to_list(1)
        out.append({
            "userId": uid, "email": u.get("email"), "tier": u.get("tier", "free"),
            "isAdmin": u.get("isAdmin", False), "deckCount": deck_count,
            "tokens": tok[0]["tokens"] if tok else 0, "generations": tok[0]["gens"] if tok else 0,
            "createdAt": u.get("createdAt"),
        })
    return {"users": out}


class TierBody(BaseModel):
    tier: str


@api.post("/admin/users/{user_id}/tier")
async def admin_set_tier(user_id: str, body: TierBody, admin=Depends(require_admin)):
    if body.tier not in ("free", "pro", "max"):
        raise HTTPException(status_code=400, detail="Invalid tier")
    res = await users.update_one({"clerkUserId": user_id}, {"$set": {"tier": body.tier, "updatedAt": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"userId": user_id, "tier": body.tier}


@api.get("/admin/generations")
async def admin_generations(admin=Depends(require_admin)):
    docs = await usage_logs.find({}).sort("createdAt", -1).to_list(200)
    out = []
    for g in docs:
        g.pop("_id", None)
        pres = await presentations.find_one({"id": g.get("presentationId")}, {"title": 1, "sourceType": 1})
        g["title"] = pres.get("title") if pres else None
        out.append(g)
    return {"generations": out}


app.include_router(api)


@app.on_event("startup")
async def startup():
    await presentations.create_index("userId")
    await presentations.create_index("id", unique=True)
    await presentations.create_index("shareId")
    await users.create_index("clerkUserId", unique=True)
    await usage_logs.create_index("userId")
    await usage_logs.create_index("createdAt")
