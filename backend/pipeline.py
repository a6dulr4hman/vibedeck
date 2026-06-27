"""Autonomous generation pipeline — per-slide, concurrent (respects K2's 120s limit).

Phase 1: generate a small, fast OUTLINE (title, arc, slide stubs).
Phase 2: generate each slide in its OWN prompt, concurrently (capped by the
router's semaphore). Smaller prompts = lower latency, fewer timeouts, less
hallucination. Each slide may compose real MagicUI/Aceternity components.

Returns (deck, tokens_used).
"""
import json
import re
import asyncio

import llm_router
from icons import resolve_icon

MAX_SOURCE_CHARS = 14000

LAYOUTS = ["cover", "statement", "agenda", "bullets", "metrics",
           "feature-grid", "bento", "timeline", "quote", "comparison", "showcase", "closing"]
BACKGROUNDS = ["particles", "meteors", "aurora", "retro-grid", "dot-pattern", "grid", "ripple", "warp", "plain"]
ACCENTS = ["violet", "cyan", "fuchsia", "emerald", "amber", "rose", "blue"]
EFFECTS = ["border-beam", "shine-border", "orbiting-circles", "sparkles-text", "marquee", "animated-grid", "globe"]

# ---- theme system: color palettes + tone guidance ----
PALETTES = {
    "violet": ["violet", "fuchsia", "blue"],
    "ocean": ["cyan", "blue", "emerald"],
    "sunset": ["amber", "rose", "fuchsia"],
    "forest": ["emerald", "cyan", "amber"],
    "mono": ["slate", "blue", "slate"],
}
TONE_GUIDE = {
    "formal": "Tone: formal, precise and executive. Authoritative, concise, no slang.",
    "playful": "Tone: playful, energetic and friendly. Punchy fun language and vivid verbs.",
    "bold": "Tone: bold and punchy. Confident claims, high-contrast statements, momentum.",
    "minimal": "Tone: minimal and restrained. Very few words, lots of breathing room.",
    "elegant": "Tone: elegant and sophisticated. Refined, warm, premium feel.",
}
DEFAULT_THEME = {"mode": "dark", "palette": "violet", "tone": "formal"}


def _norm_theme(theme):
    t = dict(DEFAULT_THEME)
    if isinstance(theme, dict):
        if theme.get("mode") in ("light", "dark"):
            t["mode"] = theme["mode"]
        if theme.get("palette") in PALETTES:
            t["palette"] = theme["palette"]
        if theme.get("tone") in TONE_GUIDE:
            t["tone"] = theme["tone"]
    return t


def _style_directive(theme):
    t = _norm_theme(theme)
    return f"STYLE DIRECTION — {TONE_GUIDE[t['tone']]}"


def _apply_palette(slides, palette):
    accents = PALETTES.get(palette, PALETTES["violet"])
    for i, s in enumerate(slides):
        s["accent"] = accents[i % len(accents)]
    return slides

# ---- component guidance shown to the Director (real MagicUI/Aceternity vocab) ----
_COMPONENTS = (
    "Backgrounds (MagicUI/Aceternity): particles, meteors, aurora, retro-grid, dot-pattern, grid, ripple, warp, plain. "
    "Effects (optional, 0-2 per slide): border-beam & shine-border (animated card borders), orbiting-circles (ecosystem/integrations), "
    "sparkles-text (hero titles), marquee (logo/tool strips), animated-grid, globe (geographic/global reach)."
)

OUTLINE_SYSTEM = f"""You are VibeDeck Director — an elite art director & presentation choreographer. \
Plan a cinematic, strict-16:9 slide deck OUTLINE.

Return ONLY one valid JSON object, beginning with "{{". No markdown, no commentary.

Rules:
- 8 to 10 slides. First layout = "cover", last = "closing". Vary layouts & backgrounds for rhythm.
- This is a PRESENTATION, not a textbook — plan punchy, high-impact slides.
- Each slide stub: a layout, a background, an accent, 0-2 effects, and a one-line "brief" describing its content.
- Choose components that fit the idea. {_COMPONENTS}

Enums:
- layout: {LAYOUTS}
- background: {BACKGROUNDS}
- accent: {ACCENTS}
- effects: {EFFECTS}

Schema:
{{"title":"<=6 words","subtitle":"one-line tagline","arc":["Hook","Problem","Solution","Metrics","Conclusion"],
"slides":[{{"layout":"cover","background":"aurora","accent":"violet","effects":["sparkles-text"],"brief":"opening hook line"}}]}}"""

