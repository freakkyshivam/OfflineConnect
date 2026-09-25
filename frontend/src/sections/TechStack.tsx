import React from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { Cpu, Layers, Terminal, Globe, Shield, Code, Server, AppWindow } from "lucide-react";

export const TechStack: React.FC = () => {
  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: gridRef, isRevealed: gridRevealed } = useScrollReveal();
  const stack = [
    {
      name: "Node.js (v22 LTS)",
      role: "Backend Runtime",
      desc: "Powers local socket lifecycle, OS network interface queries, and asynchronous I/O loops.",
      icon: <Server size={22} color="#22c55e" />,
    },
    {
      name: "TypeScript (v5.7)",
      role: "Static Typing & Core Logic",
      desc: "Provides strict type-safety across deviceStore structures, packet interfaces, and stream framing buffers.",
      icon: <Code size={22} color="#38bdf8" />,
    },
    {
      name: "node:net (TCP Sockets)",
      role: "Reliable P2P Messaging",
      desc: "Native Node.js TCP socket streams bound to port 8080 with newline delimiter buffering.",
      icon: <Terminal size={22} color="#a78bfa" />,
    },
    {
      name: "node:dgram (UDP Sockets)",
      role: "LAN Subnet Discovery",
      desc: "Native UDP sockets bound to port 4242 with SO_BROADCAST enabled for LAN beacon datagrams.",
      icon: <Cpu size={22} color="#38bdf8" />,
    },
    {
      name: "WebSocket (ws v8.18)",
      role: "Localhost IPC Bridge",
      desc: "Bridges the Node.js networking backend to the client UI over an internal 127.0.0.1 loopback socket.",
      icon: <Globe size={22} color="#f59e0b" />,
    },
    {
      name: "HTML5 / CSS3 / ES6 JS",
      role: "Application Interface",
      desc: "Lightweight, zero-framework chat client rendering glassmorphic UI, responsive layouts, and live presence badges.",
      icon: <Layers size={22} color="#ec4899" />,
    },
    {
      name: "Electron (v44.4)",
      role: "Desktop Framework",
      desc: "Packages the application into an isolated multi-process native desktop app with single-instance enforcement.",
      icon: <AppWindow size={22} color="#06b6d4" />,
    },
    {
      name: "React.js + Vite",
      role: "Documentation & Landing Web",
      desc: "Drives this standalone documentation website, built independently without runtime socket dependencies.",
      icon: <Shield size={22} color="#60a5fa" />,
    },
  ];

  return (
    <section id="tech-stack">
      <div className="container">
        <div
          ref={headerRef}
          className={`section-header scroll-reveal ${headerRevealed ? "is-revealed" : ""}`}
        >
          <div className="section-tag">
            <Layers size={14} />
            <span>Under The Hood</span>
          </div>
          <h2>Verified Technology Stack</h2>
          <p>
            OfflineConnect relies exclusively on native system libraries and proven web technologies.
            No heavy frameworks, external telemetry, or closed-source protocols.
          </p>
        </div>

        <div
          ref={gridRef}
          className={`grid-4 reveal-group ${gridRevealed ? "is-revealed" : ""}`}
        >
          {stack.map((item, idx) => (
            <div
              key={idx}
              className={`glass-card scroll-reveal delay-${(idx % 4) + 1}`}
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "2.75rem",
                  height: "2.75rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </div>

              <div>
                <h3 style={{ fontSize: "1.05rem", color: "#ffffff", marginBottom: "0.2rem" }}>
                  {item.name}
                </h3>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--accent-blue)",
                    fontFamily: "var(--font-mono)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {item.role}
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
