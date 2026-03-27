import { describe, expect, test } from 'bun:test'
import {
  clearExtensionBridgeSession,
  enqueueExtensionBridgeCommand,
  pollExtensionBridgeCommand,
  resolveExtensionBridgeCommand,
  setExtensionBridgeSession,
} from '../src/browser/extension-bridge.ts'

describe('browser extension transport', () => {
  test('poll returns the queued command and result resolution settles the waiter', async () => {
    const profileId = 'extension-profile'

    setExtensionBridgeSession(profileId, {
      browserId: 'chrome',
      browserName: 'Google Chrome',
      browserKind: 'chrome',
      tabId: 'tab-1',
      tabUrl: 'https://example.com',
      tabTitle: 'Example',
      extensionVersion: '0.1.0',
    })

    const waiter = enqueueExtensionBridgeCommand(profileId, 'snapshot', {
      activePageUrl: 'https://example.com',
    })

    const command = pollExtensionBridgeCommand(profileId)
    expect(command?.profileId).toBe(profileId)
    expect(command?.action).toBe('snapshot')

    resolveExtensionBridgeCommand({
      profileId,
      commandId: command!.id,
      ok: true,
      result: {
        url: 'https://example.com',
        title: 'Example',
        text: 'hello world',
      },
    })

    await expect(waiter).resolves.toEqual({
      url: 'https://example.com',
      title: 'Example',
      text: 'hello world',
    })
    clearExtensionBridgeSession(profileId)
  })
})
