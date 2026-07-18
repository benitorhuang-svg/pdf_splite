import { PDFDocument } from 'pdf-lib'
import { mergePdfFiles } from './pdf-merge-core'

const createPdf = async (pageCount: number): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create()
  for (let page = 0; page < pageCount; page += 1) pdf.addPage([200, 300])
  return pdf.save()
}

describe('PDF merge core', () => {
  it('保留來源順序並回傳各來源頁數', async () => {
    const result = await mergePdfFiles([
      { name: 'first.pdf', bytes: await createPdf(1) },
      { name: 'second.pdf', bytes: await createPdf(2) },
    ])
    const merged = await PDFDocument.load(result.buffer)

    expect(result.sourcePageCounts).toEqual([1, 2])
    expect(merged.getPageCount()).toBe(3)
  })

  it('在複製頁面前拒絕超過頁數上限的合併工作', async () => {
    await expect(mergePdfFiles([
      { name: 'first.pdf', bytes: await createPdf(2_001) },
    ])).rejects.toThrow('超過 2,000 頁上限')
  }, 30_000)
})
