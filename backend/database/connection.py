from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os 
from dotenv import load_dotenv

load_dotenv()


DATABASE_URL=os.getenv("DATABASE_URL")

engine=create_engine(DATABASE_URL,echo=False,pool_size=20,max_overflow=30,pool_pre_ping=True)
SessionLocal=sessionmaker(autocommit=False,autoflush=True,bind=engine)
Base=declarative_base()

def connect_databse():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()