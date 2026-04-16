from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User

router = APIRouter()

# ---------------- CREATE USER ----------------
@router.post("/create-user")
def create_user(username: str, password: str, role: str, db: Session = Depends(get_db)):
    user = User(username=username, password=password, role=role)
    db.add(user)
    db.commit()
    return {"message": f"{role} created"}

# ---------------- LOGIN ----------------
@router.post("/login")
def login(username: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == username,
        User.password == password
    ).first()

    if not user:
        return {"message": "Invalid credentials"}

    return {
        "message": "Login successful",
        "role": user.role,
        "username": user.username
    }