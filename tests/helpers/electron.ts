import { _electron as electron, type ElectronApplication, type Page } from 'playwright'
import { test as base } from '@playwright/test'
import { resolve } from 'node:path'

type Fixtures = {
  electronApp: ElectronApplication
  page: Page
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    const projectRoot = resolve(__dirname, '..', '..')
    const app = await electron.launch({
      args: [resolve(projectRoot, 'out/main/index.js')],
      cwd: projectRoot,
      timeout: 30_000
    })
    await use(app)
    await app.close()
  },
  page: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    await use(window)
  }
})

export { expect } from '@playwright/test'
