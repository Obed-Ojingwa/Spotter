from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.database import Base

class Job(Base):

    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String)

    description = Column(Text)

    city = Column(String)

    state = Column(String)

    tech_stack = Column(String)

    experience_required = Column(Integer)

    organization_id = Column(Integer, ForeignKey("users.id"))