# VibeDeck — The Autonomous Presentation Director

VibeDeck ingests a PDF (or a typed brief) and uses a multi-LLM **Director** to
generate a punchy, animated, **strict 16:9** dark-mode slide deck — then plays it
back in a cinematic viewer. You can also edit any deck in plain English.

## Stack
- **Backend:** FastAPI + MongoDB (Motor)
- **Frontend:** React (CRA) + Tailwind + framer-motion + lucide-react
- **Auth:** Custom Clerk forms (no hosted Clerk UI)
- **Director LLMs:** K2 Think v2 (default) · Gemini 3.1 Pro · Claude Sonnet 4.6 · DeepSeek V4 Pro · Nemotron 3 Ultra

## How generation works
1. Extract text from the PDF / read the brief.
2. The Director LLM defines a narrative arc (Hook → Problem → Solution → Proof → Conclusion)
   and emits a **structured slide JSON** (layout + background + accent + content + icon keywords).
3. Icon keywords are resolved to lucide icons (phase-2 resolution).
4. The React renderer paints each slide as an animated 16:9 canvas (aurora, meteors,
   sparkles, number tickers, bento, timelines, etc.). Each slide keeps an `id` + speaker
   `notes` so the upcoming audio-choreography engine can sync animations to narration.

---

## Local development
- Backend: `uvicorn server:app --reload --port 8001` (env in `backend/.env`)
- Frontend: `yarn start` (env in `frontend/.env`)

## Deploying on Coolify (Docker)

This repo is fully dockerized. Host MongoDB on Coolify (or anywhere reachable) and
deploy the two services.

### 1. MongoDB
Create a MongoDB resource in Coolify. Note its internal connection string, e.g.
`mongodb://<user>:<pass>@<service>:27017`.

### 2. Backend service (`./backend/Dockerfile`)
Set these environment variables (see `backend/.env.example`):
- `MONGO_URL`, `DB_NAME`
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_AUTHORIZED_PARTIES`
- `K2_API_KEY`, `NVIDIA_API_KEY`, `EMERGENT_LLM_KEY`
- `ALLOW_TEST_AUTH=false`, `CORS_ORIGINS=https://<your-frontend-domain>`

Exposes port **8001**. Give it a public domain, e.g. `https://api.vibedeck.<domain>`.

### 3. Frontend service (`./frontend/Dockerfile`)
CRA bakes env at **build time**, so set these as **build args** (see `frontend/.env.example`):
- `REACT_APP_BACKEND_URL=https://api.vibedeck.<domain>`
- `REACT_APP_CLERK_PUBLISHABLE_KEY=pk_live_...`
- `REACT_APP_DEMO_AUTH=false`  ← must be false in production (enables real Clerk)

Serves on port **80** via nginx (SPA fallback included).

### 4. Clerk
In the Clerk dashboard, ensure your production instance allows your frontend domain.
Email + password sign-up/sign-in with email-code verification must be enabled.

### Or with docker-compose
```bash
cp backend/.env.example .env   # fill values; add REACT_APP_* too
docker compose up --build -d
```
(Uncomment the `mongo` service in `docker-compose.yml` to run Mongo locally.)

---

## Preview / demo mode
Clerk **production** keys are domain-locked to `falak.me`, so they can't run in a
generic preview sandbox. Setting `REACT_APP_DEMO_AUTH=true` enables a gated demo
login (backend `ALLOW_TEST_AUTH=true`) so the app can be exercised end-to-end
without Clerk. **Turn both off in production.**

## Roadmap
- Audio choreography: Google Cloud TTS (Journey) + STT V2 (Chirp 2, word offsets) + JS timeline sync.
- Pitch Coach live mode (Web Speech API + K2 reasoning feedback).
