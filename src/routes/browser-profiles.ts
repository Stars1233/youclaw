import { Hono } from 'hono'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { getPaths } from '../config/index.ts'
import {
  createBrowserProfile,
  getBrowserProfiles,
  getBrowserProfile,
  deleteBrowserProfile,
} from '../db/index.ts'

export function createBrowserProfilesRoutes() {
  const app = new Hono()

  // 列出所有 Profile
  app.get('/browser-profiles', (c) => {
    const profiles = getBrowserProfiles()
    return c.json(profiles)
  })

  // 创建 Profile
  app.post('/browser-profiles', async (c) => {
    const body = await c.req.json<{ name: string }>()
    if (!body.name) {
      return c.json({ error: 'name is required' }, 400)
    }
    const id = crypto.randomUUID().slice(0, 8)
    createBrowserProfile({ id, name: body.name })
    // 创建 userDataDir
    const profileDir = resolve(getPaths().browserProfiles, id)
    mkdirSync(profileDir, { recursive: true })
    return c.json(getBrowserProfile(id), 201)
  })

  // 删除 Profile
  app.delete('/browser-profiles/:id', (c) => {
    const id = c.req.param('id')
    const profile = getBrowserProfile(id)
    if (!profile) {
      return c.json({ error: 'not found' }, 404)
    }
    deleteBrowserProfile(id)
    // 删除 userDataDir
    const profileDir = resolve(getPaths().browserProfiles, id)
    try {
      rmSync(profileDir, { recursive: true, force: true })
    } catch {}
    return c.json({ ok: true })
  })

  // 启动 headed 浏览器
  app.post('/browser-profiles/:id/launch', (c) => {
    const id = c.req.param('id')
    const profile = getBrowserProfile(id)
    if (!profile) {
      return c.json({ error: 'not found' }, 404)
    }
    const profileDir = resolve(getPaths().browserProfiles, id)
    mkdirSync(profileDir, { recursive: true })
    const child = spawn('agent-browser', [
      '--profile', profileDir,
      '--headed',
      'open', 'about:blank',
    ], { detached: true, stdio: 'ignore' })
    child.unref()
    return c.json({ ok: true, profileDir })
  })

  return app
}
