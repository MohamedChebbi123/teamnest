from datetime import UTC, datetime
from sqlalchemy import Boolean, Column, DateTime,Integer,String,Text,ForeignKey
from sqlalchemy.orm import relationship
from database.connection import Base


class Organization_payments(Base):
    __tablename__="organization_payments"
    subscription_id=Column(Integer,primary_key=True)
    organization_id=Column(Integer,ForeignKey("organization.organization_id"),nullable=False)
    stripe_subscription_id = Column(String)
    stripe_price_id = Column(String)
    status = Column(String)
    created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))

    organization = relationship("Organization", back_populates="payments")

