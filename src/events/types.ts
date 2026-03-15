// 错误码枚举，用于前端识别特定错误并展示对应 UI
export enum ErrorCode {
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',  // 积分不足
  AUTH_FAILED = 'AUTH_FAILED',                     // 认证失败
  MODEL_CONNECTION_FAILED = 'MODEL_CONNECTION_FAILED', // 模型连接失败
  NETWORK_ERROR = 'NETWORK_ERROR',                 // 网络错误
  RATE_LIMITED = 'RATE_LIMITED',                    // 请求频率限制
  UNKNOWN = 'UNKNOWN',                             // 未知错误
}

// Agent 事件类型
export type AgentEvent =
  | { type: 'stream'; agentId: string; chatId: string; text: string }
  | { type: 'tool_use'; agentId: string; chatId: string; tool: string; input?: string }
  | { type: 'complete'; agentId: string; chatId: string; fullText: string; sessionId: string }
  | { type: 'error'; agentId: string; chatId: string; error: string; errorCode?: ErrorCode }
  | { type: 'processing'; agentId: string; chatId: string; isProcessing: boolean }
  // Phase 3: 子 Agent 事件
  | { type: 'subagent_started'; agentId: string; chatId: string; taskId: string; description: string }
  | { type: 'subagent_progress'; agentId: string; chatId: string; taskId: string; summary?: string }
  | { type: 'subagent_completed'; agentId: string; chatId: string; taskId: string; status: string; summary: string }
  // Memory 事件
  | { type: 'memory_updated'; agentId: string; filePath: string }
  | { type: 'conversation_archived'; agentId: string; filename: string }

export type AgentEventType = AgentEvent['type']

export type EventFilter = {
  chatId?: string
  agentId?: string
  types?: AgentEventType[]
}

export type EventHandler = (event: AgentEvent) => void
export type Unsubscribe = () => void
