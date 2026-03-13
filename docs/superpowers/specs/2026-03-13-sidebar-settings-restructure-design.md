# Sidebar & Settings Restructure Design

## Summary

Simplify the sidebar by keeping only core navigation items (New Chat, Agents, Cron Jobs, Memory) and moving all configuration/monitoring pages (Skills, Channels, Browser, Logs, System) into an enlarged Settings dialog as separate tabs.

## Motivation

The sidebar currently has 8 navigation items plus New Chat, making it crowded. The core workflow items (chat, agents, cron, memory) deserve prominent sidebar placement, while configuration and monitoring pages are better suited to a Settings dialog accessed on demand.

## Design

### Sidebar (AppSidebar.tsx)

**Before:** 8 nav items (Agents, Cron Jobs, Memory, Skills, Channels, Browser, Logs, System)

**After:** 3 nav items:
- `/agents` — Bot icon — Agents
- `/cron` — CalendarClock icon — Cron Jobs
- `/memory` — Brain icon — Memory

Remove imports: `Puzzle`, `Radio`, `Globe`, `ScrollText` (no longer needed in sidebar).

New Chat button and bottom Settings button remain unchanged.

### Settings Dialog (SettingsDialog.tsx)

**Size change:** `w-[640px] h-[520px]` → `w-[90vw] max-w-5xl h-[85vh]`

**Tab type:** `"general" | "about"` → `"general" | "skills" | "channels" | "browser" | "logs" | "system" | "about"`

**Tab list (7 tabs):**
1. General — existing GeneralPanel
2. Skills — existing Skills page component
3. Channels — existing Channels page component
4. Browser — existing BrowserProfiles page component
5. Logs — existing Logs page component
6. System — existing System page component
7. About — existing AboutPanel

Each tab renders the corresponding page component directly. The page components are self-contained and require no modification.

Tab labels reuse existing i18n keys (`t.nav.skills`, `t.nav.channels`, etc.) for the moved pages.

### Routes (App.tsx)

Remove 5 routes and their imports:
- `/skills` → Skills
- `/channels` → Channels
- `/browser` → BrowserProfiles
- `/logs` → Logs
- `/system` → System

### Content area padding

The moved page components (Skills, Channels, BrowserProfiles) use internal list+detail layouts with `border-r` dividers. The existing `p-6` padding on the dialog content area would inset these layouts incorrectly. Solution: use `p-0` for tabs that render full-bleed page components, keep `p-6` only for GeneralPanel and AboutPanel.

```tsx
<div className={cn("flex-1 overflow-hidden",
  ["general", "about"].includes(currentTab) ? "p-6 overflow-y-auto" : ""
)}>
```

### Tab rendering

Tabs **must** use conditional rendering (mount/unmount), not CSS visibility toggling, to ensure proper cleanup of intervals, SSE connections, and API polling in System and Channels components.

### Route fallback

Add a catch-all redirect in App.tsx to handle bookmarked/cached removed URLs:

```tsx
<Route path="*" element={<Navigate to="/" replace />} />
```

### Files Changed

| File | Change |
|------|--------|
| `web/src/components/layout/AppSidebar.tsx` | Remove 5 nav items, remove unused icon imports |
| `web/src/components/settings/SettingsDialog.tsx` | Enlarge dialog, add 5 tabs, conditional padding, import page components |
| `web/src/App.tsx` | Remove 5 routes/imports, add catch-all redirect |
| `e2e/tests/navigation.spec.ts` | Update tests for removed sidebar nav items |
| `e2e/tests/skills.spec.ts` | Navigate via Settings dialog instead of sidebar |
| `e2e/tests/logs.spec.ts` | Navigate via Settings dialog instead of sidebar |
| `e2e/tests/system.spec.ts` | Navigate via Settings dialog instead of sidebar |
| `e2e/tests/channels/helpers.ts` | Update `navigateToChannels()` to use Settings dialog |
| `e2e/tests/browser/helpers.ts` | Update `navigateToBrowser()` to use Settings dialog |

### No Changes Required

- Page components (Skills, Channels, BrowserProfiles, Logs, System) — used as-is
- i18n translations — reuse existing keys
- API client — no changes
- Backend — no changes

## Edge Cases

- Content area padding differs per tab type (p-6 for form tabs, p-0 for page component tabs)
- Tab rendering uses conditional mount/unmount to manage SSE/polling lifecycle
- System page's SSE EventSource uses hardcoded `/api/stream/system` — pre-existing issue in Tauri mode, not addressed here
- Catch-all redirect prevents blank pages for bookmarked removed routes
- `Settings` icon import remains in AppSidebar (used by bottom Settings button)
