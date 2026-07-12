import csv
import io
from uuid import UUID
from datetime import datetime, date, time
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from .database import get_db, engine
from .models import Company, User, Lead, Appointment, Message
from .auth import verify_password, create_access_token, get_current_user, get_password_hash
from .ai import generate_qualification_reply, check_for_human_escalation
from .seed_demo import seed_demo_data

import os

app = FastAPI(title="Keepr API", version="0.1")

# CORS — in prod set FRONTEND_URL=https://keepr.vercel.app in Railway env vars
_frontend_url = os.getenv("FRONTEND_URL", "*")
_origins = [_frontend_url] if _frontend_url != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class LeadCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = "manual"
    budget: Optional[float] = None
    area: Optional[str] = None
    timeline: Optional[str] = None
    bedrooms: Optional[int] = None
    mortgage_status: Optional[str] = None

class LeadResponse(BaseModel):
    id: UUID
    company_id: UUID
    assigned_agent_id: Optional[UUID] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    source: str
    budget: Optional[float] = None
    area: Optional[str] = None
    timeline: Optional[str] = None
    bedrooms: Optional[int] = None
    mortgage_status: Optional[str] = None
    intent: Optional[str] = None
    lead_score: int
    status: str
    last_message_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardSummaryResponse(BaseModel):
    todays_leads: int
    qualified: int
    appointments: int
    pending: int
    conversion_rate: float

class MessageCreate(BaseModel):
    sender: str  # 'lead' | 'agent'
    content: str

class MessageResponse(BaseModel):
    id: UUID
    lead_id: UUID
    sender: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class MessageAndLeadResponse(BaseModel):
    ai_reply: Optional[str] = None
    lead: LeadResponse

class InboundLeadPayload(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    source: Optional[str] = "zapier"

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    assigned_agent_id: Optional[UUID] = None
    status: Optional[str] = None
    budget: Optional[float] = None
    area: Optional[str] = None
    timeline: Optional[str] = None
    bedrooms: Optional[int] = None
    mortgage_status: Optional[str] = None

class AppointmentCreate(BaseModel):
    lead_id: UUID
    scheduled_at: datetime

class AppointmentResponse(BaseModel):
    id: UUID
    lead_id: UUID
    agent_id: UUID
    scheduled_at: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@app.post("/auth/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not user.password_hash or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "company_id": str(user.company_id),
        }
    }

# Also support OAuth2 Form login for FastAPI Swagger UI
@app.post("/auth/token", response_model=Token, include_in_schema=False)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "company_id": str(user.company_id),
        }
    }

@app.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company_id = current_user.company_id
    today_start = datetime.combine(date.today(), time.min)

    # 1. Today's leads: total leads created today for this company
    todays_leads = db.query(Lead).filter(
        Lead.company_id == company_id,
        Lead.created_at >= today_start
    ).count()

    # 2. Qualified leads: total qualified leads for this company
    qualified = db.query(Lead).filter(
        Lead.company_id == company_id,
        Lead.status == "qualified"
    ).count()

    # 3. Appointments: total appointments booked for this company
    appointments = db.query(Appointment).join(User).filter(
        User.company_id == company_id
    ).count()

    # 4. Pending: leads in 'new' or 'qualifying' status
    pending = db.query(Lead).filter(
        Lead.company_id == company_id,
        Lead.status.in_(["new", "qualifying"])
    ).count()

    # 5. Conversion Rate: qualified / total leads
    total_leads = db.query(Lead).filter(Lead.company_id == company_id).count()
    conversion_rate = 0.0
    if total_leads > 0:
        # conversion rate is qualified leads / total leads
        conversion_rate = qualified / total_leads

    return {
        "todays_leads": todays_leads,
        "qualified": qualified,
        "appointments": appointments,
        "pending": pending,
        "conversion_rate": round(conversion_rate, 2),
    }

