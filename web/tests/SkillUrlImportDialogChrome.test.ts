import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

function readSourceFile(pathname: string) {
  return readFileSync(new URL(`../src/${pathname}`, import.meta.url), 'utf8')
}

describe('Skill URL import dialog chrome', () => {
  test('removes the header divider and field label and pulls the form upward', () => {
    const source = readSourceFile('components/SkillImportPanel.tsx')

    expect(source).not.toContain('border-b border-border/70')
    expect(source).not.toContain('text-sm font-medium')
    expect(source).toContain('max-h-[70vh] overflow-y-auto px-8 pt-2 pb-7')
  })
})
