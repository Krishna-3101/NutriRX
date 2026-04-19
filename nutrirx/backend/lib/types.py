"""Pydantic models mirroring frontend types (camelCase intake JSON)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class HouseholdMember(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str
    nickname: str
    age: int
    sex: str
    conditions: list[str]
    is_pregnant: bool | None = Field(default=None, alias="isPregnant")
    is_breastfeeding: bool | None = Field(default=None, alias="isBreastfeeding")
    weeks_pregnant: int | None = Field(default=None, alias="weeksPregnant")
    a1c: float | None = None
    systolic_bp: int | None = Field(default=None, alias="systolicBP")
    diastolic_bp: int | None = Field(default=None, alias="diastolicBP")
    ferritin: float | None = None
    ldl: float | None = None


class IntakeForm(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    household: list[HouseholdMember]
    snap_weekly_budget: float = Field(alias="snapWeeklyBudget")
    wic_eligible: bool = Field(alias="wicEligible")
    zip_code: str = Field(alias="zipCode")
    cuisines: str

    @property
    def household_size(self) -> int:
        return len(self.household)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> IntakeForm:
        return cls.model_validate(data)


class AgentUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    agent: str
    status: str
    message: str
    nutrients: dict[str, Any] | None = None
