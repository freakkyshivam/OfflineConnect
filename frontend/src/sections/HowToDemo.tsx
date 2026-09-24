import React from "react";
import { PlayCircle, CheckCircle2, Laptop2, Wifi, Power, RotateCw, ArrowRight } from "lucide-react";

export const HowToDemo: React.FC = () => {
  const steps = [
    {
      num: "Step 1",
      title: "Download & Launch",
      desc: "Run OfflineConnect Setup or the Portable EXE on two Windows laptops (Device A and Device B). No Node.js or installation required.",
      icon: <Laptop2 size={20} color="var(--accent-blue)" />,
    },
    {
      num: "Step 2",
      title: "Connect to Same Local Network",
      desc: "Connect both laptops to the same Wi-Fi router or phone mobile hotspot. When prompted by Windows Defender Firewall, check 'Private networks' and click Allow.",
      icon: <Wifi size={20} color="var(--accent-cyan)" />,
    },
    {
      num: "Step 3",
      title: "Automatic Mutual Discovery",
      desc: "Within 1 to 3 seconds, Device B automatically appears in Device A's sidebar with a green ONLINE badge, and vice versa.",
      icon: <CheckCircle2 size={20} color="var(--accent-emerald)" />,
    },
    {
      num: "Step 4",
      title: "Direct One-to-One Chat",
      desc: "Click on the discovered peer to open the chat pane. Type messages in both directions over direct TCP sockets (:8080) with instant delivery.",
      icon: <PlayCircle size={20} color="#a78bfa" />,
    },
  ];

  return (
    <section id="demo">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <PlayCircle size={14} />
            <span>Demonstration Walkthrough</span>
          </div>
          <h2>How to Demo for Evaluation</h2>
          <p>
            A quick 3-minute walkthrough script to demonstrate automatic peer discovery, real-time messaging,
            and offline recovery before examiners.
          </p>
        </div>

        {/* 4 Step Setup Cards */}
        <div className="grid-4" style={{ marginBottom: "3rem" }}>
          {steps.map((s, i) => (
            <div
              key={i}
              className="glass-card"
              style={{
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
                  {s.num}
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
                  {s.icon}
                </div>
              </div>

              <h3 style={{ fontSize: "1.05rem" }}>{s.title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        {/* The Fault Tolerance Demo Case */}
        <div
          className="glass-card"
          style={{
            padding: "2rem 2.5rem",
            background: "linear-gradient(180deg, rgba(26, 35, 54, 0.7) 0%, rgba(15, 20, 32, 0.9) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ marginBottom: "1.5rem" }}>
            <span className="badge badge-purple" style={{ marginBottom: "0.5rem" }}>
              Key Demonstration Scenario
            </span>
            <h3 style={{ fontSize: "1.4rem" }}>
              Simulating Peer Disconnect & Automatic Recovery
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Show examiners how the system handles real-world wireless disconnections without crashing or losing chat context.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: "1.5rem",
              alignItems: "center",
            }}
            className="demo-flow-grid"
          >
            {/* Box 1: Closure */}
            <div
              style={{
                background: "rgba(244, 63, 94, 0.08)",
                border: "1px solid rgba(244, 63, 94, 0.25)",
                borderRadius: "0.75rem",
                padding: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                <Power size={20} color="#f43f5e" />
                <h4 style={{ color: "#fca5a5", fontSize: "1rem" }}>1. Device B Closes</h4>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                <li>• Device B exits or turns Wi-Fi off.</li>
                <li>• UDP heartbeats cease transmission.</li>
                <li>• Device A sweeps presence at 10s timeout.</li>
                <li>• Device A shows <span className="badge badge-blue">OFFLINE</span> badge.</li>
                <li>• Chat input disables cleanly to avoid socket writes.</li>
              </ul>
            </div>

            {/* Transition Arrow */}
            <div style={{ display: "flex", justifyContent: "center", color: "var(--accent-blue)" }}>
              <ArrowRight size={28} />
            </div>

            {/* Box 2: Recovery */}
            <div
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "0.75rem",
                padding: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                <RotateCw size={20} color="#34d399" />
                <h4 style={{ color: "#86efac", fontSize: "1rem" }}>2. Device B Relaunches</h4>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                <li>• Device B opens and sends UDP ANNOUNCE.</li>
                <li>• Device A captures broadcast within 3 seconds.</li>
                <li>• Device B flips back to <span className="badge badge-green">ONLINE</span>.</li>
                <li>• Chat thread re-arms automatically.</li>
                <li>• New messages send immediately over new socket.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .demo-flow-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
