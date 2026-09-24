import React from "react";
import { PROJECT_CONFIG } from "../config";
import { Download, Radio, ServerOff, Terminal, ShieldCheck } from "lucide-react";
import { GithubIcon } from "../components/GithubIcon";

export const Hero: React.FC = () => {
  return (
    <section style={{ paddingTop: "4rem", paddingBottom: "5.5rem" }} className="bg-grid-pattern">
      <div className="container">
        {/* Main Hero Header */}
        <div style={{ textAlign: "center", maxWidth: "860px", margin: "0 auto 3.5rem auto" }}>
          <div className="section-tag" style={{ margin: "0 auto 1.25rem auto" }}>
            <Radio size={14} className="pulse-icon" />
            <span>Decentralized Peer-to-Peer LAN</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "1rem",
              background: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {PROJECT_CONFIG.name}
          </h1>

          <p
            style={{
              fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
              fontWeight: 600,
              color: "var(--accent-blue)",
              marginBottom: "1.25rem",
              letterSpacing: "-0.01em",
            }}
          >
            {PROJECT_CONFIG.tagline}
          </p>

          <p
            style={{
              fontSize: "1.125rem",
              color: "var(--text-muted)",
              lineHeight: 1.7,
              maxWidth: "700px",
              margin: "0 auto 2.5rem auto",
            }}
          >
            Discover nearby devices automatically and communicate over the local network using UDP
            discovery and TCP messaging, without relying on a cloud server.
          </p>

          {/* Action CTAs */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "2.5rem",
            }}
          >
            <a
              href="#download"
              className="btn btn-primary"
              style={{ padding: "0.85rem 1.75rem", fontSize: "1rem" }}
            >
              <Download size={18} />
              <span>Download for Windows</span>
            </a>

            <a
              href={PROJECT_CONFIG.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: "0.85rem 1.75rem", fontSize: "1rem" }}
            >
              <GithubIcon size={18} />
              <span>View on GitHub</span>
            </a>
          </div>

          {/* Key Facts Pill Badges */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
              fontSize: "0.875rem",
              color: "var(--text-dim)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <ServerOff size={15} color="var(--accent-emerald)" /> Zero Cloud Infrastructure
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Radio size={15} color="var(--accent-blue)" /> UDP Broadcast Discovery (:4242)
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Terminal size={15} color="var(--accent-purple)" /> Direct TCP Sockets (:8080)
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <ShieldCheck size={15} color="var(--accent-cyan)" /> Windows x64 Native Desktop
            </span>
          </div>
        </div>

        {/* Realistic Desktop App Mockup (CSS/HTML Visual Representation) */}
        <div style={{ maxWidth: "980px", margin: "0 auto" }}>
          <div
            className="glass-card"
            style={{
              padding: "0",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.1)",
            }}
          >
            {/* Window Titlebar */}
            <div
              style={{
                background: "#0d111a",
                padding: "0.75rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#ef4444" }} />
                <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#f59e0b" }} />
                <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#10b981" }} />
                <span
                  style={{
                    marginLeft: "0.75rem",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  OfflineConnect — Desktop App v1.0.0
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  color: "#34d399",
                  background: "rgba(16, 185, 129, 0.1)",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "9999px",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
                Ready on LAN (UDP :4242 | TCP :8080)
              </div>
            </div>

            {/* App Layout (Sidebar + Chat Area) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "280px 1fr",
                minHeight: "420px",
                background: "#0e1320",
              }}
              className="mockup-body"
            >
              {/* Left Sidebar: Discovered Devices */}
              <div
                style={{
                  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(13, 17, 27, 0.6)",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Nearby Devices</span>
                  <span className="badge badge-blue">2 Discovered</span>
                </div>

                {/* Device 1 (Active Peer) */}
                <div
                  style={{
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    borderRadius: "0.5rem",
                    padding: "0.75rem",
                    cursor: "default",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#ffffff" }}>
                      Pooja-PC
                    </div>
                    <span className="badge badge-green" style={{ fontSize: "0.65rem" }}>ONLINE</span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                      marginTop: "0.25rem",
                    }}
                  >
                    192.168.1.28:8080
                  </div>
                </div>

                {/* Device 2 (Offline Peer) */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: "0.5rem",
                    padding: "0.75rem",
                    opacity: 0.65,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--text-main)" }}>
                      Lab-Desktop-04
                    </div>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "0.25rem",
                        background: "rgba(148, 163, 184, 0.1)",
                        color: "var(--text-dim)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      OFFLINE
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      fontFamily: "var(--font-mono)",
                      marginTop: "0.25rem",
                    }}
                  >
                    192.168.1.42:8080 (10s sweep)
                  </div>
                </div>

                {/* My Identity Card */}
                <div
                  style={{
                    marginTop: "auto",
                    padding: "0.75rem",
                    background: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                    My Device
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-blue)" }}>
                    Shivam-Laptop
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    192.168.1.15
                  </div>
                </div>
              </div>

              {/* Right Panel: Chat Thread */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: "#0a0d14",
                }}
              >
                {/* Chat Header */}
                <div
                  style={{
                    padding: "0.85rem 1.25rem",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "#ffffff", fontSize: "0.95rem" }}>
                      Direct Chat with Pooja-PC
                    </span>
                    <span
                      style={{
                        marginLeft: "0.75rem",
                        fontSize: "0.75rem",
                        color: "var(--accent-blue)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      tcp://192.168.1.28:8080
                    </span>
                  </div>
                  <span className="badge badge-green">TCP Socket Connected</span>
                </div>

                {/* Chat Messages */}
                <div
                  style={{
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    flex: 1,
                  }}
                >
                  {/* Incoming bubble */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", maxWidth: "80%" }}>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-dim)",
                        marginBottom: "0.25rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Pooja-PC · 21:15:02
                    </div>
                    <div
                      style={{
                        background: "rgba(30, 41, 59, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "0.75rem 0.75rem 0.75rem 0.2rem",
                        padding: "0.75rem 1rem",
                        fontSize: "0.9rem",
                        color: "#f8fafc",
                        lineHeight: 1.5,
                      }}
                    >
                      Hello Shivam! My desktop discovered your laptop via UDP broadcast. Direct TCP socket established!
                    </div>
                  </div>

                  {/* Outgoing bubble */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: "80%", alignSelf: "flex-end" }}>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-dim)",
                        marginBottom: "0.25rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Shivam-Laptop (You) · 21:15:18
                    </div>
                    <div
                      style={{
                        background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                        borderRadius: "0.75rem 0.75rem 0.2rem 0.75rem",
                        padding: "0.75rem 1rem",
                        fontSize: "0.9rem",
                        color: "#ffffff",
                        lineHeight: 1.5,
                        boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
                      }}
                    >
                      Direct TCP packets running over port 8080 with newline stream framing. Zero internet, zero cloud servers!
                    </div>
                  </div>

                  {/* Protocol Demarcation Note */}
                  <div
                    style={{
                      textAlign: "center",
                      margin: "0.5rem auto",
                      padding: "0.3rem 0.85rem",
                      borderRadius: "9999px",
                      background: "rgba(56, 189, 248, 0.08)",
                      border: "1px solid rgba(56, 189, 248, 0.2)",
                      fontSize: "0.72rem",
                      color: "var(--accent-blue)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    TCP Stream Framed: JSON payload delimited by \n (RFC 896 coalescing protection)
                  </div>
                </div>

                {/* Input Bar (Display only) */}
                <div
                  style={{
                    padding: "0.85rem 1.25rem",
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                    background: "#0d111a",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: "0.6rem 1rem",
                      background: "rgba(255, 255, 255, 0.04)",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "var(--text-dim)",
                      fontSize: "0.85rem",
                    }}
                  >
                    Type a message over TCP to Pooja-PC...
                  </div>
                  <div
                    style={{
                      padding: "0.6rem 1rem",
                      background: "var(--accent-blue)",
                      borderRadius: "0.5rem",
                      color: "#ffffff",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      opacity: 0.9,
                    }}
                  >
                    Send
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
        .pulse-icon {
          animation: pulseGlow 2.5s infinite ease-in-out;
        }
        @media (max-width: 768px) {
          .mockup-body {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
