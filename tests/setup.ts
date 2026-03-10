/**
 * 测试共享初始化
 *
 * 所有测试文件导入此模块来初始化环境、数据库、日志
 * 避免重复初始化导致冲突
 */

import { Database } from 'bun:sqlite'

// 设置测试环境变量
process.env.ANTHROPIC_API_KEY = 'test-key'
process.env.DATA_DIR = '/tmp/zoerclaw-test-' + Date.now()
process.env.LOG_LEVEL = 'error'

import { loadEnv } from '../src/config/index.ts'
import { initLogger } from '../src/logger/index.ts'
import { initDatabase, getDatabase } from '../src/db/index.ts'

// 初始化
loadEnv()
initLogger()
initDatabase()

/** 清空所有数据表 */
export function cleanAllTables() {
  const db = getDatabase()
  db.run('DELETE FROM messages')
  db.run('DELETE FROM chats')
  db.run('DELETE FROM scheduled_tasks')
  db.run('DELETE FROM task_run_logs')
  db.run('DELETE FROM sessions')
}

/** 清空指定表 */
export function cleanTables(...tables: string[]) {
  const db = getDatabase()
  for (const table of tables) {
    db.run(`DELETE FROM ${table}`)
  }
}

export { getDatabase }
