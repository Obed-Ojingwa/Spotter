
from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base

class Application(Base):

    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)

    job_id = Column(Integer, ForeignKey("jobs.id"))

    candidate_id = Column(Integer, ForeignKey("users.id"))