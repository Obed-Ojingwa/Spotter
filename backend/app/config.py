from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "SPOTTER"
    APP_ENV: str = "development"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"

    MEILI_URL: str = "http://localhost:7700"
    MEILI_MASTER_KEY: str = "spotter_meili_key"

    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM: str = "noreply@spotter.ng"

    STORAGE_TYPE: str = "local"
    LOCAL_STORAGE_PATH: str = "/app/uploads"

    SEEKER_MATCH_PRICE: int = 50000
    ORG_UNLOCK_PRICE: int = 1500000
    ORG_JOB_POST_PRICE: int = 500000
    AGENT_PRO_MONTHLY: int = 300000
    POINTS_TO_NAIRA: int = 2000

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
