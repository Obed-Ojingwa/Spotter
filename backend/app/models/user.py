from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base

class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, unique=True, index=True)
    password = Column(String)

    full_name = Column(String)

    role = Column(String)

    city = Column(String)
    state = Column(String)

    is_active = Column(Boolean, default=True)