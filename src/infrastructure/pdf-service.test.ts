import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import { createSingleSourcePages } from '@/domain/page-ref'
import { createZipBytes, splitPdf } from './pdf-service'

const createPdf = async (pageCount: number): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create()
  for (let page = 0; page < pageCount; page += 1) pdf.addPage([200 + page, 300 + page])
  return pdf.save()
}

describe('PDF 輸出整合', () => {
  it('依計畫保留頁數與順序', async () => {
    const source = await createPdf(3)
    const pages = createSingleSourcePages(3)
    const output = await splitPdf(source, [
      { index: 1, pages: [pages[2], pages[0]], startPage: 3, endPage: 1 },
      { index: 2, pages: [pages[1]], startPage: 2, endPage: 2 },
    ], 'sample.pdf', '{originalName}_{partNumber}', () => undefined)

    expect(output.map((file) => file.name)).toEqual(['sample_01.pdf', 'sample_02.pdf'])
    const first = await PDFDocument.load(output[0].bytes)
    expect(first.getPageCount()).toBe(2)
    expect(first.getPages().map((page) => page.getWidth())).toEqual([202, 200])
  })

  it('ZIP 保留所有唯一命名的分件', async () => {
    const source = await createPdf(2)
    const pages = createSingleSourcePages(2)
    const output = await splitPdf(source, [
      { index: 1, pages: [pages[0]], startPage: 1, endPage: 1 },
      { index: 2, pages: [pages[1]], startPage: 2, endPage: 2 },
    ], 'same.pdf', '{originalName}', () => undefined)
    const zip = await JSZip.loadAsync(await createZipBytes(output))

    expect(Object.keys(zip.files).sort()).toEqual(['same.pdf', 'same_2.pdf'])
  })

  it('輸出時套用頁面旋轉', async () => {
    const source = await createPdf(1)
    const [page] = createSingleSourcePages(1)
    const output = await splitPdf(source, [
      { index: 1, pages: [{ ...page, rotation: 90 }], startPage: 1, endPage: 1 },
    ], 'rotate.pdf', '{originalName}', () => undefined)
    const rotated = await PDFDocument.load(output[0].bytes)

    expect(rotated.getPage(0).getRotation().angle).toBe(90)
  })

  it('在進入 pdf-lib 複製前拒絕空分件', async () => {
    const source = await createPdf(1)
    await expect(splitPdf(source, [
      { index: 1, pages: [], startPage: 0, endPage: 0 },
    ], 'sample.pdf', '{originalName}', () => undefined)).rejects.toThrow('尚未包含任何頁面')
  })
})
