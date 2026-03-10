import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import { getEnv } from '../config/index.ts'
import { getLogger } from '../logger/index.ts'
import { getSession, saveSession } from '../db/index.ts'
import type { EventBus } from '../events/index.ts'
import type { AgentConfig, ProcessParams } from './types.ts'

export class AgentRuntime {
  private config: AgentConfig
  private eventBus: EventBus
  private systemPrompt: string

  constructor(config: AgentConfig, eventBus: EventBus, systemPrompt: string) {
    this.config = config
    this.eventBus = eventBus
    this.systemPrompt = systemPrompt
  }

  async process(params: ProcessParams): Promise<string> {
    const { chatId, prompt, agentId } = params
    const logger = getLogger()
    const env = getEnv()

    // 通知开始处理
    this.eventBus.emit({
      type: 'processing',
      agentId,
      chatId,
      isProcessing: true,
    })

    // 查找已有 session
    const existingSessionId = getSession(agentId, chatId)

    logger.info({ agentId, chatId, hasSession: !!existingSessionId }, '开始处理消息')

    try {
      const abortController = new AbortController()
      let fullText = ''
      let sessionId = existingSessionId ?? ''

      // 注入当前上下文到系统提示词（Agent 创建定时任务时需要这些信息）
      const contextualPrompt = this.systemPrompt + `\n\n## Current Context\n- Agent ID: ${agentId}\n- Chat ID: ${chatId}\n- IPC Directory: ./data/ipc/${agentId}/tasks/\n`

      const q = query({
        prompt,
        options: {
          model: env.AGENT_MODEL,
          cwd: this.config.workspaceDir,
          systemPrompt: contextualPrompt,
          abortController,
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          ...(existingSessionId ? { resume: existingSessionId } : {}),
        },
      })

      // 流式处理 SDK 消息
      for await (const message of q) {
        this.handleMessage(message, agentId, chatId, (text) => {
          fullText += text
        }, (sid) => {
          sessionId = sid
        })
      }

      // 保存 session
      if (sessionId) {
        saveSession(agentId, chatId, sessionId)
      }

      // 广播完成事件
      this.eventBus.emit({
        type: 'complete',
        agentId,
        chatId,
        fullText,
        sessionId,
      })

      logger.info({ agentId, chatId, responseLength: fullText.length }, '消息处理完成')
      return fullText
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      logger.error({ agentId, chatId, error: errorMsg }, '消息处理失败')

      this.eventBus.emit({
        type: 'error',
        agentId,
        chatId,
        error: errorMsg,
      })

      return `Error: ${errorMsg}`
    } finally {
      this.eventBus.emit({
        type: 'processing',
        agentId,
        chatId,
        isProcessing: false,
      })
    }
  }

  private handleMessage(
    message: SDKMessage,
    agentId: string,
    chatId: string,
    appendText: (text: string) => void,
    setSessionId: (sid: string) => void,
  ) {
    switch (message.type) {
      case 'assistant': {
        // 提取 session_id
        if (message.session_id) {
          setSessionId(message.session_id)
        }

        // 从 assistant message 中提取文本内容
        for (const block of message.message.content) {
          if (block.type === 'text') {
            appendText(block.text)
            // 广播流式文本
            this.eventBus.emit({
              type: 'stream',
              agentId,
              chatId,
              text: block.text,
            })
          } else if (block.type === 'tool_use') {
            this.eventBus.emit({
              type: 'tool_use',
              agentId,
              chatId,
              tool: block.name,
              input: JSON.stringify(block.input).slice(0, 200),
            })
          }
        }
        break
      }

      case 'result': {
        if (message.session_id) {
          setSessionId(message.session_id)
        }
        // result 中的文本已在 assistant 消息中提取
        break
      }
    }
  }
}
