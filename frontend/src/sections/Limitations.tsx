import React from "react";
import { AlertTriangle, ShieldCheck, Network, Lock, Smartphone, WifiOff } from "lucide-react";

export const Limitations: React.FC = () => {
  const limitations = [
    {
      title: "Local Subnet Bound",
      desc: "UDP broadcast datagrams (:4242) do not traverse layer-3 IP routers. Both machines must be in the same broadcast domain (e.g. 192.168.1.0/24).",
      icon: <Network size={20} color="var(--accent-amber)" />,
    },
    {
      title: "Router AP / Client Isolation",
      desc: "Public campus, airport, or hotel Wi-Fi networks often enable Client Isolation at the router level, blocking peer-to-peer frames.",
      icon: <Lock size={20} color="var(--accent-amber)" />,
    },
    {
      title: "Windows Firewall Rules",
      desc: "Inbound UDP port 4242 and TCP port 8080 must be permitted on Private networks. If prompted on first launch, allow access.",
      icon: <ShieldCheck size={20} color="var(--accent-amber)" />,
    },
    {
      title: "Mobile Hotspot Nuances",
      desc: "Most Android and iOS mobile hotspots support local peer routing, but some carrier configurations enforce client isolation.",
      icon: <Smartphone size={20} color="var(--accent-amber)" />,
    },
    {
      title: "Zero Internet Routing",
      desc: "OfflineConnect has no NAT traversal (STUN/TURN/ICE) or cloud relay servers. It strictly communicates over the local LAN.",
      icon: <WifiOff size={20} color="var(--accent-amber)" />,
    },
    {
      title: "Explicit Scope Exclusions",
      desc: "Group chat, end-to-end encryption, file transfers, and read receipts are intentionally out of project scope to focus on socket fundamentals.",
      icon: <AlertTriangle size={20} color="var(--accent-amber)" />,
    },
  ];

  return (
    <section id="limitations" style={{ background: "var(--bg-secondary)" }}>
      <div className="container">
        <div className="section-header">
          <div className="section-tag" style={{ background: "rgba(245, 158, 11, 0.1)", color: "var(--accent-amber)", borderColor: "rgba(245, 158, 11, 0.25)" }}>
            <AlertTriangle size={14} />
            <span>Technical Scope & Edge Cases</span>
          </div>
          <h2>Known System Limitations</h2>
          <p>
            Honest, factual engineering documentation of the network boundaries and environmental constraints
            inherent to decentralized LAN protocols.
          </p>
        </div>

        <div className="grid-3">
          {limitations.map((item, idx) => (
            <div
              key={idx}
              className="glass-card"
              style={{
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
                border: "1px solid rgba(245, 158, 11, 0.15)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.5rem",
                    background: "rgba(245, 158, 11, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </div>
                <h3 style={{ fontSize: "1.05rem", color: "#ffffff" }}>{item.title}</h3>
              </div>

              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
