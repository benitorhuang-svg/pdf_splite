import {
  MAX_TOTAL_INPUT_BYTES,
  getPdfWorkloadWarning,
  validatePdfPageCount,
  validatePdfSelection,
} from './pdf-limits'

describe('PDF workload limits', () => {
  it('rejects non-PDF and oversized selections before parsing', () => {
    expect(() => validatePdfSelection([{ name: 'notes.txt', size: 12, type: 'text/plain' }])).toThrow('不是 PDF')
    expect(() => validatePdfSelection([{ name: 'huge.pdf', size: MAX_TOTAL_INPUT_BYTES + 1 }])).toThrow('超過')
  })

  it('rejects excessive pages and warns for large workloads', () => {
    expect(() => validatePdfPageCount(2_001)).toThrow('2,000 頁上限')
    expect(getPdfWorkloadWarning(51 * 1024 * 1024, 10)).toContain('大型文件')
  })
})
