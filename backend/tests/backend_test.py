"""VibeDeck backend integration tests.

Covers:
  - /api/health and /api/models
  - Auth gating via X-Test-User header
  - Scratch generation, polling till ready, list/get/delete
  - Ownership scoping across two test users
  - Topic validation
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://d06e43a2-4633-420d-a8a5-b00ba818590d.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

USER_A = "tester_alpha"
USER_B = "tester_bravo"
MODEL_FAST = "deepseek-v4-pro"

# Topic must trigger a meaningful generation
TOPIC = "A Series A pitch for NovaGrid, an AI energy-grid optimizer that cuts utility costs 32%"


def _hdr(user):
    return {"X-Test-User": user, "Content-Type": "application/json"}


# ---------- basic ----------
class TestBasic:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["service"] == "vibedeck"

    def test_models(self):
        r = requests.get(f"{API}/models", timeout=15)
        assert r.status_code == 200
        body = r.json()
        models = body["models"]
        assert isinstance(models, list)
        assert len(models) == 5
        ids = sorted([m["id"] for m in models])
        assert ids == sorted([
            "k2-think-v2", "gemini-3.1-pro", "claude-sonnet-4.6",
            "deepseek-v4-pro", "nemotron-3-ultra"
        ])
        assert body["default"] == "k2-think-v2"
        # default marker
        defaults = [m for m in models if m.get("default")]
        assert len(defaults) == 1 and defaults[0]["id"] == "k2-think-v2"


# ---------- auth gating ----------
class TestAuth:
    def test_no_auth_returns_401(self):
        r = requests.get(f"{API}/presentations", timeout=15)
        assert r.status_code == 401, f"expected 401 got {r.status_code}: {r.text[:200]}"

    def test_with_test_user_returns_200(self):
        r = requests.get(f"{API}/presentations", headers={"X-Test-User": USER_A}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "presentations" in body
        assert isinstance(body["presentations"], list)

    def test_me(self):
        r = requests.get(f"{API}/me", headers={"X-Test-User": USER_A}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["userId"] == USER_A


# ---------- validation ----------
class TestValidation:
    def test_scratch_short_topic_400(self):
        r = requests.post(f"{API}/presentations/scratch", headers=_hdr(USER_A),
                          json={"topic": "ab", "model": MODEL_FAST}, timeout=15)
        assert r.status_code == 400

    def test_scratch_empty_topic_400(self):
        r = requests.post(f"{API}/presentations/scratch", headers=_hdr(USER_A),
                          json={"topic": "   ", "model": MODEL_FAST}, timeout=15)
        assert r.status_code == 400


# ---------- generation + crud + ownership ----------
class TestGenerationCRUD:
    pres_id = None

    def test_01_create_scratch(self):
        r = requests.post(
            f"{API}/presentations/scratch",
            headers=_hdr(USER_A),
            json={"topic": TOPIC, "model": MODEL_FAST},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body
        assert body["status"] == "processing"
        TestGenerationCRUD.pres_id = body["id"]

    def test_02_poll_until_ready(self):
        assert TestGenerationCRUD.pres_id, "no presentation id from previous test"
        pid = TestGenerationCRUD.pres_id
        deadline = time.time() + 200
        last_status = None
        last_err = None
        deck = None
        while time.time() < deadline:
            r = requests.get(f"{API}/presentations/{pid}", headers={"X-Test-User": USER_A}, timeout=20)
            assert r.status_code == 200, r.text
            deck = r.json()
            last_status = deck.get("status")
            last_err = deck.get("error")
            if last_status == "ready":
                break
            if last_status == "failed":
                pytest.fail(f"Generation failed: {last_err}")
            time.sleep(4)
        assert last_status == "ready", f"timed out; last status={last_status} err={last_err}"
        # validate shape
        assert deck["title"] and isinstance(deck["title"], str)
        assert "arc" in deck and isinstance(deck["arc"], list) and len(deck["arc"]) > 0
        slides = deck["slides"]
        assert isinstance(slides, list)
        assert 8 <= len(slides) <= 11, f"slide count out of range: {len(slides)}"
        for s in slides:
            assert s.get("layout")
            assert s.get("background")
            assert s.get("accent")
            assert s.get("title")

    def test_03_list_shows_deck(self):
        r = requests.get(f"{API}/presentations", headers={"X-Test-User": USER_A}, timeout=15)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()["presentations"]]
        assert TestGenerationCRUD.pres_id in ids

    def test_04_other_user_cannot_see(self):
        r = requests.get(f"{API}/presentations", headers={"X-Test-User": USER_B}, timeout=15)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()["presentations"]]
        assert TestGenerationCRUD.pres_id not in ids
        # direct GET should 404
        r2 = requests.get(
            f"{API}/presentations/{TestGenerationCRUD.pres_id}",
            headers={"X-Test-User": USER_B}, timeout=15,
        )
        assert r2.status_code == 404

    def test_05_delete(self):
        pid = TestGenerationCRUD.pres_id
        r = requests.delete(f"{API}/presentations/{pid}", headers={"X-Test-User": USER_A}, timeout=15)
        assert r.status_code == 200
        # verify gone
        r2 = requests.get(f"{API}/presentations/{pid}", headers={"X-Test-User": USER_A}, timeout=15)
        assert r2.status_code == 404
