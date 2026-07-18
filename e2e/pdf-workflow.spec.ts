import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'

const createPdf = async (pageCount: number): Promise<Buffer> => {
  const document = await PDFDocument.create()
  for (let index = 0; index < pageCount; index += 1) document.addPage([595, 842])
  return Buffer.from(await document.save())
}

const importPdfAndOpenWorkspace = async (page: import('@playwright/test').Page, pageCount = 3) => {
  await page.goto('/')
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    buffer: await createPdf(pageCount),
  })
  await expect(page.getByText('sample.pdf', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /下一步/ }).click()
  await page.getByRole('button', { name: /前往拆分工作台/ }).click()
  await expect(page.getByRole('heading', { name: '拆分工作台' })).toBeVisible()
}

test('initial page has no automatically detectable WCAG A/AA violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '匯入 PDF 檔案' })).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('imports a PDF and reaches the split workspace', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    buffer: await createPdf(3),
  })
  await expect(page.getByText('sample.pdf', { exact: true })).toBeVisible()
  await expect(page.getByText('共 3 頁', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: /下一步/ }).click()
  await expect(page.getByRole('heading', { name: '檔案拆分命名設定' })).toBeAttached()
  await page.getByRole('button', { name: /前往拆分工作台/ }).click()
  await expect(page.getByText(/固定頁數/).first()).toBeVisible()
})

test('merges multiple PDFs in import order', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: 'first.pdf', mimeType: 'application/pdf', buffer: await createPdf(1) },
    { name: 'second.pdf', mimeType: 'application/pdf', buffer: await createPdf(2) },
  ])
  await expect(page.getByText('first.pdf', { exact: true })).toBeVisible()
  await expect(page.getByText('second.pdf', { exact: true })).toBeVisible()
  await expect(page.getByText('共 1 頁', { exact: false })).toBeVisible()
  await expect(page.getByText('共 2 頁', { exact: false })).toBeVisible()
})

test('rejects an invalid PDF before parsing', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'invalid.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('not a pdf'),
  })
  await expect(page.getByRole('alert')).toContainText('沒有有效的 PDF 標頭')
})

test('downloads a valid ZIP and works offline after installation', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service Worker offline coverage runs on Chromium.')
  await importPdfAndOpenWorkspace(page)
  page.once('dialog', (dialog) => dialog.accept())
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /下載 ZIP/ }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).not.toBeNull()
  const zip = await JSZip.loadAsync(await readFile(path as string))
  const names = Object.keys(zip.files)
  expect(names).toEqual(['sample_part_01.pdf'])
  const output = await PDFDocument.load(await zip.file(names[0])!.async('uint8array'))
  expect(output.getPageCount()).toBe(3)

  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'PDF 拆分工具' })).toBeVisible()
  await context.setOffline(false)
})

test('processes a PDF after the PWA is installed offline', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service Worker offline coverage runs on Chromium.')
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'offline.pdf',
    mimeType: 'application/pdf',
    buffer: await createPdf(2),
  })
  await expect(page.getByText('offline.pdf', { exact: true })).toBeVisible()
  await expect(page.getByText('共 2 頁', { exact: false })).toBeVisible()
  await context.setOffline(false)
})
