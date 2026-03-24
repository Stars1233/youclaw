import { mkdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { Type } from '@mariozechner/pi-ai'
import type { ToolDefinition } from '@mariozechner/pi-coding-agent'
import { getPaths } from '../config/index.ts'
import { getLogger } from '../logger/index.ts'
import type { BrowserManager } from './manager.ts'
import {
  clickForChat,
  closeTabForChat,
  navigateForChat,
  openTabForChat,
  pressKeyForChat,
  screenshotForChat,
  snapshotForChat,
  typeForChat,
} from './pw-session.ts'

function createScreenshotPath(chatId: string): string {
  const dir = resolve(getPaths().data, 'browser-artifacts', chatId)
  mkdirSync(dir, { recursive: true })
  return resolve(dir, `browser-${Date.now()}.png`)
}

function createJsonTool<T extends Record<string, unknown>>(
  name: string,
  description: string,
  parameters: ToolDefinition['parameters'],
  run: (args: T) => Promise<unknown>,
  formatError: (args: T, message: string) => string,
): ToolDefinition {
  return {
    name: `mcp__browser__${name}`,
    label: `mcp__browser__${name}`,
    description,
    parameters,
    async execute(_toolCallId, args: T, _signal, _onUpdate, _ctx) {
      try {
        const result = await run(args)
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
          details: {},
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(formatError(args, msg))
      }
    },
  }
}

export function createBrowserMcpServer(params: {
  browserManager: BrowserManager
  chatId: string
  agentId: string
  profileId: string
}): ToolDefinition[] {
  const { browserManager, chatId, agentId, profileId } = params

  return [
    createJsonTool(
      'status',
      'Get the status of the current browser profile runtime.',
      Type.Object({}),
      async () => {
        const runtime = await browserManager.getProfileStatus(profileId)
        const profile = browserManager.getProfile(profileId)
        return { profile, runtime }
      },
      (_args, message) => `Failed to get browser status: ${message}`,
    ),
    createJsonTool(
      'list_tabs',
      'List browser tabs for the current profile.',
      Type.Object({}),
      async () => {
        const tabs = await browserManager.listTabs(profileId)
        return { tabs }
      },
      (_args, message) => `Failed to list tabs: ${message}`,
    ),
    createJsonTool(
      'open_tab',
      'Open a new browser tab. Optionally navigate to a URL immediately.',
      Type.Object({
        url: Type.Optional(Type.String({ description: 'Optional absolute URL to open in the new tab' })),
      }),
      async (args: { url?: string }) => openTabForChat(browserManager, { chatId, agentId, profileId, url: args.url }),
      (_args, message) => `Failed to open tab: ${message}`,
    ),
    createJsonTool(
      'navigate',
      'Navigate the current browser tab to a URL.',
      Type.Object({
        url: Type.String({ description: 'Absolute URL to navigate to' }),
      }),
      async (args: { url: string }) => navigateForChat(browserManager, { chatId, agentId, profileId, url: args.url }),
      (_args, message) => `Failed to navigate: ${message}`,
    ),
    createJsonTool(
      'snapshot',
      'Capture a lightweight text snapshot of the current tab.',
      Type.Object({}),
      async () => snapshotForChat(browserManager, { chatId, agentId, profileId }),
      (_args, message) => `Failed to capture snapshot: ${message}`,
    ),
    createJsonTool(
      'screenshot',
      'Capture a screenshot of the current tab.',
      Type.Object({
        path: Type.Optional(Type.String({ description: 'Optional absolute output path for the screenshot PNG' })),
      }),
      async (args: { path?: string }) => {
        const targetPath = args.path || createScreenshotPath(chatId)
        const result = await screenshotForChat(browserManager, { chatId, agentId, profileId, path: targetPath })
        return {
          ...result,
          filename: basename(result.path),
        }
      },
      (_args, message) => `Failed to take screenshot: ${message}`,
    ),
    createJsonTool(
      'click',
      'Click the first DOM element matching a CSS selector in the current tab.',
      Type.Object({
        selector: Type.String({ description: 'CSS selector for the element to click' }),
      }),
      async (args: { selector: string }) => clickForChat(browserManager, { chatId, agentId, profileId, selector: args.selector }),
      (args, message) => `Failed to click selector ${args.selector}: ${message}`,
    ),
    createJsonTool(
      'type',
      'Fill an input or textarea identified by a CSS selector in the current tab.',
      Type.Object({
        selector: Type.String({ description: 'CSS selector for the input element' }),
        text: Type.String({ description: 'Text to enter into the field' }),
      }),
      async (args: { selector: string; text: string }) => typeForChat(browserManager, { chatId, agentId, profileId, selector: args.selector, text: args.text }),
      (args, message) => `Failed to type into selector ${args.selector}: ${message}`,
    ),
    createJsonTool(
      'press_key',
      'Send a keyboard shortcut or key to the current tab.',
      Type.Object({
        key: Type.String({ description: 'Key name accepted by Playwright, for example Enter or Meta+L' }),
      }),
      async (args: { key: string }) => pressKeyForChat(browserManager, { chatId, agentId, profileId, key: args.key }),
      (args, message) => `Failed to press key ${args.key}: ${message}`,
    ),
    createJsonTool(
      'close_tab',
      'Close the current tab or a tab identified by URL.',
      Type.Object({
        url: Type.Optional(Type.String({ description: 'Optional exact tab URL to close' })),
      }),
      async (args: { url?: string }) => closeTabForChat(browserManager, { chatId, agentId, profileId, url: args.url }),
      (_args, message) => `Failed to close tab: ${message}`,
    ),
  ]
}

export function logBrowserToolRegistration(profileId: string): void {
  const logger = getLogger()
  logger.info({ profileId, category: 'browser' }, 'Built-in browser toolset registered')
}
