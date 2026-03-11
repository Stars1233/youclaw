import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getEnv } from './env.ts'

// 项目根目录
// 从 src/config/ 运行时向上 2 级，从 dist/src/config/ 运行时向上 3 级
const __dirname = dirname(fileURLToPath(import.meta.url))
const isCompiledBuild = __dirname.replace(/\\/g, '/').includes('/dist/src/')
export const ROOT_DIR = resolve(__dirname, isCompiledBuild ? '../../..' : '../..')

// Electron 打包后 asar 内的文件对子进程不可见，
// asarUnpack 的资源实际在 app.asar.unpacked/ 目录下
const UNPACKED_ROOT = ROOT_DIR.replace(/app\.asar(?!\.unpacked)/, 'app.asar.unpacked')

export function getPaths() {
  const env = getEnv()
  const dataDir = resolve(ROOT_DIR, env.DATA_DIR)

  return {
    root: ROOT_DIR,
    data: dataDir,
    db: resolve(dataDir, 'youclaw.db'),
    agents: resolve(UNPACKED_ROOT, 'agents'),
    skills: resolve(UNPACKED_ROOT, 'skills'),
    prompts: resolve(UNPACKED_ROOT, 'prompts'),
    browserProfiles: resolve(dataDir, 'browser-profiles'),
    logs: resolve(dataDir, 'logs'),
  }
}
