/**
 * OfflineConnect Landing Website Configuration
 *
 * All URLs and version references are centralized here.
 * When a new GitHub release is created, update `RELEASE_VERSION`
 * and the download URLs will automatically update.
 */

export const PROJECT_CONFIG = {
  name: "OfflineConnect",
  version: "1.0.0",
  tagline: "LAN-based Real-Time Chat & Presence System",
  description:
    "Discover nearby devices automatically and communicate over the local network using UDP discovery and TCP messaging, without relying on a cloud server.",
  repositoryUrl: "https://github.com/freakkyshivam/OfflineConnect",
  author: "Shivam Chaudhary",
  license: "MIT",
};

export const DEVELOPER_CONFIG = {
  name: "Shivam Chaudhary",
  role: "Student & Backend Developer",
  description:
    "OfflineConnect is a college networking project built to explore UDP device discovery, TCP socket communication, heartbeat-based presence, and peer-to-peer communication over a local network.",
  socials: {
    github: "https://github.com/freakkyshivam",
    portfolio: "https://shivam-dev.in",
    linkedin: "https://www.linkedin.com/in/shivamchaudhary-dev",
  },
};

/**
 * Release Download URLs
 *
 * NOTE ON GITHUB RELEASES:
 * The Windows binaries (`OfflineConnect Setup 1.0.0.exe` and `OfflineConnect 1.0.0.exe`)
 * are built locally in `server/release-pkg/`.
 * Once published to GitHub Releases under tag `v1.0.0`, the official download
 * URLs follow standard GitHub asset conventions:
 *   https://github.com/freakkyshivam/OfflineConnect/releases/download/v1.0.0/<filename>
 *
 * If the release has not yet been published to GitHub Releases, the buttons will link
 * to the releases page and display a notice with instructions.
 */
export const RELEASE_CONFIG = {
  // Flag indicating if release assets have been published on GitHub
  isPublished: true,

  version: "1.0.0",
  releaseTag: "v1.0.0",

  // Official GitHub release asset URLs (will become active once release is published on GitHub)
  downloadUrls: {
    installer:
      "https://github.com/freakkyshivam/OfflineConnect/releases/download/v1.0.0/OfflineConnect.Setup.1.0.0.exe",
    portable:
      "https://github.com/freakkyshivam/OfflineConnect/releases/download/v1.0.0/OfflineConnect.1.0.0.exe",
    releasesPage: "https://github.com/freakkyshivam/OfflineConnect/releases",
    github: "https://github.com/freakkyshivam/OfflineConnect",
  },

  // Binary metadata
  files: {
    installer: {
      filename: "OfflineConnect Setup 1.0.0.exe",
      size: "~106 MB",
      type: "NSIS Installer",
      target: "Windows 10 / 11 (x64)",
    },
    portable: {
      filename: "OfflineConnect 1.0.0.exe",
      size: "~106 MB",
      type: "Portable Standalone Executable",
      target: "Windows 10 / 11 (x64)",
    },
  },
};
