"""Helpers for Gemini 429 / free-tier quota handling."""

from __future__ import annotations

import logging
import re
import time

logger = logging.getLogger(__name__)


def is_quota_exceeded_error(exc: BaseException) -> bool:
    """True when the API rejected the call due to rate limits or daily free-tier quota."""
    t = str(exc).lower()
    return (
        "resource_exhausted" in t
        or " 429" in t
        or "429 " in t
        or "too many requests" in t
        or "quota exceeded" in t
        or "generate_content_free_tier" in t
    )


def quota_retry_delay_seconds(exc: BaseException, default: float = 22.0) -> float:
    """Parse 'Please retry in 20.3s' from Google error text; cap wait at 120s."""
    m = re.search(r"retry in ([\d.]+)\s*s", str(exc), re.IGNORECASE)
    if m:
        return min(120.0, float(m.group(1)) + 2.0)
    return default


def sleep_before_gemini_retry(exc: BaseException, attempt: int, max_attempts: int) -> None:
    """Sleep after a failed attempt (not after the final failure)."""
    if attempt >= max_attempts - 1:
        return
    if is_quota_exceeded_error(exc):
        delay = quota_retry_delay_seconds(exc)
        logger.warning("Gemini quota/rate limit (429). Waiting %.1fs before retry %s/%s...", delay, attempt + 2, max_attempts)
        time.sleep(delay)
    else:
        time.sleep(2.0)
