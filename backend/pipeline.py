"""The autonomous generation pipeline.

PDF / brief  ->  Director LLM (K2 Think by default)  ->  structured slide deck.

The Director defines a narrative arc, ruthlessly compresses the source into
punchy slides, assigns a layout + cinematic background + accent, and emits a
short keyword per icon. Icons are resolved to lucide names in Python (phase 2).
"""
import json
import re

import llm_router
from icons import resolve_icon

MAX_SOURCE_CHARS = 14000

LAYOUTS = ["cover", "agenda", "statement", "bullets", "metrics",
           "feature-grid", "bento", "timeline", "quote", "comparison", "closing"]
BACKGROUNDS = ["aurora", "meteors", "grid", "dots", "spotlight", "plain"]
ACCENTS = ["violet", "cyan", "fuchsia", "emerald", "amber", "rose", "blue"]

SYSTEM_PROMPT = """You are VibeDeck Director — an elite art director and presentation choreographer. \
Turn source material into a punchy, cinematic, strict-16:9 dark-mode slide deck.

Return ONLY one valid JSON object. No markdown, no commentary, no schema restatement. Begin your answer with "{".

IMPORTANT: Think briefly — a few sentences of planning at most — then output the JSON immediately. Do not deliberate at length.

Rules:
- A presentation, NOT a textbook. Compress hard: short phrases, metrics, taglines. Max ~12 words per text field. Never paragraphs.
- Narrative arc: Hook -> Problem -> Solution/Architecture -> Proof/Metrics -> Conclusion/CTA.
- 8 to 11 slides. First slide layout = "cover", last = "closing". Vary layouts for visual rhythm.
- "icon" fields: give a SHORT lowercase keyword for the concept (e.g. "database", "security", "growth", "team", "money", "speed"). NOT an icon library name.
- Choose background + accent per slide; make neighbours differ. Use aurora/meteors/spotlight on cover & closing.
- Add a 1-3 sentence speaker "notes" to every slide.

Enums:
- layout: cover, agenda, statement, bullets, metrics, feature-grid, bento, timeline, quote, comparison, closing
- background: aurora, meteors, grid, dots, spotlight, plain
- accent: violet, cyan, fuchsia, emerald, amber, rose, blue

Schema (include only the fields a layout needs):
{"title","subtitle","theme":"dark","arc":["Hook","Problem","Solution","Metrics","Conclusion"],"slides":[{"layout","background","accent","eyebrow","title","subtitle","items":[{"icon","title","text"}],"metrics":[{"value","prefix","suffix","label"}],"timeline":[{"label","title","text"}],"quote":{"text","author","role"},"comparison":{"leftTitle","rightTitle","leftItems":[],"rightItems":[]},"notes"}]}

Field usage: cover(eyebrow,title,subtitle) · agenda(title,items 3-6) · statement(title,subtitle) · bullets(title,items 3-5) · metrics(title,metrics 2-4) · feature-grid(title,items 3-6) · bento(title,items 4-6) · timeline(title,timeline 3-5) · quote(quote) · comparison(title,comparison) · closing(eyebrow,title,subtitle)."""

_OUTPUT_TAIL = "\n\nNow output ONLY the JSON deck object, beginning with { and nothing before it."


def _build_user_prompt(source_text: str, mode: str) -> str:
    source_text = (source_text or "").strip()[:MAX_SOURCE_CHARS]
    if mode == "scratch":
        head = (
            "MODE: Start from scratch. The user gave only a brief/topic below. "
            "Expand it into a compelling deck using your knowledge.\n\nBRIEF:\n"
        )
    else:
        head = (
            "MODE: Summarize a source document into a deck. Extract the core narrative, "
            "the strongest metrics, and the key takeaways. Discard filler.\n\nSOURCE DOCUMENT:\n"
        )
    return head + source_text + _OUTPUT_TAIL


def _iter_objects(text: str):
    """Yield every balanced {...} substring (string-aware), left to right."""
    n = len(text)
    i = 0
    while i < n:
        if text[i] == "{":
            depth, in_str, esc = 0, False, False
            for j in range(i, n):
                c = text[j]
                if in_str:
                    if esc:
                        esc = False
                    elif c == "\\":
                        esc = True
                    elif c == '"':
                        in_str = False
                else:
                    if c == '"':
                        in_str = True
                    elif c == "{":
                        depth += 1
                    elif c == "}":
                        depth -= 1
                        if depth == 0:
                            yield text[i:j + 1]
                            break
        i += 1


def _extract_json(text: str) -> dict:
    """Find the deck JSON object, ignoring reasoning prefix / trailing prose."""
    text = (text or "").strip()
    if "</think>" in text:
        text = text.split("</think>")[-1].strip()

    fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fence:
        try:
            obj = json.loads(fence.group(1))
            if isinstance(obj, dict) and "slides" in obj:
                return obj
        except json.JSONDecodeError:
            pass

    fallback = None
    for candidate in _iter_objects(text):
        if '"slides"' not in candidate:
            continue
        try:
            obj = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and "slides" in obj:
            return obj
        fallback = fallback or obj

    if fallback is not None:
        return fallback
    raise ValueError("No deck JSON object found in model output")


