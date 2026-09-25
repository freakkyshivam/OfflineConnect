import React from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import {
  Radio,
  Wifi,
  MessageSquare,
  Activity,
  Heart,
  RotateCcw,
  RefreshCw,
  Users,
  Monitor,
  ServerOff,
} from "lucide-react";

export const Features: React.FC = () => {
  const { ref: headerRef, isRevealed: headerRevealed } = useScrollReveal();
  const { ref: gridRef, isRevealed: gridRevealed } = useScrollReveal();
  const featuresList = [
    {
      icon: <Radio size={22} color="var(--accent-blue)" />,
      title: "Automatic LAN Device Discovery",
      description:
        "Devices automatically detect one another on boot without manual IP entry, DNS configuration, or external directory services.",
      badge: "Port :4242",
    },
    {
      icon: <Wifi size={22} color="var(--accent-cyan)" />,
      title: "UDP Broadcast / Subnet Discovery",
      description:
        "Announces presence across the local subnet using broadcast datagrams, reaching all reachable nodes on the same physical broadcast domain.",
      badge: "UDP4 Broadcast",
    },
    {
      icon: <MessageSquare size={22} color="var(--accent-emerald)" />,
      title: "Real-Time TCP Messaging",
      description:
        "Direct socket connections established on-demand provide guaranteed, in-order text message transmission between peers.",
      badge: "Port :8080",
    },
    {
      icon: <Activity size={22} color="#a78bfa" />,
      title: "Online / Offline Presence",
      description:
        "Live presence states reflect whether peers are reachable on the network. State changes instantly reflect in the UI sidebar.",
      badge: "Real-time State",
    },
    {
      icon: <Heart size={22} color="#f43f5e" />,
      title: "Heartbeat-Based Presence Detection",
      description:
        "Regular 3-second heartbeat announcements paired with a 10-second sweep interval filter out transient Wi-Fi drops while catching offline nodes.",
      badge: "3s Pulse / 10s Sweep",
    },
    {
      icon: <RotateCcw size={22} color="var(--accent-amber)" />,
      title: "Automatic Rediscovery",
      description:
        "When an offline machine wakes up, reconnects to Wi-Fi, or relaunches, it is instantly recognized without restarting the application.",
      badge: "Zero Manual Refresh",
    },
    {
      icon: <RefreshCw size={22} color="var(--accent-blue)" />,
      title: "Automatic Reconnect",
      description:
        "Active chat threads automatically recover outbound sockets when a peer is rediscovered, allowing conversations to resume immediately.",
      badge: "Seamless Resume",
    },
    {
      icon: <Users size={22} color="#34d399" />,
      title: "One-to-One Direct Chat",
      description:
        "Direct peer-to-peer communication channel with strict chronological message ordering and individual delivery tracking.",
      badge: "1:1 P2P",
    },
    {
      icon: <Monitor size={22} color="var(--accent-cyan)" />,
      title: "Windows Desktop Application",
      description:
        "Packaged as a standalone Windows x64 desktop application with single-instance protection, native window controls, and graceful teardown.",
      badge: "Electron + NSIS",
    },
    {
      icon: <ServerOff size={22} color="var(--accent-emerald)" />,
      title: "No Cloud Server Required",
      description:
        "Zero internet dependency. Operates entirely off-grid during ISP outages, remote field environments, or private laboratory networks.",
      badge: "100% Offline",
    },
  ];

  return (
    <section id="features" style={{ background: "var(--bg-secondary)" }}>
      <div className="container">
        <div
          ref={headerRef}
          className={`section-header scroll-reveal ${headerRevealed ? "is-revealed" : ""}`}
        >
          <div className="section-tag">
            <Activity size={14} />
            <span>Verified Capabilities</span>
          </div>
          <h2>Implemented Core Features</h2>
          <p>
            OfflineConnect is built strictly on verified local networking fundamentals with no external
            cloud dependencies or mock simulations.
          </p>
        </div>

        <div
          ref={gridRef}
          className={`grid-3 reveal-group ${gridRevealed ? "is-revealed" : ""}`}
        >
          {featuresList.map((feature, idx) => (
            <div
              key={idx}
              className={`glass-card scroll-reveal delay-${(idx % 6) + 1}`}
              style={{
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "0.625rem",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {feature.icon}
                </div>
                <span className="badge badge-blue">{feature.badge}</span>
              </div>

              <div>
                <h3 style={{ fontSize: "1.15rem", marginBottom: "0.5rem" }}>{feature.title}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.925rem", lineHeight: 1.6 }}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
