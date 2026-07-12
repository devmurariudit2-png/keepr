# KEEPR — MVP Blueprint v1.0
### "Never lose a lead again."

**How to use this document:** Save this file as `docs/BLUEPRINT.md` in your repo. This is the single source of truth your AI IDE (Claude Code, Cursor, etc.) should read in full before writing any code. Every build-day prompt in Section 12 references a section number here — keep them in sync as you iterate. Nothing in this doc contradicts your original scoping; it tightens it and adds the handful of decisions that separate a toy demo from something a broker actually trusts with real leads.

---

## Table of Contents
1. [TL;DR](#1-tldr)
2. [Brand Identity](#2-brand-identity)
3. [Product Requirements Document](#3-product-requirements-document)
4. [System Architecture](#4-system-architecture)
5. [Database Schema](#5-database-schema)
6. [API Specification](#6-api-specification)
7. [AI Qualification Engine](#7-ai-qualification-engine)
8. [UI Wireframes](#8-ui-wireframes)
9. [Growth & Funnel Design](#9-growth--funnel-design)
10. [Feature Prioritization](#10-feature-prioritization)
11. [Technical Hacks (Free Value, Zero Scope Creep)](#11-technical-hacks-free-value-zero-scope-creep)
12. [Exact AI IDE / Claude Code Prompts](#12-exact-ai-ide--claude-code-prompts)
13. [7-Day Execution Plan](#13-7-day-execution-plan)
14. [Definition of Done](#14-definition-of-done)
15. [Immediate Next Action](#15-immediate-next-action)

---

## 1. TL;DR

- **One promise:** Never lose a lead again.
- **One user action that proves it works:** a broker uploads/connects leads → AI qualifies them in chat → qualified leads get booked → broker sees it happen on a dashboard.
- **One success metric:** a real broker says "can I start using this next week?"
- **Everything not in service of that sentence is out of scope**, no matter how easy it would be to add.

---

## 2. Brand Identity

### 2.1 Name (recommended + alternatives)

| Name | Why it works | Watch-out |
|---|---|---|
| **Keepr** (recommended) | Literal ("keeper of your leads"), short, easy to say on a sales call, domain-friendly (`keepr.ai` / `usekeepr.com` — verify availability before committing) | Slightly playful; less "enterprise" if you later sell to large developers |
| Closezy | Sales energy, memorable | Reads a bit consumer/casual |
| FollowUp.ai | Fully descriptive, easy SEO | Generic, hard to trademark/defend |
| LeadVault | Trust + security connotation | Slightly cold, "enterprise SaaS #4021" vibe |

Use **Keepr** as the working name throughout this doc and your codebase. Swap later if you land on something else — nothing here is name-dependent except copy strings.

### 2.2 Tagline options
- **"Never lose a lead again."** (primary — matches the one promise exactly, use everywhere)
- "Every lead, qualified. Every lead, remembered."
- "The lead never goes cold."

### 2.3 Positioning statement
> For real estate brokerage owners and developer sales teams who lose deals to slow follow-up, **Keepr** is an AI front-desk that captures, qualifies, and books every incoming lead within minutes — unlike spreadsheets, WhatsApp chaos, or a CRM nobody updates.

### 2.4 Visual identity direction

Avoid the two visual clichés every AI product defaults to right now: (a) cream background + terracotta accent + serif display, and (b) near-black + neon-green SaaS-dashboard look. Both read as "AI wrapper," and this product needs to read as **trustworthy infrastructure for someone else's money**.

Instead, ground the identity in the actual subject: **architectural blueprints and property deeds** — literally the artifact this document is named after, and the visual language of real estate itself.

- **Palette:**
  - Blueprint navy `#1B2A4A` — primary, headers, nav
  - Paper `#F6F4EF` — background (warm, not sterile white)
  - Brass `#B8923F` — single accent, used sparingly (CTA buttons, the lead score ring, "qualified" badges)
  - Ink `#1A1A1A` — body text
  - Signal red `#C1443B` — reserved *only* for "lead going cold" alerts, nowhere else
- **Type:**
  - Display: a confident slab serif (e.g. Zilla Slab, Roboto Slab) for headlines and the lead score number — evokes a stamped deed / architectural title block
  - Body: a clean grotesque (e.g. Inter, IBM Plex Sans) for everything else
  - Data/mono: IBM Plex Mono for dashboard numbers, timestamps, phone numbers — gives the dashboard a "control room" precision feel
- **Signature element:** a faint blueprint grid-line texture behind the hero and dashboard header (very low opacity, never behind body text) — the one visual flourish, used once, not repeated everywhere.
- **Voice:** plain, confident, zero SaaS-buzzword filler. "Book Appointment," not "Schedule Engagement." Errors say what happened and what to do next, never apologize.

---

## 3. Product Requirements Document

### 3.1 Problem
Real estate brokerages and developer sales teams generate more leads than they can respond to fast. Leads sit in WhatsApp, Instagram DMs, and spreadsheets. By the time an agent replies, the buyer has already messaged three competitors. The lead isn't lost to a bad product — it's lost to slow, inconsistent follow-up.

### 3.2 Target users (pick one as primary for the first 20–30 demos)

**Persona A — Brokerage Owner**
- Runs a team of 5–30 agents
- Leads come from Facebook/Instagram ads, walk-ins, referrals, portals (Bayut/Zillow-equivalent)
- Pain: agents forget to follow up, no visibility into what's happening with each lead, no consistent qualification
- Buying trigger: "show me it works on leads I already have"

**Persona B — Developer Sales Team**
- Sells units for a single project launch, high lead spikes around launch dates
- Leads come from ad campaigns, WhatsApp broadcast responses
- Pain: sales team is overwhelmed during launch week, unqualified leads eat agent time
- Buying trigger: "can this handle a launch-week spike without hiring more people"

Pick **one** persona to demo to first. Don't build features for both in v0.1 — the workflow is identical, only the source of leads differs.

### 3.3 Core promise (non-negotiable scope anchor)
Every feature decision gets tested against one question: **does this help capture, qualify, or book a lead — or does it help the broker trust that no lead was lost?** If a proposed feature doesn't map to one of those, it's v0.2 at the earliest.

### 3.4 User stories

1. As a brokerage owner, I log in and see today's leads, how many are qualified, how many appointments are booked, at a glance.
2. As a brokerage owner, I upload a CSV of 20 existing leads and the AI starts qualifying them without me touching each one manually.
3. As a lead, I chat with what feels like a helpful assistant (not a rigid form) and answer a few natural questions about my budget, area, timeline, financing, and bedroom needs.
4. As a brokerage owner, I open any lead and see exactly what the AI learned, a lead score, and a one-click "Book Appointment" button.
5. As a brokerage owner, I can see which leads are going cold so none get silently forgotten.
6. As an agent, I can see which leads are assigned to me.

### 3.5 Explicitly out of scope for v0.1
See Section 10 for the full "will not build" list — carried over unchanged from your original scoping, because it's correct.

### 3.6 Success criteria
Not: 1,000 customers.
**Success is:** one broker uploads 20 real leads, the AI qualifies them, 4+ appointments get booked, and the broker asks to keep using it next week — unprompted.

---

## 4. System Architecture

### 4.1 Stack
| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js | App router, deployed on Vercel |
| Backend | FastAPI | Deployed on Railway |
| Database | PostgreSQL | Consider Supabase (Section 11) to get auth + realtime for free |
| AI | OpenAI (or Anthropic Claude — see Section 11) | Structured/tool-call output, not free-text parsing |
| Scheduling | Cal.com embed/API (Section 11) | Don't build a calendar from scratch |
| Hosting | Vercel (frontend) + Railway (backend + DB) | |

### 4.2 High-level flow
```
Lead message (chat / WhatsApp / form)
        │
        ▼
POST /leads/:id/messages ──▶ AI extracts structured fields (tool call)
        │                          │
        ▼                          ▼
  messages table            leads table updated live
        │
        ▼
  backend computes lead_score (deterministic formula, Section 7.4)
        │
        ▼
  dashboard + leads list update (Section 8)
        │
        ▼
  agent clicks "Book Appointment" ──▶ Cal.com booking ──▶ appointments table
```

### 4.3 Repo structure (unchanged from your original)
```
frontend/
backend/
database/
docs/          ← this file lives here as BLUEPRINT.md
README.md
```

---

## 5. Database Schema

Your instinct to keep this to a handful of tables is correct. You listed three (Company, Lead, Appointment) — you actually need **five**, because you can't have a login (Day 1 of your own plan) without a Users table, and you can't show "what the AI learned" (your own wireframe) without storing the conversation. Still dead simple.

```sql
-- Companies (the brokerage / developer sales org)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'trial',          -- trial | active — a label only, no billing logic
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (brokers / agents who log in)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,                 -- nullable if using magic-link auth
    role TEXT DEFAULT 'agent',          -- owner | agent — a label only, no permission system
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Leads
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES users(id),
    name TEXT,
    phone TEXT,
    email TEXT,
    source TEXT DEFAULT 'manual',       -- manual | csv_import | facebook | whatsapp | website
    budget NUMERIC,
    area TEXT,
    timeline TEXT,                      -- '0-30 days' | '30-90 days' | '90+ days' | 'unspecified'
    bedrooms INT,
    mortgage_status TEXT,               -- cash | pre_approved | needs_financing | unclear
    intent TEXT,                        -- high | medium | low
    lead_score INT DEFAULT 0,
    status TEXT DEFAULT 'new',          -- new | qualifying | qualified | appointment_booked | lost
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages (full conversation transcript)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,               -- lead | ai | agent
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'booked',       -- booked | completed | no_show | cancelled
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices you will actually query on day one
CREATE INDEX idx_leads_company_status ON leads(company_id, status);
CREATE INDEX idx_messages_lead ON messages(lead_id, created_at);
CREATE INDEX idx_appointments_agent_date ON appointments(agent_id, scheduled_at);
```

Five tables. Still fits on a napkin.

---

## 6. API Specification

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Log in (email + password, or magic link — Section 11) |
| GET | `/leads` | List leads for the logged-in company, filterable by status |
| POST | `/leads` | Create a single lead manually |
| POST | `/leads/import` | Bulk CSV import — this is how the "20 leads" demo happens |
| GET | `/leads/:id` | Full lead detail (extracted fields + score) |
| PATCH | `/leads/:id` | Update status / reassign agent |
| POST | `/leads/:id/messages` | Send a message into the conversation → triggers AI reply + extraction |
| GET | `/leads/:id/messages` | Full conversation transcript |
| POST | `/appointments` | Book an appointment for a lead |
| GET | `/appointments` | List appointments |
| GET | `/dashboard/summary` | The four dashboard numbers (Section 8.2) |

Eleven endpoints, not five — but the extra six are the difference between "five endpoints that work in a demo" and "five endpoints plus the six things every real broker will ask for in week one" (login, import, transcript, reassignment). Still nowhere near a platform.

### Example: `POST /leads/:id/messages`
Request:
```json
{ "sender": "lead", "content": "Looking for a villa, budget around 400k" }
```
Response:
```json
{
  "ai_reply": "Great — what area are you hoping to be in?",
  "lead": {
    "id": "…",
    "budget": 400000,
    "area": null,
    "timeline": null,
    "bedrooms": null,
    "mortgage_status": null,
    "lead_score": 24,
    "status": "qualifying"
  }
}
```

### Example: `GET /dashboard/summary`
```json
{
  "todays_leads": 42,
  "qualified": 21,
  "appointments": 8,
  "pending": 13,
  "conversion_rate": 0.51
}
```

---

## 7. AI Qualification Engine

### 7.1 Design decision: dynamic slot-filling, not a linear survey
Your original flow (Budget → Area → Timeline → Mortgage → Bedrooms) is the right *default order*, but the AI should extract whatever the lead volunteers out of order and only ask for what's still missing. A rigid "question 1, question 2, question 3" script feels like a form and leads notice. This is a prompt-design decision, not a new feature — it costs nothing extra to build and is the single biggest driver of "this actually feels smart" in a demo.

### 7.2 Production system prompt
```
You are Keepr's real estate qualification assistant. You chat with prospective
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
`submit_lead_qualification`. Do not also send a chat message in that turn.
```

### 7.3 Structured output (tool call, not free-text parsing)
Never parse the AI's free-text reply with regex — have it call a tool with a strict schema. Works identically on OpenAI function calling or Anthropic tool use.
```json
{
  "name": "submit_lead_qualification",
  "description": "Submit extracted lead qualification data once enough information has been gathered.",
  "input_schema": {
    "type": "object",
    "properties": {
      "budget": { "type": "number" },
      "area": { "type": "string" },
      "timeline": { "type": "string", "enum": ["0-30 days", "30-90 days", "90+ days", "unspecified"] },
      "mortgage_status": { "type": "string", "enum": ["cash", "pre_approved", "needs_financing", "unclear"] },
      "bedrooms": { "type": "integer" },
      "intent": { "type": "string", "enum": ["high", "medium", "low"], "description": "Your read of buying urgency from tone and engagement" }
    },
    "required": ["budget", "area", "timeline", "mortgage_status", "bedrooms", "intent"]
  }
}
```
Note what's **not** in this schema: `lead_score` and `recommendation`. That's deliberate — see 7.4.

### 7.4 Lead scoring — deterministic, not AI-guessed
An LLM guessing a numeric score is inconsistent between two nearly-identical leads, and a broker will notice within the first week and stop trusting it. Compute the score in backend code from the extracted fields instead. Transparent and auditable also makes for a much better demo answer when a broker asks "how did it get 92?"

```
lead_score =
    budget_fit        (0–30)   full points if within the brokerage's listed inventory range for the stated area
  + timeline_urgency  (0–25)   0-30 days = 25, 30-90 days = 15, 90+ days = 5, unspecified = 0
  + financing_ready   (0–15)   cash or pre_approved = 15, needs_financing = 8, unclear = 0
  + area_specificity  (0–10)   named neighborhood = 10, general city only = 5, undecided = 0
  + stated_intent     (0–20)   high = 20, medium = 10, low = 0   (from the AI's `intent` field)

recommendation:
  score >= 70   → "book_visit"
  40–69         → "nurture"        (send listings, don't book yet)
  < 40          → "long_term_nurture"
```

### 7.5 Escalation
If a lead's message contains clear frustration, a legal/contractual question, or repeats a question the AI already answered incorrectly, flag the lead `status = 'needs_human'` and notify the assigned agent. Don't build a second AI agent for this — it's a single keyword/sentiment check in the same extraction call.

---

## 8. UI Wireframes

### 8.1 Landing Page
```
┌─────────────────────────────────────────┐
│  KEEPR                        [Login]    │
│                                           │
│   Capture. Qualify. Book.                │
│   Never lose another lead.               │
│                                           │
│         [ Try it yourself → ]            │
│         (self-demo chat, see 9.2)        │
│                                           │
│         [ Book a Demo ]                  │
└─────────────────────────────────────────┘
```

### 8.2 Dashboard — nothing else
```
┌─────────────────────────────────────────┐
│  Today's Leads      42                   │
│  Qualified          21                   │
│  Appointments        8                   │
│  Pending            13                   │
│  Conversion         51%                  │
└─────────────────────────────────────────┘
```

### 8.3 Leads List (row)
```
┌─────────────────────────────────────────┐
│ John        Budget: $400k   Qualified    │
│ Agent: Sarah        Last msg: 2 min ago  │
└─────────────────────────────────────────┘
```
Empty state (first login, before CSV import): *"No leads yet — import your first 20 to see it work."* with an import button front and center. This is the state a broker sees in the demo, so it needs to invite action, not look broken.

### 8.4 Conversation / Lead Detail
```
┌───────────────┬─────────────────────────┐
│  AI ⇄ Buyer    │  Lead Score:  92         │
│  chat thread   │  Budget:      $400k      │
│  (scrollable)  │  Area:        Downtown   │
│                │  Timeline:    30 days    │
│                │  Bedrooms:    3          │
│                │  Intent:      High       │
│                │                          │
│                │  [ Book Appointment ]    │
└───────────────┴─────────────────────────┘
```

### 8.5 Appointment Booking
Click "Book Appointment" → Cal.com embed appears inline → confirm → done. (Section 11 explains why you shouldn't build this screen yourself.)

### 8.6 Cold-lead flag (small, not a feature)
Any lead with no reply in 24h gets a small amber dot next to their name in the list — no separate "alerts" page, just a visual cue on the existing row. This is what "never lose a lead" looks like on screen without building an alerting system.

---

## 9. Growth & Funnel Design

### 9.1 Acquisition funnel for Keepr itself
```
Landing page
   │
   ▼
Self-demo: visitor becomes the "lead," chats with the AI, sees their
own lead card populate live   ← highest-leverage step, see 9.2
   │
   ▼
Book a call (Cal.com embed, same component you build for the product)
   │
   ▼
Onboarding: import their own 20 real leads
   │
   ▼
One week later: "You had 4 appointments booked. Want to keep going?"
```

### 9.2 The single best growth hack available here
Let the landing page visitor *be* the lead. Embed the exact same chat widget from Section 8.4, pointed at a public "demo company," with no login required. The visitor experiences qualification firsthand instead of reading marketing copy about it — and it's free to build, because it's the same `/leads/:id/messages` endpoint your product already needs. This is very likely more convincing in a broker demo than any slide.

### 9.3 Landing page copy
- **Headline:** Capture. Qualify. Book.
- **Subhead:** Never lose another lead.
- **CTA 1 (primary):** Try it yourself →
- **CTA 2 (secondary):** Book a Demo
- **Three proof bullets (fill in after first 5 broker calls with a real stat each time):**
  - "Every lead gets a reply in under a minute, day or night."
  - "See exactly what the AI learned about every buyer — budget, area, timeline, intent."
  - "One click from qualified to booked."

### 9.4 Demo script for your first 20–30 calls
1. Show the dashboard with their own imported leads (not a stock demo).
2. Open one lead, walk through the conversation and the score.
3. Click "Book Appointment" live.
4. Ask directly: *"If this worked exactly like this on your real leads next week, would you use it?"*
5. Write down the exact word they use for what's missing. Don't build it yet — wait until 10 independent brokers say the same word.

---

## 10. Feature Prioritization

### Must-have (Days 1–4)
Login · Dashboard · Leads list · CSV import · AI qualification chat · Appointment booking (Cal.com) · Deploy

### Candidates for v0.2 (only if 10+ brokers independently ask)
Cold-lead auto-follow-up · WhatsApp inbound capture · Facebook Lead Ads webhook · Agent leaderboard

### Will not build in v0.1
❌ Voice AI ❌ Multi-agent ❌ LangGraph ❌ Long-term memory ❌ Vector DB ❌ Analytics dashboards ❌ Teams/permissions ❌ Billing ❌ Roles ❌ RAG ❌ Forecasting

This list is correct as originally scoped. Keep it.

---

## 11. Technical Hacks (Free Value, Zero Scope Creep)

Each of these replaces "build it yourself" with "use something that already exists" — none of them add a new feature to the product, so none of them violate Section 10's "will not build" list.

1. **Structured tool-calling for extraction, not regex on free text.** Covered in 7.3 — this alone is the difference between a demo that breaks on the third message and one that doesn't.
2. **Deterministic backend scoring, not an AI-guessed number.** Covered in 7.4 — makes the score explainable, which matters the moment a broker asks "why 92?"
3. **Cal.com embed/API instead of a custom calendar.** Building scheduling from scratch is a multi-day trap disguised as a small feature. Cal.com gives you availability, timezones, and reminders for free — use it for both the product *and* your own demo-booking flow (9.1).
4. **Supabase instead of raw Postgres + hand-rolled auth.** Same Postgres you already planned, but you get login/magic-links and realtime subscriptions (for the live-updating dashboard) without writing either yourself. Optional, but saves at least a full day.
5. **The self-demo widget (9.2).** Reuses the exact qualification endpoint you're already building — the only new work is a public route with no login.
6. **CSV import on day one, not later.** Your own definition of success (Section 3.6) requires a broker to upload 20 leads. Build this with the leads table, not as an afterthought.
7. **Streaming AI replies (SSE) in the chat.** A visible "typing" effect makes the product feel alive in a live demo — small effort, disproportionate perceived quality.
8. **Seed/reset script for demo data.** You're doing 20–30 live demos. A one-command reset to clean demo state saves you from ever showing a broken or stale dashboard mid-call.
9. **A single amber dot for cold leads (8.6), not an alerts system.** Delivers on "never lose a lead" visually without building notifications infrastructure.

---

## 12. Exact AI IDE / Claude Code Prompts

Paste these into Claude Code (or your AI IDE of choice) in order, one per build day. Each assumes `docs/BLUEPRINT.md` (this file) is already in the repo and readable.

**Prompt — Day 1 (Foundation)**
```
Read docs/BLUEPRINT.md in full before writing any code. Today, build only:
login (email/password), the dashboard (Section 8.2, exactly those 4 numbers,
nothing else), the leads list (Section 8.3, including the empty state copy),
and the database schema exactly as written in Section 5. Use Next.js for
frontend, FastAPI for backend, PostgreSQL for the database. Do not add any
table, endpoint, or UI element not listed in Sections 5, 6, or 8. Ask me
before adding any dependency not named in Section 4.1.
```

**Prompt — Day 2 (AI Qualification)**
```
Read docs/BLUEPRINT.md Section 7 in full. Build the AI qualification chat:
the conversation UI from Section 8.4, the POST /leads/:id/messages endpoint
from Section 6, the system prompt from 7.2 verbatim, and the
submit_lead_qualification tool schema from 7.3 verbatim. Implement lead
scoring as a plain backend function using the exact formula in Section 7.4 —
do not let the model output the score itself. Store every message in the
messages table.
```

**Prompt — Day 3 (Appointments + CSV Import)**
```
Read docs/BLUEPRINT.md Sections 6 and 11 (points 3 and 6). Add CSV import
(POST /leads/import) and appointment booking using a Cal.com embed, not a
custom calendar UI. On successful booking, write to the appointments table
and update the lead's status to appointment_booked.
```

**Prompt — Day 4 (Deploy)**
```
Deploy frontend to Vercel and backend + database to Railway per Section 4.1.
Add a seed script (Section 11, point 8) that resets to a clean demo state
with 20 sample leads in varying qualification stages. Do not add any feature
not already specified in this document.
```

**Prompt — Day 5 (Self-demo widget)**
```
Read docs/BLUEPRINT.md Section 9.2. Add a public, no-login version of the
chat widget from Section 8.4 on the landing page, pointed at a fixed "demo
company" record, so a visitor can experience qualification as if they were
the lead. Reuse the existing POST /leads/:id/messages endpoint — do not
create a separate code path for this.
```

---

## 13. 7-Day Execution Plan

| Day | Focus |
|---|---|
| 1 | Login, dashboard, leads list, database (Section 12, Day 1 prompt) |
| 2 | AI qualification chat + deterministic scoring (Day 2 prompt) |
| 3 | Appointment booking (Cal.com) + CSV import (Day 3 prompt) |
| 4 | Deploy + seed/demo data (Day 4 prompt) |
| 5 | Self-demo widget on landing page + your own dry-run through the entire flow end to end (Day 5 prompt) |
| 6 | Fix everything that broke in your dry-run. Book the first 5 broker/dev-team calls. |
| 7 | Run those first 5 demos using the script in 9.4. Write down the exact words used for anything missing. Do not start building it yet. |

---

## 14. Definition of Done
A real broker or developer sales lead:
1. Logs in and sees their own dashboard.
2. Imports 20 real leads via CSV.
3. Watches the AI qualify at least one live, in front of them.
4. Sees a lead go from "new" to "qualified" to "appointment booked" with one click.
5. Says, unprompted, "can I start using this next week?"

If that happens with even one broker, v0.1 has done its job. Everything after that is prioritized by how many *other* brokers ask for the same thing next — not by what seems obviously useful to build.

---

## 15. Immediate Next Action
1. Confirm the brand name (Keepr or one of the alternatives in Section 2.1) — every prompt in Section 12 and every copy string in Section 9.3 uses it.
2. Pick one persona from Section 3.2 to demo to first.
3. Paste the Day 1 prompt from Section 12 into your AI IDE.