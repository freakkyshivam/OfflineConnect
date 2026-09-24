# OfflineConnect Landing & Documentation Website

This directory contains the independent React.js informational and landing website for **OfflineConnect**.

---

## 🎯 Purpose

- Explains the OfflineConnect project, decentralized LAN architecture, and protocol design.
- Outlines the dual-phase networking model (UDP broadcast discovery + TCP direct chat).
- Explains networking concepts (framing, Nagle coalescing, MTU fragmentation, heartbeat hysteresis).
- Provides downloadable links to the official Windows x64 binaries (NSIS Installer and Portable Executable).
- Acts as a standalone static web application completely decoupled from the Node.js / Electron desktop app.

---

## 🛠️ Tech Stack

- **React 19**
- **Vite 6**
- **TypeScript 5.7**
- **Lucide Icons**
- **Custom Modern Technical CSS** (Responsive, Glassmorphic, Zero heavy UI libraries)

---

## 🚀 Running Locally

From within this `frontend/` directory:

```bash
# Install dependencies
npm install

# Start development server at http://localhost:5173
npm run dev

# Compile TypeScript and build for production (outputs to dist/)
npm run build

# Preview production build locally
npm run preview

# Run TypeScript typecheck
npm run typecheck
```

---

## 📦 Download Hosting & Release Configuration

The download links are centralized in:
`frontend/src/config.ts`

### Binary Hosting Design:
To keep the website repository lightweight, the 100+ MB Electron executables (`OfflineConnect Setup 1.0.0.exe` and `OfflineConnect 1.0.0.exe`) are **not** bundled directly into the static site assets. Instead, they are hosted as official GitHub Release assets.

### How to Publish the Release Assets on GitHub:
1. Push all project commits and tags to GitHub:
   ```bash
   git tag v1.0.0
   git push origin main --tags
   ```
2. Navigate to your GitHub repository:
   `https://github.com/freakkyshivam/OfflineConnect/releases/new`
3. Select or create tag: **`v1.0.0`**
4. Set release title: **`OfflineConnect v1.0.0 — LAN Peer-to-Peer Chat`**
5. Attach the two compiled Windows binaries located in `server/release-pkg/`:
   - `OfflineConnect Setup 1.0.0.exe` (~106 MB)
   - `OfflineConnect 1.0.0.exe` (~106 MB)
6. Click **Publish Release**.
7. In `frontend/src/config.ts`, verify or update `RELEASE_CONFIG.isPublished = true`.
