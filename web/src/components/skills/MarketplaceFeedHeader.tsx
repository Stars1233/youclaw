import { BarChart3, Brain, Code2, LayoutGrid, MessageCircle, PenTool, Rocket, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { RegistrySelectableSource } from '../../api/client'
import type { Translations } from '../../i18n/types'
import {
  getTencentMarketplaceCategoryLabel,
  tencentMarketplaceCategoryOrder,
  type TencentMarketplaceCategoryFilter,
} from '../../lib/tencent-marketplace-category'
import { cn } from '../../lib/utils'

const tencentCategoryMeta: Record<
  Exclude<TencentMarketplaceCategoryFilter, 'all'>,
  { icon: LucideIcon }
> = {
  'ai-intelligence': {
    icon: Brain,
  },
  'developer-tools': {
    icon: Code2,
  },
  productivity: {
    icon: Rocket,
  },
  'data-analysis': {
    icon: BarChart3,
  },
  'content-creation': {
    icon: PenTool,
  },
  'security-compliance': {
    icon: ShieldCheck,
  },
  'communication-collaboration': {
    icon: MessageCircle,
  },
}

export function MarketplaceFeedHeader({
  registrySource,
  marketplaceCategoryFilter,
  onMarketplaceCategoryFilterChange,
  t,
}: {
  registrySource: RegistrySelectableSource
  marketplaceCategoryFilter: TencentMarketplaceCategoryFilter
  onMarketplaceCategoryFilterChange: (filter: TencentMarketplaceCategoryFilter) => void
  t: Translations
}) {
  const showTencentCategories = registrySource === 'tencent' || registrySource === 'recommended'

  if (!showTencentCategories) {
    return null
  }

  const tencentCategoryOptions = [
    {
      value: 'all' as const,
      label: getTencentMarketplaceCategoryLabel('all', t),
      icon: LayoutGrid,
    },
    ...tencentMarketplaceCategoryOrder.map((category) => ({
      value: category,
      label: getTencentMarketplaceCategoryLabel(category, t),
      ...tencentCategoryMeta[category],
    })),
  ]

  return (
    <div className="flex flex-wrap gap-3 pb-6">
      {tencentCategoryOptions.map((option) => {
        const Icon = option.icon
        const isSelected = marketplaceCategoryFilter === option.value

        return (
          <button
            key={option.value}
            type="button"
            data-testid={`marketplace-category-${option.value}`}
            aria-pressed={isSelected}
            onClick={() => onMarketplaceCategoryFilterChange(option.value)}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all duration-200 outline-none',
              isSelected
                ? 'border-primary/35 bg-primary/[0.06] text-foreground shadow-[0_12px_24px_-18px_rgba(37,99,235,0.45)]'
                : 'border-border/70 bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-current" />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
