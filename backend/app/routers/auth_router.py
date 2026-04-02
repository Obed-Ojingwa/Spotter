from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.utils.security import hash_password

router = APIRouter()

@router.post("/register")

def register(email: str, password: str, role: str, db: Session = Depends(get_db)):

    user = User(
        email=email,
        password=hash_password(password),
        role=role
    )

    db.add(user)

    db.commit()

    return {"message": "User created"}