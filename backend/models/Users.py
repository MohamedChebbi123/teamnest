from datetime import UTC, datetime
from sqlalchemy import Column, DateTime,Integer,String
from database.connection import Base


class Users(Base):
    __tablename__="users"
    
    user_id=Column(Integer,primary_key=True)
    first_name=Column(String(20),nullable=False)
    last_name=Column(String(20),nullable=False)
    email=Column(String(50),nullable=False,unique=True, index=True)
    phone_number=Column(String(12),nullable=False,unique=True)
    country=Column(String(50),nullable=False)
    password_hashed=Column(String(100),nullable=False)
    avatar_url=Column(String(200),nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(UTC))
    last_login_at = Column(DateTime, nullable=True)
    
    