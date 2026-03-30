import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

function readSourceFile(pathname: string) {
  return readFileSync(new URL(`../src/${pathname}`, import.meta.url), 'utf8')
}

describe('MarketplaceCard metrics styling', () => {
  test('renders marketplace metrics as plain icon and text instead of pill bubbles', () => {
    const source = readSourceFile('components/MarketplaceCard.tsx')

    expect(source).toContain("viewMode === 'grid' ? 'mt-3 flex flex-wrap items-center gap-x-4 gap-y-2' : 'mt-2 flex flex-wrap items-center gap-x-4 gap-y-2'")
    expect(source).toContain('inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground')
    expect(source).not.toContain('rounded-full border border-border/50 bg-muted/20 px-2.5 py-1.5')
  })
})
