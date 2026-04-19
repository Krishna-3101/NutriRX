import os
from typing import Any

import httpx

USDA_BASE = "https://api.nal.usda.gov/fdc/v1"


async def search_food(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Search for foods by name. Returns list of food items with fdcId."""
    api_key = os.getenv("USDA_API_KEY")
    if not api_key:
        return []
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{USDA_BASE}/foods/search",
            params={
                "query": query,
                "api_key": api_key,
                "pageSize": limit,
                "dataType": "Survey (FNDDS),SR Legacy,Foundation",
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("foods", [])


async def get_food_nutrients(fdc_id: str) -> dict[str, Any]:
    """Get full nutrient profile for a specific food by fdcId."""
    api_key = os.getenv("USDA_API_KEY")
    if not api_key:
        return {}
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{USDA_BASE}/food/{fdc_id}",
            params={"api_key": api_key},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()


def extract_key_nutrients(food_data: dict[str, Any]) -> dict[str, float]:
    """
    From a raw USDA food detail response, extract the nutrients we care about.
    Returns a flat dict matching our NutrientTargets structure, per 100g.
    """
    nutrient_map = {
        1008: "calories_kcal",
        1003: "protein_g",
        1005: "carbs_g",
        1079: "fiber_g",
        1004: "fat_g",
        1258: "saturated_fat_g",
        1093: "sodium_mg",
        1092: "potassium_mg",
        1087: "calcium_mg",
        1089: "iron_mg",
        1177: "folate_mcg",
        1114: "vitamin_d_iu",
        1404: "omega3_g",
    }
    result: dict[str, float] = {}
    for nutrient in food_data.get("foodNutrients", []):
        nid = nutrient.get("nutrient", {}).get("id")
        if nid is None:
            nid = nutrient.get("nutrientId")
        if nid in nutrient_map:
            key = nutrient_map[nid]
            amount = nutrient.get("amount")
            if amount is None:
                amount = nutrient.get("value", 0)
            result[key] = float(amount or 0)
    return result


async def validate_ingredient_nutrition(ingredient_name: str) -> dict[str, float]:
    """
    Given an ingredient name from a generated recipe,
    search USDA and return its nutrient profile per 100g.
    Returns empty dict if not found.
    """
    foods = await search_food(ingredient_name, limit=1)
    if not foods:
        return {}
    fdc_id = str(foods[0]["fdcId"])
    food_data = await get_food_nutrients(fdc_id)
    return extract_key_nutrients(food_data)
