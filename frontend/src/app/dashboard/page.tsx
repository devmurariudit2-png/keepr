'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DashboardStats {
  todays_leads: number;
  qualified: number;
  appointments: number;
  pending: number;
  conversion_rate: number;
}

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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CSV Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Demo Reset state
  const [resetting, setResetting] = useState(false);

  const router = useRouter();

  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    setImporting(true);
    setImportError(null);
    setImportSuccessMessage(null);

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch(`${API}/leads/import`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to import leads.");
      }

      const data = await res.json();
      setImportSuccessMessage(data.message || `Successfully imported leads.`);
      setImportFile(null);
      
      // Reload stats and leads
      fetchDashboardData(token);
      
      // Auto close after 2 seconds
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportSuccessMessage(null);
      }, 2000);
      
    } catch (err: any) {
      setImportError(err.message || "An error occurred during CSV import.");
    } finally {
      setImporting(false);
    }
  };

  const handleResetDemo = async () => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    if (!confirm("Are you sure you want to reset all data and seed 20 fresh leads?")) return;

    setResetting(true);
    try {
      const res = await fetch(`${API}/demo/reset`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to reset demo data.");
      
      // Reload stats and leads
      fetchDashboardData(token);
      alert("Successfully loaded 20 fresh demo leads!");
    } catch (err: any) {
      alert(err.message || "An error occurred during reset.");
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    // Check authentication
    const token = sessionStorage.getItem("access_token");
    const storedUser = sessionStorage.getItem("user");

    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(storedUser));
    fetchDashboardData(token);
  }, []);

  const fetchDashboardData = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch summary stats
      const statsRes = await fetch(`${API}/dashboard/summary`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!statsRes.ok) throw new Error("Failed to fetch dashboard stats.");
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch leads list
      const leadsRes = await fetch(`${API}/leads`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!leadsRes.ok) throw new Error("Failed to fetch leads list.");
      const leadsData = await leadsRes.json();
      setLeads(leadsData);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  if (loading && !stats) {
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
        LOADING_KEEPR_CONTROL_ROOM...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--paper)", display: "flex", flexDirection: "column" }}>
      {/* Dashboard Top Navigation */}
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
          <div style={{
            width: "28px",
            height: "28px",
            border: "2px solid var(--paper)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: "0.9rem",
            color: "var(--paper)",
            fontFamily: "var(--font-display)"
          }}>
            K
            <div style={{
              position: "absolute",
              bottom: "-2px",
              right: "-2px",
              width: "10px",
              height: "10px",
              borderTop: "2px solid var(--navy)",
              borderLeft: "2px solid var(--navy)",
              backgroundColor: "var(--brass)"
            }} />
          </div>
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.3rem",
            fontWeight: 800,
            letterSpacing: "0.05em"
          }}>KEEPR</span>
          <span className="mono-text" style={{ fontSize: "0.75rem", opacity: 0.7, marginLeft: "12px", borderLeft: "1px solid rgba(246,244,239,0.3)", paddingLeft: "12px" }}>
            v0.1_CONTROL_ROOM
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button 
            onClick={handleResetDemo}
            disabled={resetting}
            style={{
              backgroundColor: "transparent",
              border: "1px dashed var(--brass)",
              color: "var(--brass)",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            {resetting ? "RESETTING..." : "RESET_DEMO_DATA"}
          </button>
          <span className="mono-text" style={{ fontSize: "0.85rem" }}>
            AGENT: {user?.name.toUpperCase()}
          </span>
          <button 
            onClick={handleSignOut} 
            style={{
              backgroundColor: "rgba(246, 244, 239, 0.1)",
              border: "1px solid rgba(246, 244, 239, 0.4)",
              color: "var(--paper)",
              padding: "6px 12px",
              fontSize: "0.8rem"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(246, 244, 239, 0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(246, 244, 239, 0.1)")}
          >
            SIGN_OUT
          </button>
        </div>
      </header>

      {/* Blueprint Grid Header Section */}
      <div className="blueprint-grid" style={{
        padding: "40px 40px 24px 40px",
        borderBottom: "1px solid var(--border-light)"
      }}>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "baseline", gap: "12px" }}>
          Dashboard
          <span className="mono-text" style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--brass)" }}>
            [LIVE_DATA_FEED]
          </span>
        </h1>
        <p style={{ marginTop: "8px", fontSize: "0.95rem", opacity: 0.7, maxWidth: "600px" }}>
          Monitor incoming leads, qualify intent dynamically, and track booked appointments in real time.
        </p>
      </div>

      {/* Main Dashboard Workspace */}
      <main style={{ flex: 1, padding: "32px 40px", display: "flex", flexDirection: "column", gap: "32px" }}>
        
        {error && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: "rgba(193, 68, 59, 0.1)",
            border: "1px solid var(--signal-red)",
            borderRadius: "4px",
            color: "var(--signal-red)",
            fontSize: "0.9rem"
          }}>
            {error}
          </div>
        )}

        {/* Stats Panel (Section 8.2 & 7.4) */}
        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "20px"
        }}>
          {/* Today's Leads Card */}
          <div style={{
            backgroundColor: "var(--white)",
            border: "1px solid var(--border-light)",
            padding: "24px",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(27, 42, 74, 0.02)"
          }}>
            <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)", opacity: 0.7, marginBottom: "8px" }}>
              Today's Leads
            </h3>
            <div className="mono-text" style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--navy)" }}>
              {stats?.todays_leads ?? 0}
            </div>
          </div>

          {/* Qualified Leads Card */}
          <div style={{
            backgroundColor: "var(--white)",
            border: "1px solid var(--border-light)",
            padding: "24px",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(27, 42, 74, 0.02)"
          }}>
            <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)", opacity: 0.7, marginBottom: "8px" }}>
              Qualified
            </h3>
            <div className="mono-text" style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--brass)" }}>
              {stats?.qualified ?? 0}
            </div>
          </div>

          {/* Appointments Booked Card */}
          <div style={{
            backgroundColor: "var(--white)",
            border: "1px solid var(--border-light)",
            padding: "24px",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(27, 42, 74, 0.02)"
          }}>
            <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)", opacity: 0.7, marginBottom: "8px" }}>
              Appointments
            </h3>
            <div className="mono-text" style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--navy)" }}>
              {stats?.appointments ?? 0}
            </div>
          </div>

          {/* Pending Qualification Card */}
          <div style={{
            backgroundColor: "var(--white)",
            border: "1px solid var(--border-light)",
            padding: "24px",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(27, 42, 74, 0.02)"
          }}>
            <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)", opacity: 0.7, marginBottom: "8px" }}>
              Pending
            </h3>
            <div className="mono-text" style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--navy)" }}>
              {stats?.pending ?? 0}
            </div>
          </div>

          {/* Conversion Rate Card */}
          <div style={{
            backgroundColor: "var(--white)",
            border: "1px solid var(--border-light)",
            padding: "24px",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(27, 42, 74, 0.02)"
          }}>
            <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)", opacity: 0.7, marginBottom: "8px" }}>
              Conversion Rate
            </h3>
            <div className="mono-text" style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--navy)" }}>
              {stats ? Math.round(stats.conversion_rate * 100) : 0}%
            </div>
          </div>
        </section>

        {/* Leads List Workspace (Section 8.3) */}
        <section style={{
          backgroundColor: "var(--white)",
          border: "1px solid var(--border-light)",
          borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(27, 42, 74, 0.02)",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Leads Header Row */}
          <div style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-light)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--navy)" }}>
              Brokerage Leads
            </h2>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="primary" 
              style={{ padding: "8px 16px", fontSize: "0.9rem" }}
            >
              Import Leads (CSV)
            </button>
          </div>

          {/* Leads Table / List Container */}
          {leads.length === 0 ? (
            /* Empty State Copy (Section 8.3) */
            <div style={{
              padding: "64px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px"
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "2px dashed var(--border-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                color: "var(--navy)",
                opacity: 0.5,
                marginBottom: "8px"
              }}>
                📂
              </div>
              <p style={{ fontSize: "1.05rem", fontWeight: 500, color: "var(--navy)" }}>
                No leads yet — import your first 20 to see it work.
              </p>
              <p style={{ fontSize: "0.85rem", opacity: 0.6, maxWidth: "340px", margin: "0 auto" }}>
                Use the import button above to upload a spreadsheet of prospective buyers to kickstart the AI qualification loop.
              </p>
            </div>
          ) : (
            /* Leads Rows (Section 8.3) */
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(27, 42, 74, 0.02)", borderBottom: "1px solid var(--border-light)" }}>
                    <th style={{ padding: "12px 24px", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)" }}>Name</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)" }}>Source</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)" }}>Budget</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)" }}>Score</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)" }}>Status</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--navy)" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const statusColors: any = {
                      new: { bg: "rgba(27, 42, 74, 0.05)", text: "var(--navy)" },
                      qualifying: { bg: "rgba(184, 146, 63, 0.1)", text: "var(--brass)" },
                      qualified: { bg: "rgba(184, 146, 63, 0.2)", text: "var(--brass)" },
                      appointment_booked: { bg: "rgba(27, 42, 74, 0.1)", text: "var(--navy)" },
                      lost: { bg: "rgba(193, 68, 59, 0.1)", text: "var(--signal-red)" },
                    };
                    const color = statusColors[lead.status] || { bg: "#eee", text: "#333" };

                    return (
                      <tr key={lead.id} 
                          onClick={() => router.push(`/dashboard/${lead.id}`)}
                          style={{ borderBottom: "1px solid var(--border-light)", transition: "background-color 0.15s", cursor: "pointer" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(27, 42, 74, 0.02)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {/* Section 8.6: cold-lead amber dot — no reply in 24h */}
                            {(() => {
                              const isCold =
                                lead.last_message_at &&
                                !["qualified", "appointment_booked", "lost"].includes(lead.status) &&
                                Date.now() - new Date(lead.last_message_at).getTime() > 24 * 60 * 60 * 1000;
                              return isCold ? (
                                <span
                                  title="No reply in 24h — cold lead"
                                  style={{
                                    width: "9px",
                                    height: "9px",
                                    borderRadius: "50%",
                                    backgroundColor: "#d97706",
                                    flexShrink: 0,
                                    boxShadow: "0 0 0 2px rgba(217,119,6,0.25)",
                                    animation: "coldPulse 2.5s ease-in-out infinite",
                                  }}
                                />
                              ) : null;
                            })()}
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--navy)" }}>{lead.name || "Unnamed Lead"}</div>
                              <div className="mono-text" style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "2px" }}>{lead.phone || lead.email || "no_contact_info"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <span className="mono-text" style={{ fontSize: "0.85rem", opacity: 0.8 }}>{lead.source}</span>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <span className="mono-text" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                            {lead.budget ? `$${(lead.budget / 1000).toFixed(0)}k` : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <div className="mono-text" style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            border: `2px solid ${lead.lead_score >= 70 ? "var(--brass)" : "var(--border-light)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                            color: lead.lead_score >= 70 ? "var(--brass)" : "var(--navy)"
                          }}>
                            {lead.lead_score}
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            backgroundColor: color.bg,
                            color: color.text,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em"
                          }}>
                            {lead.status.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                            {lead.area ? `${lead.area} • ` : ""}{lead.bedrooms ? `${lead.bedrooms} bed` : ""}
                            {!lead.area && !lead.bedrooms && "No details extracted"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* CSV Import Modal Overlay */}
      {isImportModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(27, 42, 74, 0.6)",
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
            width: "100%",
            maxWidth: "500px",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            position: "relative"
          }}>
            <button 
              onClick={() => {
                setIsImportModalOpen(false);
                setImportError(null);
                setImportSuccessMessage(null);
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
                fontWeight: "bold"
              }}
            >
              ✕
            </button>

            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--navy)", marginBottom: "12px" }}>
              IMPORT_LEADS_CSV
            </h3>
            
            <p style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: "20px", lineHeight: 1.4 }}>
              Upload a comma-separated value (.csv) file containing your prospective real estate leads.
            </p>

            <div style={{
              backgroundColor: "var(--paper)",
              padding: "12px 16px",
              borderRadius: "4px",
              border: "1px solid var(--border-light)",
              fontSize: "0.8rem",
              marginBottom: "20px"
            }}>
              <strong>Suggested CSV Header Columns:</strong>
              <div className="mono-text" style={{ fontSize: "0.75rem", marginTop: "4px", color: "var(--brass)" }}>
                name, phone, email, budget, area, timeline, bedrooms, mortgage_status
              </div>
            </div>

            <form onSubmit={handleCSVImport}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{
                  border: "2px dashed var(--border-light)",
                  borderRadius: "6px",
                  padding: "24px",
                  textAlign: "center",
                  backgroundColor: "rgba(246, 244, 239, 0.2)",
                  cursor: "pointer"
                }}>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                    id="csv-file-input"
                    required
                  />
                  <label htmlFor="csv-file-input" style={{ cursor: "pointer" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📄</div>
                    <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: "0.9rem" }}>
                      {importFile ? importFile.name : "Click to select CSV file"}
                    </div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.5, marginTop: "4px" }}>
                      {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : "Files must end in .csv"}
                    </div>
                  </label>
                </div>

                {importError && (
                  <div style={{ color: "var(--signal-red)", fontSize: "0.85rem", fontWeight: 600 }}>
                    ⚠️ {importError}
                  </div>
                )}

                {importSuccessMessage && (
                  <div style={{ color: "var(--brass)", fontSize: "0.85rem", fontWeight: 600 }}>
                    ✓ {importSuccessMessage}
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button 
                    type="submit" 
                    className="primary" 
                    disabled={importing || !importFile} 
                    style={{ flex: 1, padding: "12px" }}
                  >
                    {importing ? "Importing Leads..." : "Upload & Parse"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportFile(null);
                      setImportError(null);
                    }} 
                    className="secondary" 
                    style={{ flex: 1, padding: "12px" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