SLIDE_SYSTEM = f"""You are VibeDeck Director designing ONE slide of a deck. \
Return ONLY one valid JSON object, beginning with "{{". No markdown, no commentary.

Compress HARD — short phrases, metrics, taglines. Max ~10 words per text field. Never paragraphs. \
Keep counts small so nothing overflows a 16:9 canvas:
- bullets/feature-grid/bento: 3-4 items max
- metrics: 2-4 metrics
- timeline: 3-4 steps
- comparison: 3-4 items per side

For "icon" use a SHORT lowercase keyword (e.g. "database","security","growth","team","money","speed").

Field usage by layout: cover(eyebrow,title,subtitle) · statement(title,subtitle) · agenda(title,items title-only 3-5) · \
bullets(title,items[icon,title,text] 3-4) · metrics(title,metrics 2-4) · feature-grid(title,items 3-4) · \
bento(title,items 3-4) · timeline(title,timeline 3-4) · quote(quote) · comparison(title,comparison) · \
showcase(title,subtitle,items 3) · closing(eyebrow,title,subtitle).

Schema (include only fields the layout needs):
{{"eyebrow","title","subtitle","items":[{{"icon","title","text"}}],"metrics":[{{"value","prefix","suffix","label"}}],
"timeline":[{{"label","title","text"}}],"quote":{{"text","author","role"}},
"comparison":{{"leftTitle","rightTitle","leftItems":[],"rightItems":[]}},"notes":"1-2 sentence speaker script"}}"""

_TAIL = "\n\nOutput ONLY the JSON object now."


def _src(source_text, mode):
    source_text = (source_text or "").strip()[:MAX_SOURCE_CHARS]
    if mode == "scratch":
        return f"MODE: from a brief. Expand this topic into a compelling deck.\n\nBRIEF:\n{source_text}"
    return f"MODE: summarize this document. Extract the core narrative & strongest metrics; discard filler.\n\nSOURCE:\n{source_text}"


def _iter_objects(text):
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


def _extract_json(text, prefer_keys=()):
    text = (text or "").strip()
    if "</think>" in text:
        text = text.split("</think>")[-1].strip()
    fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fence:
        try:
            return json.loads(fence.group(1))
        except json.JSONDecodeError:
            pass
    fallback = None
    for cand in _iter_objects(text):
        try:
            obj = json.loads(cand)
        except json.JSONDecodeError:
            continue
        if not isinstance(obj, dict):
            continue
        if prefer_keys and any(k in obj for k in prefer_keys):
            return obj
        if fallback is None:
            fallback = obj
    if fallback is not None:
        return fallback
    raise ValueError("No JSON object found in model output")


def _clean_slide(stub, content, index):
    layout = stub.get("layout") if stub.get("layout") in LAYOUTS else "bullets"
    background = stub.get("background") if stub.get("background") in BACKGROUNDS else "aurora"
    accent = stub.get("accent") if stub.get("accent") in ACCENTS else "violet"
    effects = [e for e in (stub.get("effects") or []) if e in EFFECTS][:2]
    # slide may add/override effects
    for e in (content.get("effects") or []):
        if e in EFFECTS and e not in effects and len(effects) < 2:
            effects.append(e)

    out = {
        "id": f"slide-{index + 1}",
        "layout": layout, "background": background, "accent": accent, "effects": effects,
        "eyebrow": (content.get("eyebrow") or "")[:50],
        "title": (content.get("title") or "")[:120],
        "subtitle": (content.get("subtitle") or "")[:160],
        "notes": (content.get("notes") or "")[:500],
        "items": [], "metrics": [], "timeline": [], "quote": None, "comparison": None,
    }
    for it in (content.get("items") or [])[:4]:
        if isinstance(it, dict):
            out["items"].append({
                "icon": resolve_icon(it.get("icon")),
                "title": (it.get("title") or "")[:60],
                "text": (it.get("text") or "")[:110],
            })
    for m in (content.get("metrics") or [])[:4]:
        if isinstance(m, dict):
            out["metrics"].append({
                "value": str(m.get("value", ""))[:10], "prefix": str(m.get("prefix", ""))[:4],
                "suffix": str(m.get("suffix", ""))[:4], "label": (m.get("label") or "")[:48],
            })
    for t in (content.get("timeline") or [])[:4]:
        if isinstance(t, dict):
            out["timeline"].append({
                "label": (t.get("label") or "")[:20], "title": (t.get("title") or "")[:60],
                "text": (t.get("text") or "")[:90],
            })
    q = content.get("quote")
    if isinstance(q, dict) and q.get("text"):
        out["quote"] = {"text": q.get("text", "")[:240], "author": (q.get("author") or "")[:50], "role": (q.get("role") or "")[:50]}
    c = content.get("comparison")
    if isinstance(c, dict):
        out["comparison"] = {
            "leftTitle": (c.get("leftTitle") or "Before")[:32], "rightTitle": (c.get("rightTitle") or "After")[:32],
            "leftItems": [str(x)[:70] for x in (c.get("leftItems") or [])[:4]],
            "rightItems": [str(x)[:70] for x in (c.get("rightItems") or [])[:4]],
        }
    if not out["title"]:
        out["title"] = (stub.get("brief") or "Slide")[:120]
    return out