@app.get("/leads", response_model=List[LeadResponse])
def list_leads(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company_id = current_user.company_id
    query = db.query(Lead).filter(Lead.company_id == company_id)
    if status:
        query = query.filter(Lead.status == status)
    
    # Order by creation date desc
    return query.order_by(Lead.created_at.desc()).all()

@app.post("/leads", response_model=LeadResponse)
def create_lead(lead_in: LeadCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = Lead(
        company_id=current_user.company_id,
        assigned_agent_id=current_user.id,
        name=lead_in.name,
        phone=lead_in.phone,
        email=lead_in.email,
        source=lead_in.source,
        budget=lead_in.budget,
        area=lead_in.area,
        timeline=lead_in.timeline,
        bedrooms=lead_in.bedrooms,
        mortgage_status=lead_in.mortgage_status,
        status="new",
        lead_score=0
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

# --- Day 2 Endpoints & Helpers ---

def compute_lead_score(lead: Lead) -> int:
    score = 0
    # 1. budget_fit (0–30)
    if lead.budget:
        if lead.budget >= 300000:
            score += 30
        elif lead.budget >= 150000:
            score += 20
        else:
            score += 10
            
    # 2. timeline_urgency (0–25)
    timeline_scores = {
        "0-30 days": 25,
        "30-90 days": 15,
        "90+ days": 5,
        "unspecified": 0
    }
    score += timeline_scores.get(lead.timeline, 0)
    
    # 3. financing_ready (0–15)
    financing_scores = {
        "cash": 15,
        "pre_approved": 15,
        "needs_financing": 8,
        "unclear": 0
    }
    score += financing_scores.get(lead.mortgage_status, 0)
    
    # 4. area_specificity (0–10)
    if lead.area:
        if len(lead.area) > 3:  # named neighborhood
            score += 10
        else:  # general city or undecided
            score += 5
            
    # 5. stated_intent (0–20)
    intent_scores = {
        "high": 20,
        "medium": 10,
        "low": 0
    }
    score += intent_scores.get(lead.intent, 0)
    
    return min(score, 100)

@app.get("/leads/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == current_user.company_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@app.patch("/leads/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: UUID, lead_in: LeadUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == current_user.company_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = lead_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)
    
    # Recalculate score if any scoring field was updated
    if any(field in update_data for field in ["budget", "timeline", "mortgage_status", "area", "intent"]):
        lead.lead_score = compute_lead_score(lead)

    db.commit()
    db.refresh(lead)
    return lead

@app.get("/leads/{lead_id}/messages", response_model=List[MessageResponse])
def get_lead_messages(lead_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == current_user.company_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return db.query(Message).filter(Message.lead_id == lead_id).order_by(Message.created_at.asc()).all()

@app.post("/leads/{lead_id}/messages", response_model=MessageAndLeadResponse)
def send_lead_message(
    lead_id: UUID,
    msg_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == current_user.company_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # 1. Save incoming message
    new_msg = Message(
        lead_id=lead.id,
        sender=msg_in.sender,
        content=msg_in.content
    )
    db.add(new_msg)
    
    # Update lead's last message time
    lead.last_message_at = func.now()
    
    # 2. Check for human escalation based on sentiment/keywords
    if msg_in.sender == "lead" and check_for_human_escalation(msg_in.content):
        lead.status = "needs_human"
        
    db.commit()
    db.refresh(lead)

    ai_reply_text = None

    # 3. Trigger AI reply if sender was 'lead' and status is not already needs_human / lost / appointment_booked
    if msg_in.sender == "lead" and lead.status not in ["needs_human", "lost", "appointment_booked"]:
        # Update status to qualifying if it was new
        if lead.status == "new":
            lead.status = "qualifying"
            db.commit()
            db.refresh(lead)

        # Get full conversation transcript
        transcript_msgs = db.query(Message).filter(Message.lead_id == lead.id).order_by(Message.created_at.asc()).all()
        history = [{"sender": m.sender, "content": m.content} for m in transcript_msgs]
        
        # Call Gemini AI qualification engine
        ai_res = generate_qualification_reply(history)
        
        # If AI chose to submit qualification (function call triggered)
        if ai_res.get("qualification_data"):
            q_data = ai_res["qualification_data"]
            # Update lead fields
            lead.budget = q_data["budget"]
            lead.area = q_data["area"]
            lead.timeline = q_data["timeline"]
            lead.mortgage_status = q_data["mortgage_status"]
            lead.bedrooms = q_data["bedrooms"]
            lead.intent = q_data["intent"]
            
            # Compute lead score
            lead.lead_score = compute_lead_score(lead)
            lead.status = "qualified"
            
            # Save AI final closing message
            ai_reply_text = "Thank you so much for providing those details! I am connecting you with one of our expert agents right now to help you book your visit."
            ai_msg = Message(
                lead_id=lead.id,
                sender="ai",
                content=ai_reply_text
            )
            db.add(ai_msg)
            
        else:
            # AI replied with a text message to continue qualification
            ai_reply_text = ai_res["reply"]
            ai_msg = Message(
                lead_id=lead.id,
                sender="ai",
                content=ai_reply_text
            )
            db.add(ai_msg)
        
        db.commit()
        db.refresh(lead)
    
    return {
        "ai_reply": ai_reply_text,
        "lead": lead
    }

@app.post("/leads/import")
async def import_leads_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        contents = await file.read()
        csv_text = contents.decode("utf-8")
        csv_file = io.StringIO(csv_text)
        
        # Read with DictReader
        reader = csv.DictReader(csv_file)
        
        # Normalize headers to lowercase, stripped
        normalized_fieldnames = []
        if reader.fieldnames:
            normalized_fieldnames = [name.strip().lower().replace(" ", "_") for name in reader.fieldnames]
            reader.fieldnames = normalized_fieldnames
        
        imported_count = 0
        leads_added = []
        
        for row in reader:
            # Map values with default fallbacks
            name = row.get("name") or row.get("lead_name") or "Unnamed Lead"
            phone = row.get("phone") or row.get("phone_number") or None
            email = row.get("email") or row.get("email_address") or None
            
            # Budget
            budget = None
            budget_raw = row.get("budget")
            if budget_raw:
                try:
                    # Strip commas and currency symbols
                    clean_budget = budget_raw.replace("$", "").replace(",", "").strip()
                    budget = float(clean_budget)
                except ValueError:
                    pass

            # Bedrooms
            bedrooms = None
            bedrooms_raw = row.get("bedrooms") or row.get("beds")
            if bedrooms_raw:
                try:
                    bedrooms = int(bedrooms_raw.strip())
                except ValueError:
                    pass
            
            area = row.get("area") or row.get("neighborhood") or None
            timeline = row.get("timeline") or "unspecified"
            mortgage_status = row.get("mortgage_status") or row.get("financing") or "unclear"
            source = row.get("source") or "csv_import"
            
            # Create Lead model
            lead = Lead(
                company_id=current_user.company_id,
                assigned_agent_id=current_user.id,
                name=name,
                phone=phone,
                email=email,
                source=source,
                budget=budget,
                area=area,
                timeline=timeline,
                bedrooms=bedrooms,
                mortgage_status=mortgage_status,
                status="new",
                lead_score=0
            )
            
            # Compute score from CSV parsed fields
            lead.lead_score = compute_lead_score(lead)
            
            # If all 5 fields exist, set status to qualified immediately
            if budget and area and timeline != "unspecified" and mortgage_status != "unclear" and bedrooms:
                lead.status = "qualified"

            db.add(lead)
            imported_count += 1
            
        db.commit()
        return {
            "status": "success",
            "imported_count": imported_count,
            "message": f"Successfully imported {imported_count} leads."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse CSV file: {str(e)}"
        )

@app.post("/appointments", response_model=AppointmentResponse)
def book_appointment(
    appt_in: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == appt_in.lead_id, Lead.company_id == current_user.company_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # Create Appointment
    appointment = Appointment(
        lead_id=lead.id,
        agent_id=current_user.id,
        scheduled_at=appt_in.scheduled_at,
        status="booked"
    )
    db.add(appointment)
    
    # Update Lead status to appointment_booked
    lead.status = "appointment_booked"
    
    db.commit()
    db.refresh(appointment)
    return appointment

@app.get("/appointments", response_model=List[AppointmentResponse])
def list_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Appointment).join(User).filter(
        User.company_id == current_user.company_id
    ).order_by(Appointment.scheduled_at.asc()).all()

@app.post("/demo/reset")
def reset_demo_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        seed_demo_data(db, current_user.company_id, current_user.id)
        return {
            "status": "success",
            "message": "Successfully reset database to clean 20-lead demo state."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset demo data: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Public Demo Endpoints (no auth required) — Section 9.2 self-demo widget
# ---------------------------------------------------------------------------

# We use a fixed "public demo" company sentinel UUID so all demo leads are
# isolated from real agent data.  The value is deterministic so the frontend
# doesn't need to know about it.
PUBLIC_DEMO_COMPANY_ID = UUID("00000000-0000-0000-0000-000000000001")
PUBLIC_DEMO_AGENT_ID   = UUID("00000000-0000-0000-0000-000000000002")


class PublicLeadCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


@app.post("/demo/public-lead", response_model=LeadResponse)
def create_public_demo_lead(lead_in: PublicLeadCreate, db: Session = Depends(get_db)):
    """
    Create an anonymous demo lead for the landing-page self-demo widget.
    No authentication required.  Returns the new lead so the widget can
    POST subsequent messages to /public/leads/{id}/messages.
    """
    # Ensure the sentinel company & agent rows exist (idempotent upsert)
    demo_company = db.query(Company).filter(Company.id == PUBLIC_DEMO_COMPANY_ID).first()
    if not demo_company:
        demo_company = Company(id=PUBLIC_DEMO_COMPANY_ID, name="Keepr Public Demo")
        db.add(demo_company)

    demo_agent = db.query(User).filter(User.id == PUBLIC_DEMO_AGENT_ID).first()
    if not demo_agent:
        import secrets
        demo_agent = User(
            id=PUBLIC_DEMO_AGENT_ID,
            company_id=PUBLIC_DEMO_COMPANY_ID,
            email="demo@keepr.internal",
            name="Demo Agent",
            password_hash=secrets.token_hex(32),
            role="agent",
        )
        db.add(demo_agent)

    lead = Lead(
        company_id=PUBLIC_DEMO_COMPANY_ID,
        assigned_agent_id=PUBLIC_DEMO_AGENT_ID,
        name=lead_in.name,
        phone=lead_in.phone,
        email=lead_in.email,
        source="demo",
        status="new",
        lead_score=0,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@app.post("/public/leads/{lead_id}/messages", response_model=MessageAndLeadResponse)
def public_send_message(
    lead_id: UUID,
    msg_in: MessageCreate,
    db: Session = Depends(get_db),
):
    """
    Public (no-auth) message endpoint used by the landing-page demo widget.
    Identical business logic to the authenticated endpoint, but restricted
    to leads that belong to the public demo company.
    """
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.company_id == PUBLIC_DEMO_COMPANY_ID,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Demo lead not found")

    # Save incoming message
    new_msg = Message(lead_id=lead.id, sender=msg_in.sender, content=msg_in.content)
    db.add(new_msg)
    lead.last_message_at = func.now()

    if msg_in.sender == "lead" and check_for_human_escalation(msg_in.content):
        lead.status = "needs_human"

    db.commit()
    db.refresh(lead)

    ai_reply_text = None

    if msg_in.sender == "lead" and lead.status not in ["needs_human", "lost", "appointment_booked"]:
        if lead.status == "new":
            lead.status = "qualifying"
            db.commit()
            db.refresh(lead)

        transcript_msgs = db.query(Message).filter(Message.lead_id == lead.id).order_by(Message.created_at.asc()).all()
        history = [{"sender": m.sender, "content": m.content} for m in transcript_msgs]

        ai_res = generate_qualification_reply(history)

        if ai_res.get("qualification_data"):
            q_data = ai_res["qualification_data"]
            lead.budget = q_data["budget"]
            lead.area = q_data["area"]
            lead.timeline = q_data["timeline"]
            lead.mortgage_status = q_data["mortgage_status"]
            lead.bedrooms = q_data["bedrooms"]
            lead.intent = q_data["intent"]
            lead.lead_score = compute_lead_score(lead)
            lead.status = "qualified"
            ai_reply_text = "Great — you've been fully qualified! A Keepr agent will be in touch shortly to book your visit. 🎉"
        else:
            ai_reply_text = ai_res["reply"]

        ai_msg = Message(lead_id=lead.id, sender="ai", content=ai_reply_text)
        db.add(ai_msg)
        db.commit()
        db.refresh(lead)

    return {"message": new_msg, "lead": lead, "ai_reply": ai_reply_text}


import urllib.request
import json

def send_evolution_whatsapp(phone: str, text: str):
    """
    Helper to send a WhatsApp message using the self-hosted Evolution API.
    """
    api_url = os.getenv("EVOLUTION_API_URL")
    api_key = os.getenv("EVOLUTION_API_KEY")
    instance = os.getenv("EVOLUTION_INSTANCE_NAME")
    
    if not api_url or not api_key or not instance:
        print("[Evolution API] Config missing. Message output skipped:")
        print(f"To {phone}: {text}")
        return
        
    payload = {
        "number": phone,
        "options": {
            "delay": 1000,
            "presence": "composing"
        },
        "textMessage": {
            "text": text
        }
    }
    
    url = f"{api_url.rstrip('/')}/message/sendText/{instance}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "apikey": api_key,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            print(f"[Evolution API] Outbound message sent successfully: {response.status}")
    except Exception as e:
        print(f"[Evolution API] Failed to send outbound message: {e}")


@app.post("/webhooks/evolution-api")
async def evolution_webhook(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Webhook receiver for self-hosted Evolution API.
    Handles the messages.upsert event for incoming WhatsApp chats.
    """
    event = payload.get("event")
    if event != "messages.upsert":
        return {"status": "ignored_event", "event": event}
        
    data = payload.get("data", {})
    key = data.get("key", {})
    
    # 1. Ignore if sent by the bot/me to avoid infinite loops
    if key.get("fromMe", False):
        return {"status": "ignored_self"}
        
    # 2. Extract sender phone number and message body
    remote_jid = key.get("remoteJid", "")
    if not remote_jid or "@" not in remote_jid:
        return {"status": "ignored_invalid_jid"}
        
    phone = remote_jid.split("@")[0]
    
    message_obj = data.get("message", {})
    body = message_obj.get("conversation") or message_obj.get("extendedTextMessage", {}).get("text") or ""
    body = body.strip()
    if not body:
        return {"status": "ignored_empty_message"}
        
    push_name = data.get("pushName") or f"Lead {phone}"
    
    # 3. Find default company and broker (Sarah) to assign the lead
    company = db.query(Company).first()
    if not company:
        company = Company(id=PUBLIC_DEMO_COMPANY_ID, name="Keepr Public Demo")
        db.add(company)
        db.commit()
        db.refresh(company)
        
    agent = db.query(User).filter(User.company_id == company.id).first()
    agent_id = agent.id if agent else None
    
    # 4. Find or create lead by phone number
    lead = db.query(Lead).filter(Lead.phone == phone).first()
    if not lead:
        lead = Lead(
            company_id=company.id,
            assigned_agent_id=agent_id,
            name=push_name,
            phone=phone,
            source="whatsapp",
            status="new",
            lead_score=0
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        
    # 5. Save lead message
    new_msg = Message(lead_id=lead.id, sender="lead", content=body)
    db.add(new_msg)
    lead.last_message_at = func.now()
    
    reply_text = None
    
    if lead.status not in ["needs_human", "lost", "appointment_booked"]:
        if lead.status == "new":
            lead.status = "qualifying"
            
        db.commit()
        db.refresh(lead)
        
        # Check human escalation keyword
        if check_for_human_escalation(body):
            lead.status = "needs_human"
            db.commit()
            db.refresh(lead)
            reply_text = "I've flagged this for a human agent to review. They will get back to you shortly."
        else:
            # 6. Generate AI response
            transcript_msgs = db.query(Message).filter(Message.lead_id == lead.id).order_by(Message.created_at.asc()).all()
            history = [{"sender": m.sender, "content": m.content} for m in transcript_msgs]
            
            ai_res = generate_qualification_reply(history)
            
            if ai_res.get("qualification_data"):
                q_data = ai_res["qualification_data"]
                lead.budget = q_data["budget"]
                lead.area = q_data["area"]
                lead.timeline = q_data["timeline"]
                lead.mortgage_status = q_data["mortgage_status"]
                lead.bedrooms = q_data["bedrooms"]
                lead.intent = q_data["intent"]
                lead.lead_score = compute_lead_score(lead)
                lead.status = "qualified"
                
                # Cal.com booking link
                reply_text = "Great — you've been fully qualified! A Keepr agent will contact you shortly. Please book your visit here: https://cal.com/keepr-demo/15min 🎉"
            else:
                reply_text = ai_res["reply"]
                
        if reply_text:
            # Save AI reply to transcript
            ai_msg = Message(lead_id=lead.id, sender="ai", content=reply_text)
            db.add(ai_msg)
            db.commit()
            db.refresh(lead)
            
            # Send outgoing WhatsApp reply via Evolution API
            send_evolution_whatsapp(phone, reply_text)
            
    return {
        "status": "processed",
        "lead_id": str(lead.id),
        "lead_status": lead.status,
        "ai_reply": reply_text
    }


@app.post("/webhooks/ingest")
async def ingest_lead_webhook(
    payload: InboundLeadPayload,
    db: Session = Depends(get_db)
):
    """
    Webhook receiver for multi-source lead ingestion.
    Creates a new lead and triggers an automated welcome/qualification WhatsApp outreach.
    """
    # 1. Clean phone number (strip whitespace, dashes, country code prefix if needed)
    clean_phone = "".join(filter(str.isdigit, payload.phone))
    if not clean_phone:
        raise HTTPException(status_code=400, detail="Invalid phone number format")
        
    # 2. Find default company and broker (Sarah) to assign the lead
    company = db.query(Company).first()
    if not company:
        company = Company(id=PUBLIC_DEMO_COMPANY_ID, name="Keepr Public Demo")
        db.add(company)
        db.commit()
        db.refresh(company)
        
    agent = db.query(User).filter(User.company_id == company.id).first()
    agent_id = agent.id if agent else None
    
    # 3. Check if lead already exists to prevent duplicate outreach
    lead = db.query(Lead).filter(Lead.phone == clean_phone).first()
    if lead:
        return {
            "status": "exists",
            "lead_id": str(lead.id),
            "lead_status": lead.status
        }
        
    # 4. Create new lead with qualifying status (since we are starting outreach)
    lead = Lead(
        company_id=company.id,
        assigned_agent_id=agent_id,
        name=payload.name,
        phone=clean_phone,
        email=payload.email,
        source=payload.source or "zapier",
        status="qualifying",
        lead_score=0
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    # 5. Generate first qualification/welcome question
    outreach_text = f"Hi {payload.name}! I am the AI assistant for Keepr Real Estate. Thanks for your inquiry! Which neighborhood or area are you hoping to find a property in?"
    
    # Save the AI welcome message to database transcript
    ai_msg = Message(lead_id=lead.id, sender="ai", content=outreach_text)
    db.add(ai_msg)
    db.commit()
    db.refresh(lead)
    
    # 6. Send outbound WhatsApp message via Evolution API
    send_evolution_whatsapp(clean_phone, outreach_text)
    
    return {
        "status": "ingested_and_outreached",
        "lead_id": str(lead.id),
        "outreach_message": outreach_text
    }

