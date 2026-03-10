import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { EventBus } from '../events/index.ts'

export function createStreamRoutes(eventBus: EventBus) {
  const stream = new Hono()

  // GET /api/stream/:chatId — 订阅某个 chat 的流式事件
  stream.get('/stream/:chatId', (c) => {
    const chatId = c.req.param('chatId')

    return streamSSE(c, async (sse) => {
      // 使用写入队列确保 SSE 事件按序发送，避免并发写入丢失
      let writeQueue = Promise.resolve()
      const enqueueWrite = (event: string, data: string) => {
        writeQueue = writeQueue.then(() => sse.writeSSE({ event, data })).catch(() => {})
      }

      const unsubscribe = eventBus.subscribe({ chatId }, (event) => {
        enqueueWrite(event.type, JSON.stringify(event))
      })

      // 发送连接确认
      await sse.writeSSE({
        event: 'connected',
        data: JSON.stringify({ chatId, timestamp: new Date().toISOString() }),
      })

      // 保持连接直到客户端断开
      try {
        // 等待中止信号
        await new Promise<void>((resolve) => {
          c.req.raw.signal.addEventListener('abort', () => resolve())
        })
      } finally {
        unsubscribe()
      }
    })
  })

  // GET /api/stream/system — 订阅系统级事件
  stream.get('/stream/system', (c) => {
    return streamSSE(c, async (sse) => {
      let writeQueue = Promise.resolve()
      const enqueueWrite = (event: string, data: string) => {
        writeQueue = writeQueue.then(() => sse.writeSSE({ event, data })).catch(() => {})
      }

      const unsubscribe = eventBus.subscribe({}, (event) => {
        enqueueWrite(event.type, JSON.stringify(event))
      })

      await sse.writeSSE({
        event: 'connected',
        data: JSON.stringify({ timestamp: new Date().toISOString() }),
      })

      try {
        await new Promise<void>((resolve) => {
          c.req.raw.signal.addEventListener('abort', () => resolve())
        })
      } finally {
        unsubscribe()
      }
    })
  })

  return stream
}
