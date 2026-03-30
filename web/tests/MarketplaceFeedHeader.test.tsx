import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarketplaceFeedHeader } from '../src/components/skills/MarketplaceFeedHeader'
import { en } from '../src/i18n/en'

describe('MarketplaceFeedHeader', () => {
  test('shows category filters for the recommended source without a redundant heading', () => {
    const html = renderToStaticMarkup(
      <MarketplaceFeedHeader
        registrySource="recommended"
        marketplaceCategoryFilter="all"
        onMarketplaceCategoryFilterChange={() => {}}
        t={en}
      />,
    )

    expect(html).toContain('AI Intelligence')
    expect(html).not.toContain('<h3')
    expect(html).not.toContain('>Recommended<')
  })

  test('renders nothing for marketplace sources without category filters', () => {
    const html = renderToStaticMarkup(
      <MarketplaceFeedHeader
        registrySource="clawhub"
        marketplaceCategoryFilter="all"
        onMarketplaceCategoryFilterChange={() => {}}
        t={en}
      />,
    )

    expect(html).toBe('')
  })
})
