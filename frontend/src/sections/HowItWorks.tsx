import React from "react";
import { GitCommit, ArrowLeftRight, Radio, MessageSquare, Clock, ShieldAlert, RotateCw } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      title: "UDP Broadcast Announcement",
      desc: "On launch, the device binds to UDP port 4242 and broadcasts an ANNOUNCE JSON datagram every 3,000ms containing its session ID, name, and TCP port.",
      icon: <Radio size={18} color="var(--accent-blue)" />,
    },
    {
      num: "02",
      title: "Subnet Detection & Handshake",
      desc: "Nearby nodes on the same subnet capture the broadcast, record the sender's IP and port in their local deviceStore, and send a unicast reply.",
      icon: <ArrowLeftRight size={18} color="var(--accent-cyan)" />,
    },
    {
      num: "03",
      title: "Continuous Presence Tracking",
      desc: "Every valid heartbeat updates the peer's lastSeen timestamp. The store normalizes IPv4 addresses and prevents duplicate sessions.",
      icon: <Clock size={18} color="var(--accent-purple)" />,
    },
    {
      num: "04",
      title: "Direct TCP Socket Connection",
      desc: "When a chat is initiated, an outbound TCP connection is established directly to the peer's IP on port 8080 without intermediate proxying.",
      icon: <MessageSquare size={18} color="var(--accent-emerald)" />,
    },
    {
      num: "05",
      title: "Silent Timeout & Offline Sweep",
      desc: "If no heartbeat arrives within 10 seconds (PEER_TIMEOUT), the sweep marks the peer offline and alerts the UI without purging chat history.",
      icon: <ShieldAlert size={18} color="#f43f5e" />,
    },
    {
      num: "06",
      title: "Automatic Rediscovery & Resumption",
      desc: "When the silent node resumes broadcasting, the first incoming packet flips its status back to online and re-arms the active chat session.",
      icon: <RotateCw size={18} color="var(--accent-amber)" />,
    },
  ];

  return (
    <section id="how-it-works">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <GitCommit size={14} />
            <span>Architecture & Flow</span>
          </div>
          <h2>How OfflineConnect Operates</h2>
          <p>
            A two-phase protocol combining lightweight UDP broadcast for presence and stateful TCP
            streams for guaranteed message delivery.
          </p>
        </div>

        {/* Visual Dual-Phase Protocol Diagram */}
        <div
          className="glass-card"
          style={{
            padding: "2.5rem 2rem",
            marginBottom: "3.5rem",
            background: "linear-gradient(180deg, rgba(18, 24, 38, 0.8) 0%, rgba(13, 17, 27, 0.95) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                color: "var(--accent-blue)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Protocol Phase Breakdown
            </span>
            <h3 style={{ fontSize: "1.5rem", marginTop: "0.4rem" }}>
              Discovery Phase vs Transmission Phase
            </h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2rem",
            }}
            className="protocol-grid"
          >
            {/* Phase 1: UDP Discovery */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.25)",
                borderRadius: "0.75rem",
                padding: "1.5rem",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <span style={{ fontWeight: 700, color: "var(--accent-blue)", fontSize: "1.1rem" }}>
                  Phase 1: UDP Peer Discovery
                </span>
                <span className="badge badge-blue">Port 4242</span>
              </div>

              {/* Node diagram */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.5rem 1rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "0.5rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#ffffff", fontWeight: 600 }}>Device A</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>192.168.1.15</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, padding: "0 1rem" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--accent-blue)", marginBottom: "0.2rem" }}>
                    UDP Broadcast (3s)
                  </span>
                  <div style={{ width: "100%", height: "2px", background: "var(--accent-blue)", position: "relative" }}>
                    <div style={{ position: "absolute", right: 0, top: "-4px", width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "8px solid var(--accent-blue)" }} />
                    <div style={{ position: "absolute", left: 0, top: "-4px", width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "8px solid var(--accent-blue)" }} />
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                    255.255.255.255:4242
                  </span>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#ffffff", fontWeight: 600 }}>Device B</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>192.168.1.28</div>
                </div>
              </div>

              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Broadcast datagrams announce session identity without requiring knowledge of peer IP addresses.
                Maintains live presence with a 10s silent timeout sweep.
              </p>
            </div>

            {/* Phase 2: TCP Chat */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.25)",
                borderRadius: "0.75rem",
                padding: "1.5rem",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <span style={{ fontWeight: 700, color: "var(--accent-emerald)", fontSize: "1.1rem" }}>
                  Phase 2: TCP Direct Chat
                </span>
                <span className="badge badge-green">Port 8080</span>
              </div>

              {/* Node diagram */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.5rem 1rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "0.5rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#ffffff", fontWeight: 600 }}>Device A</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Client Socket</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, padding: "0 1rem" }}>
                  <span style={{ fontSize: "0.7rem", color: "#34d399", marginBottom: "0.2rem" }}>
                    Framed TCP Stream (\n)
                  </span>
                  <div style={{ width: "100%", height: "2px", background: "#34d399", position: "relative" }}>
                    <div style={{ position: "absolute", right: 0, top: "-4px", width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "8px solid #34d399)" }} />
                    <div style={{ position: "absolute", left: 0, top: "-4px", width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "8px solid #34d399)" }} />
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                    Direct Unicast :8080
                  </span>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#ffffff", fontWeight: 600 }}>Device B</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Listening Server</div>
                </div>
              </div>

              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Direct bidirectional TCP connection provides in-order, lossless packet delivery. Newline-delimited
                framing resolves TCP byte-stream coalescing and packet fragmentation.
              </p>
            </div>
          </div>
        </div>

        {/* 6-Step Chronological Progression */}
        <div className="grid-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="glass-card"
              style={{
                padding: "1.75rem",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  {step.num}
                </span>
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.5rem",
                    background: "rgba(255, 255, 255, 0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step.icon}
                </div>
              </div>

              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{step.title}</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .protocol-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
