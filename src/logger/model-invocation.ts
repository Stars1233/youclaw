import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getPaths } from '../config/index.ts'

export const MODEL_INVOCATION_LOG_DIRNAME = 'model-invocations'

export type ModelInvocationLogEvent = 'request' | 'response' | 'error'

export interface ModelInvocationLogEntry {
  timestamp?: string
  event: ModelInvocationLogEvent
  invocationId: string
  round?: number
  agentId: string
  chatId: string
  model: {
    provider: string
    modelId: string
    baseUrl?: string
  }
  session: {
    resumed: boolean
    sessionFile: string | null
  }
  payload?: unknown
  result?: {
    durationMs?: number
    outputLength?: number
    sessionId?: string
    sessionFile?: string | null
  }
  responseText?: string
  error?: {
    message: string
    partialOutput?: string
  }
}

export function getModelInvocationLogDir(): string {
  return resolve(getPaths().logs, MODEL_INVOCATION_LOG_DIRNAME)
}

export function getModelInvocationLogPath(entry: Pick<ModelInvocationLogEntry, 'timestamp' | 'event' | 'invocationId' | 'round'>): string {
  const timestamp = entry.timestamp ?? new Date().toISOString()
  const date = timestamp.split('T')[0] ?? 'unknown-date'
  const dirname = entry.invocationId
  const roundDir = typeof entry.round === 'number'
    ? `round-${String(entry.round).padStart(3, '0')}`
    : '_session'
  const filename = `${entry.event}.json`
  return resolve(getModelInvocationLogDir(), date, dirname, roundDir, filename)
}

export function writeModelInvocationLog(entry: ModelInvocationLogEntry): void {
  try {
    const timestamp = entry.timestamp ?? new Date().toISOString()
    const payload = {
      timestamp,
      ...entry,
    }
    const logPath = getModelInvocationLogPath({
      timestamp,
      event: entry.event,
      invocationId: entry.invocationId,
      round: entry.round,
    })
    mkdirSync(resolve(logPath, '..'), { recursive: true })
    writeFileSync(logPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
  } catch {
    // best-effort only
  }
}
