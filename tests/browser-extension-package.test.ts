import { describe, expect, test } from 'bun:test'
import { getBrowserExtensionPackageInfo } from '../src/browser/extension-package.ts'

describe('browser extension package', () => {
  test('reads extension metadata from the bundled chromium extension directory', () => {
    const info = getBrowserExtensionPackageInfo()

    expect(info.name).toBe('YouClaw Main Browser Bridge')
    expect(info.version).toBe('0.1.0')
    expect(info.installMode).toBe('unpacked')
    expect(info.files).toContain('manifest.json')
    expect(info.files).toContain('popup.js')
    expect(info.files).toContain('service-worker.js')
  })
})
