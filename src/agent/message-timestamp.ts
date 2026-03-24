type TimestampLike = string | number | Date

const CRON_TIME_PATTERN = /Current time: /
const TIMESTAMP_ENVELOPE_PATTERN = /^\[[^\]]*\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?: [^\]]+)?\]\s/

function resolveLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function normalizeTimestamp(value: TimestampLike): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatTimestampEnvelope(timestamp: Date, timeZone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'shortOffset',
    }).formatToParts(timestamp)

    const map: Record<string, string> = {}
    for (const part of parts) {
      if (part.type !== 'literal') {
        map[part.type] = part.value
      }
    }

    if (!map.weekday || !map.year || !map.month || !map.day || !map.hour || !map.minute) {
      return null
    }

    const zone = map.timeZoneName || timeZone
    return `[${map.weekday} ${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute} ${zone}]`
  } catch {
    return null
  }
}

export function injectMessageTimestamp(
  message: string,
  opts: { timestamp: TimestampLike; timeZone?: string },
): string {
  if (!message.trim()) {
    return message
  }

  if (TIMESTAMP_ENVELOPE_PATTERN.test(message) || CRON_TIME_PATTERN.test(message)) {
    return message
  }

  const timestamp = normalizeTimestamp(opts.timestamp)
  if (!timestamp) {
    return message
  }

  const envelope = formatTimestampEnvelope(timestamp, opts.timeZone || resolveLocalTimezone())
  if (!envelope) {
    return message
  }

  return `${envelope} ${message}`
}
