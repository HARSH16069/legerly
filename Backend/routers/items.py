from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from deps import get_db
from models import Item, StockMovement
from schemas import ItemCreate

router = APIRouter(prefix="/items", tags=["Items"])


def get_stock(db: Session, item_id: int) -> Decimal:
    total_in, total_out = db.query(
        func.coalesce(func.sum(case((StockMovement.movement_type == "in", StockMovement.quantity), else_=0)), 0),
        func.coalesce(func.sum(case((StockMovement.movement_type == "out", StockMovement.quantity), else_=0)), 0),
    ).filter(StockMovement.item_id == item_id).one()
    return total_in - total_out


@router.post("")
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    if item.item_code:
        existing = db.query(Item).filter(Item.item_code == item.item_code).first()
        if existing:
            raise HTTPException(400, "Item code already exists")

    new_item = Item(
        name=item.name,
        item_code=item.item_code,
        unit=item.unit,
        selling_price=item.selling_price,
        cost_price=item.cost_price,
        tax_rate=item.tax_rate,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.get("")
def get_items(db: Session = Depends(get_db)):
    return db.query(Item).all()


@router.get("/{item_id}/stock")
def get_item_stock(item_id: int, db: Session = Depends(get_db)):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    return {"item": item.name, "stock": get_stock(db, item_id)}
