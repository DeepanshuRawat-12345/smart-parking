from models import Slot, ParkingLog
from datetime import datetime

def create_slot(db, location):
    slot = Slot(location=location, status="free")
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot

def get_all_slots(db):
    return db.query(Slot).all()

def update_slot_status(db, slot_id, status):
    slot = db.query(Slot).filter(Slot.id == slot_id).first()

    if not slot:
        return {"error": "Slot not found"}

    # Car enters
    if status == "occupied" and slot.status == "free":
        log = ParkingLog(slot_id=slot_id, entry_time=datetime.utcnow())
        db.add(log)

    # Car exits
    elif status == "free" and slot.status == "occupied":
        log = db.query(ParkingLog).filter(
            ParkingLog.slot_id == slot_id,
            ParkingLog.exit_time == None
        ).first()

        if log:
            log.exit_time = datetime.utcnow()

    slot.status = status
    db.commit()

    return {"message": f"Slot {slot_id} updated to {status}"}