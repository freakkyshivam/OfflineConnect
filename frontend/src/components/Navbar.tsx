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
    { name: "Developer", href: "#developer" },
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }} className="nav-actions">
          <a
            href={PROJECT_CONFIG.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary nav-action-btn"
            style={{ padding: "0.5rem 0.85rem", fontSize: "0.85rem" }}
            aria-label="View OfflineConnect on GitHub"
          >
            <GithubIcon size={16} />
            <span className="hide-mobile">GitHub</span>
          </a>

          <a
            href="#download"
            className="btn btn-primary nav-action-btn"
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          >
            <Download size={16} />
            <span className="hide-mobile-xs">Download</span>
          </a>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "0.5rem",
              color: "var(--text-main)",
              cursor: "pointer",
              padding: "0.45rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            className="mobile-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer"
          style={{
            background: "rgba(10, 13, 20, 0.98)",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
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
                padding: "0.5rem 0.5rem",
                borderRadius: "0.375rem",
                display: "flex",
                alignItems: "center",
                transition: "background 0.2s ease, color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.06)";
                (e.currentTarget as HTMLElement).style.color = "var(--accent-blue)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--text-main)";
              }}
            >
              {link.name}
            </a>
          ))}
        </div>
      )}

      <style>{`
        @keyframes drawerSlideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .mobile-drawer {
          animation: drawerSlideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (min-width: 960px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
        }
        @media (min-width: 960px) and (max-width: 1080px) {
          .desktop-nav {
            gap: 1rem !important;
          }
          .desktop-nav a {
            font-size: 0.85rem !important;
          }
        }
        @media (max-width: 500px) {
          .hide-mobile {
            display: none !important;
          }
        }
        @media (max-width: 420px) {
          .hide-mobile-xs {
            display: none !important;
          }
          .nav-action-btn {
            padding: 0.5rem 0.65rem !important;
          }
        }
        @media (max-width: 360px) {
          .nav-actions {
            gap: 0.375rem !important;
          }
          .nav-action-btn {
            padding: 0.45rem 0.55rem !important;
          }
        }
      `}</style>
    </nav>
  );
};
