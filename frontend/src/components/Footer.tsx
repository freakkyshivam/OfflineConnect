import React from "react";
import { PROJECT_CONFIG, DEVELOPER_CONFIG } from "../config";
import { Radio, ExternalLink } from "lucide-react";
import { GithubIcon } from "./GithubIcon";
import { LinkedinIcon } from "./LinkedinIcon";

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
            gap: "2.5rem",
            marginBottom: "2.5rem",
          }}
        >
          {/* Brand info */}
          <div style={{ maxWidth: "400px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
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

            <div style={{ fontSize: "0.85rem", color: "var(--accent-blue)", fontWeight: 500, marginBottom: "0.6rem" }}>
              {PROJECT_CONFIG.tagline}
            </div>

            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1rem" }}>
              A college networking project exploring UDP, TCP, and peer-to-peer communication.
            </p>

            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Built & Developed by{" "}
              <a
                href={DEVELOPER_CONFIG.socials.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#ffffff", fontWeight: 600, textDecoration: "none" }}
              >
                {DEVELOPER_CONFIG.name}
              </a>
            </div>
          </div>

          {/* Quick Links & Socials */}
          <div style={{ display: "flex", gap: "3.5rem", flexWrap: "wrap" }}>
            {/* Developer Profiles */}
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#ffffff", marginBottom: "0.75rem" }}>
                Developer
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
                <li>
                  <a
                    href={DEVELOPER_CONFIG.socials.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <GithubIcon size={14} />
                    <span>GitHub</span>
                  </a>
                </li>
                <li>
                  <a
                    href={DEVELOPER_CONFIG.socials.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <span>Portfolio</span>
                    <ExternalLink size={12} style={{ opacity: 0.7 }} />
                  </a>
                </li>
                <li>
                  <a
                    href={DEVELOPER_CONFIG.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <LinkedinIcon size={14} color="#0a66c2" />
                    <span>LinkedIn</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Navigation */}
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

            {/* Resources */}
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

        {/* Bottom Bar: Copyright & Attribution */}
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
            © 2026 {DEVELOPER_CONFIG.name}. Licensed under {PROJECT_CONFIG.license} License.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <a
              href={DEVELOPER_CONFIG.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              GitHub
            </a>
            <span>•</span>
            <a
              href={DEVELOPER_CONFIG.socials.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              Portfolio
            </a>
            <span>•</span>
            <a
              href={DEVELOPER_CONFIG.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
