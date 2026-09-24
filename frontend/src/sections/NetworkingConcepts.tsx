import React from "react";
import { BookOpen, Radio, Shield, HeartPulse, SplitSquareVertical } from "lucide-react";

export const NetworkingConcepts: React.FC = () => {
  const concepts = [
    {
      title: "User Datagram Protocol (UDP)",
      subtitle: "Connectionless Peer Discovery & Broadcast",
      icon: <Radio size={24} color="var(--accent-blue)" />,
      badge: "UDP Datagrams",
      explanation:
        "Discovery uses UDP because nodes do not initially know peer IP addresses. UDP natively supports broadcasting to 255.255.255.255 without requiring a prior 3-way handshake. Each datagram is lightweight, stateless, and ideal for recurring beacon broadcasts.",
      points: [
        "Connectionless: zero handshake delay",
        "Subnet broadcast support (SO_BROADCAST)",
        "Tolerant to occasional dropped packets",
      ],
    },
    {
      title: "Transmission Control Protocol (TCP)",
      subtitle: "Stateful Reliable In-Order Delivery",
      icon: <Shield size={24} color="var(--accent-emerald)" />,
      badge: "TCP Sockets",
      explanation:
        "Chat messages require guaranteed delivery. TCP provides sequence tracking, automatic retransmissions (ACKs), sliding-window flow control, and connection state monitoring. A message sent over TCP will never arrive garbled, out of order, or partially duplicated.",
      points: [
        "Reliable 3-way handshake connection",
        "Automatic segment acknowledgement & retransmission",
        "Guaranteed byte-stream sequencing",
      ],
    },
    {
      title: "Heartbeat & Presence Mathematics",
      subtitle: "Absorbing Wi-Fi Frame Loss Without Jitter",
      icon: <HeartPulse size={24} color="#f43f5e" />,
      badge: "Hysteresis Window",
      explanation:
        "Wireless networks regularly drop frames. OfflineConnect sends heartbeats every 3 seconds (HEARTBEAT_INTERVAL) and only marks a peer offline after 10 seconds of complete silence (PEER_TIMEOUT). This 3.3x tolerance window prevents UI avatar flickering caused by transient Wi-Fi drops.",
      points: [
        "3,000ms heartbeat announcement interval",
        "10,000ms silence timeout before offline status",
        "Persistent store retains chat history across reconnects",
      ],
    },
    {
      title: "TCP Stream Framing (\\n Delimiter)",
      subtitle: "Resolving Coalescing & Fragmentation",
      icon: <SplitSquareVertical size={24} color="#a78bfa" />,
      badge: "RFC 896 Mitigation",
      explanation:
        "TCP treats data as a continuous stream of bytes, not discrete messages. Nagle's algorithm coalesces small writes into one packet, while large payloads fragment across MTU limits. OfflineConnect appends newline '\\n' delimiters and buffers incoming chunks, extracting discrete JSON objects cleanly.",
      points: [
        "Prevents message merging when multiple chats send rapidly",
        "Reassembles chunks split across TCP segment boundaries",
        "Flushes un-delimited buffers safely upon socket closure",
      ],
    },
  ];

  return (
    <section id="networking" style={{ background: "var(--bg-secondary)" }}>
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <BookOpen size={14} />
            <span>Computer Networking Fundamentals</span>
          </div>
          <h2>Networking Concepts in Practice</h2>
          <p>
            Designed as a computer networking educational project demonstrating real-world socket programming,
            transport-layer protocol selection, and stream abstraction handling.
          </p>
        </div>

        <div className="grid-2">
          {concepts.map((c, i) => (
            <div
              key={i}
              className="glass-card"
              style={{
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <div
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "0.625rem",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", marginBottom: "0.2rem" }}>{c.title}</h3>
                    <div style={{ fontSize: "0.825rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                      {c.subtitle}
                    </div>
                  </div>
                </div>
                <span className="badge badge-blue">{c.badge}</span>
              </div>

              <p style={{ color: "var(--text-muted)", fontSize: "0.925rem", lineHeight: 1.65 }}>
                {c.explanation}
              </p>

              <div
                style={{
                  background: "rgba(0, 0, 0, 0.25)",
                  borderRadius: "0.5rem",
                  padding: "0.85rem 1rem",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  marginTop: "auto",
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.4rem" }}>
                  Key Principles
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {c.points.map((pt, idx) => (
                    <li
                      key={idx}
                      style={{
                        fontSize: "0.825rem",
                        color: "var(--text-main)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--accent-blue)" }} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
