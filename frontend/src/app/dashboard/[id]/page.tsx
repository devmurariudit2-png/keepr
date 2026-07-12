'use client';

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  budget: number | null;
  area: string | null;
  timeline: string | null;
  bedrooms: number | null;
  mortgage_status: string | null;
  intent: string | null;
  lead_score: number;
  status: string;
  last_message_at: string | null;
  created_at: string;
}

interface Message {
  id: string;
  lead_id: string;
  sender: string;
  content: string;
  created_at: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [senderType, setSenderType] = useState<"lead" | "agent">("lead");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Editing state for manual overrides
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Lead>>({});

  // Cal.com Booking state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleCalEvent = async (e: MessageEvent) => {
      // Check for Cal.com events
      const isCalEvent = e.origin === "https://cal.com" || e.data?.origin === "Cal";
      if (!isCalEvent) return;

      const action = e.data?.action || e.data?.type;
      if (action === "bookingSuccessful") {
        setBookingSuccess(true);
        
        // Record appointment in DB
        const token = sessionStorage.getItem("access_token");
        if (!token) return;

        try {
          const res = await fetch(`${API}/appointments`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              lead_id: leadId,
              scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
          });

          if (res.ok) {
            // Re-fetch lead details to update status to appointment_booked
            const leadRes = await fetch(`${API}/leads/${leadId}`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (leadRes.ok) {
              const updated = await leadRes.json();
              setLead(updated);
            }
          }
        } catch (err) {
          console.error("Failed to save Cal.com appointment:", err);
        }

        // Close booking modal after 3 seconds
        setTimeout(() => {
          setIsBookingModalOpen(false);
          setBookingSuccess(false);
        }, 3000);
      }
    };

    window.addEventListener("message", handleCalEvent);
    return () => window.removeEventListener("message", handleCalEvent);
  }, [leadId]);

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchLeadAndMessages(token);
  }, [leadId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchLeadAndMessages = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Lead details
      const leadRes = await fetch(`${API}/leads/${leadId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!leadRes.ok) throw new Error("Failed to load lead details.");
      const leadData = await leadRes.json();
      setLead(leadData);
      setEditFields(leadData);

      // Fetch Messages transcript
      const msgsRes = await fetch(`${API}/leads/${leadId}/messages`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!msgsRes.ok) throw new Error("Failed to load messages transcript.");
      const msgsData = await msgsRes.json();
      setMessages(msgsData);

    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    setSending(true);
    setError(null);

    const messagePayload = {
      sender: senderType,
      content: inputText
    };

    // Optimistically add lead's or agent's message to view
    const tempId = Math.random().toString();
    const tempMsg: Message = {
      id: tempId,
      lead_id: leadId,
      sender: senderType,
      content: inputText,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempMsg]);
    setInputText("");

    try {
      const response = await fetch(`${API}/leads/${leadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(messagePayload)
      });

      if (!response.ok) throw new Error("Failed to send message.");
      const data = await response.json();

      // Update lead details from response
      setLead(data.lead);
      setEditFields(data.lead);

      // Re-fetch all messages to ensure proper ordering and AI replies are included
      const msgsRes = await fetch(`${API}/leads/${leadId}/messages`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (msgsRes.ok) {
        const msgsData = await msgsRes.json();
        setMessages(msgsData);
      }
    } catch (err: any) {
      setError(err.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const handleSaveChanges = async () => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    try {
      setError(null);
      const res = await fetch(`${API}/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editFields.name,
          phone: editFields.phone,
          email: editFields.email,
          status: editFields.status,
          budget: editFields.budget ? Number(editFields.budget) : null,
          area: editFields.area,
          timeline: editFields.timeline,
          bedrooms: editFields.bedrooms ? Number(editFields.bedrooms) : null,
          mortgage_status: editFields.mortgage_status,
        })
      });

      if (!res.ok) throw new Error("Failed to update lead properties.");
      const updatedLead = await res.json();
      setLead(updatedLead);
      setEditFields(updatedLead);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Could not save manual override updates.");
    }
  };

  if (loading && !lead) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--paper)",
        color: "var(--navy)",
        fontFamily: "var(--font-mono)"
      }}>
        LOADING_CONVERSATION_THREAD...
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ padding: "40px", textAlign: "center", backgroundColor: "var(--paper)" }}>
        <h3>Lead not found.</h3>
        <Link href="/dashboard" style={{ color: "var(--navy)", textDecoration: "underline" }}>Back to Dashboard</Link>
      </div>
    );
  }

  const isHighIntent = lead.intent === "high" || lead.lead_score >= 70;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--paper)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        backgroundColor: "var(--navy)",
        color: "var(--paper)",
        padding: "16px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "2px solid var(--brass)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/dashboard" style={{ color: "var(--paper)", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>←</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>BACK_TO_DASHBOARD</span>
          </Link>
        </div>
        <div>
          <span className="mono-text" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
            LEAD_ID: {lead.id.substring(0, 8).toUpperCase()}...
          </span>
        </div>
      </header>

      {/* Main Split Interface */}
      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", borderTop: "1px solid var(--border-light)" }}>
        
        {/* Left Side: Conversation Hub */}
        <div style={{
          flex: "1 1 500px",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border-light)",
          backgroundColor: "#ffffff",
          height: "calc(100vh - 66px)",
          position: "relative"
        }}>
          {/* Conversation Header */}
          <div style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-light)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--navy)" }}>
                Chat Transcript
              </h2>
              <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                Full dialogue between Lead, Assistant AI, and Agents.
              </p>
            </div>
            {/* Sender Type Toggle for Testing */}
            <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--paper)", padding: "4px", borderRadius: "4px", border: "1px solid var(--border-light)" }}>
              <button 
                onClick={() => setSenderType("lead")}
                style={{
                  fontSize: "0.75rem",
                  padding: "4px 8px",
                  borderRadius: "2px",
                  backgroundColor: senderType === "lead" ? "var(--brass)" : "transparent",
                  color: senderType === "lead" ? "var(--white)" : "var(--navy)"
                }}
              >
                Send as Lead
              </button>
              <button 
                onClick={() => setSenderType("agent")}
                style={{
                  fontSize: "0.75rem",
                  padding: "4px 8px",
                  borderRadius: "2px",
                  backgroundColor: senderType === "agent" ? "var(--navy)" : "transparent",
                  color: senderType === "agent" ? "var(--white)" : "var(--navy)"
                }}
              >
                Send as Agent
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            backgroundColor: "rgba(246, 244, 239, 0.2)"
          }}>
            {messages.length === 0 ? (
              <p style={{ textAlign: "center", opacity: 0.5, fontStyle: "italic", marginTop: "40px" }}>
                No messages recorded. Type below to start the conversation!
              </p>
            ) : (
              messages.map((msg) => {
                const isLead = msg.sender === "lead";
                const isAI = msg.sender === "ai";
                
                let bubbleBg = "var(--navy)";
                let bubbleColor = "var(--white)";
                let alignSelf = "flex-end";
                
                if (isLead) {
                  bubbleBg = "var(--gray-light)";
                  bubbleColor = "var(--ink)";
                  alignSelf = "flex-start";
                } else if (isAI) {
                  bubbleBg = "rgba(27, 42, 74, 0.08)";
                  bubbleColor = "var(--navy)";
                  alignSelf = "flex-end";
                }

                return (
                  <div key={msg.id} style={{
                    alignSelf: alignSelf,
                    maxWidth: "75%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isLead ? "flex-start" : "flex-end"
                  }}>
                    <span className="mono-text" style={{ fontSize: "0.7rem", opacity: 0.5, marginBottom: "4px" }}>
                      {msg.sender.toUpperCase()} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div style={{
                      backgroundColor: bubbleBg,
                      color: bubbleColor,
                      padding: "12px 16px",
                      borderRadius: isLead ? "12px 12px 12px 2px" : "12px 12px 2px 12px",
                      fontSize: "0.95rem",
                      lineHeight: 1.4,
                      border: isAI ? "1px dashed var(--navy)" : "none"
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-light)",
            backgroundColor: "var(--white)",
            display: "flex",
            gap: "12px"
          }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={senderType === "lead" ? "Type what the buyer says..." : "Type agent message..."}
              style={{ flex: 1 }}
              required
              disabled={sending}
            />
            <button type="submit" className="primary" disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>

        {/* Right Side: Lead Scoring & Property Insights (Section 8.4) */}
        <div style={{
          flex: "1 1 360px",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          height: "calc(100vh - 66px)",
          overflowY: "auto"
        }}>
          {/* Header Card */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--navy)" }}>
                {lead.name || "Unnamed Buyer"}
              </h1>
              <p className="mono-text" style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: "2px" }}>
                Source: {lead.source.toUpperCase()}
              </p>
            </div>
            {lead.status === "needs_human" && (
              <div style={{
                backgroundColor: "var(--signal-red)",
                color: "var(--white)",
                fontWeight: "bold",
                fontSize: "0.75rem",
                padding: "6px 12px",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)"
              }}>
                [ESCALATED]
              </div>
            )}
          </div>

          {/* Lead Score Circular Graphic & Stats (Section 7.4) */}
          <div style={{
            backgroundColor: "var(--white)",
            border: "1px solid var(--border-light)",
            borderRadius: "6px",
            padding: "24px",
            display: "flex",
            alignItems: "center",
            gap: "24px"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              border: `5px solid ${isHighIntent ? "var(--brass)" : "var(--navy)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              boxShadow: "0 4px 10px rgba(27, 42, 74, 0.05)"
            }}>
              <span className="mono-text" style={{
                fontSize: "1.75rem",
                fontWeight: "bold",
                color: isHighIntent ? "var(--brass)" : "var(--navy)"
              }}>
                {lead.lead_score}
              </span>
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", color: "var(--navy)" }}>Lead Score</h3>
              <p style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "4px" }}>
                {lead.lead_score >= 70 ? (
                  <strong style={{ color: "var(--brass)" }}>HighUrgency: Recommended for visit</strong>
                ) : lead.lead_score >= 40 ? (
                  <span>Nurture: Keep sending units</span>
                ) : (
                  <span>Long-term Nurture</span>
                )}
              </p>
            </div>
          </div>

          {/* Escalation Warning (Section 7.5) */}
          {lead.status === "needs_human" && (
            <div style={{
              backgroundColor: "rgba(193, 68, 59, 0.08)",
              borderLeft: "4px solid var(--signal-red)",
              padding: "16px",
              borderRadius: "4px",
              color: "var(--signal-red)",
              fontSize: "0.85rem",
              lineHeight: 1.5
            }}>
              <strong>⚠️ Escalated to Agent Response Needed</strong>
              <p style={{ marginTop: "4px" }}>
                The AI flagged this conversation because the lead requested human follow-up or exhibited sentiment matching frustration.
              </p>
            </div>
          )}

          {/* Extracted Facts Card */}
          <div style={{
            backgroundColor: "var(--white)",
            border: "1px solid var(--border-light)",
            borderRadius: "6px",
            padding: "24px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1rem", color: "var(--navy)" }}>Extracted Facts</h3>
              <button 
                onClick={() => {
                  if (isEditing) {
                    handleSaveChanges();
                  } else {
                    setIsEditing(true);
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--brass)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                {isEditing ? "Save" : "Manual Override"}
              </button>
            </div>

            {isEditing ? (
              /* Editable Override Fields */
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Name</label>
                  <input 
                    type="text" 
                    value={editFields.name || ""} 
                    onChange={(e) => setEditFields({...editFields, name: e.target.value})} 
                    style={{ padding: "6px 10px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Budget</label>
                  <input 
                    type="number" 
                    value={editFields.budget || ""} 
                    onChange={(e) => setEditFields({...editFields, budget: e.target.value ? Number(e.target.value) : null})} 
                    style={{ padding: "6px 10px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Area</label>
                  <input 
                    type="text" 
                    value={editFields.area || ""} 
                    onChange={(e) => setEditFields({...editFields, area: e.target.value})} 
                    style={{ padding: "6px 10px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Timeline</label>
                  <select 
                    value={editFields.timeline || "unspecified"} 
                    onChange={(e) => setEditFields({...editFields, timeline: e.target.value})}
                    style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--border-light)" }}
                  >
                    <option value="0-30 days">0-30 days</option>
                    <option value="30-90 days">30-90 days</option>
                    <option value="90+ days">90+ days</option>
                    <option value="unspecified">unspecified</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Bedrooms</label>
                  <input 
                    type="number" 
                    value={editFields.bedrooms || ""} 
                    onChange={(e) => setEditFields({...editFields, bedrooms: e.target.value ? Number(e.target.value) : null})} 
                    style={{ padding: "6px 10px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Mortgage Status</label>
                  <select 
                    value={editFields.mortgage_status || "unclear"} 
                    onChange={(e) => setEditFields({...editFields, mortgage_status: e.target.value})}
                    style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--border-light)" }}
                  >
                    <option value="cash">cash</option>
                    <option value="pre_approved">pre_approved</option>
                    <option value="needs_financing">needs_financing</option>
                    <option value="unclear">unclear</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Status</label>
                  <select 
                    value={editFields.status || "new"} 
                    onChange={(e) => setEditFields({...editFields, status: e.target.value})}
                    style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--border-light)" }}
                  >
                    <option value="new">new</option>
                    <option value="qualifying">qualifying</option>
                    <option value="qualified">qualified</option>
                    <option value="needs_human">needs_human</option>
                    <option value="appointment_booked">appointment_booked</option>
                    <option value="lost">lost</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button onClick={handleSaveChanges} className="primary" style={{ padding: "6px 12px", fontSize: "0.85rem", flex: 1 }}>Save</button>
                  <button onClick={() => { setIsEditing(false); setEditFields(lead); }} className="secondary" style={{ padding: "6px 12px", fontSize: "0.85rem", flex: 1 }}>Cancel</button>
                </div>
              </div>
            ) : (
              /* Display Extracted Facts */
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Budget */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-light)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>Stated Budget</span>
                  <span className="mono-text" style={{ fontWeight: 600 }}>
                    {lead.budget ? `$${Number(lead.budget).toLocaleString()}` : "—"}
                  </span>
                </div>
                
                {/* Area */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-light)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>Preferred Area</span>
                  <span style={{ fontWeight: 600 }}>{lead.area || "—"}</span>
                </div>

                {/* Timeline */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-light)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>Buy Timeline</span>
                  <span className="mono-text" style={{ fontWeight: 600 }}>{lead.timeline || "—"}</span>
                </div>

                {/* Bedrooms */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-light)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>Bedrooms</span>
                  <span className="mono-text" style={{ fontWeight: 600 }}>{lead.bedrooms ? `${lead.bedrooms} bed` : "—"}</span>
                </div>

                {/* Mortgage */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-light)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>Financing Status</span>
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                    {lead.mortgage_status ? lead.mortgage_status.replace("_", " ") : "—"}
                  </span>
                </div>

                {/* Intent */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-light)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>Urgency Level</span>
                  <span style={{ fontWeight: 600, color: isHighIntent ? "var(--brass)" : "var(--navy)" }}>
                    {lead.intent ? lead.intent.toUpperCase() : "—"}
                  </span>
                </div>

                {/* Status */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border-light)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>Current Status</span>
                  <span style={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.8rem", color: "var(--brass)" }}>
                    {lead.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Book Appointment CTA (Section 8.5 Placeholder) */}
          <button 
            onClick={() => setIsBookingModalOpen(true)}
            className="primary" 
            style={{
              padding: "16px",
              fontSize: "1.1rem",
              boxShadow: "0 10px 20px rgba(184, 146, 63, 0.15)"
            }}
          >
            [ Book Appointment ]
          </button>
        </div>

      </div>

      {/* Cal.com Embed Modal */}
      {isBookingModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(27, 42, 74, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "var(--white)",
            border: "2px solid var(--brass)",
            borderRadius: "6px",
            width: "90%",
            maxWidth: "900px",
            height: "85vh",
            padding: "24px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            position: "relative",
            display: "flex",
            flexDirection: "column"
          }}>
            <button 
              onClick={() => {
                setIsBookingModalOpen(false);
                setBookingSuccess(false);
              }}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "1.2rem",
                color: "var(--navy)",
                cursor: "pointer",
                fontWeight: "bold",
                zIndex: 1100
              }}
            >
              ✕
            </button>

            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--navy)", marginBottom: "16px" }}>
              SCHEDULE_VISIT_CAL_COM
            </h3>

            {bookingSuccess ? (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                color: "var(--brass)"
              }}>
                <div style={{ fontSize: "3rem" }}>📅</div>
                <h4 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Booking Successful!</h4>
                <p style={{ fontSize: "0.9rem", color: "var(--navy)", opacity: 0.8 }}>
                  Saving appointment to database and updating status to APPOINTMENT_BOOKED...
                </p>
              </div>
            ) : (
              <iframe 
                src="https://cal.com/demo-broker" 
                style={{
                  width: "100%",
                  flex: 1,
                  border: "none",
                  borderRadius: "4px"
                }}
                title="Cal.com scheduling embed"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
