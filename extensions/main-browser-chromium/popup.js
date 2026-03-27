const backendInput = document.getElementById('backend')
const pairingInput = document.getElementById('pairing')
const connectButton = document.getElementById('connect')
const status = document.getElementById('status')

function setStatus(message, isError = false) {
  status.textContent = message
  status.style.color = isError ? '#c03a2b' : '#2f6f44'
}

async function loadDefaults() {
  const stored = await chrome.storage.local.get({
    backendUrl: 'http://127.0.0.1:62601',
    pairingCode: '',
  })
  backendInput.value = stored.backendUrl
  pairingInput.value = stored.pairingCode
}

async function saveDefaults() {
  await chrome.storage.local.set({
    backendUrl: backendInput.value.trim(),
    pairingCode: pairingInput.value.trim(),
  })
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab) {
    throw new Error('No active tab found')
  }
  return tab
}

async function connectCurrentTab() {
  const backendUrl = backendInput.value.trim().replace(/\/+$/, '')
  const pairingCode = pairingInput.value.trim()
  if (!backendUrl || !pairingCode) {
    throw new Error('Backend URL and pairing code are required')
  }

  const tab = await getCurrentTab()
  const browserName = navigator.userAgent.includes('Edg/')
    ? 'Microsoft Edge'
    : navigator.userAgent.includes('Brave')
      ? 'Brave'
      : navigator.userAgent.includes('Chrome')
        ? 'Google Chrome'
        : 'Chromium Browser'
  const browserKind = navigator.userAgent.includes('Edg/')
    ? 'edge'
    : navigator.userAgent.includes('Brave')
      ? 'brave'
      : navigator.userAgent.includes('Chrome')
        ? 'chrome'
        : 'chromium'

  const res = await fetch(`${backendUrl}/api/browser/main-bridge/extension-attach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pairingCode,
      browserName,
      browserKind,
      tabId: tab.id != null ? String(tab.id) : null,
      tabUrl: tab.url ?? null,
      tabTitle: tab.title ?? null,
      extensionVersion: chrome.runtime.getManifest().version,
    }),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.error || `Attach failed: ${res.status}`)
  }

  await chrome.storage.local.set({
    bridgeProfileId: body?.state?.profileId ?? null,
  })
  chrome.runtime.sendMessage({
    type: 'bridge-attached',
    backendUrl,
    profileId: body?.state?.profileId ?? null,
  })

  return body
}

connectButton.addEventListener('click', async () => {
  connectButton.disabled = true
  setStatus('Connecting current tab...')
  try {
    await saveDefaults()
    await connectCurrentTab()
    setStatus('Current tab connected to YouClaw.')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true)
  } finally {
    connectButton.disabled = false
  }
})

loadDefaults().catch(() => {
  setStatus('Failed to load extension defaults.', true)
})
