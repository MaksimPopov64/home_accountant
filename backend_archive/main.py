from datetime import date
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Home Accountant")
app.mount("/static", StaticFiles(directory="static"), name="static")


# ── Seed default data ────────────────────────────────────────────────────────

def seed_defaults(db: Session):
    if db.query(models.Category).count() == 0:
        defaults = [
            models.Category(name="Продукты",      icon="🛒", color="#10b981"),
            models.Category(name="Транспорт",     icon="🚗", color="#3b82f6"),
            models.Category(name="Кафе и рестораны", icon="🍕", color="#f59e0b"),
            models.Category(name="Здоровье",      icon="💊", color="#ef4444"),
            models.Category(name="Развлечения",   icon="🎮", color="#8b5cf6"),
            models.Category(name="Одежда",        icon="👕", color="#ec4899"),
            models.Category(name="Коммунальные",  icon="🏠", color="#6b7280"),
            models.Category(name="Прочее",        icon="📦", color="#94a3b8"),
        ]
        db.add_all(defaults)
        db.commit()


@app.on_event("startup")
def startup():
    db = next(get_db())
    seed_defaults(db)


# ── Static pages ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return FileResponse("static/index.html")


# ── Persons ──────────────────────────────────────────────────────────────────

@app.get("/api/persons", response_model=list[schemas.PersonOut])
def list_persons(db: Session = Depends(get_db)):
    return db.query(models.Person).all()


@app.post("/api/persons", response_model=schemas.PersonOut, status_code=201)
def create_person(data: schemas.PersonCreate, db: Session = Depends(get_db)):
    if db.query(models.Person).filter_by(name=data.name).first():
        raise HTTPException(400, "Человек с таким именем уже существует")
    person = models.Person(**data.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@app.put("/api/persons/{person_id}", response_model=schemas.PersonOut)
def update_person(person_id: int, data: schemas.PersonCreate, db: Session = Depends(get_db)):
    person = db.get(models.Person, person_id)
    if not person:
        raise HTTPException(404, "Не найден")
    person.name = data.name
    person.color = data.color
    db.commit()
    db.refresh(person)
    return person


@app.delete("/api/persons/{person_id}", status_code=204)
def delete_person(person_id: int, db: Session = Depends(get_db)):
    person = db.get(models.Person, person_id)
    if not person:
        raise HTTPException(404, "Не найден")
    db.delete(person)
    db.commit()


# ── Categories ───────────────────────────────────────────────────────────────

@app.get("/api/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()


@app.post("/api/categories", response_model=schemas.CategoryOut, status_code=201)
def create_category(data: schemas.CategoryCreate, db: Session = Depends(get_db)):
    if db.query(models.Category).filter_by(name=data.name).first():
        raise HTTPException(400, "Категория с таким названием уже существует")
    cat = models.Category(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@app.put("/api/categories/{cat_id}", response_model=schemas.CategoryOut)
def update_category(cat_id: int, data: schemas.CategoryCreate, db: Session = Depends(get_db)):
    cat = db.get(models.Category, cat_id)
    if not cat:
        raise HTTPException(404, "Не найдена")
    cat.name = data.name
    cat.icon = data.icon
    cat.color = data.color
    db.commit()
    db.refresh(cat)
    return cat


@app.delete("/api/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.get(models.Category, cat_id)
    if not cat:
        raise HTTPException(404, "Не найдена")
    db.delete(cat)
    db.commit()


# ── Expenses ─────────────────────────────────────────────────────────────────

@app.get("/api/expenses", response_model=list[schemas.ExpenseOut])
def list_expenses(
    person_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(models.Expense).options(
        joinedload(models.Expense.person),
        joinedload(models.Expense.category),
    )
    if person_id:
        q = q.filter(models.Expense.person_id == person_id)
    if category_id:
        q = q.filter(models.Expense.category_id == category_id)
    if date_from:
        q = q.filter(models.Expense.date >= date_from)
    if date_to:
        q = q.filter(models.Expense.date <= date_to)
    return q.order_by(models.Expense.date.desc(), models.Expense.id.desc()).limit(limit).all()


@app.post("/api/expenses", response_model=schemas.ExpenseOut, status_code=201)
def create_expense(data: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    if not db.get(models.Person, data.person_id):
        raise HTTPException(404, "Человек не найден")
    if not db.get(models.Category, data.category_id):
        raise HTTPException(404, "Категория не найдена")
    expense = models.Expense(**data.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return db.query(models.Expense).options(
        joinedload(models.Expense.person),
        joinedload(models.Expense.category),
    ).get(expense.id)


@app.put("/api/expenses/{expense_id}", response_model=schemas.ExpenseOut)
def update_expense(expense_id: int, data: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    expense = db.get(models.Expense, expense_id)
    if not expense:
        raise HTTPException(404, "Расход не найден")
    for field, value in data.model_dump().items():
        setattr(expense, field, value)
    db.commit()
    return db.query(models.Expense).options(
        joinedload(models.Expense.person),
        joinedload(models.Expense.category),
    ).get(expense_id)


@app.delete("/api/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.get(models.Expense, expense_id)
    if not expense:
        raise HTTPException(404, "Расход не найден")
    db.delete(expense)
    db.commit()


# ── Dashboard ─────────────────────────────────────────────────────────────────

@app.get("/api/dashboard", response_model=schemas.DashboardSummary)
def dashboard(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Expense)
    if date_from:
        q = q.filter(models.Expense.date >= date_from)
    if date_to:
        q = q.filter(models.Expense.date <= date_to)

    total = q.with_entities(func.sum(models.Expense.amount)).scalar() or 0.0

    by_cat_rows = (
        q.join(models.Category)
        .with_entities(
            models.Category.name,
            models.Category.color,
            models.Category.icon,
            func.sum(models.Expense.amount).label("total"),
        )
        .group_by(models.Category.id)
        .order_by(func.sum(models.Expense.amount).desc())
        .all()
    )

    by_person_rows = (
        q.join(models.Person)
        .with_entities(
            models.Person.name,
            models.Person.color,
            func.sum(models.Expense.amount).label("total"),
        )
        .group_by(models.Person.id)
        .order_by(func.sum(models.Expense.amount).desc())
        .all()
    )

    return schemas.DashboardSummary(
        total=total,
        by_category=[
            schemas.SummaryByGroup(name=r.name, color=r.color, icon=r.icon, total=r.total)
            for r in by_cat_rows
        ],
        by_person=[
            schemas.SummaryByGroup(name=r.name, color=r.color, total=r.total)
            for r in by_person_rows
        ],
    )
