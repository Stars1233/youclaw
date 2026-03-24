import { describe, expect, test } from 'bun:test'
import { injectMessageTimestamp } from '../src/agent/message-timestamp.ts'

describe('injectMessageTimestamp', () => {
  test('prepends a compact timestamp envelope', () => {
    const result = injectMessageTimestamp('hello', {
      timestamp: '2026-03-24T12:01:00.000Z',
      timeZone: 'Asia/Shanghai',
    })

    expect(result).toBe('[Tue 2026-03-24 20:01 GMT+8] hello')
  })

  test('does not double-stamp timestamped messages', () => {
    const input = '[Tue 2026-03-24 20:01 GMT+8] hello'

    expect(injectMessageTimestamp(input, {
      timestamp: '2026-03-24T12:01:00.000Z',
      timeZone: 'Asia/Shanghai',
    })).toBe(input)
  })

  test('does not alter cron-style current time messages', () => {
    const input = 'Check logs.\nCurrent time: Tuesday, March 24th, 2026 — 20:01 (Asia/Shanghai)'

    expect(injectMessageTimestamp(input, {
      timestamp: '2026-03-24T12:01:00.000Z',
      timeZone: 'Asia/Shanghai',
    })).toBe(input)
  })

  test('returns the original message when timestamp is invalid', () => {
    expect(injectMessageTimestamp('hello', {
      timestamp: 'not-a-date',
      timeZone: 'Asia/Shanghai',
    })).toBe('hello')
  })
})
