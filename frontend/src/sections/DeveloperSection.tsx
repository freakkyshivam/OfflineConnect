import React from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { DEVELOPER_CONFIG } from "../config";
import { Globe, ExternalLink, Code2 } from "lucide-react";
import { GithubIcon } from "../components/GithubIcon";
import { LinkedinIcon } from "../components/LinkedinIcon";

export const DeveloperSection: React.FC = () => {
  const { ref: cardRef, isRevealed } = useScrollReveal();

  return (
    <section id="developer" style={{ padding: "4rem 0", background: "var(--bg-secondary)" }}>
      <div className="container">
        <div
          ref={cardRef}
          className={`glass-card developer-card scroll-reveal ${isRevealed ? "is-revealed" : ""}`}
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            padding: "2.25rem 2.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2rem",
            flexWrap: "wrap",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "linear-gradient(180deg, rgba(18, 24, 38, 0.75) 0%, rgba(13, 17, 27, 0.9) 100%)",
          }}
        >
          {/* Left: Info */}
          <div className="developer-info" style={{ flex: 1, minWidth: "260px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <span className="section-tag" style={{ margin: 0, padding: "0.2rem 0.65rem", fontSize: "0.75rem" }}>
                <Code2 size={13} />
                <span>Developer</span>
              </span>
            </div>

            <h3 style={{ fontSize: "1.4rem", color: "#ffffff", marginBottom: "0.25rem" }}>
              {DEVELOPER_CONFIG.name}
            </h3>

            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--accent-blue)",
                fontFamily: "var(--font-mono)",
                marginBottom: "0.85rem",
              }}
            >
              {DEVELOPER_CONFIG.role}
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.925rem", lineHeight: 1.6 }}>
              {DEVELOPER_CONFIG.description}
            </p>
          </div>

          {/* Right: Social & Profile Links */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              minWidth: "180px",
            }}
            className="developer-links"
          >
            <a
              href={DEVELOPER_CONFIG.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", justifyContent: "flex-start" }}
            >
              <GithubIcon size={16} />
              <span>GitHub</span>
              <ExternalLink size={13} style={{ marginLeft: "auto", opacity: 0.6 }} />
            </a>

            <a
              href={DEVELOPER_CONFIG.socials.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", justifyContent: "flex-start" }}
            >
              <Globe size={16} color="var(--accent-cyan)" />
              <span>Portfolio</span>
              <ExternalLink size={13} style={{ marginLeft: "auto", opacity: 0.6 }} />
            </a>

            <a
              href={DEVELOPER_CONFIG.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", justifyContent: "flex-start" }}
            >
              <LinkedinIcon size={16} color="#0a66c2" />
              <span>LinkedIn</span>
              <ExternalLink size={13} style={{ marginLeft: "auto", opacity: 0.6 }} />
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .developer-card {
            padding: 1.75rem 1.25rem !important;
            gap: 1.5rem !important;
          }
          .developer-info {
            min-width: 0 !important;
          }
          .developer-links {
            width: 100% !important;
            flex-direction: column !important;
            gap: 0.65rem !important;
            min-width: 0 !important;
          }
          .developer-links a {
            width: 100% !important;
          }
        }
        @media (max-width: 480px) {
          .developer-card {
            padding: 1.5rem 1rem !important;
          }
        }
      `}</style>
    </section>
  );
};