def _fallback_outline(source_text, mode):
    base = (source_text or "Presentation").strip()[:60]
    layouts = ["cover", "statement", "bullets", "metrics", "feature-grid", "timeline", "quote", "closing"]
    bgs = ["aurora", "particles", "grid", "dot-pattern", "meteors", "retro-grid", "ripple", "warp"]
    accents = ["violet", "cyan", "fuchsia", "emerald", "amber", "rose", "blue", "violet"]
    return {
        "title": base or "Presentation",
        "subtitle": "",
        "arc": ["Hook", "Problem", "Solution", "Metrics", "Conclusion"],
        "slides": [{"layout": layouts[i], "background": bgs[i], "accent": accents[i], "effects": [], "brief": base} for i in range(8)],
    }


async def _generate_outline(source_text, model_key, mode, theme=None):
    user = _src(source_text, mode) + "\n\n" + _style_directive(theme) + _TAIL
    try:
        raw, tokens = await llm_router.complete(model_key, OUTLINE_SYSTEM, user)
    except Exception:
        return _fallback_outline(source_text, mode), 0
    try:
        outline = _extract_json(raw, prefer_keys=["slides"])
        if not outline.get("slides"):
            raise ValueError("empty")
    except Exception:
        outline = _fallback_outline(source_text, mode)
        tokens = tokens or 0
    return outline, tokens


async def _generate_slide(deck_ctx, stub, index, model_key, theme=None):
    brief = stub.get("brief", "")
    user = (
        f"DECK: {deck_ctx}\n{_style_directive(theme)}\n\nDESIGN SLIDE {index + 1}.\n"
        f"layout={stub.get('layout')} background={stub.get('background')} accent={stub.get('accent')}.\n"
        f"Slide brief: {brief}" + _TAIL
    )
    try:
        raw, tokens = await llm_router.complete(model_key, SLIDE_SYSTEM, user)
        content = _extract_json(raw, prefer_keys=["title", "items", "metrics", "quote"])
    except Exception:
        content, tokens = {"title": brief or f"Slide {index + 1}"}, 0
    return index, _clean_slide(stub, content, index), tokens


async def generate_deck(source_text, model_key, mode="pdf", on_progress=None, theme=None):
    theme = _norm_theme(theme)
    total_tokens = 0
    if on_progress:
        await on_progress(2, "Choreographing the narrative arc")
    outline, otok = await _generate_outline(source_text, model_key, mode, theme)
    total_tokens += otok

    stubs = outline.get("slides", [])[:10]
    n = len(stubs)
    deck_ctx = f"title='{outline.get('title')}' arc={outline.get('arc')}"

    done = 0
    results = []

    async def run(i, stub):
        nonlocal done, total_tokens
        idx, slide, tk = await _generate_slide(deck_ctx, stub, i, model_key, theme)
        total_tokens += tk
        done += 1
        if on_progress:
            await on_progress(3, f"Designing slide {done}/{n}")
        return idx, slide

    gathered = await asyncio.gather(*[run(i, s) for i, s in enumerate(stubs)])
    results = [s for _, s in sorted(gathered, key=lambda x: x[0])]
    _apply_palette(results, theme["palette"])

    if on_progress:
        await on_progress(4, "Applying art direction")

    arc = outline.get("arc")
    if not isinstance(arc, list):
        arc = ["Hook", "Problem", "Solution", "Metrics", "Conclusion"]
    deck = {
        "title": (outline.get("title") or "Untitled Deck")[:80],
        "subtitle": (outline.get("subtitle") or "")[:160],
        "theme": theme,
        "arc": [str(a)[:24] for a in arc][:6],
        "slides": results,
    }
    if not deck["slides"]:
        raise ValueError("Director produced no slides")
    return deck, total_tokens


