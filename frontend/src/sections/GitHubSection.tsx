import React from "react";
import { PROJECT_CONFIG } from "../config";
import { Code2, GitFork, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { GithubIcon } from "../components/GithubIcon";

export const GitHubSection: React.FC = () => {
  return (
    <section id="github">
      <div className="container">
        <div
          className="glass-card"
          style={{
            padding: "3.5rem 2.5rem",
            background: "linear-gradient(180deg, rgba(18, 24, 38, 0.9) 0%, rgba(10, 13, 20, 0.98) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            textAlign: "center",
            maxWidth: "960px",
            margin: "0 auto",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 189, 248, 0.1)",
          }}
        >
          <div
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "1rem",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem auto",
            }}
          >
            <GithubIcon size={32} color="#ffffff" />
          </div>

          <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Open Source & Transparent
          </h2>

          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "1.05rem",
              maxWidth: "680px",
              margin: "0 auto 2rem auto",
              lineHeight: 1.7,
            }}
          >
            OfflineConnect is fully open source under the MIT License. Inspect every line of the UDP discovery logic,
            TCP stream framing parser, automated test suites, and Electron packaging scripts.
          </p>

          {/* Action Buttons */}
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
              href={PROJECT_CONFIG.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: "0.85rem 1.75rem" }}
            >
              <GithubIcon size={18} />
              <span>Explore Source on GitHub</span>
              <ExternalLink size={14} />
            </a>

            <a
              href={`${PROJECT_CONFIG.repositoryUrl}/fork`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: "0.85rem 1.75rem" }}
            >
              <GitFork size={18} />
              <span>Fork Repository</span>
            </a>
          </div>

          {/* Project Details Badges */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1.25rem",
              textAlign: "left",
              background: "rgba(0, 0, 0, 0.3)",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
            className="github-info-grid"
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--accent-blue)", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                <Code2 size={16} /> Source Code
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                TypeScript ES2022 backend, zero-dependency client, Electron main and preload bridge.
              </p>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--accent-emerald)", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                <BookOpen size={16} /> Viva & Demo Docs
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Contains comprehensive evaluation guides (`docs/VIVA.md` and `docs/DEMO.md`).
              </p>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--accent-purple)", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                <ShieldCheck size={16} /> Automated Tests
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                22 node:test automated tests verifying presence timeouts, framing, and LAN simulations.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .github-info-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
