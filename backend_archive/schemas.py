from datetime import date, datetime
from pydantic import BaseModel, field_validator


class PersonBase(BaseModel):
    name: str
    color: str = "#6366f1"


class PersonCreate(PersonBase):
    pass


class PersonOut(PersonBase):
    id: int

    model_config = {"from_attributes": True}


class CategoryBase(BaseModel):
    name: str
    icon: str = "💰"
    color: str = "#10b981"


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int

    model_config = {"from_attributes": True}


class ExpenseBase(BaseModel):
    amount: float
    description: str
    date: date
    person_id: int
    category_id: int

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Сумма должна быть больше нуля")
        return v


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseOut(ExpenseBase):
    id: int
    created_at: datetime
    person: PersonOut
    category: CategoryOut

    model_config = {"from_attributes": True}


class SummaryByGroup(BaseModel):
    name: str
    color: str
    icon: str = ""
    total: float


class DashboardSummary(BaseModel):
    total: float
    by_category: list[SummaryByGroup]
    by_person: list[SummaryByGroup]
