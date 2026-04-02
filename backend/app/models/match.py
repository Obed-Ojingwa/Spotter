from sqlalchemy import Column, Integer, Float, ForeignKey
from app.database import Base

class Match(Base):

    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)

    job_id = Column(Integer, ForeignKey("jobs.id"))

    candidate_id = Column(Integer, ForeignKey("users.id"))

    score = Column(Float)

    approved_by_spotter = Column(Integer, ForeignKey("users.id"))