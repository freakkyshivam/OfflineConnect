import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { startBackend, BackendInstance } from "../index.js";

// Prevent multiple application instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log("Another instance of OfflineConnect is already running. Exiting.");
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let backend: BackendInstance | null = null;

function getPreloadPath(): string {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const thisDir = path.dirname(thisFile);
    return path.join(thisDir, "preload.cjs");
  } catch {
    return path.join(__dirname, "preload.cjs");
  }
}

async function createWindow() {
  try {
    // Start local networking services
    backend = await startBackend({
      httpPort: 3000,
      tcpPort: 8080,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Backend startup error:", errorMessage);

    dialog.showErrorBox(
      "OfflineConnect Startup Error",
      `Failed to initialize local networking services.\n\nError: ${errorMessage}\n\n` +
        "Windows Firewall may be blocking OfflineConnect network traffic, " +
        "or port 3000/8080/4242 is already in use by another application.",
    );
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1080,
    height: 740,
    minWidth: 800,
    minHeight: 560,
    title: "OfflineConnect",
    autoHideMenuBar: true,
    show: false, // show once ready-to-show to prevent white flash
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: getPreloadPath(),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Load the running application from local server
  const appUrl = `http://127.0.0.1:${backend.httpPort}`;
  console.log(`Loading desktop UI from ${appUrl}`);

  mainWindow.loadURL(appUrl).catch((err) => {
    console.error("Failed to load window URL:", err);
    dialog.showErrorBox(
      "Failed to Load Interface",
      `Could not connect to the local OfflineConnect server at ${appUrl}.\n` +
        "Please check if Windows Firewall is blocking internal loopback traffic.",
    );
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// When a second instance is launched, focus the existing instance
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Graceful shutdown: stop all networking and clean up background processes
app.on("before-quit", async (event) => {
  if (backend) {
    event.preventDefault();
    console.log("Shutting down OfflineConnect networking stack...");
    try {
      await backend.stop();
    } catch (e) {
      console.error("Error during backend stop:", e);
    }
    backend = null;
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
