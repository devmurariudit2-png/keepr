import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Lead, Message, Appointment, User

def seed_demo_data(db: Session, company_id: uuid.UUID, agent_id: uuid.UUID):
    # 1. Clear existing company leads, messages, and appointments
    lead_ids_query = db.query(Lead.id).filter(Lead.company_id == company_id).subquery()
    
    db.query(Message).filter(Message.lead_id.in_(lead_ids_query)).delete(synchronize_session=False)
    db.query(Appointment).filter(Appointment.lead_id.in_(lead_ids_query)).delete(synchronize_session=False)
    db.query(Lead).filter(Lead.company_id == company_id).delete(synchronize_session=False)
    db.commit()

    # Base date for timestamps
    now = datetime.now()

    # --- DEFINE 20 realistic buyer personas and transcripts ---

    # 1-4. Status: 'new'
    new_leads = [
        {"name": "Emily Carter", "email": "emily.c@gmail.com", "phone": "+1 555-0210", "source": "facebook"},
        {"name": "Michael Adams", "email": "madams@outlook.com", "phone": "+1 555-0211", "source": "website"},
        {"name": "Sophia Martinez", "email": "sophia.m@gmail.com", "phone": "+1 555-0212", "source": "instagram"},
        {"name": "James Taylor", "email": "jtaylor@yahoo.com", "phone": "+1 555-0213", "source": "manual"}
    ]

    for data in new_leads:
        lead = Lead(
            company_id=company_id,
            assigned_agent_id=agent_id,
            name=data["name"],
            phone=data["phone"],
            email=data["email"],
            source=data["source"],
            status="new",
            lead_score=0,
            created_at=now - timedelta(hours=2)
        )
        db.add(lead)

    # 5-8. Status: 'qualifying'
    qualifying_leads = [
        {
            "name": "Chloe Green",
            "email": "chloe.g@gmail.com",
            "phone": "+1 555-0214",
            "source": "facebook",
            "budget": 450000.0,
            "area": "Downtown",
            "timeline": "30-90 days",
            "bedrooms": None,
            "mortgage_status": "unclear",
            "intent": "medium",
            "score": 45,
            "messages": [
                {"sender": "lead", "content": "Hi, I saw your listing for the Downtown high-rise. Is it still available?"},
                {"sender": "ai", "content": "Yes, it is! I'd love to help you find the right home there. What is your typical budget range for this purchase?"},
                {"sender": "lead", "content": "I am looking around $450k, hoping to move in about two months."}
            ]
        },
        {
            "name": "William Harris",
            "email": "wharris@gmail.com",
            "phone": "+1 555-0215",
            "source": "website",
            "budget": None,
            "area": "Marina Heights",
            "timeline": "unspecified",
            "bedrooms": 2,
            "mortgage_status": "unclear",
            "intent": "low",
            "score": 15,
            "messages": [
                {"sender": "lead", "content": "Hello, looking for a 2 bed apartment in Marina Heights. Any listings?"},
                {"sender": "ai", "content": "Hello! Yes, we have several beautiful 2-bedroom layouts in Marina Heights. What is your budget range for a 2-bedroom home?"}
            ]
        },
        {
            "name": "Olivia Robinson",
            "email": "olivia.r@gmail.com",
            "phone": "+1 555-0216",
            "source": "instagram",
            "budget": 300000.0,
            "area": None,
            "timeline": "unspecified",
            "bedrooms": None,
            "mortgage_status": "unclear",
            "intent": "medium",
            "score": 20,
            "messages": [
                {"sender": "lead", "content": "I want to buy a place, budget is $300k. What neighborhoods do you recommend?"},
                {"sender": "ai", "content": "That is a great budget! Depending on what you prefer, we have options in Downtown, Green Valley, or the Suburbs. Which area or neighborhood do you prefer?"}
            ]
        },
        {
            "name": "Liam Clark",
            "email": "liam.c@outlook.com",
            "phone": "+1 555-0217",
            "source": "whatsapp",
            "budget": None,
            "area": "Green Valley",
            "timeline": "0-30 days",
            "bedrooms": None,
            "mortgage_status": "unclear",
            "intent": "high",
            "score": 30,
            "messages": [
                {"sender": "lead", "content": "Need to move to Green Valley immediately. Can you show me what you have?"},
                {"sender": "ai", "content": "I'd be happy to show you some immediate options! To match the best units, what is your budget range for the purchase?"}
            ]
        }
    ]

    for data in qualifying_leads:
        lead = Lead(
            company_id=company_id,
            assigned_agent_id=agent_id,
            name=data["name"],
            phone=data["phone"],
            email=data["email"],
            source=data["source"],
            status="qualifying",
            budget=data["budget"],
            area=data["area"],
            timeline=data["timeline"],
            bedrooms=data["bedrooms"],
            mortgage_status=data["mortgage_status"],
            intent=data["intent"],
            lead_score=data["score"],
            last_message_at=now - timedelta(minutes=45),
            created_at=now - timedelta(days=1)
        )
        db.add(lead)
        db.flush() # get lead id
        
        # Seed message history
        for m_idx, msg in enumerate(data["messages"]):
            db_msg = Message(
                lead_id=lead.id,
                sender=msg["sender"],
                content=msg["content"],
                created_at=now - timedelta(days=1) + timedelta(minutes=5 * m_idx)
            )
            db.add(db_msg)

    # 9-12. Status: 'qualified'
    qualified_leads = [
        {
            "name": "Isabella Lewis",
            "email": "isabella.l@gmail.com",
            "phone": "+1 555-0218",
            "source": "facebook",
            "budget": 650000.0,
            "area": "Downtown",
            "timeline": "0-30 days",
            "bedrooms": 3,
            "mortgage_status": "pre_approved",
            "intent": "high",
            "score": 100,
            "messages": [
                {"sender": "lead", "content": "Hi, interested in a 3 bedroom home in Downtown. Can you help?"},
                {"sender": "ai", "content": "I can certainly help you with that! What is your budget range for a 3-bedroom home?"},
                {"sender": "lead", "content": "Around $650,000. I am pre-approved for a mortgage already."},
                {"sender": "ai", "content": "Fantastic! When are you planning to buy or move?"},
                {"sender": "lead", "content": "As soon as possible, within 30 days."},
                {"sender": "ai", "content": "Thank you so much for providing those details! I am connecting you with one of our expert agents right now to help you book your visit."}
            ]
        },
        {
            "name": "Ethan Walker",
            "email": "ewalker@gmail.com",
            "phone": "+1 555-0219",
            "source": "website",
            "budget": 350000.0,
            "area": "Marina Heights",
            "timeline": "30-90 days",
            "bedrooms": 2,
            "mortgage_status": "cash",
            "intent": "medium",
            "score": 85,
            "messages": [
                {"sender": "lead", "content": "Looking for a 2 bedroom place in Marina Heights. I have cash ready."},
                {"sender": "ai", "content": "Cash ready is excellent! What is your budget range for a 2-bedroom home?"},
                {"sender": "lead", "content": "My budget is about $350k."},
                {"sender": "ai", "content": "Got it. When are you looking to buy or make the move?"},
                {"sender": "lead", "content": "Probably in about 2 months, 60 days from now."},
                {"sender": "ai", "content": "Thank you so much for providing those details! I am connecting you with one of our expert agents right now to help you book your visit."}
            ]
        },
        {
            "name": "Mia Hall",
            "email": "miahall@outlook.com",
            "phone": "+1 555-0220",
            "source": "whatsapp",
            "budget": 180000.0,
            "area": "Suburbs",
            "timeline": "0-30 days",
            "bedrooms": 2,
            "mortgage_status": "pre_approved",
            "intent": "high",
            "score": 75,
            "messages": [
                {"sender": "lead", "content": "Hi, I need a 2 bedroom home in the Suburbs. Moving within 3 weeks."},
                {"sender": "ai", "content": "We can definitely find you a great place in the Suburbs! What is your budget range?"},
                {"sender": "lead", "content": "I am looking around $180,000."},
                {"sender": "ai", "content": "Perfect. Are you a cash buyer, or do you have a mortgage pre-approval in place?"},
                {"sender": "lead", "content": "I'm pre-approved already."},
                {"sender": "ai", "content": "Thank you so much for providing those details! I am connecting you with one of our expert agents right now to help you book your visit."}
            ]
        },
        {
            "name": "Alexander Young",
            "email": "ayoung@gmail.com",
            "phone": "+1 555-0221",
            "source": "manual",
            "budget": 500000.0,
            "area": "Green Valley",
            "timeline": "30-90 days",
            "bedrooms": 3,
            "mortgage_status": "needs_financing",
            "intent": "medium",
            "score": 68,
            "messages": [
                {"sender": "lead", "content": "I'm looking for a 3 bed villa in Green Valley. Timeline is about 3 months."},
                {"sender": "ai", "content": "Green Valley has wonderful villas! What is your budget range for a 3-bedroom villa?"},
                {"sender": "lead", "content": "Up to $500k."},
                {"sender": "ai", "content": "Are you a cash buyer, or will you need mortgage financing?"},
                {"sender": "lead", "content": "I will need financing, currently talking to banks."},
                {"sender": "ai", "content": "Thank you so much for providing those details! I am connecting you with one of our expert agents right now to help you book your visit."}
            ]
        }
    ]

    for data in qualified_leads:
        lead = Lead(
            company_id=company_id,
            assigned_agent_id=agent_id,
            name=data["name"],
            phone=data["phone"],
            email=data["email"],
            source=data["source"],
            status="qualified",
            budget=data["budget"],
            area=data["area"],
            timeline=data["timeline"],
            bedrooms=data["bedrooms"],
            mortgage_status=data["mortgage_status"],
            intent=data["intent"],
            lead_score=data["score"],
            last_message_at=now - timedelta(hours=1),
            created_at=now - timedelta(days=2)
        )
        db.add(lead)
        db.flush()
        
        for m_idx, msg in enumerate(data["messages"]):
            db_msg = Message(
                lead_id=lead.id,
                sender=msg["sender"],
                content=msg["content"],
                created_at=now - timedelta(days=2) + timedelta(minutes=5 * m_idx)
            )
            db.add(db_msg)

    # 13-16. Status: 'appointment_booked'
    booked_leads = [
        {"name": "Charlotte Allen", "email": "callen@gmail.com", "phone": "+1 555-0222", "budget": 600000.0, "area": "Downtown", "score": 100},
        {"name": "Benjamin Wright", "email": "bwright@gmail.com", "phone": "+1 555-0223", "budget": 450000.0, "area": "Marina Heights", "score": 90},
        {"name": "Amelia Scott", "email": "ascott@gmail.com", "phone": "+1 555-0224", "budget": 280000.0, "area": "Green Valley", "score": 80},
        {"name": "Lucas King", "email": "lking@gmail.com", "phone": "+1 555-0225", "budget": 350000.0, "area": "Suburbs", "score": 75}
    ]

    for idx, data in enumerate(booked_leads):
        lead = Lead(
            company_id=company_id,
            assigned_agent_id=agent_id,
            name=data["name"],
            phone=data["phone"],
            email=data["email"],
            source="website",
            status="appointment_booked",
            budget=data["budget"],
            area=data["area"],
            timeline="0-30 days",
            bedrooms=3,
            mortgage_status="pre_approved",
            intent="high",
            lead_score=data["score"],
            last_message_at=now - timedelta(hours=6),
            created_at=now - timedelta(days=3)
        )
        db.add(lead)
        db.flush()

        # Seed appointment
        appt = Appointment(
            lead_id=lead.id,
            agent_id=agent_id,
            scheduled_at=now + timedelta(days=idx + 1, hours=2),
            status="booked",
            created_at=now - timedelta(hours=6)
        )
        db.add(appt)

        # Seed single msg history
        msg = Message(
            lead_id=lead.id,
            sender="lead",
            content="Thanks! The appointment is set on the calendar.",
            created_at=now - timedelta(hours=6)
        )
        db.add(msg)

    # 17-18. Status: 'needs_human'
    escalated_leads = [
        {
            "name": "Daniel Baker",
            "email": "dbaker@outlook.com",
            "phone": "+1 555-0226",
            "source": "facebook",
            "budget": 400000.0,
            "area": "Downtown",
            "timeline": "30-90 days",
            "bedrooms": 2,
            "mortgage_status": "unclear",
            "intent": "medium",
            "score": 50,
            "messages": [
                {"sender": "lead", "content": "Hi, looking for a 2 bed in Downtown for about $400k."},
                {"sender": "ai", "content": "Hello! I can help you find a 2-bedroom home in Downtown. What is your moving timeline?"},
                {"sender": "lead", "content": "In about 2 months. But look, I want to talk to a real person. Stop using this AI bot."},
            ]
        },
        {
            "name": "Harper Hill",
            "email": "hhill@gmail.com",
            "phone": "+1 555-0227",
            "source": "instagram",
            "budget": 500000.0,
            "area": "Marina Heights",
            "timeline": "0-30 days",
            "bedrooms": 3,
            "mortgage_status": "pre_approved",
            "intent": "high",
            "score": 90,
            "messages": [
                {"sender": "lead", "content": "Hi, urgent request: looking for a 3 bed in Marina for $500k. I am pre-approved."},
                {"sender": "ai", "content": "That sounds like a great search! I'd love to help you book a visit. Can you confirm if you have any preferred building?"},
                {"sender": "lead", "content": "This is ridiculous, the site keeps crashing when I click. Can someone call me right now?"}
            ]
        }
    ]

    for data in escalated_leads:
        lead = Lead(
            company_id=company_id,
            assigned_agent_id=agent_id,
            name=data["name"],
            phone=data["phone"],
            email=data["email"],
            source=data["source"],
            status="needs_human",
            budget=data["budget"],
            area=data["area"],
            timeline=data["timeline"],
            bedrooms=data["bedrooms"],
            mortgage_status=data["mortgage_status"],
            intent=data["intent"],
            lead_score=data["score"],
            last_message_at=now - timedelta(minutes=15),
            created_at=now - timedelta(hours=12)
        )
        db.add(lead)
        db.flush()

        for m_idx, msg in enumerate(data["messages"]):
            db_msg = Message(
                lead_id=lead.id,
                sender=msg["sender"],
                content=msg["content"],
                created_at=now - timedelta(hours=12) + timedelta(minutes=5 * m_idx)
            )
            db.add(db_msg)

    # 19-20. Status: 'lost'
    lost_leads = [
        {
            "name": "Henry Lopez",
            "email": "hlopez@gmail.com",
            "phone": "+1 555-0228",
            "source": "website",
            "budget": 100000.0,
            "area": "Downtown",
            "timeline": "90+ days",
            "bedrooms": 3,
            "mortgage_status": "needs_financing",
            "intent": "low",
            "score": 25,
            "messages": [
                {"sender": "lead", "content": "Looking for a 3 bedroom villa in Downtown for $100k. Need long-term financing."},
                {"sender": "ai", "content": "Thank you for reaching out. A 3-bedroom villa in Downtown for $100k is below the current market pricing. Are you flexible on area or budget?"},
                {"sender": "lead", "content": "No, that is my absolute limit and I can only buy in Downtown. I cannot go higher."}
            ]
        },
        {
            "name": "Evelyn Nelson",
            "email": "enelson@outlook.com",
            "phone": "+1 555-0229",
            "source": "facebook",
            "budget": 250000.0,
            "area": "Suburbs",
            "timeline": "unspecified",
            "bedrooms": 1,
            "mortgage_status": "unclear",
            "intent": "low",
            "score": 15,
            "messages": [
                {"sender": "lead", "content": "Hi, just browsing for 1 bed in Suburbs. Not looking to buy anytime soon."},
                {"sender": "ai", "content": "No problem! We'd be happy to show you some options for reference. What is your budget range?"},
                {"sender": "lead", "content": "Around $250k but I am not interested in buying right now, please do not contact me again."}
            ]
        }
    ]

    for data in lost_leads:
        lead = Lead(
            company_id=company_id,
            assigned_agent_id=agent_id,
            name=data["name"],
            phone=data["phone"],
            email=data["email"],
            source=data["source"],
            status="lost",
            budget=data["budget"],
            area=data["area"],
            timeline=data["timeline"],
            bedrooms=data["bedrooms"],
            mortgage_status=data["mortgage_status"],
            intent=data["intent"],
            lead_score=data["score"],
            last_message_at=now - timedelta(days=2),
            created_at=now - timedelta(days=4)
        )
        db.add(lead)
        db.flush()

        for m_idx, msg in enumerate(data["messages"]):
            db_msg = Message(
                lead_id=lead.id,
                sender=msg["sender"],
                content=msg["content"],
                created_at=now - timedelta(days=4) + timedelta(minutes=5 * m_idx)
            )
            db.add(db_msg)

    db.commit()
    print("Successfully seeded 20 realistic demo leads!")
