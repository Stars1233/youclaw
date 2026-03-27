import { describe, expect, test } from 'bun:test'
import { detectInstalledBrowsers } from '../src/browser/detect.ts'

describe('browser discovery', () => {
  test('marks BROWSER env match as the recommended browser', () => {
    const discovery = detectInstalledBrowsers({
      platform: 'linux',
      env: { BROWSER: 'brave-browser' },
      exists: (path) => ['/usr/bin/brave-browser', '/usr/bin/google-chrome'].includes(path),
    })

    expect(discovery.recommendationSource).toBe('env')
    expect(discovery.recommendedBrowserId).toBe('brave')
    expect(discovery.browsers.find((browser) => browser.id === 'brave')?.isRecommended).toBe(true)
  })

  test('falls back to priority ordering when no env hint is available', () => {
    const discovery = detectInstalledBrowsers({
      platform: 'darwin',
      env: {},
      exists: (path) => [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      ].includes(path),
    })

    expect(discovery.recommendationSource).toBe('priority')
    expect(discovery.recommendedBrowserId).toBe('chrome')
    expect(discovery.browsers).toHaveLength(2)
  })
})
