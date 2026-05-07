from fastapi import FastAPI, Depends, File, UploadFile
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

# OCR disabled for hosted deployment (too large for free tier)
# from paddleocr import PaddleOCR
import os
import re

# ocr = PaddleOCR(use_angle_cls=True, lang='en')

# Import routes
from routes import user_routes
from routes import visitor_routes
from routes import admin_routes

# Import DB + Models
from database import engine, get_db, SessionLocal
from models import Base, Slot

# -------------------- APP INIT --------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Include routes
app.include_router(user_routes.router)
app.include_router(visitor_routes.router)
app.include_router(admin_routes.router)

# -------------------- CREATE SLOTS --------------------

@app.post("/create-slots")
def create_slots(db: Session = Depends(get_db)):

    if db.query(Slot).first():
        return {"message": "Slots already exist"}

    for i in range(1, 3):
        db.add(Slot(id=i, location=f"A{i}", status="free", slot_type="visitor"))

    db.add(Slot(id=3, location="A3", status="free", slot_type="resident", is_reserved=True, owner_flat="1907"))
    db.add(Slot(id=4, location="A4", status="free", slot_type="resident", is_reserved=True, owner_flat="1908"))
    db.add(Slot(id=5, location="A5", status="free", slot_type="general"))

    db.commit()
    return {"message": "Slots created"}

# -------------------- VIEW SLOTS --------------------

@app.get("/slots")
def get_slots(db: Session = Depends(get_db)):
    return db.query(Slot).all()

# -------------------- ALLOCATE SLOT --------------------

@app.get("/allocate-slot")
def allocate_slot(user_type: str, db: Session = Depends(get_db)):

    if user_type == "visitor":
        slot = db.query(Slot).filter(
            Slot.id == 3,
            Slot.status == "free"
        ).first()
    else:
        slot = db.query(Slot).filter(
            Slot.status == "free"
        ).first()

    if not slot:
        return {"slot": None, "type": "full"}

    slot.status = "occupied"
    db.commit()

    return {"slot": slot.id, "type": user_type}

# -------------------- RELEASE SLOT --------------------

@app.post("/release-slot")
def release_slot(slot_id: int, db: Session = Depends(get_db)):

    slot = db.query(Slot).filter(Slot.id == slot_id).first()

    if not slot:
        return {"message": "Slot not found"}

    slot.status = "free"
    db.commit()

    return {"message": f"Slot {slot_id} released"}

# -------------------- PARKING STATUS --------------------

@app.get("/parking-status")
def parking_status(db: Session = Depends(get_db)):
    return db.query(Slot).all()

# -------------------- AUTO SEED --------------------

@app.on_event("startup")
def seed_data():
    db = SessionLocal()

    if db.query(Slot).first():
        db.close()
        return

    db.add(Slot(id=1, location="A1", status="free", slot_type="visitor"))
    db.add(Slot(id=2, location="A2", status="free", slot_type="visitor"))
    db.add(Slot(id=3, location="A3", status="free", slot_type="resident", is_reserved=True, owner_flat="1907"))
    db.add(Slot(id=4, location="A4", status="free", slot_type="resident", is_reserved=True, owner_flat="1908"))
    db.add(Slot(id=5, location="A5", status="free", slot_type="general"))

    db.commit()
    db.close()

# -------------------- OCR ROUTE --------------------

@app.post("/ocr-plate")
async def ocr_plate(file: UploadFile = File(...)):
    return {"status": "disabled", "message": "OCR is disabled on the hosted version. Use locally for plate scanning."}