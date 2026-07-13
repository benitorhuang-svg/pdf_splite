import {
  createSplitPlan,
  createUniqueOutputNames,
  formatPageSelection,
  formatOutputName,
  parsePageSelection,
  validateSplitPlan,
} from '@/domain/split-plan'
import type { SplitRule } from '@/domain/split-plan'

describe('SplitPlan', () => {
  const pageNumbers = (parts: ReturnType<typeof createSplitPlan>) =>
    parts.map((part) => part.pages.map((page) => page.documentPageNumber))

  it('固定頁數為 1 時每頁建立一個分件', () => {
    expect(createSplitPlan(3, { mode: 'fixed-count', fixedCount: 1, customRanges: [] })).toHaveLength(3)
  })

  it('固定頁數保留最後不足頁數的分件', () => {
    const parts = createSplitPlan(12, { mode: 'fixed-count', fixedCount: 5, customRanges: [] })
    expect(pageNumbers(parts)).toEqual([[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12]])
  })

  it('依自訂頁碼範圍建立分件', () => {
    const parts = createSplitPlan(6, {
      mode: 'page-ranges', fixedCount: 5, customRanges: [{ start: 1, end: 2 }, { start: 5, end: 6 }],
    })
    expect(pageNumbers(parts)).toEqual([[1, 2], [5, 6]])
  })

  it('可解析並格式化手動快速填入的分頁範圍', () => {
    expect(parsePageSelection('1-3, 5, 8-10', 10)).toEqual([1, 2, 3, 5, 8, 9, 10])
    expect(formatPageSelection([1, 2, 3, 5, 8, 9, 10])).toBe('1-3, 5, 8-10')
  })

  it('拒絕超出文件範圍的快速填入頁碼', () => {
    expect(() => parsePageSelection('1-4', 3)).toThrow('頁碼 4 不在有效範圍')
  })

  it('舊工作階段缺少自訂範圍時不會拋出例外', () => {
    const legacyRule = { mode: 'page-ranges', fixedCount: 5 } as SplitRule
    expect(createSplitPlan(3, legacyRule)).toEqual([])
  })

  it('依模板產生安全檔名', () => {
    const part = createSplitPlan(3, { mode: 'fixed-count', fixedCount: 2, customRanges: [] })[0]
    expect(formatOutputName('{originalName}_{partNumber}_{startPage}-{endPage}', 'demo.pdf', part)).toBe('demo_01_1-2.pdf')
  })

  it('替重複輸出名稱加入穩定後綴', () => {
    const parts = createSplitPlan(3, { mode: 'fixed-count', fixedCount: 1, customRanges: [] })
    expect(createUniqueOutputNames('{originalName}', 'demo.pdf', parts)).toEqual([
      'demo.pdf', 'demo_2.pdf', 'demo_3.pdf',
    ])
  })

  it('拒絕空分件', () => {
    expect(() => validateSplitPlan([
      { index: 1, pages: [], startPage: 0, endPage: 0 },
    ], 3)).toThrow('檔案 1 尚未包含任何頁面')
  })

  it('拒絕跨分件重複頁面', () => {
    expect(() => validateSplitPlan([
      { index: 1, pages: createSplitPlan(1, { mode: 'fixed-count', fixedCount: 1, customRanges: [] })[0].pages, startPage: 1, endPage: 1 },
      { index: 2, pages: createSplitPlan(1, { mode: 'fixed-count', fixedCount: 1, customRanges: [] })[0].pages, startPage: 1, endPage: 1 },
    ], 3)).toThrow('第 1 頁被重複指派')
  })
})
