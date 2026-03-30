import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

function readSourceFile(pathname: string) {
  return readFileSync(new URL(`../src/${pathname}`, import.meta.url), 'utf8')
}

describe('Skills toast feedback', () => {
  test('positions the global toaster at the top center', () => {
    const source = readSourceFile('components/AppToaster.tsx')

    expect(source).toContain('position="top-center"')
    expect(source).toContain('visibleToasts={1}')
    expect(source).toContain('richColors')
    expect(source).not.toContain('closeButton')
    expect(source).toContain("'--width': 'max-content'")
    expect(source).toContain("maxWidth: 'min(calc(100vw - 32px), 420px)'")
  })

  test('shows enable, disable, and delete toasts on the Skills page', () => {
    const source = readSourceFile('pages/Skills.tsx')

    expect(source).toContain('notify.success(formatSkillMessage(t.skills.skillEnabledSuccess, skillName))')
    expect(source).toContain('notify.success(formatSkillMessage(t.skills.skillDisabledSuccess, skillName))')
    expect(source).toContain('notify.success(formatSkillMessage(t.skills.skillDeleteSuccess, skillName))')
    expect(source).toContain('notify.error(formatActionError')
  })

  test('wires install and env-related skill actions into toasts', () => {
    const source = readSourceFile('components/skills/shared.tsx')

    expect(source).toContain('notify.success(t.skills.envSaveSuccess.replace')
    expect(source).toContain('notify.success(t.skills.installSuccess')
    expect(source).toContain('notify.success(`${tool} ${t.envSetup.installSuccess}`)')
    expect(source).toContain('notify.error(')
  })

  test('shows upload and import toasts in dialog flows', () => {
    const uploadSource = readSourceFile('components/SkillUploadDialog.tsx')
    const importSource = readSourceFile('components/SkillImportPanel.tsx')

    expect(uploadSource).toContain('notify.success(t.skills.uploadSuccess)')
    expect(uploadSource).toContain('notify.error(message)')
    expect(importSource).toContain('notify.success(t.skills.importSuccess)')
    expect(importSource).toContain('notify.error(message)')
  })

  test('shows marketplace action toasts on install, update, and uninstall', () => {
    const source = readSourceFile('components/MarketplaceCard.tsx')

    expect(source).toContain('t.skills.marketplaceInstallSuccess')
    expect(source).toContain('t.skills.marketplaceUpdateSuccess')
    expect(source).toContain('t.skills.marketplaceUninstallSuccess')
    expect(source).toContain('notify.success(')
    expect(source).toContain('notify.error(')
  })

  test('shows authoring toasts for create, save, publish, discard, and delete', () => {
    const source = readSourceFile('components/skills/SkillEditor.tsx')

    expect(source).toContain('t.skills.skillCreateSuccess')
    expect(source).toContain('t.skills.draftSaveSuccess')
    expect(source).toContain('t.skills.skillPublishSuccess')
    expect(source).toContain('t.skills.draftDiscardSuccess')
    expect(source).toContain('t.skills.skillDeleteSuccess')
    expect(source).toContain('notify.success(')
    expect(source).toContain('notify.error(')
  })
})
