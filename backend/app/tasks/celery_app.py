from celery import Celery
from app.config import settings

celery_app = Celery(
    "spotter",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.matching_tasks",
        "app.tasks.points_tasks",
        "app.tasks.report_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Lagos",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)
