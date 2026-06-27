# VibeDeck — Test Credentials & Access Notes

## Preview environment auth = DEMO MODE
The Clerk **production** keys are domain-locked to `falak.me`, so Clerk cannot run inside the
preview sandbox. The frontend runs in gated **demo mode** (`REACT_APP_DEMO_AUTH=true`).

### Frontend demo login
- Go to `/sign-in` (or `/sign-up`) → an "Enter VibeDeck" form appears.
- Email is OPTIONAL but DETERMINES IDENTITY. The demo user id = `demo_<lowercased-alnum-email>`.
- Click **Enter VibeDeck** (`data-testid="demo-continue"`) → lands on `/dashboard`.
- Session persists in localStorage (`vibedeck_demo_user`).

### Admin access (sandbox)
- Sign in with email **`admin@falak.me`** → demo id `demo_adminfalakme` → grants `isAdmin` + Max tier.
- The Admin panel link appears in the account menu; route `/admin`.

### Existing READY decks in DB (for testing Editor/Present without generating)
- Email `alex2@novagrid.com` (demo id `demo_alex2novagridcom`) owns deck **"NovaGrid"** (9 slides, dark).
- Email `ar1vuog@gmail.com` (demo id `demo_ar1vuoggmailcom`) owns deck **"ClarityAI"** (9 slides, dark).
- A fresh K2 deck (light/sunset/playful) is generated for `k2tester@test.vibedeck` (demo id `demo_k2tester`).

### Backend auth (direct API testing)
- Gated test auth is ON (`ALLOW_TEST_AUTH=true`).
- Send header **`X-Test-User: <id>`** (and optional `X-Test-Email: <email>`) on `/api/*` calls.
- Example: `curl -H "X-Test-User: demo_alex2novagridcom" $URL/api/presentations`

## Production (Coolify on falak.me)
- Set `REACT_APP_DEMO_AUTH=false` and `ALLOW_TEST_AUTH=false`. Real Clerk forms take over.

## LLM models (real, not mocked)
- Default: `k2-think-v2` — WORKS, but slow (~120–200s deep reasoning).
- `deepseek-v4-pro` / `minimax-m3` (NVIDIA): slow / occasionally times out.
- Pro/Max models (Gemini/Claude/GPT via Emergent key) require valid model identifiers.
- Prefer `k2-think-v2` for reliable generation in testing (be patient; per-slide is concurrent).
