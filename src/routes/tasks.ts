import { Hono } from 'hono'
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getTaskRunLogs,
  saveMessage,
  upsertChat,
} from '../db/index.ts'
import type { AgentManager } from '../agent/manager.ts'
import type { AgentQueue } from '../agent/queue.ts'
import type { Scheduler } from '../scheduler/scheduler.ts'

export function createTasksRoutes(scheduler: Scheduler, agentManager: AgentManager, agentQueue: AgentQueue) {
  const app = new Hono()

  // GET /api/tasks — 任务列表
  app.get('/tasks', (c) => {
    const tasks = getTasks()
    return c.json(tasks)
  })

  // POST /api/tasks — 创建任务
  app.post('/tasks', async (c) => {
    const body = await c.req.json<{
      agentId: string
      chatId: string
      prompt: string
      scheduleType: string
      scheduleValue: string
      name?: string
      description?: string
    }>()

    // 验证 agent 存在
    const agent = agentManager.getAgent(body.agentId)
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404)
    }

    // 验证调度类型
    if (!['cron', 'interval', 'once'].includes(body.scheduleType)) {
      return c.json({ error: 'Invalid schedule type. Must be cron, interval, or once' }, 400)
    }

    const id = crypto.randomUUID()

    // 计算首次运行时间
    let nextRun: string
    if (body.scheduleType === 'once') {
      nextRun = body.scheduleValue // ISO 时间
    } else {
      const computed = scheduler.calculateNextRun({
        schedule_type: body.scheduleType,
        schedule_value: body.scheduleValue,
        last_run: null,
      })
      if (!computed) {
        return c.json({ error: 'Invalid schedule value' }, 400)
      }
      nextRun = computed
    }

    createTask({
      id,
      agentId: body.agentId,
      chatId: body.chatId,
      prompt: body.prompt,
      scheduleType: body.scheduleType,
      scheduleValue: body.scheduleValue,
      nextRun,
      name: body.name,
      description: body.description,
    })

    const task = getTask(id)
    return c.json(task, 201)
  })

  // PUT /api/tasks/:id — 更新任务
  app.put('/tasks/:id', async (c) => {
    const id = c.req.param('id')
    const existing = getTask(id)
    if (!existing) {
      return c.json({ error: 'Task not found' }, 404)
    }

    const body = await c.req.json<Partial<{
      prompt: string
      scheduleValue: string
      scheduleType: string
      status: string
      name: string
      description: string
    }>>()

    const updates: Parameters<typeof updateTask>[1] = {}
    if (body.prompt !== undefined) updates.prompt = body.prompt
    if (body.status !== undefined) updates.status = body.status
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.scheduleValue !== undefined || body.scheduleType !== undefined) {
      if (body.scheduleValue !== undefined) updates.scheduleValue = body.scheduleValue
      // 重新计算 nextRun
      const scheduleType = body.scheduleType ?? existing.schedule_type
      const scheduleValue = body.scheduleValue ?? existing.schedule_value
      const nextRun = scheduler.calculateNextRun({
        schedule_type: scheduleType,
        schedule_value: scheduleValue,
        last_run: existing.last_run,
      })
      updates.nextRun = nextRun
    }

    updateTask(id, updates)
    const updated = getTask(id)
    return c.json(updated)
  })

  // POST /api/tasks/:id/clone — 克隆任务
  app.post('/tasks/:id/clone', async (c) => {
    const id = c.req.param('id')
    const existing = getTask(id)
    if (!existing) {
      return c.json({ error: 'Task not found' }, 404)
    }

    const newId = crypto.randomUUID()
    const chatId = `task:${newId.slice(0, 8)}`
    const nextRun = scheduler.calculateNextRun({
      schedule_type: existing.schedule_type,
      schedule_value: existing.schedule_value,
      last_run: null,
    })

    createTask({
      id: newId,
      agentId: existing.agent_id,
      chatId,
      prompt: existing.prompt,
      scheduleType: existing.schedule_type,
      scheduleValue: existing.schedule_value,
      nextRun: nextRun ?? new Date().toISOString(),
      name: existing.name ? `${existing.name} (copy)` : undefined,
      description: existing.description ?? undefined,
    })

    const task = getTask(newId)
    return c.json(task, 201)
  })

  // DELETE /api/tasks/:id — 删除任务
  app.delete('/tasks/:id', (c) => {
    const id = c.req.param('id')
    const existing = getTask(id)
    if (!existing) {
      return c.json({ error: 'Task not found' }, 404)
    }

    deleteTask(id)
    return c.json({ ok: true })
  })

  // POST /api/tasks/:id/run — 手动立即执行
  app.post('/tasks/:id/run', async (c) => {
    const id = c.req.param('id')
    const task = getTask(id)
    if (!task) {
      return c.json({ error: 'Task not found' }, 404)
    }

    const runAt = new Date().toISOString()
    try {
      const result = await agentQueue.enqueue(task.agent_id, task.chat_id, task.prompt)

      // 保存执行结果到 messages 表
      const timestamp = new Date().toISOString()
      saveMessage({
        id: `${task.id}-${runAt}-user`,
        chatId: task.chat_id,
        sender: 'manual',
        senderName: 'Manual Run',
        content: task.prompt,
        timestamp: runAt,
        isFromMe: true,
        isBotMessage: false,
      })
      saveMessage({
        id: `${task.id}-${runAt}-bot`,
        chatId: task.chat_id,
        sender: task.agent_id,
        senderName: task.agent_id,
        content: result ?? '(no output)',
        timestamp,
        isFromMe: false,
        isBotMessage: true,
      })
      const taskName = (task as any).name || task.prompt.slice(0, 30)
      upsertChat(task.chat_id, task.agent_id, `Task: ${taskName}`, 'task')

      return c.json({ status: 'success', result })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return c.json({ status: 'error', error }, 500)
    }
  })

  // GET /api/tasks/:id/logs — 运行历史
  app.get('/tasks/:id/logs', (c) => {
    const id = c.req.param('id')
    const existing = getTask(id)
    if (!existing) {
      return c.json({ error: 'Task not found' }, 404)
    }

    const logs = getTaskRunLogs(id)
    return c.json(logs)
  })

  return app
}
