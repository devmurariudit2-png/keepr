import uuid
from sqlalchemy import Column, String, Numeric, Integer, ForeignKey, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    plan = Column(String, default="trial")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="company", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)
    role = Column(String, default="agent")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="users")
    assigned_leads = relationship("Lead", back_populates="assigned_agent")
    appointments = relationship("Appointment", back_populates="agent", cascade="all, delete-orphan")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    assigned_agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    source = Column(String, default="manual")
    budget = Column(Numeric, nullable=True)
    area = Column(String, nullable=True)
    timeline = Column(String, nullable=True)  # '0-30 days' | '30-90 days' | '90+ days' | 'unspecified'
    bedrooms = Column(Integer, nullable=True)
    mortgage_status = Column(String, nullable=True)  # 'cash' | 'pre_approved' | 'needs_financing' | 'unclear'
    intent = Column(String, nullable=True)  # 'high' | 'medium' | 'low'
    lead_score = Column(Integer, default=0)
    status = Column(String, default="new")  # 'new' | 'qualifying' | 'qualified' | 'appointment_booked' | 'lost'
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="leads")
    assigned_agent = relationship("User", back_populates="assigned_leads")
    messages = relationship("Message", back_populates="lead", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="lead", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String, nullable=False)  # 'lead' | 'ai' | 'agent'
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="messages")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="booked")  # 'booked' | 'completed' | 'no_show' | 'cancelled'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="appointments")
    agent = relationship("User", back_populates="appointments")
