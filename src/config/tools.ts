/**
 * External tool download URLs and version configuration.
 * Centralized here so all download paths are easy to find and update.
 */

export const CDN_BASE = 'https://cdn.chat2db-ai.com/youclaw/tools'

// Bun runtime
export const BUN_VERSION = '1.2.15'
export const BUN_CDN_BASE = `${CDN_BASE}/bun`
export const BUN_GITHUB_BASE = `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}`

// Git for Windows
export const GIT_VERSION = '2.53.0.2'
export const GIT_CDN_URL = `${CDN_BASE}/git/Git-${GIT_VERSION}-64-bit.exe.zip`

// Git download URL for manual install (frontend)
export const GIT_DOWNLOAD_URL = GIT_CDN_URL
