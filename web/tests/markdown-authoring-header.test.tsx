import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarkdownAuthoringHeader } from '../src/components/skills/MarkdownAuthoringHeader'

describe('MarkdownAuthoringHeader', () => {
  test('renders a field-sized title aligned with the mode toggle row', () => {
    const markup = renderToStaticMarkup(
      <MarkdownAuthoringHeader
        title="Skill Details"
        mode="markdown"
        onModeChange={() => {}}
      />,
    )

    expect(markup).toContain('mb-5 flex gap-4 items-center justify-between')
    expect(markup).toContain('truncate text-base font-semibold')
    expect(markup).toContain('Skill Details')
  })
})
