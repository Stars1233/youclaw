import { test, expect } from '../fixtures'

test.describe('多 Agent 创建与协调', () => {
  const testAgentId = 'e2e-helper'
  const testAgentName = 'E2E Helper'
  const subAgentId = 'e2e-sub'

  test.beforeEach(async ({ page }) => {
    await page.getByTestId('nav-agents').click()
    await page.waitForLoadState('networkidle')
  })

  test('创建新 Agent', async ({ page }) => {
    // 点击新建
    await page.getByTestId('agent-create-btn').click()

    // 填写表单
    await page.getByTestId('agent-input-id').fill(testAgentId)
    await page.getByTestId('agent-input-name').fill(testAgentName)

    // 提交
    await page.getByTestId('agent-submit-btn').click()
    await page.waitForTimeout(1000)

    // 验证新 Agent 出现在列表中
    const agentItems = page.getByTestId('agent-item')
    const count = await agentItems.count()
    expect(count).toBeGreaterThanOrEqual(2) // default + 新建的

    // 验证新 Agent 在列表按钮中可见
    await expect(page.getByTestId('agent-item').filter({ hasText: testAgentName })).toBeVisible()
  })

  test('给 Agent 配置 Sub Agent', async ({ page }) => {
    // 选中新创建的 Agent
    const agentItem = page.getByTestId('agent-item').filter({ hasText: testAgentName })
    await agentItem.click()
    await page.waitForLoadState('networkidle')

    // 点击添加 Sub Agent
    await expect(page.getByTestId('subagent-add-btn')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('subagent-add-btn').click()

    // 填写 Sub Agent 表单
    await page.getByTestId('subagent-input-id').fill(subAgentId)
    await page.getByTestId('subagent-input-desc').fill('E2E 测试用子 Agent')

    // 保存
    await page.getByTestId('subagent-save-btn').click()
    await page.waitForTimeout(1000)

    // 验证 Sub Agent 出现在列表
    await expect(page.getByTestId('subagent-item').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('subagent-item').filter({ hasText: subAgentId })).toBeVisible()
  })

  test('验证多 Agent 列表展示', async ({ page }) => {
    // 列表应至少有 2 个 Agent（default + e2e-helper）
    await expect(page.getByTestId('agent-item').first()).toBeVisible({ timeout: 10_000 })
    const count = await page.getByTestId('agent-item').count()
    expect(count).toBeGreaterThanOrEqual(2)

    // 切换不同 Agent，验证详情正确加载
    await page.getByTestId('agent-item').filter({ hasText: 'Default' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Default Assistant' })).toBeVisible()

    await page.getByTestId('agent-item').filter({ hasText: testAgentName }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: testAgentName })).toBeVisible()
  })

  test('删除 Sub Agent 和 Agent（清理）', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept())

    // 选中测试 Agent
    const agentItem = page.getByTestId('agent-item').filter({ hasText: testAgentName })
    await agentItem.click()
    await page.waitForLoadState('networkidle')

    // 展开 Sub Agent 并删除
    const subItem = page.getByTestId('subagent-item').first()
    if (await subItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await subItem.click() // 展开
      await page.waitForTimeout(500)
      await page.getByTestId('subagent-delete-btn').click()
      await page.waitForTimeout(1000)
    }

    // 删除 Agent 本身
    await page.getByTestId('agent-delete-btn').click()
    await page.waitForTimeout(1000)

    // 验证 Agent 已从列表移除
    await expect(page.getByTestId('agent-item').filter({ hasText: testAgentName })).not.toBeVisible({ timeout: 5_000 })
  })
})
