import React from "react";
import { PROJECT_CONFIG } from "../config";
import { Radio } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-subtle)",
        background: "#080a10",
        padding: "3.5rem 0 2rem 0",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "2rem",
            marginBottom: "2.5rem",
          }}
        >
          {/* Brand info */}
          <div style={{ maxWidth: "380px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "1.75rem",
                  height: "1.75rem",
                  borderRadius: "0.375rem",
                  background: "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Radio size={14} color="#ffffff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#ffffff" }}>
                {PROJECT_CONFIG.name}
              </span>
              <span className="badge badge-blue">v{PROJECT_CONFIG.version}</span>
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", lineHeight: 1.6 }}>
              A computer networking capstone project demonstrating decentralized peer-to-peer communication
              using native UDP and TCP sockets on local area networks.
            </p>
          </div>

          {/* Quick links */}
          <div style={{ display: "flex", gap: "3rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#ffffff", marginBottom: "0.75rem" }}>
                Navigation
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                <li><a href="#features" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Features</a></li>
                <li><a href="#how-it-works" style={{ color: "var(--text-muted)", textDecoration: "none" }}>How It Works</a></li>
                <li><a href="#networking" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Networking Concepts</a></li>
                <li><a href="#tech-stack" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Tech Stack</a></li>
              </ul>
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#ffffff", marginBottom: "0.75rem" }}>
                Resources
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                <li><a href="#download" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Download Binaries</a></li>
                <li><a href="#demo" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Demo Walkthrough</a></li>
                <li><a href="#limitations" style={{ color: "var(--text-muted)", textDecoration: "none" }}>System Boundaries</a></li>
                <li><a href={PROJECT_CONFIG.repositoryUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>GitHub Repository</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            paddingTop: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            fontSize: "0.8rem",
            color: "var(--text-dim)",
          }}
        >
          <div>
            © {new Date().getFullYear()} {PROJECT_CONFIG.name}. Licensed under {PROJECT_CONFIG.license} License.
          </div>
          <div>
            Built with pure socket engineering and React.js
          </div>
        </div>
      </div>
    </footer>
  );
};
