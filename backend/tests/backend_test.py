"""VibeDeck backend integration tests — iteration 2.

Covers (Phase 2):
  - /api/health, /api/models
  - Auth gating (no auth -> 401; X-Test-User -> 200)
  - /api/me
  - Scratch validation
  - NEW: Per-slide edit endpoint (changes only target slide, preserves id/accent)
  - NEW: Whole-deck edit preserves theme object
  - NEW: Share toggle + public read endpoint (no auth)
  - NEW: Admin endpoints (overview/users/generations/set tier)
  - NEW: Theme palette propagation on fresh scratch generation
  - Ownership scoping
"""
import os
import time
import pytest
import requests

def _read_backend_url():
    if os.environ.get("REACT_APP_BACKEND_URL"):
        return os.environ["REACT_APP_BACKEND_URL"]
    try:
        with open("/app/frontend/.env", "r", encoding="utf-8") as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _read_backend_url().rstrip("/")
API = f"{BASE_URL}/api"

USER_K2 = "demo_k2tester"
USER_ADMIN = "demo_adminfalakme"
ADMIN_EMAIL = "admin@falak.me"
USER_OTHER = "demo_other_alice_test"
MODEL = "k2-think-v2"

EXISTING_DECK_ID = "96fe2627693d4552a38945d2b444d654"

PALETTE_ACCENTS = {
    "violet": {"violet", "fuchsia", "blue"},
    "ocean": {"cyan", "blue", "emerald"},
    "sunset": {"amber", "rose", "fuchsia"},
    "forest": {"emerald", "cyan", "amber"},
    "mono": {"slate", "blue"},
}


def _hdr(user, email=None):
    h = {"X-Test-User": user, "Content-Type": "application/json"}
    if email:
        h["X-Test-Email"] = email
    return h


# ---------- basic ----------
class TestBasic:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_models(self):
        r = requests.get(f"{API}/models", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["models"], list) and len(body["models"]) >= 5
        assert body["default"] == "k2-think-v2"
        assert "free" in body["tiers"]


