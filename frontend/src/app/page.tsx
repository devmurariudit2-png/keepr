"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Lead {
  id: string;
  name: string;
  status: string;
  lead_score: number;
  budget?: number;
  area?: string;
  timeline?: string;
  mortgage_status?: string;
}

interface ChatMessage {
  sender: "lead" | "ai";
  content: string;
}

// ── Typing indicator ────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "5px", padding: "8px 4px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: "var(--navy)",
            opacity: 0.4,
            display: "inline-block",
            animation: `keepr-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Score ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const colour = score >= 70 ? "var(--brass)" : score >= 40 ? "#d4a847" : "var(--signal-red)";
  return (
    <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(27,42,74,0.1)" strokeWidth="10" />
      <circle
        cx="64" cy="64" r={r} fill="none"
        stroke={colour} strokeWidth="10"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }}
      />
      <text
        x="64" y="70"
        textAnchor="middle"
        style={{ transform: "rotate(90deg) translate(0,-128px)", fontSize: "28px", fontWeight: 800, fill: colour, fontFamily: "var(--font-mono)" }}
      >
        {score}
      </text>
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  // "idle" | "form" | "chat" | "qualified"
  const [stage, setStage] = useState<"idle" | "form" | "chat" | "qualified">("idle");
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [formError, setFormError] = useState("");
  const [creatingLead, setCreatingLead] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function handleStartDemo(e: React.FormEvent) {
    e.preventDefault();
    if (!visitorName.trim()) { setFormError("Please enter your name."); return; }
    setCreatingLead(true);
    setFormError("");
    try {
      const res = await fetch(`${API}/demo/public-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: visitorName.trim(), phone: visitorPhone.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Could not start demo");
      const newLead: Lead = await res.json();
      setLead(newLead);
      setMessages([{
        sender: "ai",
        content: `Hi ${visitorName.split(" ")[0]}! 👋 I'm Keepr's AI assistant. I'll ask you a few quick questions to see what kind of property fits you best — just like a real lead experience.\n\nWhat area or neighbourhood are you looking to buy in?`,
      }]);
      setStage("chat");
    } catch {
      setFormError("Server error — make sure the backend is running.");
    } finally {
      setCreatingLead(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || sending || !lead) return;
    const userMsg = input.trim();
    setInput("");
    setSending(true);

    setMessages((prev) => [...prev, { sender: "lead", content: userMsg }]);
    setTyping(true);

    try {
      const res = await fetch(`${API}/public/leads/${lead.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: "lead", content: userMsg }),
      });
      const data = await res.json();

      setLead(data.lead);

      if (data.ai_reply) {
        setTyping(false);
        setMessages((prev) => [...prev, { sender: "ai", content: data.ai_reply }]);
      } else {
        setTyping(false);
      }

      if (data.lead?.status === "qualified") {
        setTimeout(() => setStage("qualified"), 1200);
      }
    } catch {
      setTyping(false);
      setMessages((prev) => [...prev, { sender: "ai", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes keepr-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1.0); opacity: 1;   }
        }
        @keyframes keepr-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes keepr-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,163,66,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(201,163,66,0); }
        }
        .demo-bubble-enter { animation: keepr-fadein 0.35s ease both; }
        .demo-send-btn:hover { background: var(--navy) !important; color: var(--paper) !important; }
        .demo-input:focus { outline: 2px solid var(--navy); }
        .proof-bullet { transition: transform 0.2s; }
        .proof-bullet:hover { transform: translateX(4px); }
      `}</style>

      <div className="blueprint-grid" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 40px", borderBottom: "1px solid var(--border-light)",
          backgroundColor: "rgba(246,244,239,0.88)", backdropFilter: "blur(10px)",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "32px", height: "32px", border: "2px solid var(--navy)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "bold", color: "var(--navy)", fontFamily: "var(--font-display)",
              position: "relative",
            }}>
              K
              <div style={{
                position: "absolute", bottom: "-2px", right: "-2px",
                width: "11px", height: "11px",
                borderTop: "2px solid var(--navy)", borderLeft: "2px solid var(--navy)",
                backgroundColor: "var(--paper)",
              }} />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "0.05em", color: "var(--navy)" }}>
              KEEPR
            </span>
          </div>
          <Link href="/login">
            <button className="secondary" style={{ padding: "8px 20px" }}>Agent Login</button>
          </Link>
        </header>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 24px 80px", textAlign: "center" }}>

          <div style={{
            display: "inline-block", padding: "6px 16px",
            backgroundColor: "rgba(27,42,74,0.05)", border: "1px solid var(--navy)",
            fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 600,
            color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.15em",
            marginBottom: "28px", borderRadius: "4px",
          }}>
            Real Estate AI Front-Desk
          </div>

          <h1 style={{
            fontSize: "clamp(2.8rem, 7vw, 4.8rem)", fontWeight: 800, lineHeight: 1.05,
            letterSpacing: "-0.025em", color: "var(--navy)", marginBottom: "16px",
            fontFamily: "var(--font-display)",
          }}>
            Capture. Qualify. Book.
          </h1>

          <p style={{
            fontSize: "1.35rem", fontWeight: 400, color: "var(--ink)", opacity: 0.85,
            marginBottom: "48px", fontFamily: "var(--font-display)", fontStyle: "italic",
          }}>
            &quot;Never lose another lead.&quot;
          </p>

          {/* ── Proof bullets ──────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "56px", maxWidth: "540px", textAlign: "left" }}>
            {[
              "Every lead gets a reply in under a minute, day or night.",
              "See exactly what the AI learned — budget, area, timeline, intent.",
              "One click from qualified to booked.",
            ].map((text, i) => (
              <div key={i} className="proof-bullet" style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ color: "var(--brass)", fontSize: "1rem", marginTop: "2px", flexShrink: 0 }}>▸</span>
                <span style={{ color: "var(--ink)", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* ── Demo widget ────────────────────────────────────────────── */}
          <div style={{
            width: "100%", maxWidth: "640px",
            border: "2px solid var(--navy)", borderRadius: "10px",
            backgroundColor: "rgba(246,244,239,0.6)", backdropFilter: "blur(6px)",
            overflow: "hidden",
            boxShadow: "6px 6px 0 rgba(27,42,74,0.12)",
          }}>
            {/* Widget header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 20px", borderBottom: "1px solid var(--border-light)",
              backgroundColor: "rgba(27,42,74,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: stage === "chat" || stage === "qualified" ? "#22c55e" : "var(--border-light)",
                  animation: stage === "chat" ? "keepr-pulse 2s infinite" : "none",
                }} />
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--navy)", fontFamily: "var(--font-display)" }}>
                  Keepr AI — Live Demo
                </span>
              </div>
              <span className="mono-text" style={{ fontSize: "0.72rem", opacity: 0.55 }}>
                {stage === "idle" && "waiting"}
                {stage === "form" && "ready"}
                {stage === "chat" && `session · ${lead?.id?.slice(0, 8) ?? "..."}`}
                {stage === "qualified" && `score: ${lead?.lead_score ?? "—"}`}
              </span>
            </div>

            {/* ── Stage: idle ─────────────────────────────────────────── */}
            {stage === "idle" && (
              <div style={{ padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                <p style={{ color: "var(--ink)", lineHeight: 1.6, maxWidth: "380px", textAlign: "center" }}>
                  Experience qualification firsthand. You&rsquo;ll become the lead — our AI will ask you the same questions it asks every buyer.
                </p>
                <button
                  className="primary"
                  style={{ padding: "14px 36px", fontSize: "1rem", width: "100%", maxWidth: "300px" }}
                  onClick={() => setStage("form")}
                >
                  Try it yourself →
                </button>
              </div>
            )}

            {/* ── Stage: form ─────────────────────────────────────────── */}
            {stage === "form" && (
              <form onSubmit={handleStartDemo} style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <p className="mono-text" style={{ fontSize: "0.8rem", opacity: 0.7, marginBottom: "4px" }}>
                  // Enter your details to start
                </p>
                <div>
                  <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", color: "var(--navy)", marginBottom: "6px" }}>
                    Your name *
                  </label>
                  <input
                    className="demo-input"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    style={{
                      width: "100%", padding: "10px 14px",
                      border: "1.5px solid var(--border-light)", borderRadius: "6px",
                      fontFamily: "var(--font-body)", fontSize: "0.95rem",
                      backgroundColor: "var(--paper)", color: "var(--navy)", boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", color: "var(--navy)", marginBottom: "6px" }}>
                    Phone (optional)
                  </label>
                  <input
                    className="demo-input"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="e.g. +1 555-000-1234"
                    style={{
                      width: "100%", padding: "10px 14px",
                      border: "1.5px solid var(--border-light)", borderRadius: "6px",
                      fontFamily: "var(--font-body)", fontSize: "0.95rem",
                      backgroundColor: "var(--paper)", color: "var(--navy)", boxSizing: "border-box",
                    }}
                  />
                </div>
                {formError && (
                  <p style={{ color: "var(--signal-red)", fontSize: "0.85rem", margin: 0 }}>{formError}</p>
                )}
                <button
                  type="submit"
                  className="primary"
                  disabled={creatingLead}
                  style={{ padding: "12px 24px", marginTop: "4px" }}
                >
                  {creatingLead ? "Starting…" : "Start qualification →"}
                </button>
              </form>
            )}

            {/* ── Stage: chat ─────────────────────────────────────────── */}
            {stage === "chat" && (
              <div style={{ display: "flex", flexDirection: "column", height: "400px" }}>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className="demo-bubble-enter"
                      style={{
                        display: "flex",
                        justifyContent: m.sender === "lead" ? "flex-end" : "flex-start",
                      }}
                    >
                      {m.sender === "ai" && (
                        <div style={{
                          width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                          border: "1.5px solid var(--navy)", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: "0.7rem", fontWeight: 800,
                          color: "var(--navy)", marginRight: "8px", marginTop: "2px",
                          fontFamily: "var(--font-display)",
                        }}>AI</div>
                      )}
                      <div style={{
                        maxWidth: "76%",
                        padding: "10px 14px",
                        borderRadius: m.sender === "lead" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        backgroundColor: m.sender === "lead" ? "var(--navy)" : "rgba(27,42,74,0.07)",
                        color: m.sender === "lead" ? "var(--paper)" : "var(--navy)",
                        fontSize: "0.9rem",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {typing && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                        border: "1.5px solid var(--navy)", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "0.7rem", fontWeight: 800,
                        color: "var(--navy)", marginRight: "8px", marginTop: "2px",
                        fontFamily: "var(--font-display)",
                      }}>AI</div>
                      <div style={{
                        padding: "6px 14px", borderRadius: "14px 14px 14px 4px",
                        backgroundColor: "rgba(27,42,74,0.07)",
                      }}>
                        <TypingDots />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={{
                  display: "flex", gap: "10px", padding: "12px 16px",
                  borderTop: "1px solid var(--border-light)", backgroundColor: "rgba(246,244,239,0.9)",
                }}>
                  <input
                    className="demo-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer…"
                    disabled={sending}
                    style={{
                      flex: 1, padding: "9px 14px",
                      border: "1.5px solid var(--border-light)", borderRadius: "6px",
                      fontFamily: "var(--font-body)", fontSize: "0.9rem",
                      backgroundColor: "var(--paper)", color: "var(--navy)",
                    }}
                  />
                  <button
                    className="demo-send-btn"
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    style={{
                      padding: "9px 18px", border: "1.5px solid var(--navy)",
                      borderRadius: "6px", backgroundColor: "transparent",
                      color: "var(--navy)", fontWeight: 700, cursor: "pointer",
                      fontFamily: "var(--font-body)", fontSize: "0.9rem",
                      transition: "all 0.15s", opacity: sending || !input.trim() ? 0.4 : 1,
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {/* ── Stage: qualified ────────────────────────────────────── */}
            {stage === "qualified" && lead && (
              <div className="demo-bubble-enter" style={{ padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
                <div style={{ position: "relative" }}>
                  <ScoreRing score={lead.lead_score} />
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%, -55%)",
                    fontSize: "0.65rem", fontFamily: "var(--font-mono)",
                    color: "var(--navy)", opacity: 0.6, textAlign: "center", lineHeight: 1.3,
                  }}>
                    lead<br/>score
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--navy)", marginBottom: "8px", fontSize: "1.3rem" }}>
                    You&rsquo;re qualified, {lead.name.split(" ")[0]}!
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--ink)", opacity: 0.8, lineHeight: 1.5 }}>
                    In a real session, an agent would now book your viewing in one click. This is exactly what every lead experiences with Keepr.
                  </p>
                </div>

                {/* Mini lead card */}
                {(lead.budget || lead.area || lead.timeline) && (
                  <div style={{
                    width: "100%", maxWidth: "360px",
                    border: "1px solid var(--border-light)", borderRadius: "8px",
                    padding: "16px", backgroundColor: "rgba(27,42,74,0.03)",
                  }}>
                    <div className="mono-text" style={{ fontSize: "0.72rem", opacity: 0.5, marginBottom: "12px" }}>
                      // what the AI captured
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      {[
                        ["Budget", lead.budget ? `$${(lead.budget / 1000).toFixed(0)}k` : "—"],
                        ["Area", lead.area ?? "—"],
                        ["Timeline", lead.timeline ?? "—"],
                        ["Mortgage", lead.mortgage_status ?? "—"],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ fontSize: "0.72rem", opacity: 0.5, fontFamily: "var(--font-mono)", marginBottom: "2px" }}>{label}</div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--navy)" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                  <Link href="/login">
                    <button className="primary" style={{ padding: "12px 28px" }}>
                      See the dashboard →
                    </button>
                  </Link>
                  <button
                    className="secondary"
                    style={{ padding: "12px 28px" }}
                    onClick={() => { setStage("idle"); setLead(null); setMessages([]); setVisitorName(""); setVisitorPhone(""); }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Book a demo CTA */}
          <p style={{ marginTop: "28px", fontSize: "0.9rem", color: "var(--ink)", opacity: 0.7 }}>
            Want to see it with your real leads?{" "}
            <a
              href="https://cal.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--navy)", fontWeight: 700, textDecoration: "underline" }}
            >
              Book a 15-min demo
            </a>
          </p>
        </main>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer style={{
          padding: "28px 24px", borderTop: "1px solid var(--border-light)",
          textAlign: "center", backgroundColor: "rgba(27,42,74,0.02)",
        }}>
          <p className="mono-text" style={{ fontSize: "0.75rem", opacity: 0.5 }}>
            © {new Date().getFullYear()} Keepr. Built in alignment with the Keepr MVP Blueprint.
          </p>
        </footer>
      </div>
    </>
  );
}
