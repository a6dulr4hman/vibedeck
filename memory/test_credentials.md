# VibeDeck — Test Credentials & Access Notes

## Preview environment auth = DEMO MODE
The Clerk **production** keys provided are domain-locked to `falak.me`, so Clerk
cannot run inside the preview sandbox. The frontend therefore runs in gated
**demo mode** (`REACT_APP_DEMO_AUTH=true`).

### Frontend demo login
- Go to `/sign-in` (or `/sign-up`) → an "Enter VibeDeck" form appears.
- Email is OPTIONAL. Enter anything (e.g. `alex@novagrid.com`) or leave blank.
- Click **Enter VibeDeck** (`data-testid="demo-continue"`) → lands on `/dashboard`.
- The session persists in localStorage (`vibedeck_demo_user`).

### Backend auth (for direct API testing)
- Backend gated test auth is ON (`ALLOW_TEST_AUTH=true`).
- Send header **`X-Test-User: <any-id>`** on `/api/*` calls to authenticate as that user.
- Example: `curl -H "X-Test-User: tester1" $URL/api/presentations`

## Production (Coolify on falak.me)
- Set `REACT_APP_DEMO_AUTH=false` and `ALLOW_TEST_AUTH=false`.
- Real custom Clerk sign-in/sign-up forms take over (already implemented).

## LLM models (real, not mocked)
- Default: `k2-think-v2` (slow, ~150-200s — deep reasoning model).
- Faster options for testing: `deepseek-v4-pro` (~60-120s), `gemini-3.1-pro`, `claude-sonnet-4.6`, `nemotron-3-ultra`.
- Prefer `deepseek-v4-pro` when testing generation to reduce wait time.
