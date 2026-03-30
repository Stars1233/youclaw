import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

function readSourceFile(pathname: string) {
  return readFileSync(new URL(`../src/${pathname}`, import.meta.url), 'utf8')
}

describe('Skill upload dialog chrome', () => {
  test('removes helper copy, divider, and action buttons from the upload hero', () => {
    const source = readSourceFile('components/SkillUploadDialog.tsx')
    const zhSource = readSourceFile('i18n/zh.ts')

    expect(source).not.toContain('<DialogDescription>')
    expect(source).not.toContain('{t.skills.uploadDropHint}')
    expect(source).not.toContain('{t.skills.uploadFolderDesktopOnly}')
    expect(source).not.toContain('border-b border-border/70')
    expect(source).not.toContain('aria-label={t.skills.uploadChooseZip}')
    expect(source).not.toContain('aria-label={t.skills.uploadChooseFolder}')
    expect(source).not.toContain('<FileArchive className="h-4 w-4" />')
    expect(source).not.toContain('<FolderOpen className="h-4 w-4" />')
    expect(source).toContain('<div className="text-[1.35rem] font-normal tracking-tight text-muted-foreground">{t.skills.uploadDropTitle}</div>')
    expect(source).not.toContain('<div className="text-[1.9rem] font-semibold tracking-tight">{t.skills.uploadRequirementsTitle}</div>')
    expect(source).not.toContain('<div className="text-[1.35rem] font-semibold tracking-tight">{t.skills.uploadRequirementsTitle}</div>')
    expect(source).toContain('<div className="text-[1.35rem] font-normal tracking-tight">{t.skills.uploadRequirementsTitle}</div>')
    expect(zhSource).toContain("uploadDropTitle: '拖拽文件或点击上传'")
  })
})
