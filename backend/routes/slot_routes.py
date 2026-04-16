from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from services.slot_service import create_slot, get_all_slots
from services.slot_service import update_slot_status
from services.prediction_service import is_slot_likely_free
from services.allocation_service import allocate_slot

router = APIRouter()

@router.post("/create-slot")
def add_slot(location: str, db: Session = Depends(get_db)):
    return create_slot(db, location)

@router.get("/slots")
def read_slots(db: Session = Depends(get_db)):
    return get_all_slots(db)

@router.post("/update-slot")
def update_slot(slot_id: int, status: str, db: Session = Depends(get_db)):
    return update_slot_status(db, slot_id, status)

@router.get("/predict/{slot_id}")
def predict_slot(slot_id: int, db: Session = Depends(get_db)):
    return is_slot_likely_free(db, slot_id)

@router.get("/allocate-slot")
def get_slot(user_type: str = "visitor", db: Session = Depends(get_db)):
    return allocate_slot(db, user_type)