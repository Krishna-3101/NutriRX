"""Derive coarse weekly nutrition averages from stored plan JSON for history trends."""

from __future__ import annotations

from typing import Any


def _num(n: Any) -> float:
    if n is None:
        return 0.0
    if isinstance(n, (int, float)):
        return float(n)
    if isinstance(n, str):
        try:
            return float("".join(c for c in n if c.isdigit() or c in ".-") or 0)
        except ValueError:
            return 0.0
    return 0.0


def nutrition_avgs_from_plan(plan: dict[str, Any]) -> tuple[float, float, float]:
    """
    Returns (avg_glycemic_proxy, avg_sodium_mg, avg_iron_mg) per meal across the plan.
    Glycemic proxy: carbs_g / 15 (very rough GL contribution) when carbs present, else 0.
    """
    meals = plan.get("meals") or []
    if not meals:
        return (0.0, 0.0, 0.0)
    gly_sum = 0.0
    na_sum = 0.0
    fe_sum = 0.0
    n_meals = 0
    for m in meals:
        if not isinstance(m, dict):
            continue
        n = m.get("nutrition") or {}
        if not isinstance(n, dict):
            continue
        carbs = _num(n.get("carbs_g") or n.get("carbs"))
        na_sum += _num(n.get("sodium_mg") or n.get("sodium"))
        fe_sum += _num(n.get("iron_mg") or n.get("iron"))
        gly_sum += carbs / 15.0 if carbs else 0.0
        n_meals += 1
    if n_meals == 0:
        return (0.0, 0.0, 0.0)
    return (gly_sum / n_meals, na_sum / n_meals, fe_sum / n_meals)
