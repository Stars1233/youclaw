import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getPaths } from '../config/index.ts'
import { getChatBrowserState, upsertChatBrowserState } from './store.ts'
import {
  enqueueExtensionBridgeCommand,
  getExtensionBridgeSession,
} from './extension-bridge.ts'
import type { BrowserRefAction } from './types.ts'

function createScreenshotPath(chatId: string): string {
  const dir = resolve(getPaths().data, 'browser-artifacts', chatId)
  mkdirSync(dir, { recursive: true })
  return resolve(dir, `browser-extension-${Date.now()}.png`)
}

type ExtensionSnapshotRef = {
  ref: string
  tag: string
  role?: string
  type?: string
  label?: string
  text?: string
  placeholder?: string
  value?: string
}

type ExtensionCommandResult = {
  url?: string | null
  title?: string | null
  text?: string
  refs?: ExtensionSnapshotRef[]
  closed?: boolean
  dataUrl?: string | null
}

async function persistChatPage(
  chatId: string,
  agentId: string,
  profileId: string,
  result: ExtensionCommandResult,
): Promise<void> {
  upsertChatBrowserState(chatId, {
    agentId,
    profileId,
    activeTargetId: null,
    activePageUrl: result.url ?? null,
    activePageTitle: result.title ?? null,
  })
}

function getActivePageUrl(chatId: string, profileId: string): string | null {
  const state = getChatBrowserState(chatId)
  if (!state || state.profileId !== profileId) return null
  return state.activePageUrl
}

function requireExtensionSession(profileId: string) {
  const session = getExtensionBridgeSession(profileId)
  if (!session) {
    throw new Error('Main browser extension is not connected')
  }
  return session
}

async function runExtensionCommand(
  profileId: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<ExtensionCommandResult> {
  requireExtensionSession(profileId)
  return enqueueExtensionBridgeCommand(profileId, action as Parameters<typeof enqueueExtensionBridgeCommand>[1], payload) as Promise<ExtensionCommandResult>
}

export async function openTabForExtensionChat(params: {
  chatId: string
  agentId: string
  profileId: string
  url?: string
}): Promise<{ url: string; title: string }> {
  const result = await runExtensionCommand(params.profileId, 'open_tab', {
    url: params.url,
  })
  await persistChatPage(params.chatId, params.agentId, params.profileId, result)
  return {
    url: result.url ?? '',
    title: result.title ?? '',
  }
}

export async function navigateForExtensionChat(params: {
  chatId: string
  agentId: string
  profileId: string
  url: string
}): Promise<{ url: string; title: string }> {
  const result = await runExtensionCommand(params.profileId, 'navigate', {
    url: params.url,
  })
  await persistChatPage(params.chatId, params.agentId, params.profileId, result)
  return {
    url: result.url ?? '',
    title: result.title ?? '',
  }
}

export async function snapshotForExtensionChat(params: {
  chatId: string
  agentId: string
  profileId: string
}): Promise<Record<string, unknown>> {
  const result = await runExtensionCommand(params.profileId, 'snapshot', {
    activePageUrl: getActivePageUrl(params.chatId, params.profileId),
  })
  await persistChatPage(params.chatId, params.agentId, params.profileId, result)
  return {
    title: result.title ?? '',
    url: result.url ?? '',
    text: result.text ?? '',
    refs: result.refs ?? [],
  }
}

export async function actForExtensionChat(params: {
  chatId: string
  agentId: string
  profileId: string
  ref: string
  action: BrowserRefAction
  text?: string
  option?: string
}): Promise<{ url: string; title: string }> {
  const result = await runExtensionCommand(params.profileId, 'act', {
    ref: params.ref,
    interaction: params.action,
    text: params.text,
    option: params.option,
  })
  await persistChatPage(params.chatId, params.agentId, params.profileId, result)
  return {
    url: result.url ?? '',
    title: result.title ?? '',
  }
}

export async function screenshotForExtensionChat(params: {
  chatId: string
  agentId: string
  profileId: string
  path?: string
}): Promise<{ path: string; url: string }> {
  const targetPath = params.path || createScreenshotPath(params.chatId)
  const result = await runExtensionCommand(params.profileId, 'screenshot', {})
  if (!result.dataUrl) {
    throw new Error('Browser extension did not return screenshot data')
  }
  const payload = result.dataUrl.replace(/^data:image\/png;base64,/, '')
  writeFileSync(targetPath, Buffer.from(payload, 'base64'))
  await persistChatPage(params.chatId, params.agentId, params.profileId, result)
  return {
    path: targetPath,
    url: result.url ?? '',
  }
}

export async function clickForExtensionChat(params: {
  chatId: string
  agentId: string
  profileId: string
  selector: string
}): Promise<{ url: string; title: string }> {
  const result = await runExtensionCommand(params.profileId, 'click', {
    selector: params.selector,
  })
  await persistChatPage(params.chatId, params.agentId, params.profileId, result)
  return {
    url: result.url ?? '',
    title: result.title ?? '',
  }
}

export async function typeForExtensionChat(params: {
  chatId: string
  agentId: string
  profileId: string
  selector: string
  text: string
}): Promise<{ url: string; title: string }> {
  const result = await runExtensionCommand(params.profileId, 'type', {
    selector: params.selector,
    text: params.text,
  })
  await persistChatPage(params.chatId, params.agentId, params.profileId, result)
  return {
    url: result.url ?? '',
    title: result.title ?? '',
  }
}

export async function pressKeyForExtensionChat(params: {
  chatId: string
  agentId: string
  profileId: string
  key: string
}): Promise<{ url: string; title: string }> {
  const result = await runExtensionCommand(params.profileId, 'press_key', {
    key: params.key,
  })
  await persistChatPage(params.chatId, params.agentId, params.profileId, result)
  return {
    url: result.url ?? '',
    title: result.title ?? '',
  }
}

export async function closeTabForExtensionChat(params: {
  chatId: string
  agentId: string
  profileId: string
  url?: string
}): Promise<{ closed: boolean }> {
  const result = await runExtensionCommand(params.profileId, 'close_tab', {
    url: params.url,
  })
  await persistChatPage(params.chatId, params.agentId, params.profileId, result)
  return {
    closed: !!result.closed,
  }
}
