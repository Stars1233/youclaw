import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('browser runtime wiring', () => {
  test('prompt builder instructs the agent to use browser MCP tools instead of agent-browser CLI', () => {
    const promptBuilder = read('src/agent/prompt-builder.ts')

    expect(promptBuilder).toContain('mcp__browser__*')
    expect(promptBuilder).toContain('Prefer the built-in \\`mcp__browser__*\\` tools')
    expect(promptBuilder).toContain('Use the legacy \\`agent-browser\\` skill only when you need capabilities not yet covered')
    expect(promptBuilder).toContain('agent-browser --session ${context.browserProfile.id} --profile ${context.browserProfile.userDataDir} <command>')
    expect(promptBuilder).toContain('Manual login is the default and recommended flow')
    expect(promptBuilder).toContain('Do NOT ask the user for credentials')
    expect(promptBuilder).toContain('If the site shows CAPTCHA, 2FA, device verification')
    expect(promptBuilder).toContain('For sensitive or high-impact actions, prepare the page and then ask the user to review, confirm, or complete the final step manually')
  })

  test('agent runtime injects the built-in browser MCP server', () => {
    const runtime = read('src/agent/runtime.ts')

    expect(runtime).toContain("mcpServers['browser'] = createBrowserMcpServer({")
    expect(runtime).toContain('resolveProfileSelection(browserProfileId, this.config.browser?.defaultProfile ?? this.config.browserProfile)')
    expect(runtime).toContain('browserProfile: resolvedBrowserProfile')
  })
})
