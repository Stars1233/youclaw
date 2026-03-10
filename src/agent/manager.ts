import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { getPaths } from '../config/index.ts'
import { getLogger } from '../logger/index.ts'
import type { EventBus } from '../events/index.ts'
import { AgentConfigSchema } from './schema.ts'
import { AgentRuntime } from './runtime.ts'
import { PromptBuilder } from './prompt-builder.ts'
import type { AgentConfig, AgentInstance } from './types.ts'

export class AgentManager {
  private agents: Map<string, AgentInstance> = new Map()
  private eventBus: EventBus
  private promptBuilder: PromptBuilder

  constructor(eventBus: EventBus, promptBuilder: PromptBuilder) {
    this.eventBus = eventBus
    this.promptBuilder = promptBuilder
  }

  /**
   * 从 agents/ 目录加载所有 agent
   * 扫描每个子目录的 agent.yaml，使用 Zod 校验配置并创建 AgentRuntime
   */
  async loadAgents(): Promise<void> {
    const logger = getLogger()
    const paths = getPaths()
    const agentsDir = paths.agents

    if (!existsSync(agentsDir)) {
      logger.warn({ agentsDir }, 'agents 目录不存在')
      return
    }

    const entries = readdirSync(agentsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const agentDir = resolve(agentsDir, entry.name)
      const configPath = resolve(agentDir, 'agent.yaml')

      if (!existsSync(configPath)) {
        logger.debug({ agentDir }, '跳过无 agent.yaml 的目录')
        continue
      }

      try {
        const rawYaml = readFileSync(configPath, 'utf-8')
        const parsed = parseYaml(rawYaml) as Record<string, unknown>

        // 使用 Zod 校验配置
        const result = AgentConfigSchema.safeParse({
          ...parsed,
          id: parsed.id ?? entry.name,
          name: parsed.name ?? entry.name,
        })

        if (!result.success) {
          logger.error({ agentDir, errors: result.error.issues }, 'agent.yaml 配置校验失败')
          continue
        }

        const config: AgentConfig = {
          ...result.data,
          workspaceDir: agentDir,
        }

        const runtime = new AgentRuntime(config, this.eventBus, this.promptBuilder)

        this.agents.set(config.id, {
          config,
          workspaceDir: agentDir,
          runtime,
          state: {
            sessionId: null,
            isProcessing: false,
            lastProcessedAt: null,
            totalProcessed: 0,
            lastError: null,
            queueDepth: 0,
          },
        })

        logger.info({ agentId: config.id, name: config.name }, 'Agent 已加载')
      } catch (err) {
        logger.error({ agentDir, error: err instanceof Error ? err.message : String(err) }, '加载 agent 失败')
      }
    }

    logger.info({ count: this.agents.size }, '所有 agent 加载完成')
  }

  /**
   * 清空已加载的 agent 并重新从磁盘加载
   */
  async reloadAgents(): Promise<void> {
    this.agents.clear()
    await this.loadAgents()
  }

  /**
   * 根据 chatId 找到对应的 agent
   */
  resolveAgent(chatId: string): AgentInstance | undefined {
    for (const managed of this.agents.values()) {
      const chatIds = managed.config.telegram?.chatIds
      if (chatIds && chatIds.includes(chatId)) {
        return managed
      }
    }
    // web / telegram 未精确匹配时，fallback 到默认 agent
    return this.getDefaultAgent()
  }

  /**
   * 获取所有 agent 配置列表
   */
  getAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).map((m) => m.config)
  }

  /**
   * 获取单个 agent
   */
  getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId)
  }

  /**
   * 获取默认 agent
   */
  getDefaultAgent(): AgentInstance | undefined {
    const defaultAgent = this.agents.get('default')
    if (defaultAgent) return defaultAgent
    const first = this.agents.values().next()
    return first.done ? undefined : first.value
  }
}
