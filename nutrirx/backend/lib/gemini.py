from __future__ import annotations

import os

import google.genai as genai

_PLACEHOLDER_KEYS = {
    "",
    "your_gemini_api_key",
    "replace_me",
    "changeme",
}

_FATAL_ERROR_FRAGMENTS = (
    "api key not valid",
    "invalid api key",
    "api_key_invalid",
    "invalid_argument",
    "model not found",
    "not found for api version",
    "is not found",
    "unsupported model",
    "unauthenticated",
    "permission_denied",
)


def get_gemini_api_key() -> str:
    api_key = (os.getenv("GEMINI_API_KEY", "") or "").strip()
    if api_key.lower() in _PLACEHOLDER_KEYS:
        raise RuntimeError(
            "Gemini API key is missing or invalid. Set GEMINI_API_KEY in nutrirx/backend/.env."
        )
    return api_key


def make_gemini_client() -> genai.Client:
    return genai.Client(api_key=get_gemini_api_key())


def is_fatal_gemini_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(fragment in text for fragment in _FATAL_ERROR_FRAGMENTS)


def user_facing_generation_error(exc: Exception) -> str:
    if is_fatal_gemini_error(exc):
        return (
            "Gemini API key is invalid or missing. Update GEMINI_API_KEY in "
            "nutrirx/backend/.env and try again."
        )
    return f"Plan generation failed: {exc!s}"
