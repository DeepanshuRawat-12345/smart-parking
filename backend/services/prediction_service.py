from models import ParkingLog, Slot
from datetime import datetime

def get_average_exit_time(db, slot_id):
    logs = db.query(ParkingLog).filter(
        ParkingLog.slot_id == slot_id,
        ParkingLog.exit_time != None
    ).all()

    if not logs:
        return None

    total_seconds = 0

    for log in logs:
        t = log.exit_time
        total_seconds += t.hour * 3600 + t.minute * 60 + t.second

    avg_seconds = total_seconds / len(logs)

    hours = int(avg_seconds // 3600)
    minutes = int((avg_seconds % 3600) // 60)

    return hours, minutes


def is_slot_likely_free(db, slot_id):
    # 🔹 Step 1: Check real-time sensor (slot status)
    slot = db.query(Slot).filter(Slot.id == slot_id).first()

    if not slot:
        return {"error": "Slot not found"}

    # 🚫 If occupied → definitely not free
    if slot.status == "occupied":
        return {
            "slot_id": slot_id,
            "likely_free": False,
            "reason": "Currently occupied (sensor data)"
        }

    # 🔹 Step 2: Use prediction (only if slot is free)
    avg = get_average_exit_time(db, slot_id)

    if not avg:
        return {
            "slot_id": slot_id,
            "likely_free": False,
            "reason": "Not enough data"
        }

    avg_hour, avg_minute = avg

    now = datetime.utcnow()
    current_minutes = now.hour * 60 + now.minute
    avg_minutes = avg_hour * 60 + avg_minute

    result = current_minutes > avg_minutes

    return {
        "slot_id": slot_id,
        "likely_free": result,
        "reason": "Based on historical pattern"
    }