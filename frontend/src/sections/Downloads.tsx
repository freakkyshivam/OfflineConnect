import React from "react";
import { RELEASE_CONFIG } from "../config";
import { Download, Monitor, AlertCircle, ExternalLink, HardDrive } from "lucide-react";

export const Downloads: React.FC = () => {
  return (
    <section id="download" style={{ background: "var(--bg-secondary)" }}>
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <Download size={14} />
            <span>Official Releases</span>
          </div>
          <h2>Download OfflineConnect for Windows</h2>
          <p>
            Native Windows x64 binaries bundled with standalone Electron and Node.js runtime.
            No command line, npm, or technical configuration required.
          </p>
        </div>

        {/* Release Cards Grid */}
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto 3rem auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
          }}
          className="download-grid"
        >
          {/* Card 1: Windows NSIS Installer */}
          <div
            className="glass-card"
            style={{
              padding: "2.25rem",
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              background: "linear-gradient(180deg, rgba(18, 24, 38, 0.8) 0%, rgba(13, 17, 27, 0.95) 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "0.75rem",
                  background: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Monitor size={24} color="var(--accent-blue)" />
              </div>
              <span className="badge badge-blue">Recommended</span>
            </div>

            <h3 style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>
              OfflineConnect Setup
            </h3>
            <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: "1rem" }}>
              v{RELEASE_CONFIG.version} · {RELEASE_CONFIG.files.installer.size} · Windows x64
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.925rem", lineHeight: 1.6, marginBottom: "1.75rem" }}>
              Standard Windows NSIS installation wizard. Installs to your user profile, creates Desktop & Start Menu
              shortcuts, and registers clean uninstallation.
            </p>

            <div style={{ marginTop: "auto" }}>
              <a
                href={RELEASE_CONFIG.downloadUrls.installer}
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.85rem" }}
              >
                <Download size={18} />
                <span>Download Installer</span>
              </a>

              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-mono)",
                  textAlign: "center",
                  marginTop: "0.75rem",
                }}
              >
                {RELEASE_CONFIG.files.installer.filename}
              </div>
            </div>
          </div>

          {/* Card 2: Portable Version */}
          <div
            className="glass-card"
            style={{
              padding: "2.25rem",
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              background: "linear-gradient(180deg, rgba(18, 24, 38, 0.8) 0%, rgba(13, 17, 27, 0.95) 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "0.75rem",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HardDrive size={24} color="var(--accent-emerald)" />
              </div>
              <span className="badge badge-green">Zero Install</span>
            </div>

            <h3 style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>
              OfflineConnect Portable
            </h3>
            <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: "1rem" }}>
              v{RELEASE_CONFIG.version} · {RELEASE_CONFIG.files.portable.size} · Windows x64
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.925rem", lineHeight: 1.6, marginBottom: "1.75rem" }}>
              Single executable that runs immediately with zero system installation. Ideal for USB drives,
              college computer laboratories, and guest machines.
            </p>

            <div style={{ marginTop: "auto" }}>
              <a
                href={RELEASE_CONFIG.downloadUrls.portable}
                className="btn btn-emerald"
                style={{ width: "100%", padding: "0.85rem" }}
              >
                <Download size={18} />
                <span>Download Portable</span>
              </a>

              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-mono)",
                  textAlign: "center",
                  marginTop: "0.75rem",
                }}
              >
                {RELEASE_CONFIG.files.portable.filename}
              </div>
            </div>
          </div>
        </div>

        {/* Release Distribution Notice */}
        <div
          className="glass-card"
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "1.25rem 1.5rem",
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <AlertCircle size={20} color="var(--accent-cyan)" />
            <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Downloads are hosted via GitHub Releases to ensure integrity and fast CDN delivery.
            </div>
          </div>

          <a
            href={RELEASE_CONFIG.downloadUrls.releasesPage}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.875rem",
              color: "var(--accent-blue)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontWeight: 500,
            }}
          >
            <span>View All Releases on GitHub</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .download-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
