import fc from 'fast-check'
import { createSplitPlan, formatPageSelection, parsePageSelection, validateSplitPlan } from './split-plan'

describe('SplitPlan properties', () => {
  it('固定頁數拆分永遠完整涵蓋且不重複', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 2_000 }),
      fc.integer({ min: 1, max: 250 }),
      (pageCount, fixedCount) => {
        const parts = createSplitPlan(pageCount, {
          mode: 'fixed-count', fixedCount, customRanges: [],
        })
        const pageNumbers = parts.flatMap((part) =>
          part.pages.map((page) => page.documentPageNumber))

        expect(pageNumbers).toEqual(Array.from({ length: pageCount }, (_, index) => index + 1))
        expect(new Set(pageNumbers).size).toBe(pageCount)
        expect(() => validateSplitPlan(parts, pageCount)).not.toThrow()
      },
    ))
  })

  it('合法頁碼集合格式化後可無損解析', () => {
    fc.assert(fc.property(
      fc.uniqueArray(fc.integer({ min: 1, max: 2_000 }), { minLength: 1 }),
      (values) => {
        const pages = values.toSorted((left, right) => left - right)
        expect(parsePageSelection(formatPageSelection(pages), 2_000)).toEqual(pages)
      },
    ))
  })

  it('任意合法自訂範圍都保留頁面順序', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 1_500 }),
      fc.integer({ min: 1, max: 500 }),
      (start, length) => {
        const end = start + length - 1
        const parts = createSplitPlan(end, {
          mode: 'page-ranges', fixedCount: 1, customRanges: [{ start, end }],
        })
        expect(parts[0].pages.map((page) => page.documentPageNumber)).toEqual(
          Array.from({ length }, (_, index) => start + index),
        )
      },
    ))
  })
})
