import type { LayoutTemplate } from './types'

export const splitTemplate: LayoutTemplate = {
  id: 'split',
  name: 'Split',
  description: 'Pipeline sidebar + main review area + chat strip',
  grid: {
    columns: '280px 1fr',
    rows: '1fr auto',
    areas: `
      "pipeline main"
      "pipeline chat"
    `
  },
  regions: [
    { slot: 'pipeline', gridArea: 'pipeline', className: 'border-r border-border' },
    { slot: 'main', gridArea: 'main', className: 'overflow-auto' },
    { slot: 'chat', gridArea: 'chat', className: 'border-t border-border' }
  ]
}

export const focusTemplate: LayoutTemplate = {
  id: 'focus',
  name: 'Focus',
  description: 'Main review area + chat only, no sidebar',
  grid: {
    columns: '1fr',
    rows: '1fr auto',
    areas: `
      "main"
      "chat"
    `
  },
  regions: [
    { slot: 'main', gridArea: 'main', className: 'overflow-auto' },
    { slot: 'chat', gridArea: 'chat', className: 'border-t border-border' }
  ]
}

export const templates = {
  split: splitTemplate,
  focus: focusTemplate
}

export type TemplateId = keyof typeof templates
