import type { ComponentType } from 'react'

export type SlotId = string

export type LayoutRegion = {
  slot: SlotId
  gridArea: string
  className?: string
}

export type LayoutTemplate = {
  id: string
  name: string
  description: string
  grid: {
    columns: string
    rows: string
    areas: string
  }
  regions: LayoutRegion[]
}

export type PanelRegistry = Record<SlotId, ComponentType>
