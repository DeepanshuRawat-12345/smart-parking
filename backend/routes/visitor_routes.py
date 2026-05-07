from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import VisitorRequest, Slot, Resident
from datetime import datetime, timedelta
from paddleocr import PaddleOCR
import numpy as np
import cv2

router = APIRouter()

# 🔥 OCR INIT
ocr = PaddleOCR(use_angle_cls=True, lang='en')


# ---------------- CREATE REQUEST ----------------
@router.post("/request-visit")
def request_visit(visitor_name: str, phone: str, flat_number: str, db: Session = Depends(get_db)):
    request = VisitorRequest(
        visitor_name=visitor_name,
        phone=phone,
        flat_number=flat_number,
        status="pending"
    )
    db.add(request)
    db.commit()
    return {"message": "Request sent", "status": "pending"}


# ---------------- VIEW REQUESTS ----------------
@router.get("/requests")
def get_requests(db: Session = Depends(get_db)):
    return db.query(VisitorRequest).all()


# ---------------- APPROVE REQUEST ----------------
@router.post("/approve-request")
def approve_request(request_id: int, resident_flat: str, db: Session = Depends(get_db)):

    request = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()

    if not request:
        return {"message": "Request not found"}

    # 🔥 Only correct resident can approve
    if request.flat_number != resident_flat:
        return {"message": "Unauthorized: Wrong resident"}

    request.status = "approved"
    db.commit()

    return {"message": "Request approved"}


# ---------------- REJECT REQUEST ----------------
@router.post("/reject-request")
def reject_request(request_id: int, db: Session = Depends(get_db)):

    request = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()

    if not request:
        return {"message": "Request not found"}

    request.status = "rejected"
    db.commit()

    return {"message": "Request rejected"}


# ---------------- ADD VEHICLE ----------------
@router.post("/add-vehicle")
def add_vehicle(request_id: int, car_brand: str, car_model: str, vehicle_number: str, db: Session = Depends(get_db)):

    request = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()

    if not request:
        return {"message": "Request not found"}

    if request.status != "approved":
        return {"message": "Request not approved yet"}

    request.car_brand = car_brand
    request.car_model = car_model
    request.vehicle_number = vehicle_number

    db.commit()

    return {"message": "Vehicle details added"}


# ---------------- ML LOGIC ----------------
def is_resident_out(resident):
    now = datetime.now().strftime("%H:%M")

    if resident.avg_exit_time > resident.avg_entry_time:
        return not (resident.avg_entry_time <= now <= resident.avg_exit_time)

    return resident.avg_exit_time <= now <= resident.avg_entry_time


# ---------------- VERIFY ENTRY ----------------
@router.post("/verify-entry")
def verify_entry(request_id: int, db: Session = Depends(get_db)):

    request = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()

    if not request:
        return {"message": "Request not found"}

    if request.status != "approved":
        return {"message": "Not approved"}

    if not request.vehicle_number:
        return {"message": "Vehicle missing"}

    # 1. Own slot
    slot = db.query(Slot).filter(
        Slot.owner_flat == request.flat_number,
        Slot.status == "free",
        Slot.sensor_status == "empty"
    ).first()

    # 2. ML + IoT logic
    if not slot:
        residents = db.query(Resident).all()

        for res in residents:
            if is_resident_out(res):
                temp = db.query(Slot).filter(
                    Slot.owner_flat == res.flat_number,
                    Slot.status == "free",
                    Slot.sensor_status == "empty"
                ).first()

                if temp:
                    slot = temp
                    break

    # 3. Visitor slot
    if not slot:
        slot = db.query(Slot).filter(
            Slot.status == "free",
            Slot.slot_type == "visitor"
        ).first()

    # 4. General slot
    if not slot:
        slot = db.query(Slot).filter(
            Slot.status == "free",
            Slot.slot_type == "general"
        ).first()

    # 5. Outside slot
    if not slot:
        slot = db.query(Slot).filter(
            Slot.status == "free",
            Slot.slot_type == "outside"
        ).first()

    if not slot:
        return {"message": "No slots available"}

    # Assign slot
    slot.status = "occupied"
    slot.sensor_status = "occupied"

    request.assigned_slot = slot.id
    request.entry_time = datetime.now()
    request.max_exit_time = datetime.now() + timedelta(hours=2)
    request.verified = True

    db.commit()

    return {"message": "Entry allowed", "slot": slot.location}


# ---------------- EXIT ----------------
@router.post("/exit")
def exit_vehicle(request_id: int, db: Session = Depends(get_db)):

    request = db.query(VisitorRequest).filter(VisitorRequest.id == request_id).first()

    if not request:
        return {"message": "Request not found"}

    if not request.assigned_slot:
        return {"message": "No slot assigned"}

    if request.exit_time:
        return {"message": "Already exited"}

    slot = db.query(Slot).filter(Slot.id == request.assigned_slot).first()

    if not slot:
        return {"message": "Slot not found"}

    slot.status = "free"
    slot.sensor_status = "empty"

    request.exit_time = datetime.now()

    duration = request.exit_time - request.entry_time

    db.commit()

    return {
        "message": "Vehicle exited",
        "slot_freed": slot.location,
        "duration": str(duration)
    }


# ---------------- OCR PLATE ----------------
@router.post("/scan-plate")
async def scan_plate(file: UploadFile = File(...), db: Session = Depends(get_db)):

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    result = ocr.ocr(img)

    plate = ""
    for line in result:
        for word in line:
            plate += word[1][0]

    plate = "".join(e for e in plate if e.isalnum())

    resident = db.query(Resident).filter(
        Resident.car_number.contains(plate)
    ).first()

    if resident:
        return {
            "detected_plate": plate,
            "resident": resident.name,
            "flat": resident.flat_number
        }

    return {
        "detected_plate": plate,
        "message": "No matching resident"
    }


# ---------------- IDENTIFY ----------------
@router.get("/identify-resident")
def identify_resident(car_number: str, db: Session = Depends(get_db)):

    resident = db.query(Resident).filter(
        Resident.car_number == car_number
    ).first()

    if not resident:
        return {"message": "Resident not found"}

    slot = db.query(Slot).filter(
        Slot.owner_flat == resident.flat_number
    ).first()

    return {
        "name": resident.name,
        "flat_number": resident.flat_number,
        "car_number": resident.car_number,
        "slot": slot.location if slot else None
    }


# ---------------- SENSOR UPDATE ----------------
@router.post("/update-sensor")
def update_sensor(slot_id: int, status: str, db: Session = Depends(get_db)):

    slot = db.query(Slot).filter(Slot.id == slot_id).first()

    if not slot:
        return {"message": "Slot not found"}

    slot.sensor_status = status
    slot.status = "occupied" if status == "occupied" else "free"

    db.commit()

    return {"message": "Sensor updated"}

