from sqlalchemy import Column, Integer, String, DateTime, Boolean, DateTime
from database import Base
from datetime import datetime


class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    location = Column(String)

    status = Column(String, default="free")   # free / occupied
    slot_type = Column(String, default="general")  # visitor/resident/general
    is_reserved = Column(Boolean, default=False)
    owner_flat = Column(String, nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True)
    password = Column(String)
    role = Column(String)


class ParkingLog(Base):
    __tablename__ = "parking_logs"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer)
    entry_time = Column(DateTime, default=datetime.utcnow)
    exit_time = Column(DateTime, nullable=True)


class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String)
    slot_id = Column(Integer)
    entry_time = Column(DateTime, default=datetime.utcnow)
    exit_time = Column(DateTime, nullable=True)

class VisitorRequest(Base):
    __tablename__ = "visitor_requests"

    id = Column(Integer, primary_key=True, index=True)
    visitor_name = Column(String)
    phone = Column(String)
    flat_number = Column(String)

    # Request status
    status = Column(String, default="pending")  # pending/approved/rejected

    # Vehicle details
    car_brand = Column(String, nullable=True)
    car_model = Column(String, nullable=True)
    vehicle_number = Column(String, nullable=True)

    # Guard verification
    verified = Column(Boolean, default=False)

    entry_time = Column(DateTime, nullable=True)
    exit_time = Column(DateTime, nullable=True)
    assigned_slot = Column(Integer, nullable=True)
    max_exit_time = Column(DateTime, nullable=True)

class Resident(Base):
    __tablename__ = "residents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    flat_number = Column(String, unique=True)
    phone = Column(String)

    avg_exit_time = Column(String)   # e.g. "08:00"
    avg_entry_time = Column(String)  # e.g. "20:00"
    car_number = Column(String, unique=True)
    car_brand = Column(String)
    car_model = Column(String)

class Guard(Base):
    __tablename__ = "guards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    phone = Column(String)