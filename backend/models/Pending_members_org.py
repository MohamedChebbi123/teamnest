from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base

class Pending_members_org(Base):
    __tablename__="pending_members_org"
    id=Column(Integer,primary_key=True)
    user_id=Column(Integer,ForeignKey('users.user_id'))
    org_id=Column(Integer,ForeignKey('organization.organization_id'))
    sent_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))
    
    user=relationship("Users",backref="pending_orgs")
    organization=relationship("Organization",backref="pending_members")