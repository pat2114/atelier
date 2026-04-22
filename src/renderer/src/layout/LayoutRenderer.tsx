import type { LayoutTemplate, PanelRegistry } from './types'
import { cn } from '@/lib/utils'

type LayoutRendererProps = {
  template: LayoutTemplate
  panels: PanelRegistry
}

export function LayoutRenderer({ template, panels }: LayoutRendererProps): React.JSX.Element {
  const style: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: template.grid.columns,
    gridTemplateRows: template.grid.rows,
    gridTemplateAreas: template.grid.areas,
    height: '100%',
    width: '100%'
  }

  return (
    <div style={style}>
      {template.regions.map((region) => {
        const Panel = panels[region.slot]
        return (
          <div
            key={region.slot}
            className={cn('min-h-0 min-w-0', region.className)}
            style={{ gridArea: region.gridArea }}
            data-slot={region.slot}
          >
            {Panel ? <Panel /> : <EmptySlot slot={region.slot} />}
          </div>
        )
      })}
    </div>
  )
}

function EmptySlot({ slot }: { slot: string }): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      no panel registered for &quot;{slot}&quot;
    </div>
  )
}
