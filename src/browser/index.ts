export { BrowserManager } from './manager.ts'
export { createBrowserRoutes } from './routes.ts'
export { createBrowserMcpServer, logBrowserToolRegistration } from './mcp.ts'
export { createBrowserActionRouter } from './router.ts'
export { detectInstalledBrowsers } from './detect.ts'
export { buildBrowserMainBridgeState } from './main-bridge.ts'
export { getBrowserExtensionPackageInfo, buildBrowserExtensionZip, resolveBrowserExtensionDirectory } from './extension-package.ts'
export { disconnectAllBrowserSessions } from './pw-session.ts'
export {
  createBrowserProfile,
  updateBrowserProfile,
  getBrowserProfile,
  listBrowserProfiles,
  deleteBrowserProfile,
  ensureDefaultManagedProfile,
  getBrowserProfileRuntime,
  upsertBrowserProfileRuntime,
  getChatBrowserState,
  upsertChatBrowserState,
  clearChatBrowserState,
} from './store.ts'
export {
  DEFAULT_BROWSER_PROFILE_ID,
  DEFAULT_BROWSER_PROFILE_NAME,
} from './types.ts'
export type {
  BrowserDiscovery,
  BrowserDiscoveryEntry,
  BrowserDiscoveryKind,
  BrowserDriver,
  BrowserMainBridgeState,
  BrowserMainBridgeStatus,
  BrowserProfile,
  BrowserRefAction,
  BrowserProfileRuntime,
  BrowserRuntimeStatus,
  BrowserTarget,
  ChatBrowserState,
  CreateBrowserProfileInput,
  UpdateBrowserProfileInput,
} from './types.ts'
