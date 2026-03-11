import { readFileSync } from 'node:fs'
import { getLogger } from '../logger/index.ts'
import type { MemoryManager } from './manager.ts'

interface TranscriptEntry {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 对话存档器：解析 SDK transcript (JSONL) 并格式化为 Markdown
 */
export class ConversationArchiver {
  constructor(private memoryManager: MemoryManager) {}

  /**
   * 从 SDK transcript 文件存档对话
   */
  async archive(agentId: string, transcriptPath: string, chatId: string): Promise<string | null> {
    const logger = getLogger()

    try {
      const raw = readFileSync(transcriptPath, 'utf-8')
      const entries = this.parseTranscript(raw)

      if (entries.length === 0) {
        logger.debug({ agentId, transcriptPath }, '空 transcript，跳过存档')
        return null
      }

      const title = this.generateTitle(entries)
      const now = new Date()
      const date = now.toISOString().split('T')[0]!
      const sanitizedTitle = this.sanitizeFilename(title)
      const filename = `${date}-${sanitizedTitle}.md`

      const content = this.formatMarkdown(title, chatId, now, entries)
      this.memoryManager.saveConversationArchive(agentId, filename, content)

      logger.info({ agentId, filename, entries: entries.length }, '对话已存档')
      return filename
    } catch (err) {
      logger.error({ agentId, transcriptPath, error: err instanceof Error ? err.message : String(err) }, '对话存档失败')
      return null
    }
  }

  /**
   * 从 JSONL 内容解析 user/assistant 消息
   */
  parseTranscript(raw: string): TranscriptEntry[] {
    const entries: TranscriptEntry[] = []

    for (const line of raw.split('\n')) {
      if (!line.trim()) continue

      try {
        const obj = JSON.parse(line)

        if (obj.type === 'user' || obj.role === 'user') {
          const content = this.extractContent(obj)
          if (content) {
            entries.push({ role: 'user', content })
          }
        } else if (obj.type === 'assistant' || obj.role === 'assistant') {
          const content = this.extractContent(obj)
          if (content) {
            entries.push({ role: 'assistant', content })
          }
        }
      } catch {
        // 跳过无效 JSON 行
      }
    }

    return entries
  }

  /**
   * 从消息对象中提取文本内容
   */
  private extractContent(obj: Record<string, unknown>): string {
    // 直接字符串
    if (typeof obj.content === 'string') return obj.content

    // 嵌套在 message.content 中
    const message = obj.message as Record<string, unknown> | undefined
    if (message && typeof message.content === 'string') return message.content

    // 数组格式（Claude SDK 格式）
    const contentArr = (message?.content ?? obj.content) as Array<Record<string, unknown>> | undefined
    if (Array.isArray(contentArr)) {
      return contentArr
        .filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text as string)
        .join('\n')
    }

    return ''
  }

  /**
   * 从首条用户消息生成标题
   */
  private generateTitle(entries: TranscriptEntry[]): string {
    const firstUser = entries.find((e) => e.role === 'user')
    if (!firstUser) return 'conversation'

    // 取首行，截断到 50 字符
    const firstLine = firstUser.content.split('\n')[0] ?? 'conversation'
    return firstLine.slice(0, 50)
  }

  /**
   * 文件名清理：小写、非字母数字转 -、去除连续 -、最多 50 字符
   */
  private sanitizeFilename(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'conversation'
  }

  /**
   * 格式化为 Markdown
   */
  private formatMarkdown(title: string, chatId: string, archivedAt: Date, entries: TranscriptEntry[]): string {
    const parts: string[] = []
    parts.push(`# ${title}`)
    parts.push('')
    parts.push(`**Chat**: ${chatId}`)
    parts.push(`**Archived**: ${archivedAt.toISOString()}`)
    parts.push('')
    parts.push('---')
    parts.push('')

    for (const entry of entries) {
      const label = entry.role === 'user' ? 'User' : 'Assistant'
      // 截断超长内容
      const content = entry.content.length > 2000
        ? entry.content.slice(0, 2000) + '\n\n*(truncated)*'
        : entry.content
      parts.push(`## ${label}`)
      parts.push(content)
      parts.push('')
    }

    return parts.join('\n')
  }
}
