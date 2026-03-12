import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  apiFetch: (method: string, path: string, body?: string) =>
    ipcRenderer.invoke("api-fetch", { method, path, body }),

  subscribeEvents: (chatId: string) => ipcRenderer.invoke("subscribe-events", chatId),
  unsubscribeEvents: (subId: string) => ipcRenderer.invoke("unsubscribe-events", subId),
  onAgentEvent: (callback: (event: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on("agent-event", handler);
    return () => ipcRenderer.removeListener("agent-event", handler);
  },

  getVersion: () => ipcRenderer.invoke("get-version"),
  getPlatform: () => process.platform,

  getTheme: () => ipcRenderer.invoke("get-theme"),
  setTheme: (theme: string) => ipcRenderer.invoke("set-theme", theme),

  getApiKey: () => ipcRenderer.invoke("get-api-key"),
  setApiKey: (key: string) => ipcRenderer.invoke("set-api-key", key),

  getBaseUrl: () => ipcRenderer.invoke("get-base-url"),
  setBaseUrl: (url: string) => ipcRenderer.invoke("set-base-url", url),

  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  getAllowPrerelease: () => ipcRenderer.invoke("get-allow-prerelease"),
  setAllowPrerelease: (value: boolean) => ipcRenderer.invoke("set-allow-prerelease", value),

  onUpdateStatus: (callback: (status: string, data?: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: string, data?: unknown) =>
      callback(status, data);
    ipcRenderer.on("update-status", handler);
    return () => ipcRenderer.removeListener("update-status", handler);
  },
  onOpenSettings: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("open-settings", handler);
    return () => ipcRenderer.removeListener("open-settings", handler);
  },

});
