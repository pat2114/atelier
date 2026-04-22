import { test, expect } from './helpers/electron'

const PINK_HUE_MIN = 300
const PINK_HUE_MAX = 360

function parseOklch(value: string): { l: number; c: number; h: number } | null {
  const match = /oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/.exec(value)
  if (!match) return null
  return { l: parseFloat(match[1]), c: parseFloat(match[2]), h: parseFloat(match[3]) }
}

test('baseline app loads with no inline background tint', async ({ page }) => {
  await expect(page.locator('[data-slot="pipeline"]')).toBeVisible()
  await expect(page.locator('[data-slot="chat"]')).toBeVisible()
  await expect(page.getByPlaceholder(/tell the shell/i)).toBeVisible()

  const initialBg = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue('--background').trim()
  )
  expect(initialBg).toBe('')
})

test('"warmer" uses the deterministic fast-path and changes the accent token', async ({ page }) => {
  const input = page.getByPlaceholder(/tell the shell/i)
  await input.fill('warmer')
  await input.press('Enter')

  await expect(page.getByText(/warmed up the accent/i)).toBeVisible({ timeout: 5_000 })

  const primary = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue('--primary').trim()
  )
  expect(primary).toMatch(/^oklch\(/)
  const parsed = parseOklch(primary)
  expect(parsed).not.toBeNull()
  expect(parsed!.c).toBeGreaterThan(0)
})

test('"make it pink" falls through to Claude and tints the background', async ({
  page
}) => {
  const input = page.getByPlaceholder(/tell the shell/i)
  await input.fill('make it pink')
  await input.press('Enter')

  // Thinking bubble should appear first
  await expect(page.getByText(/thinking/i)).toBeVisible({ timeout: 5_000 })

  // Then get resolved with a real reply (LLM call can take up to ~30s cold)
  await expect(page.getByText(/thinking/i)).toBeHidden({ timeout: 45_000 })

  // Capture a screenshot so a human can also sanity-check visually
  await page.screenshot({
    path: 'tests/__snapshots__/make-it-pink.png',
    fullPage: true
  })

  // Background should now have a pink-tinted OKLCH value set inline
  const background = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue('--background').trim()
  )
  expect(background).toMatch(/^oklch\(/)

  const parsed = parseOklch(background)
  expect(parsed).not.toBeNull()
  expect(parsed!.c).toBeGreaterThan(0)
  expect(parsed!.h).toBeGreaterThanOrEqual(PINK_HUE_MIN)
  expect(parsed!.h).toBeLessThanOrEqual(PINK_HUE_MAX)
})
