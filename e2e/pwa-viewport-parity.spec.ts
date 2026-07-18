import { expect, test } from '@playwright/test'

test.describe('PWA viewport parity', () => {
  test('keeps the design scale stable in the installed PWA viewport', async ({ page }) => {
    await page.setViewportSize({ width: 860, height: 1100 })
    await page.goto('/')

    const metrics = await page.evaluate(() => ({
      uiScale: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(),
      importLayout: getComputedStyle(document.querySelector('.import-workspace')).display,
      titleSize: getComputedStyle(document.querySelector('h1')).fontSize,
    }))

    expect(metrics.uiScale).toBe('1')
    expect(metrics.importLayout).toBe('block')
    expect(metrics.titleSize).toBe('20px')
  })

  test('keeps the same design scale on a wide desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')

    const uiScale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim())

    expect(uiScale).toBe('1')
  })
})