# ---------- auth ----------
class TestAuth:
    def test_no_auth_returns_401(self):
        r = requests.get(f"{API}/presentations", timeout=15)
        assert r.status_code == 401, f"got {r.status_code}: {r.text[:200]}"

    def test_with_test_user_returns_200(self):
        r = requests.get(f"{API}/presentations", headers=_hdr(USER_K2), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json()["presentations"], list)

    def test_me(self):
        r = requests.get(f"{API}/me", headers=_hdr(USER_K2), timeout=15)
        assert r.status_code == 200
        assert r.json()["userId"] == USER_K2

    def test_me_admin(self):
        r = requests.get(f"{API}/me", headers=_hdr(USER_ADMIN, ADMIN_EMAIL), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["isAdmin"] is True
        assert data["tier"] == "max"


# ---------- validation ----------
class TestValidation:
    def test_scratch_short_topic_400(self):
        r = requests.post(f"{API}/presentations/scratch", headers=_hdr(USER_K2),
                          json={"topic": "ab", "model": MODEL}, timeout=15)
        assert r.status_code == 400


# ---------- share + public ----------
class TestShareAndPublic:
    def test_public_read_existing_share(self):
        # k2tester deck is already shared per credentials
        r = requests.get(f"{API}/public/presentations/338103f47d754b92be2ffa31b0a5b43a", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("title", "subtitle", "arc", "slides", "status", "theme"):
            assert key in data
        assert isinstance(data["slides"], list) and len(data["slides"]) > 0

    def test_public_invalid_share_404(self):
        r = requests.get(f"{API}/public/presentations/doesnotexist123", timeout=15)
        assert r.status_code == 404

    def test_toggle_share_round_trip(self):
        # Toggle off then back on to confirm endpoint works; restore initial state
        r0 = requests.get(f"{API}/presentations/{EXISTING_DECK_ID}", headers=_hdr(USER_K2), timeout=15)
        assert r0.status_code == 200, r0.text
        initial = bool(r0.json().get("isPublic"))

        r1 = requests.post(f"{API}/presentations/{EXISTING_DECK_ID}/share",
                           headers=_hdr(USER_K2), timeout=15)
        assert r1.status_code == 200, r1.text
        b1 = r1.json()
        assert "shareId" in b1 and isinstance(b1["shareId"], str) and len(b1["shareId"]) > 8
        assert b1["isPublic"] == (not initial)

        # Toggle again to restore
        r2 = requests.post(f"{API}/presentations/{EXISTING_DECK_ID}/share",
                           headers=_hdr(USER_K2), timeout=15)
        assert r2.status_code == 200
        assert r2.json()["isPublic"] == initial

    def test_public_404_when_not_public(self):
        # Toggle off then check public read returns 404
        r0 = requests.get(f"{API}/presentations/{EXISTING_DECK_ID}", headers=_hdr(USER_K2), timeout=15)
        was_public = bool(r0.json().get("isPublic"))
        share_id = r0.json().get("shareId")
        if was_public:
            requests.post(f"{API}/presentations/{EXISTING_DECK_ID}/share",
                          headers=_hdr(USER_K2), timeout=15)
        try:
            r = requests.get(f"{API}/public/presentations/{share_id}", timeout=15)
            assert r.status_code == 404
        finally:
            if was_public:
                requests.post(f"{API}/presentations/{EXISTING_DECK_ID}/share",
                              headers=_hdr(USER_K2), timeout=15)


# ---------- per-slide edit ----------
class TestSlideEdit:
    def test_slide_index_out_of_range(self):
        r = requests.post(f"{API}/presentations/{EXISTING_DECK_ID}/slides/99/edit",
                          headers=_hdr(USER_K2),
                          json={"instruction": "change title", "model": MODEL}, timeout=30)
        assert r.status_code == 400

    def test_slide_edit_empty_instruction(self):
        r = requests.post(f"{API}/presentations/{EXISTING_DECK_ID}/slides/0/edit",
                          headers=_hdr(USER_K2),
                          json={"instruction": "  ", "model": MODEL}, timeout=30)
        assert r.status_code == 400

    def test_slide_edit_only_target_changed(self):
        # Fetch original
        r0 = requests.get(f"{API}/presentations/{EXISTING_DECK_ID}", headers=_hdr(USER_K2), timeout=15)
        assert r0.status_code == 200, r0.text
        before = r0.json()
        slides_before = before["slides"]
        assert len(slides_before) >= 3
        target = 1
        sb = slides_before[target]
        sb_id, sb_accent = sb.get("id"), sb.get("accent")

        r = requests.post(
            f"{API}/presentations/{EXISTING_DECK_ID}/slides/{target}/edit",
            headers=_hdr(USER_K2),
            json={"instruction": "Tighten the title to be punchier; keep the same overall meaning.",
                  "model": MODEL},
            timeout=180,
        )
        assert r.status_code == 200, f"slide edit failed: {r.status_code} {r.text[:400]}"
        after = r.json()
        slides_after = after["slides"]
        assert len(slides_after) == len(slides_before)

        # Other slides unchanged (titles match)
        for i, (a, b) in enumerate(zip(slides_after, slides_before)):
            if i == target:
                continue
            assert a.get("title") == b.get("title"), f"slide {i} title mutated unexpectedly"
            assert a.get("accent") == b.get("accent"), f"slide {i} accent mutated"
            if b.get("id"):
                assert a.get("id") == b.get("id")

        # Target slide: id + accent preserved (per spec)
        sa = slides_after[target]
        if sb_id:
            assert sa.get("id") == sb_id, "target slide id was changed"
        assert sa.get("accent") == sb_accent, "target slide accent was changed"


# ---------- whole-deck edit preserves theme ----------
class TestDeckEditPreservesTheme:
    def test_deck_edit_keeps_theme_object(self):
        r0 = requests.get(f"{API}/presentations/{EXISTING_DECK_ID}", headers=_hdr(USER_K2), timeout=15)
        before_theme = r0.json().get("theme")
        assert isinstance(before_theme, dict), f"theme not a dict: {before_theme!r}"

        r = requests.post(f"{API}/presentations/{EXISTING_DECK_ID}/edit",
                          headers=_hdr(USER_K2),
                          json={"instruction": "Make the subtitle one notch more energetic.",
                                "model": MODEL},
                          timeout=300)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        after = r.json()
        assert isinstance(after.get("theme"), dict), "theme dropped after edit"
        assert after["theme"].get("palette") == before_theme.get("palette")
        assert after["theme"].get("mode") == before_theme.get("mode")
        assert after["theme"].get("tone") == before_theme.get("tone")


# ---------- admin ----------
class TestAdmin:
    def test_admin_overview(self):
        r = requests.get(f"{API}/admin/overview", headers=_hdr(USER_ADMIN, ADMIN_EMAIL), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("totalUsers", "totalDecks", "totalGenerations", "totalTokens", "byModel", "byTier"):
            assert k in d
        assert d["totalUsers"] >= 1

    def test_admin_users_list(self):
        r = requests.get(f"{API}/admin/users", headers=_hdr(USER_ADMIN, ADMIN_EMAIL), timeout=15)
        assert r.status_code == 200
        users = r.json()["users"]
        assert isinstance(users, list) and len(users) >= 1
        sample = users[0]
        for k in ("userId", "email", "tier", "isAdmin", "deckCount"):
            assert k in sample

    def test_admin_generations(self):
        r = requests.get(f"{API}/admin/generations", headers=_hdr(USER_ADMIN, ADMIN_EMAIL), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json()["generations"], list)

    def test_non_admin_blocked(self):
        r = requests.get(f"{API}/admin/overview", headers=_hdr(USER_K2), timeout=15)
        assert r.status_code == 403

    def test_admin_set_tier(self):
        # Pick a non-admin user from list, save tier, change to pro, back to free
        rl = requests.get(f"{API}/admin/users", headers=_hdr(USER_ADMIN, ADMIN_EMAIL), timeout=15)
        users = rl.json()["users"]
        target = next((u for u in users if not u.get("isAdmin")), None)
        assert target is not None, "no non-admin user available"
        uid, original = target["userId"], target.get("tier", "free")

        r1 = requests.post(f"{API}/admin/users/{uid}/tier",
                           headers=_hdr(USER_ADMIN, ADMIN_EMAIL),
                           json={"tier": "pro"}, timeout=15)
        assert r1.status_code == 200, r1.text
        assert r1.json()["tier"] == "pro"

        # Verify persisted
        rv = requests.get(f"{API}/admin/users", headers=_hdr(USER_ADMIN, ADMIN_EMAIL), timeout=15)
        u2 = next((u for u in rv.json()["users"] if u["userId"] == uid), None)
        assert u2 and u2["tier"] == "pro"

        # Restore
        requests.post(f"{API}/admin/users/{uid}/tier",
                      headers=_hdr(USER_ADMIN, ADMIN_EMAIL),
                      json={"tier": original}, timeout=15)

    def test_admin_set_tier_invalid(self):
        r = requests.post(f"{API}/admin/users/{USER_K2}/tier",
                          headers=_hdr(USER_ADMIN, ADMIN_EMAIL),
                          json={"tier": "platinum"}, timeout=15)
        assert r.status_code == 400


# ---------- scratch with theme palette propagation ----------
class TestScratchWithTheme:
    pres_id = None

    def test_01_create_scratch_with_sunset_theme(self):
        body = {
            "topic": "Series A pitch for SolarMint, a residential rooftop solar marketplace",
            "model": MODEL,
            "theme": {"tone": "bold", "palette": "sunset", "mode": "light"},
        }
        r = requests.post(f"{API}/presentations/scratch", headers=_hdr(USER_OTHER),
                          json=body, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "processing"
        TestScratchWithTheme.pres_id = d["id"]

    def test_02_poll_until_ready_and_validate_theme(self):
        pid = TestScratchWithTheme.pres_id
        assert pid, "no pid from previous test"
        deadline = time.time() + 240
        deck = None
        last_status = None
        while time.time() < deadline:
            r = requests.get(f"{API}/presentations/{pid}", headers=_hdr(USER_OTHER), timeout=20)
            assert r.status_code == 200
            deck = r.json()
            last_status = deck.get("status")
            if last_status == "ready":
                break
            if last_status == "failed":
                pytest.fail(f"Generation failed: {deck.get('error')}")
            time.sleep(5)
        assert last_status == "ready", f"timed out, last={last_status}"

        # Theme stored exactly as input
        theme = deck.get("theme")
        assert isinstance(theme, dict)
        assert theme.get("palette") == "sunset"
        assert theme.get("mode") == "light"
        assert theme.get("tone") == "bold"

        # All slide accents drawn from sunset palette
        allowed = PALETTE_ACCENTS["sunset"]
        bad = [s.get("accent") for s in deck["slides"] if s.get("accent") not in allowed]
        assert not bad, f"slide accents outside sunset palette: {bad}"

    def test_03_cleanup(self):
        pid = TestScratchWithTheme.pres_id
        if pid:
            requests.delete(f"{API}/presentations/{pid}", headers=_hdr(USER_OTHER), timeout=15)


# ---------- ownership ----------
class TestOwnership:
    def test_other_user_cannot_see_k2_deck(self):
        r = requests.get(f"{API}/presentations/{EXISTING_DECK_ID}",
                         headers=_hdr(USER_OTHER), timeout=15)
        assert r.status_code == 404
