import React, { useState, useEffect } from "react";
import { PROJECT_CONFIG } from "../config";
import { Radio, Download, Menu, X } from "lucide-react";
import { GithubIcon } from "./GithubIcon";

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Networking", href: "#networking" },
    { name: "Tech Stack", href: "#tech-stack" },
    { name: "How to Demo", href: "#demo" },
    { name: "Limitations", href: "#limitations" },
  ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "all 0.25s ease",
        background: scrolled ? "rgba(10, 13, 20, 0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid transparent",
      }}
      aria-label="Main Navigation"
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "4.5rem",
        }}
      >
        {/* Brand Logo */}
        <a
          href="#"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            textDecoration: "none",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "0.5rem",
              background: "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 15px rgba(56, 189, 248, 0.4)",
            }}
          >
            <Radio size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.125rem", letterSpacing: "-0.01em" }}>
              {PROJECT_CONFIG.name}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
              LAN v{PROJECT_CONFIG.version}
            </div>
          </div>
        </a>

        {/* Desktop Nav Items */}
        <div
          style={{
            display: "none",
            gap: "1.75rem",
            alignItems: "center",
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              style={{
                color: "var(--text-muted)",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: 500,
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#ffffff")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-muted)")}
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <a
            href={PROJECT_CONFIG.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ padding: "0.55rem 0.95rem", fontSize: "0.85rem" }}
            aria-label="View OfflineConnect on GitHub"
          >
            <GithubIcon size={16} />
            <span className="hide-mobile">GitHub</span>
          </a>

          <a
            href="#download"
            className="btn btn-primary"
            style={{ padding: "0.55rem 1.1rem", fontSize: "0.85rem" }}
          >
            <Download size={16} />
            <span>Download</span>
          </a>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-main)",
              cursor: "pointer",
              padding: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="mobile-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            background: "rgba(10, 13, 20, 0.98)",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: "var(--text-main)",
                textDecoration: "none",
                fontSize: "1rem",
                fontWeight: 500,
                padding: "0.35rem 0",
              }}
            >
              {link.name}
            </a>
          ))}
        </div>
      )}

      <style>{`
        @media (min-width: 860px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
        }
        @media (max-width: 500px) {
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
};
