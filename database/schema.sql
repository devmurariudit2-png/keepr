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
