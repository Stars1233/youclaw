import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

function readSourceFile(pathname: string) {
  return readFileSync(new URL(`../src/${pathname}`, import.meta.url), 'utf8')
}

describe('Skill editor chrome', () => {
  test('does not render a full-width divider under the authoring header', () => {
    const sharedSource = readSourceFile('components/skills/authoring-shared.tsx')
    const pageSource = readSourceFile('pages/Skills.tsx')

    expect(sharedSource).not.toContain('border-b border-border/45 pl-6 pr-20 py-5')
    expect(sharedSource).toContain('pl-6 pr-20 py-5')
    expect(pageSource).toContain('shadow-none')
    expect(pageSource).not.toContain('shadow-xl')
  })

  test('uses lighter section containers instead of stacked bordered cards', () => {
    const sharedSource = readSourceFile('components/skills/authoring-shared.tsx')
    const editorSource = readSourceFile('components/skills/SkillEditor.tsx')
    const markdownSource = readSourceFile('components/skills/MarkdownAuthoringEditor.tsx')
    const shellSource = readSourceFile('components/skills/authoring-shell.tsx')

    expect(sharedSource).not.toContain('rounded-3xl border border-border bg-background/60 p-5')
    expect(sharedSource).not.toContain('rounded-[30px] bg-muted/20 p-5')
    expect(sharedSource).toContain('rounded-[30px] p-4')
    expect(editorSource).not.toContain('rounded-2xl border border-border bg-background/70 px-4 py-4')
    expect(editorSource).not.toContain('rounded-2xl bg-background/80 px-4 py-4')
    expect(editorSource).not.toContain('rounded-2xl bg-background/80 px-4 py-4 shadow-sm')
    expect(editorSource).toContain('divide-y divide-border/50')
    expect(editorSource).toContain('hover:bg-muted/35')
    expect(editorSource).toContain('space-y-6')
    expect(markdownSource).not.toContain('rounded-[32px] border border-border/60 bg-background p-5 shadow-sm')
    expect(markdownSource).toContain('rounded-[32px] bg-background p-4')
    expect(markdownSource).not.toContain('rounded-[32px] bg-background p-5 shadow-sm')
    expect(shellSource).toContain('flex-1 overflow-y-auto px-6 py-4')
    expect(shellSource).toContain('mx-auto max-w-5xl space-y-6')
  })

  test('removes the requested create-page helper copy and define section heading', () => {
    const source = readSourceFile('components/skills/SkillEditor.tsx')

    expect(source).not.toContain('t.skills.createSkillBody')
    expect(source).not.toContain('t.skills.stageDefineTitle')
    expect(source).not.toContain('t.skills.stageDefineBody')
  })

  test('keeps a single primary title and removes version badges from the create flow', () => {
    const source = readSourceFile('components/skills/SkillEditor.tsx')
    const zhSource = readSourceFile('i18n/zh.ts')

    expect(source).not.toContain('badges={<Badge variant="outline">v{currentVersion}</Badge>}')
    expect(source).not.toContain('version={resolvedDraft.frontmatter.version?.trim() || currentVersion}')
    expect(source).not.toContain('hideHeader')
    expect(source).toContain('title={t.skills.skillDetails}')
    expect(zhSource).toContain("skillDetails: '技能详情'")
  })

  test('styles field labels like secondary headings', () => {
    const source = readSourceFile('components/skills/authoring-shared.tsx')
    const editorSource = readSourceFile('components/skills/SkillEditor.tsx')

    expect(source).not.toContain('text-sm font-medium')
    expect(source).toContain('text-base font-semibold')
    expect(editorSource).toContain('className="shadow-none"')
    expect(editorSource).toContain('rows={3}')
    expect(editorSource).toContain('className="min-h-[72px] resize-y shadow-none"')
  })

  test('uses a segmented mode switch instead of two isolated outlined icon buttons', () => {
    const source = readSourceFile('components/skills/MarkdownAuthoringEditor.tsx')
    const headerSource = readSourceFile('components/skills/MarkdownAuthoringHeader.tsx')
    const sharedSource = readSourceFile('components/skills/authoring-shared.tsx')

    expect(source).toContain("import { MarkdownAuthoringHeader } from './MarkdownAuthoringHeader'")
    expect(source).not.toContain('h-14 w-14 rounded-3xl border border-border/70 shadow-none')
    expect(headerSource).toContain("title ? 'items-center justify-between' : 'items-start justify-end'")
    expect(headerSource).toContain('inline-flex shrink-0 items-center rounded-2xl bg-muted/45 p-1')
    expect(headerSource).toContain('h-11 w-11 items-center justify-center whitespace-nowrap rounded-xl border-0 text-sm font-medium shadow-none transition-colors')
    expect(headerSource).not.toContain("bg-background text-foreground shadow-sm")
    expect(headerSource).toContain('truncate text-base font-semibold')
    expect(source).toContain('rows={16}')
    expect(source).toContain('min-h-[320px]')
    expect(sharedSource).toContain('[&_h1]:text-xl')
  })

  test('adds searchable and filterable agent bindings with a dedicated scroll container', () => {
    const source = readSourceFile('components/skills/SkillEditor.tsx')

    expect(source).toContain("import { cn } from '@/lib/utils'")
    expect(source).toContain("const [bindingSearchQuery, setBindingSearchQuery] = useState('')")
    expect(source).not.toContain("const [bindingStatusFilter, setBindingStatusFilter] = useState<BindingFilter>('all')")
    expect(source).not.toContain('description={t.skills.stageBindingBody}')
    expect(source).toContain('placeholder={t.skills.bindingSearchPlaceholder}')
    expect(source).not.toContain('binding.id.toLowerCase().includes(query)')
    expect(source).not.toContain('t.skills.bindingFilterAll')
    expect(source).not.toContain('t.skills.bindingFilterBound')
    expect(source).not.toContain('t.skills.bindingFilterWildcard')
    expect(source).not.toContain('t.skills.bindingFilterUnbound')
    expect(source).toContain('visibleBindingRows.map((binding) => {')
    expect(source).toContain('t.skills.bindingNoResults')
    expect(source).toContain('max-h-72 overflow-y-auto')
    expect(source).not.toContain('visibleBindingRows.length}/{bindingRows.length}')
    expect(source).not.toContain('text-xs text-muted-foreground">{binding.id}')
    expect(source).toContain('titleClassName="text-base font-semibold"')
  })
})
