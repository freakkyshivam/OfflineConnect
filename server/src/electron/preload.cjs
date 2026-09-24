const { contextBridge, ipcRenderer } = require("electron");

// Secure, sandboxed bridge exposing only high-level environment info
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  onNetworkAlert: (callback) => {
    ipcRenderer.on("network-alert", (_event, message) => {
      callback(message);
    });
  },
});
