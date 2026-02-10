from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String
from database.connection import Base


class Users(Base):
    __tablename__="users"
    
    user_id=Column(Integer,primary_key=True)
    first_name=Column(String(20),nullable=False)
    last_name=Column(String(20),nullable=False)
    email=Column(String(50),nullable=False,unique=True, index=True)
    phone_number=Column(String(12),nullable=True,unique=True)
    country=Column(String(50),nullable=True)
    password_hashed=Column(String(100),nullable=False)
    avatar_url=Column(String(200),nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
    user_tag=Column(String(7),nullable=True)
    is_verified=Column(Boolean,default=False)
    verification_code=Column(String(6),nullable=True)
    verification_code_expiry=Column(DateTime,nullable=True)
    profile_completed=Column(Boolean,default=False)
    