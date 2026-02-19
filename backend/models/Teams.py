from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from database.connection import Base

class Teams(Base):
    __tablename__="teams"
    