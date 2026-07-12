import os
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Instantiate Gemini Client
# It will use GEMINI_API_KEY from environment variables
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = None

# Defining the function schema for structured tool calling
def submit_lead_qualification(
    budget: float,
    area: str,
    timeline: str,
    mortgage_status: str,
    bedrooms: int,
    intent: str
) -> str:
    """
    Submit extracted lead qualification data once enough information has been gathered.
    
    Args:
        budget: The lead's budget in local currency (numeric).
        area: Named neighborhood or preferred area.
        timeline: Expected timeline to buy/move. Must be one of: '0-30 days', '30-90 days', '90+ days', 'unspecified'.
        mortgage_status: Financing readiness. Must be one of: 'cash', 'pre_approved', 'needs_financing', 'unclear'.
        bedrooms: Number of bedrooms required.
        intent: The lead's buying urgency from tone and engagement. Must be one of: 'high', 'medium', 'low'.
    """
    return "Qualification submitted successfully."

SYSTEM_PROMPT = """You are Keepr's real estate qualification assistant. You chat with prospective
buyers on behalf of a real estate brokerage. Your only job is to have a warm,
brief, natural conversation that extracts five facts, then hand off to a human
agent.

Facts to extract (ask only for what's missing; if the lead volunteers a fact
out of order, extract it silently and don't ask again):
1. budget (numeric, local currency)
2. area / neighborhood preference
3. timeline (when they want to move or buy)
4. mortgage status (cash buyer / pre-approved / needs financing / unsure)
5. bedrooms required

Rules:
- Ask ONE question at a time. Never combine two questions in one message.
- Keep every message under 2 sentences.
- If the lead asks something outside your scope (legal advice, price
  negotiation, exact unit availability), say a human agent will follow up
  shortly, then continue qualification if facts are still missing.
- Once all 5 facts are collected, or the lead has stopped engaging after two
  follow-up attempts, stop asking and submit the structured result.
- Tone: warm, concise, like a helpful assistant — never a scripted chatbot.

When qualification is complete, respond ONLY with a call to
`submit_lead_qualification`. Do not also send a chat message in that turn."""

def check_for_human_escalation(content: str) -> bool:
    """
    Section 7.5: Flag lead if the message contains clear frustration,
    legal/contractual questions, or repeated complaints.
    """
    escalation_keywords = [
        "frustrated", "angry", "complaint", "sue", "legal", "lawyer",
        "contract", "scam", "wrong", "human", "agent", "person", 
        "real person", "stop bot", "talk to someone"
    ]
    content_lower = content.lower()
    for kw in escalation_keywords:
        if kw in content_lower:
            return True
    return False

def generate_qualification_reply(messages_history: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Generates a reply from Gemini given a conversation history.
    
    Args:
        messages_history: List of dicts representing previous messages:
                          [{"sender": "lead", "content": "..."}, {"sender": "ai", "content": "..."}]
    
    Returns:
        A dict containing:
        - "reply": The text reply to send to the user (if not qualified yet).
        - "qualification_data": A dict of extracted facts (if function call triggered).
    """
    if not client:
        return run_simulated_qualification(messages_history)

    # Format history for Gemini Content
    contents = []
    for msg in messages_history:
        role = "user" if msg["sender"] == "lead" else "model"
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg["content"])]
            )
        )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[submit_lead_qualification],
                temperature=0.2
            )
        )
        
        # Check if the model triggered a function call
        qualification_data = None
        reply = None

        if response.function_calls:
            for call in response.function_calls:
                if call.name == "submit_lead_qualification":
                    # Extract the arguments
                    args = call.args
                    qualification_data = {
                        "budget": float(args.get("budget", 0)),
                        "area": str(args.get("area", "")),
                        "timeline": str(args.get("timeline", "unspecified")),
                        "mortgage_status": str(args.get("mortgage_status", "unclear")),
                        "bedrooms": int(args.get("bedrooms", 0)),
                        "intent": str(args.get("intent", "medium"))
                    }
                    break
        
        if not qualification_data:
            reply = response.text or "I understand. Could you tell me more about what you're looking for?"

        return {
            "reply": reply,
            "qualification_data": qualification_data
        }

    except Exception as e:
        print(f"Error calling Gemini, falling back to simulator: {e}")
        return run_simulated_qualification(messages_history)

def run_simulated_qualification(messages_history: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Rule-based fallback simulator that qualifies the lead step-by-step
    by scanning the chat transcript using simple regex/heuristics.
    """
    import re
    
    budget = None
    area = None
    timeline = "unspecified"
    mortgage_status = "unclear"
    bedrooms = None
    intent = "medium"

    all_content = " ".join([m["content"].lower() for m in messages_history])
    
    # 1. Budget
    budget_match = re.search(r'(\d+)\s*k', all_content)
    if budget_match:
        budget = float(budget_match.group(1)) * 1000
    else:
        numbers = re.findall(r'\b\d{5,7}\b', all_content)
        if numbers:
            budget = float(numbers[0])

    # 2. Area
    if "downtown" in all_content:
        area = "Downtown"
    elif "marina" in all_content:
        area = "Marina Heights"
    elif "green valley" in all_content:
        area = "Green Valley"
    elif "suburbs" in all_content:
        area = "Suburbs"

    # 3. Timeline
    if "30 days" in all_content or "immediate" in all_content or "now" in all_content or "soon" in all_content:
        timeline = "0-30 days"
    elif "month" in all_content or "90 days" in all_content:
        timeline = "30-90 days"
    elif "later" in all_content or "90+" in all_content:
        timeline = "90+ days"

    # 4. Mortgage status
    if "cash" in all_content:
        mortgage_status = "cash"
    elif "pre-approved" in all_content or "preapproved" in all_content or "approved" in all_content:
        mortgage_status = "pre_approved"
    elif "finance" in all_content or "loan" in all_content or "mortgage" in all_content:
        mortgage_status = "needs_financing"

    # 5. Bedrooms
    bed_match = re.search(r'(\d+)\s*(?:bed|bd|bedroom)', all_content)
    if bed_match:
        bedrooms = int(bed_match.group(1))

    # Intent
    if "high" in all_content or "ready" in all_content or "now" in all_content or "urgent" in all_content:
        intent = "high"

    # Identify what facts are missing
    missing = []
    if budget is None: missing.append("budget")
    if area is None: missing.append("area")
    if timeline == "unspecified": missing.append("timeline")
    if mortgage_status == "unclear": missing.append("mortgage_status")
    if bedrooms is None: missing.append("bedrooms")

    if not missing:
        # All 5 facts collected! Trigger tool call simulation
        return {
            "reply": None,
            "qualification_data": {
                "budget": budget or 500000.0,
                "area": area or "Downtown",
                "timeline": timeline,
                "mortgage_status": mortgage_status,
                "bedrooms": bedrooms or 3,
                "intent": intent
            }
        }
    
    # Ask for the first missing property
    first_missing = missing[0]
    questions = {
        "budget": "What is your budget range for this purchase?",
        "area": "Which neighborhood or area are you hoping to find a property in?",
        "timeline": "When are you planning to buy or move?",
        "mortgage_status": "Are you a cash buyer, or do you have a mortgage pre-approval in place?",
        "bedrooms": "How many bedrooms do you need in the property?"
      }
    
    return {
        "reply": questions.get(first_missing, "Could you tell me more about your requirements?"),
        "qualification_data": None
    }
