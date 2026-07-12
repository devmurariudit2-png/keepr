import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from .models import Company, User, Lead, Message, Appointment
from .auth import get_password_hash

def seed_db():
    db = SessionLocal()
    try:
        # Clear existing data in reverse order of foreign keys
        print("Clearing database...")
        db.query(Appointment).delete()
        db.query(Message).delete()
        db.query(Lead).delete()
        db.query(User).delete()
        db.query(Company).delete()
        db.commit()

        print("Creating demo company...")
        company = Company(
            id=uuid.uuid4(),
            name="Keepr Real Estate Development",
            plan="trial"
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        print("Creating demo user...")
        user = User(
            id=uuid.uuid4(),
            company_id=company.id,
            name="Sarah Broker",
            email="sarah@keepr.ai",
            password_hash=get_password_hash("password123"),
            role="owner"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        print("Creating mock leads...")
        
        # Lead 1: New Lead
        lead1 = Lead(
            company_id=company.id,
            assigned_agent_id=user.id,
            name="John Doe",
            phone="+1 555-0192",
            email="john.doe@email.com",
            source="website",
            budget=450000,
            area=None,
            timeline=None,
            bedrooms=None,
            mortgage_status=None,
            intent=None,
            lead_score=0,
            status="new",
            created_at=datetime.utcnow()
        )
        db.add(lead1)

        # Lead 2: Qualifying Lead
        lead2 = Lead(
            company_id=company.id,
            assigned_agent_id=user.id,
            name="Alice Smith",
            phone="+1 555-0143",
            email="alice.s@email.com",
            source="facebook",
            budget=600000,
            area="Downtown",
            timeline="30-90 days",
            bedrooms=2,
            mortgage_status="unclear",
            intent="medium",
            lead_score=45,
            status="qualifying",
            created_at=datetime.utcnow() - timedelta(hours=5)
        )
        db.add(lead2)

        # Lead 3: Qualified Lead (High Score)
        lead3 = Lead(
            company_id=company.id,
            assigned_agent_id=user.id,
            name="Bob Johnson",
            phone="+1 555-0177",
            email="bob.j@email.com",
            source="csv_import",
            budget=850000,
            area="Marina Heights",
            timeline="0-30 days",
            bedrooms=3,
            mortgage_status="pre_approved",
            intent="high",
            lead_score=92,
            status="qualified",
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        db.add(lead3)

        # Lead 4: Appointment Booked Lead
        lead4 = Lead(
            company_id=company.id,
            assigned_agent_id=user.id,
            name="Charlie Brown",
            phone="+1 555-0155",
            email="charlie.b@email.com",
            source="whatsapp",
            budget=350000,
            area="Green Valley",
            timeline="0-30 days",
            bedrooms=2,
            mortgage_status="cash",
            intent="high",
            lead_score=85,
            status="appointment_booked",
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(lead4)

        # Lead 5: Lost Lead
        lead5 = Lead(
            company_id=company.id,
            assigned_agent_id=user.id,
            name="Diana Prince",
            phone="+1 555-0188",
            email="diana.p@email.com",
            source="manual",
            budget=200000,
            area="Suburbs",
            timeline="90+ days",
            bedrooms=1,
            mortgage_status="needs_financing",
            intent="low",
            lead_score=23,
            status="lost",
            created_at=datetime.utcnow() - timedelta(days=3)
        )
        db.add(lead5)

        db.commit()
        db.refresh(lead4)

        print("Creating mock appointment...")
        appointment = Appointment(
            lead_id=lead4.id,
            agent_id=user.id,
            scheduled_at=datetime.utcnow() + timedelta(days=1, hours=2),
            status="booked"
        )
        db.add(appointment)

        print("Creating mock messages...")
        msg1 = Message(
            lead_id=lead2.id,
            sender="lead",
            content="Hi, I'm looking for a 2 bedroom apartment in the Downtown area."
        )
        msg2 = Message(
            lead_id=lead2.id,
            sender="ai",
            content="Hello Alice! I can help you with that. What is your budget range for this purchase?"
        )
        msg3 = Message(
            lead_id=lead2.id,
            sender="lead",
            content="Around 600k maximum."
        )
        db.add_all([msg1, msg2, msg3])

        db.commit()
        print("Database seeded successfully!")
        print("--- DEMO LOGIN DETAILS ---")
        print("Email:    sarah@keepr.ai")
        print("Password: password123")
        print("---------------------------")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
