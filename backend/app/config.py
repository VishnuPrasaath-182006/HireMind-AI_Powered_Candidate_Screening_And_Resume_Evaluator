import os
from pathlib import Path

# Load .env file if available
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=env_path)
    except ImportError:
        pass

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:Vishnu%402006@localhost:5432/resumebuilder")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "learning_super_secret_jwt_key_123456")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    PROJECT_NAME: str = "ResumeBuilder API"
    
    # SmartHire SMTP / Email Configuration for OTP Verification
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "SmartHire <noreply.smarthire@gmail.com>")

settings = Settings()
