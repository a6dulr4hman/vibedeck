"""Clerk session verification for FastAPI.

Verifies the Clerk session token sent by the custom React forms (via
`useAuth().getToken()` -> `Authorization: Bearer <jwt>`). Uses the official
clerk-backend-api SDK which fetches the instance JWKS and validates the
signature + claims server-side (no CORS / browser-origin coupling).

A clearly-gated test path (ALLOW_TEST_AUTH) lets automated tests and local
dev exercise protected routes without a full Clerk browser flow. It is OFF by
default and must be explicitly enabled via env.
"""
import os
import httpx
from fastapi import Request, HTTPException

CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY")
ALLOW_TEST_AUTH = os.environ.get("ALLOW_TEST_AUTH", "false").lower() == "true"
AUTHORIZED_PARTIES = [
    p.strip() for p in os.environ.get("CLERK_AUTHORIZED_PARTIES", "").split(",") if p.strip()
]

_clerk = None
_AuthOptions = None
try:
    from clerk_backend_api import Clerk
    from clerk_backend_api.security.types import AuthenticateRequestOptions
    _AuthOptions = AuthenticateRequestOptions
    if CLERK_SECRET_KEY:
        _clerk = Clerk(bearer_auth=CLERK_SECRET_KEY)
except Exception as exc:  # pragma: no cover - import/runtime guard
    print(f"[auth] Clerk SDK unavailable: {exc}")


async def get_current_user(request: Request) -> dict:
    """Returns a dict with at least {'sub': <clerk_user_id>}."""
    if ALLOW_TEST_AUTH:
        test_user = request.headers.get("X-Test-User")
        if test_user:
            return {"sub": test_user, "email": f"{test_user}@test.vibedeck", "test": True}

    if _clerk is None:
        raise HTTPException(status_code=500, detail="Authentication is not configured on the server")

    httpx_req = httpx.Request(
        request.method, str(request.url), headers=dict(request.headers)
    )
    try:
        options = _AuthOptions(authorized_parties=AUTHORIZED_PARTIES or None)
        state = _clerk.authenticate_request(httpx_req, options)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {exc}")

    if not getattr(state, "is_signed_in", False):
        raise HTTPException(status_code=401, detail=getattr(state, "reason", "Unauthorized") or "Unauthorized")

    payload = state.payload or {}
    if "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid session token")
    return payload
