"""Multi-LLM router for VibeDeck (tiered).

Default Director = K2 Think v2. Models are grouped into subscription tiers:
  free : K2 Think v2, MiniMax M3, DeepSeek V4 Pro
  pro  : Gemini 3.5 Flash, Claude Sonnet 4.6, GPT 5.4
  max  : Gemini 3.1 Pro, Claude Opus 4.8, GPT 5.5

Providers:
  k2      -> api.k2think.ai (custom)
  nvidia  -> build.nvidia.com (MiniMax M3, DeepSeek V4 Pro)
  openai/anthropic/gemini -> Emergent universal key (emergentintegrations)

complete() returns (text, tokens_used) so generations can be metered.
"""
import os
import asyncio
import time
import httpx

K2_API_KEY = os.environ.get("K2_API_KEY")
K2_BASE_URL = os.environ.get("K2_BASE_URL", "https://api.k2think.ai/v1")
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY")
NVIDIA_BASE_URL = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

DEFAULT_MODEL = "k2-think-v2"
TIER_ORDER = {"free": 0, "pro": 1, "max": 2}

MODELS = {
    # ---- FREE ----
    "k2-think-v2": {
        "provider": "k2", "model": "MBZUAI-IFM/K2-Think-v2", "label": "K2 Think v2",
        "vendor": "MBZUAI-IFM", "accent": "violet", "tier": "free",
        "tagline": "Reasoning Choreographer", "budget": 16000,
    },
    "minimax-m3": {
        "provider": "nvidia", "model": "minimaxai/minimax-m3", "label": "MiniMax M3",
        "vendor": "MiniMax", "accent": "rose", "tier": "free",
        "tagline": "Creative & fast", "budget": 8000,
    },
    "deepseek-v4-pro": {
        "provider": "nvidia", "model": "deepseek-ai/deepseek-v4-pro", "label": "DeepSeek V4 Pro",
        "vendor": "DeepSeek", "accent": "blue", "tier": "free",
        "tagline": "Structured & fast", "budget": 8000,
    },
    # ---- PRO ----
    "gemini-3.5-flash": {
        "provider": "gemini", "model": "gemini-3.5-flash", "label": "Gemini 3.5 Flash",
        "vendor": "Google", "accent": "cyan", "tier": "pro",
        "tagline": "Snappy multimodal", "budget": 6000,
    },
    "claude-sonnet-4.6": {
        "provider": "anthropic", "model": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6",
        "vendor": "Anthropic", "accent": "amber", "tier": "pro",
        "tagline": "Narrative & copy", "budget": 6000,
    },
    "gpt-5.4": {
        "provider": "openai", "model": "gpt-5.4", "label": "GPT 5.4",
        "vendor": "OpenAI", "accent": "emerald", "tier": "pro",
        "tagline": "Balanced reasoning", "budget": 6000,
    },
    # ---- MAX ----
    "gemini-3.1-pro": {
        "provider": "gemini", "model": "gemini-3.1-pro-preview", "label": "Gemini 3.1 Pro",
        "vendor": "Google", "accent": "cyan", "tier": "max",
        "tagline": "Top-tier multimodal", "budget": 8000,
    },
    "claude-opus-4.8": {
        "provider": "anthropic", "model": "claude-opus-4-8", "label": "Claude Opus 4.8",
        "vendor": "Anthropic", "accent": "amber", "tier": "max",
        "tagline": "Deepest writing", "budget": 8000,
    },
    "gpt-5.5": {
        "provider": "openai", "model": "gpt-5.5", "label": "GPT 5.5",
        "vendor": "OpenAI", "accent": "emerald", "tier": "max",
        "tagline": "Frontier reasoning", "budget": 8000,
    },
}


def list_models():
    out = []
    for key, cfg in MODELS.items():
        out.append({
            "id": key, "label": cfg["label"], "vendor": cfg["vendor"],
            "accent": cfg["accent"], "tagline": cfg["tagline"], "tier": cfg["tier"],
            "default": key == DEFAULT_MODEL,
        })
    return out


def model_tier(model_key):
    return (MODELS.get(model_key) or MODELS[DEFAULT_MODEL])["tier"]


def is_model_allowed(model_key, user_tier):
    cfg = MODELS.get(model_key)
    if not cfg:
        return False
    return TIER_ORDER[cfg["tier"]] <= TIER_ORDER.get(user_tier, 0)


_sem = asyncio.Semaphore(8)  # respect K2: 10 concurrent / 30 per min


def strip_reasoning(text: str) -> str:
    if not isinstance(text, str):
        return ""
    if "</think>" in text:
        text = text.split("</think>")[-1]
    return text.strip()


async def _openai_compatible(base_url, api_key, model, system, user, max_tokens):
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.6,
        "max_tokens": max_tokens,
        "stream": False,
    }
    async with _sem:
        async with httpx.AsyncClient(timeout=115) as client:
            r = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json", "accept": "application/json"},
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
    content = data["choices"][0]["message"]["content"]
    tokens = (data.get("usage") or {}).get("total_tokens", 0)
    return content, tokens


async def _k2_complete(model, system, user, max_tokens):
    merged = f"{system}\n\n---\n\n{user}"
    payload = {"model": model, "messages": [{"role": "user", "content": merged}], "stream": False, "max_tokens": max_tokens}
    async with _sem:
        async with httpx.AsyncClient(timeout=115) as client:
            r = await client.post(
                f"{K2_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {K2_API_KEY}", "Content-Type": "application/json", "accept": "application/json"},
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
    content = data["choices"][0]["message"]["content"]
    tokens = (data.get("usage") or {}).get("total_tokens", 0)
    return content, tokens


async def _emergent_complete(provider, model, system, user, max_tokens):
    import uuid
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=uuid.uuid4().hex, system_message=system).with_model(provider, model)
    resp = await chat.send_message(UserMessage(text=user))
    text = resp if isinstance(resp, str) else getattr(resp, "content", str(resp))
    tokens = (len(system) + len(user) + len(text)) // 4  # estimate (no usage from lib)
    return text, tokens


async def complete(model_key: str, system: str, user: str, max_tokens: int = 6000):
    """Returns (text, tokens_used)."""
    cfg = MODELS.get(model_key) or MODELS[DEFAULT_MODEL]
    provider = cfg["provider"]
    model = cfg["model"]
    budget = cfg.get("budget", max_tokens)

    if provider == "k2":
        raw, tokens = await _k2_complete(model, system, user, budget)
        return strip_reasoning(raw), tokens
    if provider == "nvidia":
        raw, tokens = await _openai_compatible(NVIDIA_BASE_URL, NVIDIA_API_KEY, model, system + "\n\ndetailed thinking off", user, budget)
        return strip_reasoning(raw), tokens
    if provider in ("gemini", "anthropic", "openai"):
        raw, tokens = await _emergent_complete(provider, model, system, user, budget)
        return strip_reasoning(raw), tokens

    raise ValueError(f"Unsupported provider for model {model_key}")
