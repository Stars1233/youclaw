import { Cron } from 'croner'
import { getLogger } from '../logger/index.ts'
import { getTasksDueBy, updateTask, saveTaskRunLog, saveMessage, upsertChat } from '../db/index.ts'
import type { ScheduledTask } from '../db/index.ts'
import type { AgentQueue } from '../agent/queue.ts'
import type { AgentManager } from '../agent/manager.ts'
import type { EventBus } from '../events/index.ts'

export class Scheduler {
  private intervalId: Timer | null = null

  constructor(
    private agentQueue: AgentQueue,
    private agentManager: AgentManager,
    private eventBus: EventBus,
  ) {}

  /** 启动调度循环（每 30 秒检查一次） */
  start(): void {
    const logger = getLogger()
    if (this.intervalId) return

    logger.info('Scheduler 已启动，每 30 秒检查一次')
    // 立即执行一次
    this.tick().catch((err) => {
      logger.error({ error: String(err) }, 'Scheduler tick 失败')
    })

    this.intervalId = setInterval(() => {
      this.tick().catch((err) => {
        logger.error({ error: String(err) }, 'Scheduler tick 失败')
      })
    }, 30_000)
  }

  /** 停止调度 */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      getLogger().info('Scheduler 已停止')
    }
  }

  /** 检查并执行到期任务 */
  private async tick(): Promise<void> {
    const now = new Date().toISOString()
    const dueTasks = getTasksDueBy(now)

    for (const task of dueTasks) {
      // 不 await：并行执行多个到期任务
      this.executeTask(task).catch((err) => {
        getLogger().error({ taskId: task.id, error: String(err) }, '执行定时任务失败')
      })
    }
  }

  /** 执行单个任务 */
  private async executeTask(task: ScheduledTask): Promise<void> {
    const logger = getLogger()
    const runAt = new Date().toISOString()
    const startMs = Date.now()

    logger.info({ taskId: task.id, agentId: task.agent_id }, '执行定时任务')

    try {
      const result = await this.agentQueue.enqueue(task.agent_id, task.chat_id, task.prompt)
      const durationMs = Date.now() - startMs

      saveTaskRunLog({
        taskId: task.id,
        runAt,
        durationMs,
        status: 'success',
        result,
      })

      // 保存执行结果到 messages 表，使 Chat 页面可见
      const timestamp = new Date().toISOString()
      const taskChatId = task.chat_id

      // 保存用户 prompt 消息
      saveMessage({
        id: `${task.id}-${runAt}-user`,
        chatId: taskChatId,
        sender: 'scheduler',
        senderName: 'Scheduled Task',
        content: task.prompt,
        timestamp: runAt,
        isFromMe: true,
        isBotMessage: false,
      })

      // 保存 bot 结果消息
      saveMessage({
        id: `${task.id}-${runAt}-bot`,
        chatId: taskChatId,
        sender: task.agent_id,
        senderName: task.agent_id,
        content: result ?? '(no output)',
        timestamp,
        isFromMe: false,
        isBotMessage: true,
      })

      // 更新 chat 记录
      const taskName = (task as any).name || task.prompt.slice(0, 30)
      upsertChat(taskChatId, task.agent_id, `Task: ${taskName}`, 'task')

      // 计算下次运行时间
      const nextRun = this.calculateNextRun(task)
      if (nextRun) {
        updateTask(task.id, { lastRun: runAt, nextRun })
      } else {
        // once 类型任务执行后标记为 completed
        updateTask(task.id, { lastRun: runAt, nextRun: null, status: 'completed' })
      }

      logger.info({ taskId: task.id, durationMs }, '定时任务执行成功')
    } catch (err) {
      const durationMs = Date.now() - startMs
      const errorMsg = err instanceof Error ? err.message : String(err)

      saveTaskRunLog({
        taskId: task.id,
        runAt,
        durationMs,
        status: 'error',
        error: errorMsg,
      })

      // 即使出错也要更新下次运行时间，避免重复触发
      const nextRun = this.calculateNextRun(task)
      if (nextRun) {
        updateTask(task.id, { lastRun: runAt, nextRun })
      } else {
        updateTask(task.id, { lastRun: runAt, nextRun: null, status: 'completed' })
      }

      logger.error({ taskId: task.id, error: errorMsg }, '定时任务执行失败')
    }
  }

  /** 计算下次运行时间 */
  calculateNextRun(task: Pick<ScheduledTask, 'schedule_type' | 'schedule_value' | 'last_run'>): string | null {
    const now = new Date()

    switch (task.schedule_type) {
      case 'cron': {
        const job = new Cron(task.schedule_value)
        const next = job.nextRun()
        return next ? next.toISOString() : null
      }
      case 'interval': {
        const intervalMs = parseInt(task.schedule_value, 10)
        if (isNaN(intervalMs) || intervalMs <= 0) return null
        const base = task.last_run ? new Date(task.last_run) : now
        return new Date(base.getTime() + intervalMs).toISOString()
      }
      case 'once': {
        return null
      }
      default:
        return null
    }
  }
}