# ----------------------------- edit (chat) -----------------------------
EDIT_SYSTEM = """You are VibeDeck Director editing an existing deck via a chat instruction. \
Apply the instruction and return the COMPLETE updated deck as ONE valid JSON object using this schema:
{"title","subtitle","arc":[...],"slides":[{"layout","background","accent","effects":[],"eyebrow","title","subtitle",
"items":[{"icon","title","text"}],"metrics":[{"value","prefix","suffix","label"}],"timeline":[{"label","title","text"}],
"quote":{"text","author","role"},"comparison":{"leftTitle","rightTitle","leftItems":[],"rightItems":[]},"notes"}]}
Keep slides unless told to remove them. Use short lowercase keywords for icons. Compress hard. Return ONLY JSON, beginning with {."""


async def edit_deck(current_deck, instruction, model_key):
    theme = _norm_theme(current_deck.get("theme"))
    payload = {
        "title": current_deck.get("title"), "subtitle": current_deck.get("subtitle"),
        "arc": current_deck.get("arc"), "slides": current_deck.get("slides"),
    }
    user = f"INSTRUCTION: {instruction}\n\nCURRENT DECK JSON:\n{json.dumps(payload)[:18000]}" + _TAIL
    raw, tokens = await llm_router.complete(model_key, EDIT_SYSTEM, user, max_tokens=12000)
    deck = _extract_json(raw, prefer_keys=["slides"])
    raw_slides = deck.get("slides") or []
    slides = []
    for i, s in enumerate(raw_slides):
        if isinstance(s, dict):
            stub = {"layout": s.get("layout"), "background": s.get("background"), "accent": s.get("accent"), "effects": s.get("effects"), "brief": s.get("title")}
            slides.append(_clean_slide(stub, s, i))
    if not slides:
        raise ValueError("Edit produced no slides")
    _apply_palette(slides, theme["palette"])
    arc = deck.get("arc") if isinstance(deck.get("arc"), list) else current_deck.get("arc", [])
    out = {
        "title": (deck.get("title") or current_deck.get("title") or "Deck")[:80],
        "subtitle": (deck.get("subtitle") or "")[:160],
        "theme": theme,
        "arc": [str(a)[:24] for a in arc][:6],
        "slides": slides,
    }
    return out, tokens


# ----------------------------- edit a single slide -----------------------------
EDIT_SLIDE_SYSTEM = SLIDE_SYSTEM + (
    "\n\nYou are EDITING ONE existing slide. Apply ONLY the user's instruction and preserve "
    "everything they did not ask to change. Keep the same layout unless explicitly asked. "
    "Return the COMPLETE updated slide as ONE JSON object."
)


async def edit_slide(current_slide, deck_ctx, instruction, model_key, theme=None):
    try:
        idx = int(str(current_slide.get("id", "slide-1")).split("-")[-1]) - 1
    except Exception:
        idx = 0
    user = (
        f"DECK: {deck_ctx}\n{_style_directive(theme)}\n\n"
        f"CURRENT SLIDE JSON:\n{json.dumps(current_slide)[:8000]}\n\n"
        f"INSTRUCTION: {instruction}\n\nReturn the FULL updated slide JSON now."
    ) + _TAIL
    raw, tokens = await llm_router.complete(model_key, EDIT_SLIDE_SYSTEM, user, max_tokens=4000)
    content = _extract_json(raw, prefer_keys=["title", "items", "metrics", "quote"])
    stub = {
        "layout": content.get("layout") or current_slide.get("layout"),
        "background": content.get("background") or current_slide.get("background"),
        "accent": content.get("accent") or current_slide.get("accent"),
        "effects": content.get("effects") or current_slide.get("effects"),
        "brief": content.get("title") or current_slide.get("title"),
    }
    slide = _clean_slide(stub, content, idx)
    slide["id"] = current_slide.get("id") or slide["id"]
    # keep the slide on-palette: preserve its prior accent
    slide["accent"] = current_slide.get("accent") or slide["accent"]
    return slide, tokens
