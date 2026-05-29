from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os 
from dotenv import load_dotenv

_running_in_managed_host = bool(os.getenv("PORT"))

if not _running_in_managed_host:
    load_dotenv()


DATABASE_URL=os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")
DB_POOL_SIZE=int(os.getenv("DB_POOL_SIZE","50"))
DB_MAX_OVERFLOW=int(os.getenv("DB_MAX_OVERFLOW","100"))
DB_POOL_RECYCLE=int(os.getenv("DB_POOL_RECYCLE","1800"))

engine=create_engine(
    DATABASE_URL,
    echo=False,
    pool_size=DB_POOL_SIZE,
    max_overflow=DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=DB_POOL_RECYCLE,
)
SessionLocal=sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base=declarative_base()

def connect_databse():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()