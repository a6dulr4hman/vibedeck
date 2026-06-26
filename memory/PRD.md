# VibeDeck — Product Requirements & Build Log

## Problem statement (original)
VibeDeck: an autonomous AI presentation director & choreographer. Ingests PDFs and
acts as art director / choreographer / pitch coach to generate dynamic, animated,
interactive 16:9 web presentations. Multi-LLM router (K2 Think v2 default, Gemini 3.1
Pro, Claude Sonnet 4.6, DeepSeek V4 Pro, Nemotron 3 Ultra). Custom Clerk auth (no
hosted UI). Strict 16:9 canvases, soft dark glassmorphism aesthetic. Dashboard with
bento grid of saved decks. Audio choreography (TTS+STT word-sync) and live Pitch Coach
are later phases.

## User choices
- DB: MongoDB. Fully dockerized for self-hosting on Coolify (MongoDB hosted via Coolify).
- Auth: custom Clerk-integrated forms (production keys for falak.me).
- Default Director model: K2 Think v2.
- v1 scope: core (a) — PDF/brief → animated 16:9 deck + dashboard + viewer. Audio (b) and Pitch Coach (c) deferred.

## Architecture
- Backend: FastAPI + Motor (MongoDB). `server.py` (routes), `llm_router.py` (multi-LLM),
  `pipeline.py` (Director → slide JSON), `icons.py` (keyword→lucide phase-2 resolver),
  `auth.py` (Clerk verify + gated test auth).
- Frontend: CRA + Tailwind + framer-motion + lucide-react. Custom Clerk forms,
  demo-auth fallback for preview, rich animated SlideRenderer (11 layouts), Viewer player.
- LLMs: K2 Think (api.k2think.ai), DeepSeek V4 Pro + Nemotron 3 Ultra (build.nvidia.com),
  Gemini/Claude (Emergent universal key).

## Generation design (v1)
- Director LLM outputs structured slide JSON (not raw HTML/JS) → reliable + animated.
  Schema carries per-slide `id` + `notes` so the audio-choreography engine plugs in later.
- Two-phase icons (spec §3) simplified: LLM emits keyword, Python resolves to lucide name.

## Implemented (2026-06-26)
- [x] Multi-LLM router with 5 models + per-model token budgets.
- [x] PDF text extraction + brief (scratch) generation pipeline (async background task + polling).
- [x] 11 animated 16:9 slide layouts (cover, agenda, statement, bullets, metrics,
      feature-grid, bento, timeline, quote, comparison, closing) with aurora/meteors/sparkles/number-tickers.
- [x] Custom Clerk sign-in/up forms (email+password+code) per integration playbook.
- [x] Demo-auth fallback (preview only) — gated by env.
- [x] Dashboard: bento deck grid, LLM selector, upload-PDF + start-from-scratch flows, generation overlay.
- [x] Viewer: 16:9 player, play/pause autoplay, prev/next, thumbnails, keyboard nav, "Edit with AI".
- [x] Edit deck via natural-language instruction.

## Known constraints
- Clerk production keys are domain-locked to falak.me → real Clerk untested in preview (works on deploy).
- K2 Think v2 is slow (~150-200s) due to heavy reasoning; faster models available.

## Backlog / next phases
- P0: Dockerization for Coolify (Dockerfiles + docker-compose + nginx) — pending.
- P1: Audio choreography engine — Google TTS (Journey) + STT V2 (Chirp 2, word offsets) + JS timeline sync.
- P1: Pitch Coach live mode (Web Speech API + K2 feedback via animated modal).
- P2: Clerk webhook user sync; manual slide editing; export.
