"""Multi-LLM router for VibeDeck.

Default reasoning "Director" is K2 Think v2 (custom OpenAI-compatible API).
DeepSeek V4 Pro and NVIDIA Nemotron 3 Ultra are served via build.nvidia.com.
Gemini 3.1 Pro and Claude Sonnet 4.6 are served via the Emergent universal key.
"""
import os
import asyncio
import httpx

K2_API_KEY = os.environ.get("K2_API_KEY")
K2_BASE_URL = os.environ.get("K2_BASE_URL", "https://api.k2think.ai/v1")
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY")
NVIDIA_BASE_URL = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

DEFAULT_MODEL = "k2-think-v2"

# Public registry surfaced to the frontend LLM selector.
MODELS = {
    "k2-think-v2": {
        "provider": "k2", "model": "MBZUAI-IFM/K2-Think-v2",
        "label": "K2 Think v2", "vendor": "MBZUAI-IFM",
        "accent": "violet", "tagline": "Reasoning Choreographer (default)",
        "token_budget": 28000,
    },
    "gemini-3.1-pro": {
        "provider": "gemini", "model": "gemini-3.1-pro-preview",
        "label": "Gemini 3.1 Pro", "vendor": "Google",
        "accent": "cyan", "tagline": "Multimodal art direction",
        "token_budget": 8000,
    },
    "claude-sonnet-4.6": {
        "provider": "anthropic", "model": "claude-sonnet-4-6",
        "label": "Claude Sonnet 4.6", "vendor": "Anthropic",
        "accent": "amber", "tagline": "Narrative & copywriting",
        "token_budget": 8000,
    },
    "deepseek-v4-pro": {
        "provider": "nvidia", "model": "deepseek-ai/deepseek-v4-pro",
        "label": "DeepSeek V4 Pro", "vendor": "DeepSeek",
        "accent": "blue", "tagline": "Fast & structured",
        "token_budget": 8000,
    },
    "nemotron-3-ultra": {
        "provider": "nvidia", "model": "nvidia/nemotron-3-ultra-550b-a55b",
        "label": "Nemotron 3 Ultra", "vendor": "NVIDIA",
        "accent": "emerald", "tagline": "Heavyweight synthesis",
        "token_budget": 14000,
    },
}


def list_models():
    out = []
    for key, cfg in MODELS.items():
        out.append({
            "id": key, "label": cfg["label"], "vendor": cfg["vendor"],
            "accent": cfg["accent"], "tagline": cfg["tagline"],
            "default": key == DEFAULT_MODEL,
        })
    return out


_sem = asyncio.Semaphore(8)  # respect K2 concurrency (10) / generic safety


def strip_reasoning(text: str) -> str:
    """K2 / reasoning models prefix a <think> block. Keep only the answer."""
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
        async with httpx.AsyncClient(timeout=300) as client:
            r = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
    return data["choices"][0]["message"]["content"]


async def _k2_complete(model, system, user, max_tokens):
    # K2 example uses a single user turn; fold the system prompt in for safety.
    merged = f"{system}\n\n---\n\n{user}"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": merged}],
        "stream": False,
        "max_tokens": max_tokens,
    }
    async with _sem:
        async with httpx.AsyncClient(timeout=420) as client:
            r = await client.post(
                f"{K2_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {K2_API_KEY}",
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
    return data["choices"][0]["message"]["content"]


async def _emergent_complete(provider, model, system, user, max_tokens):
    import uuid
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = (
        LlmChat(api_key=EMERGENT_LLM_KEY, session_id=uuid.uuid4().hex, system_message=system)
        .with_model(provider, model)
    )
    resp = await chat.send_message(UserMessage(text=user))
    if isinstance(resp, str):
        return resp
    return getattr(resp, "content", str(resp))


async def complete(model_key: str, system: str, user: str, max_tokens: int = 8000) -> str:
    cfg = MODELS.get(model_key) or MODELS[DEFAULT_MODEL]
    provider = cfg["provider"]
    model = cfg["model"]
    budget = cfg.get("token_budget", max_tokens)

    if provider == "k2":
        raw = await _k2_complete(model, system, user, budget)
        return strip_reasoning(raw)
    if provider == "nvidia":
        sys_msg = system + "\n\ndetailed thinking off"
        raw = await _openai_compatible(NVIDIA_BASE_URL, NVIDIA_API_KEY, model, sys_msg, user, budget)
        return strip_reasoning(raw)
    if provider in ("gemini", "anthropic"):
        return strip_reasoning(await _emergent_complete(provider, model, system, user, budget))

    raise ValueError(f"Unsupported provider for model {model_key}")
