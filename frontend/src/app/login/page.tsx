'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed. Please verify credentials.");
      }

      // Save token & user details in sessionStorage for easy local state sync
      sessionStorage.setItem("access_token", data.access_token);
      sessionStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="blueprint-grid" style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px"
    }}>
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "2px solid var(--navy)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "1.2rem",
          color: "var(--navy)",
          fontFamily: "var(--font-display)"
        }}>
          K
          <div style={{
            position: "absolute",
            bottom: "-2px",
            right: "-2px",
            width: "14px",
            height: "14px",
            borderTop: "2px solid var(--navy)",
            borderLeft: "2px solid var(--navy)",
            backgroundColor: "var(--paper)"
          }} />
        </div>
        <span style={{ 
          fontFamily: "var(--font-display)", 
          fontSize: "2rem", 
          fontWeight: 800, 
          letterSpacing: "0.05em",
          color: "var(--navy)" 
        }}>KEEPR</span>
      </div>

      {/* Login Card */}
      <div style={{
        width: "100%",
        maxWidth: "420px",
        backgroundColor: "var(--white)",
        border: "1px solid var(--border-light)",
        boxShadow: "0 20px 40px rgba(27, 42, 74, 0.05)",
        borderRadius: "8px",
        padding: "40px 32px"
      }}>
        <h2 style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          color: "var(--navy)",
          marginBottom: "8px",
          textAlign: "center"
        }}>
          Sign In
        </h2>
        <p style={{
          fontSize: "0.9rem",
          color: "var(--ink)",
          opacity: 0.7,
          marginBottom: "32px",
          textAlign: "center"
        }}>
          Access the brokerage control room.
        </p>

        {error && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: "rgba(193, 68, 59, 0.1)",
            border: "1px solid var(--signal-red)",
            borderRadius: "4px",
            color: "var(--signal-red)",
            fontSize: "0.85rem",
            fontWeight: 500,
            marginBottom: "24px",
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Email Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="email" style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--navy)"
            }}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@keepr.ai"
              autoComplete="username"
              required
              enterKeyHint="next"
            />
          </div>

          {/* Password Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="current-password" style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--navy)"
              }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "0.8rem",
                  color: "var(--brass)",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {showPassword ? "Hide" : "Show"} password
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="current-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              enterKeyHint="done"
            />
          </div>

          {/* Sign In Button */}
          <button 
            type="submit" 
            className="primary" 
            disabled={loading}
            style={{ 
              marginTop: "12px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div style={{
          marginTop: "24px",
          textAlign: "center",
          borderTop: "1px solid var(--border-light)",
          paddingTop: "20px"
        }}>
          <Link href="/" style={{
            fontSize: "0.85rem",
            color: "var(--navy)",
            textDecoration: "underline",
            fontWeight: 500
          }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
