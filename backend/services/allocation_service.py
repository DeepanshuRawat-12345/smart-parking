from models import Slot, Visitor
from datetime import datetime
from services.prediction_service import is_slot_likely_free


def allocate_slot(db, user_type="visitor"):

    # 🔥 VISITOR LOGIC
    if user_type == "visitor":

        # 1. Visitor slots FIRST
        visitor_slots = db.query(Slot).filter(
            Slot.status == "free",
            Slot.slot_type == "visitor"
        ).all()

        if visitor_slots:
            return {"slot": visitor_slots[0].id, "type": "visitor"}

        # 2. Fallback to general
        general_slots = db.query(Slot).filter(
            Slot.status == "free",
            Slot.slot_type == "general"
        ).all()

        if general_slots:
            return {"slot": general_slots[0].id, "type": "general"}

    # 🔥 RESIDENT LOGIC
    if user_type == "resident":

        general_slots = db.query(Slot).filter(
            Slot.status == "free",
            Slot.slot_type == "general"
        ).all()

        if general_slots:
            return {"slot": general_slots[0].id, "type": "resident_priority"}

    # 🔹 Prediction (for general slots)
    all_general = db.query(Slot).filter(
        Slot.slot_type == "general"
    ).all()

    for slot in all_general:
        prediction = is_slot_likely_free(db, slot.id)
        if prediction.get("likely_free"):
            return {"slot": slot.id, "type": "predicted"}

    # 🔹 Outside fallback
    outside_slots = db.query(Slot).filter(
        Slot.status == "free",
        Slot.slot_type == "outside"
    ).all()

    if outside_slots:
        return {"slot": outside_slots[0].id, "type": "outside"}

    # 🔹 Full
    return {"slot": None, "type": "full"}


# 🚗 VISITOR ENTRY
def allocate_visitor_slot(db, vehicle_number):

    allocation = allocate_slot(db, user_type="visitor")

    if allocation["slot"] is None:
        return {"message": "Parking Full"}

    visitor = Visitor(
        vehicle_number=vehicle_number,
        slot_id=allocation["slot"],
        entry_time=datetime.utcnow()
    )

    db.add(visitor)

    # mark slot occupied
    slot = db.query(Slot).filter(Slot.id == allocation["slot"]).first()
    slot.status = "occupied"

    db.commit()

    return {
        "visitor_id": visitor.id,
        "slot": allocation["slot"],
        "type": allocation["type"]
    }


# 🚪 VISITOR EXIT
def visitor_exit(db, visitor_id):

    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()

    if not visitor:
        return {"error": "Visitor not found"}

    visitor.exit_time = datetime.utcnow()

    # free slot
    slot = db.query(Slot).filter(Slot.id == visitor.slot_id).first()
    slot.status = "free"

    db.commit()

    return {"message": "Visitor exited, slot freed"}