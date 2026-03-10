import { watch, existsSync } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import { getPaths } from '../config/index.ts'
import { getLogger } from '../logger/index.ts'
import type { SkillsLoader } from './loader.ts'

/**
 * 监听 skills 目录变更，自动触发重载
 * 使用 node:fs 的 watch（recursive）+ 防抖
 */
export class SkillsWatcher {
  private loader: SkillsLoader
  private onReload?: (skills: unknown[]) => void
  private watchers: FSWatcher[] = []
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private debounceMs: number

  constructor(loader: SkillsLoader, options?: { onReload?: (skills: unknown[]) => void; debounceMs?: number }) {
    this.loader = loader
    this.onReload = options?.onReload
    this.debounceMs = options?.debounceMs ?? 500
  }

  /**
   * 启动监听
   */
  start(): void {
    const logger = getLogger()
    const paths = getPaths()

    const dirsToWatch = [
      paths.skills,                               // 项目级 skills/
      resolve(homedir(), '.zoerclaw', 'skills'),   // 用户级
    ]

    // 也监听 agents 下的 skills 子目录
    if (existsSync(paths.agents)) {
      dirsToWatch.push(paths.agents)
    }

    for (const dir of dirsToWatch) {
      if (!existsSync(dir)) continue

      try {
        const watcher = watch(dir, { recursive: true }, (_event, _filename) => {
          this.scheduleReload()
        })
        this.watchers.push(watcher)
        logger.debug({ dir }, 'Skills watcher 已启动')
      } catch (err) {
        logger.warn({ dir, error: err instanceof Error ? err.message : String(err) }, 'Skills watcher 启动失败')
      }
    }

    if (this.watchers.length > 0) {
      logger.info({ watcherCount: this.watchers.length }, 'Skills 热更新监听已启动')
    }
  }

  /**
   * 停止监听
   */
  stop(): void {
    const logger = getLogger()

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    for (const watcher of this.watchers) {
      watcher.close()
    }
    this.watchers = []

    logger.debug('Skills watcher 已停止')
  }

  /**
   * 防抖调度重载
   */
  private scheduleReload(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      const logger = getLogger()

      try {
        const skills = this.loader.refresh()
        logger.info({ count: skills.length }, 'Skills 热更新重载完成')
        this.onReload?.(skills)
      } catch (err) {
        logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Skills 热更新重载失败')
      }
    }, this.debounceMs)
  }
}
