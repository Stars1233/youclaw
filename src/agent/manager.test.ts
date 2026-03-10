import { describe, test, expect, mock } from 'bun:test'
import { AgentManager } from './manager.ts'

// mock 最小依赖
const mockEventBus = {} as any
const mockPromptBuilder = {} as any

// 构造一个带预设 agents 的 AgentManager
function createManager(agents: Array<{ id: string; chatIds?: string[] }>) {
  const manager = new AgentManager(mockEventBus, mockPromptBuilder)
  // 直接写入内部 Map，避免真正从磁盘加载
  const map = (manager as any).agents as Map<string, any>
  for (const a of agents) {
    map.set(a.id, {
      config: {
        id: a.id,
        name: a.id,
        model: 'claude-sonnet-4-6',
        workspaceDir: '/tmp',
        telegram: a.chatIds ? { chatIds: a.chatIds } : undefined,
      },
      workspaceDir: '/tmp',
      runtime: {},
      state: {},
    })
  }
  return manager
}

describe('AgentManager.resolveAgent', () => {
  test('精确匹配 telegram chatId', () => {
    const manager = createManager([
      { id: 'agent-a', chatIds: ['tg:111'] },
      { id: 'agent-b', chatIds: ['tg:222'] },
    ])
    const result = manager.resolveAgent('tg:222')
    expect(result?.config.id).toBe('agent-b')
  })

  test('telegram chatId 未配置时 fallback 到默认 agent', () => {
    const manager = createManager([
      { id: 'default' },
    ])
    const result = manager.resolveAgent('tg:999')
    expect(result?.config.id).toBe('default')
  })

  test('web chatId fallback 到默认 agent', () => {
    const manager = createManager([
      { id: 'default' },
    ])
    const result = manager.resolveAgent('web:abc-123')
    expect(result?.config.id).toBe('default')
  })

  test('无默认 agent 时 fallback 到第一个 agent', () => {
    const manager = createManager([
      { id: 'custom-agent' },
    ])
    const result = manager.resolveAgent('tg:999')
    expect(result?.config.id).toBe('custom-agent')
  })

  test('无任何 agent 时返回 undefined', () => {
    const manager = createManager([])
    const result = manager.resolveAgent('tg:999')
    expect(result).toBeUndefined()
  })
})
