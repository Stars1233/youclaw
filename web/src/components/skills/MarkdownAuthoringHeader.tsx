import { useContext } from 'react'
import { CodeXml, Eye } from 'lucide-react'
import { I18nContext } from '../../i18n/ctx'

interface MarkdownAuthoringHeaderProps {
  title?: string
  version?: string
  description?: string
  mode: 'markdown' | 'preview'
  onModeChange: (mode: 'markdown' | 'preview') => void
}

const modeButtonClassName = [
  'inline-flex h-11 w-11 items-center justify-center whitespace-nowrap rounded-xl border-0 text-sm font-medium shadow-none transition-colors',
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]',
  'disabled:pointer-events-none disabled:opacity-50',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0',
].join(' ')

export function MarkdownAuthoringHeader({
  title,
  version,
  description,
  mode,
  onModeChange,
}: MarkdownAuthoringHeaderProps) {
  const { t } = useContext(I18nContext)

  return (
    <div className={`mb-5 flex gap-4 ${title ? 'items-center justify-between' : 'items-start justify-end'}`}>
      {title && (
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-base font-semibold">{title}</div>
            {version && (
              <span className="shrink-0 rounded-md border px-2.5 py-0.5 text-[10px] font-semibold">
                v{version}
              </span>
            )}
          </div>
          {description && (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      )}

      <div className="inline-flex shrink-0 items-center rounded-2xl bg-muted/45 p-1">
        <button
          type="button"
          aria-label={t.skills.tabPreview}
          aria-pressed={mode === 'preview'}
          className={`${modeButtonClassName} ${
            mode === 'preview'
              ? 'bg-background text-foreground'
              : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
          }`}
          onClick={() => onModeChange('preview')}
        >
          <Eye className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label={t.skills.tabMarkdown}
          aria-pressed={mode === 'markdown'}
          className={`${modeButtonClassName} ${
            mode === 'markdown'
              ? 'bg-background text-foreground'
              : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
          }`}
          onClick={() => onModeChange('markdown')}
        >
          <CodeXml className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
