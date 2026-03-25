import { describe, test, beforeEach, expect } from 'bun:test'
import { existsSync, readFileSync, rmSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import '../../tests/setup.ts'
import {
  getModelInvocationLogDir,
  getModelInvocationLogPath,
  writeModelInvocationLog,
} from './model-invocation.ts'

const logDir = getModelInvocationLogDir()

describe('model invocation logger', () => {
  beforeEach(() => {
    if (existsSync(logDir)) {
      rmSync(logDir, { recursive: true, force: true })
    }
  })

  test('writes each provider request payload to a dedicated formatted json file', () => {
    const timestamp = '2026-03-25T20:30:40.123Z'
    writeModelInvocationLog({
      timestamp,
      event: 'request',
      invocationId: 'inv-1',
      round: 1,
      agentId: 'default',
      chatId: 'chat-1',
      model: {
        provider: 'anthropic',
        modelId: 'claude-sonnet-4-6',
        baseUrl: 'https://example.test/v1',
      },
      session: {
        resumed: false,
        sessionFile: null,
      },
      payload: {
        messages: [{ role: 'user', content: 'hello' }],
      },
    })

    const logPath = getModelInvocationLogPath({
      timestamp,
      event: 'request',
      invocationId: 'inv-1',
      round: 1,
    })

    expect(existsSync(logPath)).toBe(true)
    expect(statSync(logPath).isFile()).toBe(true)
    expect(readdirSync(resolve(logPath, '..')).sort()).toEqual(['request.json'])

    const raw = readFileSync(logPath, 'utf-8')
    const parsed = JSON.parse(raw) as {
      event: string
      invocationId: string
      payload: { messages: Array<{ content: string }> }
      timestamp?: string
    }

    expect(parsed.event).toBe('request')
    expect(parsed.invocationId).toBe('inv-1')
    expect(parsed.payload.messages[0]?.content).toBe('hello')
    expect(parsed.timestamp).toBe(timestamp)
    expect(raw.includes('\n  "event": "request"')).toBe(true)
  })
})
