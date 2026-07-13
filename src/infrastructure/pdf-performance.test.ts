import { PDFDocument } from 'pdf-lib'
import { createSingleSourcePages } from '@/domain/page-ref'
import { splitPdf } from './pdf-service'

describe('PDF performance baseline', () => {
  it('splits a 50-page fixture and reports elapsed time', async () => {
    const document = await PDFDocument.create()
    for (let index = 0; index < 50; index += 1) document.addPage([595, 842])
    const source = await document.save()
    const pages = createSingleSourcePages(50)
    const parts = Array.from({ length: 10 }, (_, index) => ({
      index: index + 1,
      pages: pages.slice(index * 5, index * 5 + 5),
      startPage: index * 5 + 1,
      endPage: index * 5 + 5,
    }))
    const startedAt = performance.now()
    const output = await splitPdf(source, parts, 'benchmark.pdf', '{originalName}_{partNumber}', () => undefined)
    const elapsed = Math.round(performance.now() - startedAt)
    expect(output).toHaveLength(10)
    expect(elapsed).toBeLessThan(15_000)
    console.info(`PDF baseline: 50 pages -> 10 files in ${elapsed} ms`)
  }, 20_000)
})
