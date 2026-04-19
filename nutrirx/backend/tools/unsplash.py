import os
from typing import Optional

import httpx

UNSPLASH_BASE = "https://api.unsplash.com"


async def fetch_food_image(query: str) -> Optional[str]:
    """
    Returns the URL of the first Unsplash photo for the given food query.
    Returns None if the API key is not set or request fails.
    """
    key = os.getenv("UNSPLASH_ACCESS_KEY")
    if not key:
        return None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{UNSPLASH_BASE}/search/photos",
                headers={"Authorization": f"Client-ID {key}"},
                params={"query": query, "per_page": 1, "orientation": "landscape"},
                timeout=5.0,
            )
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            if results:
                return results[0]["urls"]["regular"]
    except Exception:
        pass
    return None