def _clean_slide(slide: dict, index: int) -> dict:
    layout = slide.get("layout") if slide.get("layout") in LAYOUTS else "bullets"
    background = slide.get("background") if slide.get("background") in BACKGROUNDS else "aurora"
    accent = slide.get("accent") if slide.get("accent") in ACCENTS else "violet"

    out = {
        "id": f"slide-{index + 1}",
        "layout": layout,
        "background": background,
        "accent": accent,
        "eyebrow": (slide.get("eyebrow") or "")[:60],
        "title": (slide.get("title") or "")[:140],
        "subtitle": (slide.get("subtitle") or "")[:200],
        "notes": (slide.get("notes") or "")[:600],
        "items": [],
        "metrics": [],
        "timeline": [],
        "quote": None,
        "comparison": None,
    }

    for it in (slide.get("items") or [])[:6]:
        if not isinstance(it, dict):
            continue
        out["items"].append({
            "icon": resolve_icon(it.get("icon")),
            "title": (it.get("title") or "")[:80],
            "text": (it.get("text") or "")[:140],
        })

    for m in (slide.get("metrics") or [])[:4]:
        if not isinstance(m, dict):
            continue
        out["metrics"].append({
            "value": str(m.get("value", ""))[:12],
            "prefix": str(m.get("prefix", ""))[:6],
            "suffix": str(m.get("suffix", ""))[:6],
            "label": (m.get("label") or "")[:60],
        })

    for t in (slide.get("timeline") or [])[:5]:
        if not isinstance(t, dict):
            continue
        out["timeline"].append({
            "label": (t.get("label") or "")[:24],
            "title": (t.get("title") or "")[:80],
            "text": (t.get("text") or "")[:120],
        })

    q = slide.get("quote")
    if isinstance(q, dict) and q.get("text"):
        out["quote"] = {
            "text": q.get("text", "")[:280],
            "author": (q.get("author") or "")[:60],
            "role": (q.get("role") or "")[:60],
        }

    c = slide.get("comparison")
    if isinstance(c, dict):
        out["comparison"] = {
            "leftTitle": (c.get("leftTitle") or "Before")[:40],
            "rightTitle": (c.get("rightTitle") or "After")[:40],
            "leftItems": [str(x)[:80] for x in (c.get("leftItems") or [])[:5]],
            "rightItems": [str(x)[:80] for x in (c.get("rightItems") or [])[:5]],
        }

    return out


def _normalize_deck(deck: dict) -> dict:
    raw_slides = deck.get("slides") or []
    slides = [_clean_slide(s, i) for i, s in enumerate(raw_slides) if isinstance(s, dict)]
    if not slides:
        raise ValueError("Director returned no slides")
    arc = deck.get("arc")
    if not isinstance(arc, list):
        arc = ["Hook", "Problem", "Solution", "Metrics", "Conclusion"]
    return {
        "title": (deck.get("title") or "Untitled Deck")[:80],
        "subtitle": (deck.get("subtitle") or "")[:160],
        "theme": "dark",
        "arc": [str(a)[:24] for a in arc][:6],
        "slides": slides,
    }


async def generate_deck(source_text: str, model_key: str, mode: str = "pdf") -> dict:
    user_prompt = _build_user_prompt(source_text, mode)
    last_err = None
    for _ in range(2):
        raw = await llm_router.complete(model_key, SYSTEM_PROMPT, user_prompt, max_tokens=8000)
        try:
            return _normalize_deck(_extract_json(raw))
        except Exception as exc:  # noqa: BLE001
            last_err = exc
    raise ValueError(f"Director output was not valid JSON: {last_err}")


EDIT_SYSTEM_PROMPT = """You are VibeDeck Director performing an EDIT on an existing deck. \
You receive the current deck JSON and an instruction. Apply the instruction and return the \
COMPLETE updated deck as ONE valid JSON object using the exact same schema. Keep slides unless \
told to remove them. Use the same enums (layout/background/accent) and short lowercase keywords \
for icons. Return ONLY JSON, beginning with {."""


async def edit_deck(current_deck: dict, instruction: str, model_key: str) -> dict:
    payload = {
        "title": current_deck.get("title"),
        "subtitle": current_deck.get("subtitle"),
        "arc": current_deck.get("arc"),
        "slides": current_deck.get("slides"),
    }
    user_prompt = (
        f"INSTRUCTION: {instruction}\n\nCURRENT DECK JSON:\n{json.dumps(payload)[:20000]}"
        + _OUTPUT_TAIL
    )
    raw = await llm_router.complete(model_key, EDIT_SYSTEM_PROMPT, user_prompt, max_tokens=8000)
    return _normalize_deck(_extract_json(raw))
