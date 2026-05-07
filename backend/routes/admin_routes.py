from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Resident, Guard, Slot

router = APIRouter(prefix="/admin")

# ---------------- RESIDENT ----------------

@router.post("/add-resident")
def add_resident(name: str, flat_number: str, phone: str, db: Session = Depends(get_db)):

    existing = db.query(Resident).filter(Resident.flat_number == flat_number).first()

    if existing:
        return {"message": "Resident already exists for this flat"}

    resident = Resident(name=name, flat_number=flat_number, phone=phone)
    db.add(resident)
    db.commit()

    return {"message": "Resident added"}


@router.get("/residents")
def get_residents(db: Session = Depends(get_db)):
    return db.query(Resident).all()


@router.delete("/delete-resident")
def delete_resident(flat_number: str, db: Session = Depends(get_db)):
    res = db.query(Resident).filter(Resident.flat_number == flat_number).first()

    if not res:
        return {"message": "Resident not found"}

    db.delete(res)
    db.commit()
    return {"message": "Resident deleted"}


# ---------------- GUARD ----------------

@router.post("/add-guard")
def add_guard(name: str, phone: str, db: Session = Depends(get_db)):
    guard = Guard(name=name, phone=phone)
    db.add(guard)
    db.commit()
    return {"message": "Guard added"}


@router.get("/guards")
def get_guards(db: Session = Depends(get_db)):
    return db.query(Guard).all()


@router.delete("/delete-guard")
def delete_guard(id: int, db: Session = Depends(get_db)):
    guard = db.query(Guard).filter(Guard.id == id).first()

    if not guard:
        return {"message": "Guard not found"}

    db.delete(guard)
    db.commit()
    return {"message": "Guard deleted"}


# ---------------- SLOT ----------------

@router.post("/add-slot")
def add_slot(location: str, slot_type: str = "general", db: Session = Depends(get_db)):

    existing = db.query(Slot).filter(Slot.location == location).first()

    if existing:
        return {"message": "Slot already exists"}

    slot = Slot(location=location, slot_type=slot_type, status="free")
    db.add(slot)
    db.commit()

    return {"message": "Slot added"}


@router.delete("/delete-slot")
def delete_slot(id: int, db: Session = Depends(get_db)):

    slot = db.query(Slot).filter(Slot.id == id).first()

    if not slot:
        return {"message": "Slot not found"}

    if slot.status == "occupied":
        return {"message": "Cannot delete occupied slot"}

    db.delete(slot)
    db.commit()

    return {"message": "Slot deleted"}

@router.post("/assign-slot")
def assign_slot(flat_number: str, slot_id: int, db: Session = Depends(get_db)):

    slot = db.query(Slot).filter(Slot.id == slot_id).first()

    if not slot:
        return {"message": "Slot not found"}

    if slot.is_reserved:
        return {"message": "Slot already assigned"}

    slot.owner_flat = flat_number
    slot.is_reserved = True
    slot.slot_type = "resident"

    db.commit()

    return {"message": f"Slot {slot_id} assigned to flat {flat_number}"}

@router.post("/unassign-slot")
def unassign_slot(slot_id: int, db: Session = Depends(get_db)):

    slot = db.query(Slot).filter(Slot.id == slot_id).first()

    if not slot:
        return {"message": "Slot not found"}

    slot.owner_flat = None
    slot.is_reserved = False
    slot.slot_type = "general"

    db.commit()

    return {"message": f"Slot {slot_id} unassigned"}

@router.post("/reset-system")
def reset_system(db: Session = Depends(get_db)):

    # delete all visitor requests
    from models import VisitorRequest
    db.query(VisitorRequest).delete()

    # delete residents
    from models import Resident
    db.query(Resident).delete()

    # delete guards
    from models import Guard
    db.query(Guard).delete()

    # reset all slots
    slots = db.query(Slot).all()
    for s in slots:
        s.status = "free"
        s.owner_flat = None
        s.is_reserved = False
        s.slot_type = "general"

    db.commit()

    return {"message": "System reset complete"}

@router.post("/seed-data")
def seed_data(db: Session = Depends(get_db)):

    from models import Resident, Slot, Guard, VisitorRequest
    import random
    from datetime import datetime

    used_numbers = set()
    used_cars = set()

    def generate_phone():
        while True:
            number = "9" + "".join([str(random.randint(0, 9)) for _ in range(9)])
            if number not in used_numbers:
                used_numbers.add(number)
                return number

    def generate_car_number():
        states = ["UP", "DL", "HR", "PB", "RJ"]
        while True:
            car = f"{random.choice(states)}{random.randint(10,99)}" \
                  f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=2))}" \
                  f"{random.randint(1000,9999)}"
            if car not in used_cars:
                used_cars.add(car)
                return car

    # ---------- CLEAR ----------
    db.query(VisitorRequest).delete()
    db.query(Resident).delete()
    db.query(Guard).delete()
    db.query(Slot).delete()

    # ---------- RESIDENTS ----------
    residents = []
    flat_start = 101

    for i in range(36):
        res = Resident(
            name=f"Resident {i+1}",
            flat_number=str(flat_start + i),
            phone=generate_phone(),
            avg_exit_time="09:00",
            avg_entry_time="18:00",
            car_number=generate_car_number(),
            car_brand="Honda",
            car_model="City"
        )
        residents.append(res)

    db.add_all(residents)

    # ---------- SLOTS ----------
    slots = []

    for i in range(36):
        slots.append(
            Slot(
                location=f"A{i+1}",
                slot_type="resident",
                status="free",
                is_reserved=True,
                owner_flat=str(flat_start + i)
            )
        )

    for i in range(36, 45):
        slots.append(Slot(location=f"A{i+1}", slot_type="visitor", status="free"))

    db.add_all(slots)
    db.commit()

    # ---------- SIMULATE PARKED ----------
    sample = random.sample(residents, 10)

    for res in sample:
        slot = db.query(Slot).filter(Slot.owner_flat == res.flat_number).first()

        if slot:
            slot.status = "occupied"
            slot.sensor_status = "occupied"

            vr = VisitorRequest(
                visitor_name="Resident Parking",
                phone=res.phone,
                flat_number=res.flat_number,
                status="approved",
                vehicle_number=res.car_number,
                car_brand=res.car_brand,
                car_model=res.car_model,
                assigned_slot=slot.id,
                entry_time=datetime.now(),
                verified=True
            )

            db.add(vr)

    # ---------- GUARDS ----------
    guards = [
        Guard(name="Guard 1", phone=generate_phone()),
        Guard(name="Guard 2", phone=generate_phone())
    ]

    db.add_all(guards)

    db.commit()

    return {"message": "System seeded with realistic data"}