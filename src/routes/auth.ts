import { Hono } from 'hono'
import { getDatabase } from '../db/index.ts'
import { getEnv } from '../config/index.ts'
import { getLogger } from '../logger/index.ts'

const AUTH_TOKEN_KEY = 'auth_token'

// 官网地址：开发环境用 localhost:3077，生产环境用 youclaw.cc
function getWebsiteBaseUrl(): string {
  return process.env.YOUCLAW_WEBSITE_URL || (process.env.NODE_ENV === 'production' ? 'https://youclaw.dev' : 'http://localhost:3077')
}

// readmex.com API 地址
function getReadmexBaseUrl(): string {
  return process.env.READMEX_API_URL || 'https://readmex.com'
}

// 从 kv_state 读取 token
export function getAuthToken(): string | null {
  const db = getDatabase()
  const row = db.query("SELECT value FROM kv_state WHERE key = ?").get(AUTH_TOKEN_KEY) as { value: string } | null
  return row?.value ?? null
}

// 保存 token 到 kv_state
function saveAuthToken(token: string): void {
  const db = getDatabase()
  db.run("INSERT OR REPLACE INTO kv_state (key, value) VALUES (?, ?)", [AUTH_TOKEN_KEY, token])
}

// 清除 token
function clearAuthToken(): void {
  const db = getDatabase()
  db.run("DELETE FROM kv_state WHERE key = ?", [AUTH_TOKEN_KEY])
}

export function createAuthRoutes() {
  const app = new Hono()

  // GET /auth/login — 返回登录 URL（前端用浏览器打开）
  app.get('/auth/login', (c) => {
    // 从请求 Host 头推断实际端口，兼容 Tauri 随机端口和 Vite proxy
    const host = c.req.header('host') || `localhost:${getEnv().PORT}`
    const redirectUri = `http://${host}/api/auth/callback`
    const websiteUrl = getWebsiteBaseUrl()
    const loginUrl = `${websiteUrl}/login?redirect_uri=${encodeURIComponent(redirectUri)}&app_name=YouClaw`
    return c.json({ loginUrl })
  })

  // GET /auth/callback — 接收官网回调的 token
  app.get('/auth/callback', (c) => {
    const token = c.req.query('token')
    const logger = getLogger()

    if (!token) {
      return c.html(`
        <html><body style="font-family:system-ui;text-align:center;padding:60px">
          <h2>Login Failed</h2>
          <p>No token received.</p>
        </body></html>
      `, 400)
    }

    saveAuthToken(token)
    logger.info({ category: 'auth' }, 'Auth token saved from callback')

    return c.html(`
      <html><body style="font-family:system-ui;text-align:center;padding:60px">
        <h2 style="color:#22c55e">Login Successful</h2>
        <p>You can close this window and return to YouClaw.</p>
        <script>setTimeout(() => window.close(), 2000)</script>
      </body></html>
    `)
  })

  // GET /auth/user — 获取用户信息
  app.get('/auth/user', async (c) => {
    const token = getAuthToken()
    if (!token) {
      return c.json({ error: 'Not logged in' }, 401)
    }

    try {
      const res = await fetch(`${getReadmexBaseUrl()}/api/oauth/user`, {
        headers: { rdxtoken: token },
      })

      if (!res.ok) {
        if (res.status === 401) {
          clearAuthToken()
          return c.json({ error: 'Token expired' }, 401)
        }
        return c.json({ error: 'Failed to fetch user info' }, 500)
      }

      const data = await res.json() as { success?: boolean; data?: unknown }
      // 官网返回 { success: true, data: null } 表示 token 无效
      if (!data.data) {
        clearAuthToken()
        return c.json({ error: 'Token expired' }, 401)
      }
      return c.json(data.data)
    } catch (err) {
      const logger = getLogger()
      logger.error({ error: String(err), category: 'auth' }, 'Failed to fetch user info')
      return c.json({ error: 'Failed to fetch user info' }, 500)
    }
  })

  // POST /auth/logout — 退出登录
  app.post('/auth/logout', async (c) => {
    const token = getAuthToken()
    const logger = getLogger()

    if (token) {
      // 通知官网后端注销
      try {
        await fetch(`${getReadmexBaseUrl()}/api/oauth/logout`, {
          method: 'POST',
          headers: { rdxtoken: token },
        })
      } catch {
        // 注销失败不影响本地清理
      }
    }

    clearAuthToken()
    logger.info({ category: 'auth' }, 'User logged out')
    return c.json({ ok: true })
  })

  // GET /auth/pay-url — 返回支付页 URL
  app.get('/auth/pay-url', (c) => {
    const host = c.req.header('host') || `localhost:${getEnv().PORT}`
    const redirectUri = `http://${host}/api/auth/pay-callback`
    const websiteUrl = getWebsiteBaseUrl()
    const payUrl = `${websiteUrl}/pay?redirect_uri=${encodeURIComponent(redirectUri)}`
    return c.json({ payUrl })
  })

  // GET /auth/pay-callback — 接收支付成功回调
  app.get('/auth/pay-callback', (c) => {
    const status = c.req.query('status')
    const orderId = c.req.query('order_id')
    const logger = getLogger()

    if (status === 'success') {
      logger.info({ category: 'auth', orderId }, 'Payment callback received')
      return c.html(`
        <html><body style="font-family:system-ui;text-align:center;padding:60px">
          <h2 style="color:#22c55e">Payment Successful</h2>
          <p>Your payment has been processed. You can close this window.</p>
          <script>setTimeout(() => window.close(), 2000)</script>
        </body></html>
      `)
    }

    return c.html(`
      <html><body style="font-family:system-ui;text-align:center;padding:60px">
        <h2>Payment Status</h2>
        <p>Status: ${status || 'unknown'}</p>
        <script>setTimeout(() => window.close(), 3000)</script>
      </body></html>
    `)
  })

  // GET /auth/status — 检查登录状态（前端轮询用）
  app.get('/auth/status', (c) => {
    const token = getAuthToken()
    return c.json({ loggedIn: !!token })
  })

  return app
}
