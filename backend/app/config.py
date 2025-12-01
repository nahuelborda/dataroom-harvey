import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory (for local development)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


def get_database_url():
    """Get database URL, fixing Render's postgres:// to postgresql://"""
    url = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/dataroom")
    # Render uses postgres:// but SQLAlchemy needs postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dataroom-demo-secret-key-2024")

    # Database (using psycopg3 driver)
    SQLALCHEMY_DATABASE_URI = get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Google OAuth - HARDCODED FOR DEMO
    GOOGLE_CLIENT_ID = os.getenv(
        "GOOGLE_CLIENT_ID",
        "432188631796-nl55sss6tcqtoiramkv01ggqlrlqi6aa.apps.googleusercontent.com"
    )
    GOOGLE_CLIENT_SECRET = os.getenv(
        "GOOGLE_CLIENT_SECRET",
        "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"
    )
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

    # Frontend - will be set by FRONTEND_ORIGIN env var in production
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    # Storage
    STORAGE_PATH = os.getenv("STORAGE_PATH", "./data")

    # JWT
    JWT_SECRET = os.getenv("JWT_SECRET", "dataroom-jwt-demo-secret-2024")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

