import type { PageRef } from '@/domain/page-ref'
import { createSingleSourcePages } from '@/domain/page-ref'

export type SplitMode = 'fixed-count' | 'page-ranges'

export interface PageRange {
  readonly start: number
  readonly end: number
}

export interface OutputPart {
  readonly index: number
  readonly pages: readonly PageRef[]
  readonly startPage: number
  readonly endPage: number
}

export interface SplitRule {
  readonly mode: SplitMode
  readonly fixedCount: number
  readonly customRanges: readonly PageRange[]
}

export const formatPageSelection = (pages: readonly number[]): string => {
  const groups: string[] = []
  let start = pages[0]
  let end = pages[0]
  for (let index = 1; index <= pages.length; index += 1) {
    const page = pages[index]
    if (page === end + 1) {
      end = page
      continue
    }
    if (start !== undefined) groups.push(start === end ? String(start) : `${start}-${end}`)
    start = page
    end = page
  }
  return groups.join(', ')
}

export const parsePageSelection = (value: string, totalPages: number): number[] => {
  if (!value.trim()) return []
  const pages: number[] = []
  const seen = new Set<number>()
  for (const segment of value.split(',')) {
    const match = segment.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!match) throw new Error(`無法辨識分頁範圍「${segment.trim()}」`)
    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])
    if (start > end) throw new Error(`起始頁 ${start} 不能大於結束頁 ${end}`)
    for (let page = start; page <= end; page += 1) {
      assertPage(page, totalPages)
      if (seen.has(page)) throw new Error(`第 ${page} 頁重複出現`)
      seen.add(page)
      pages.push(page)
    }
  }
  return pages
}

export const validateSplitPlan = (parts: readonly OutputPart[], totalPages: number): void => {
  if (parts.length === 0) throw new Error('請至少建立一個拆分檔案')
  const seen = new Set<number>()
  for (const part of parts) {
    if (part.pages.length === 0) throw new Error(`檔案 ${part.index} 尚未包含任何頁面`)
    for (const page of part.pages) {
      assertPage(page.documentPageNumber, totalPages)
      if (seen.has(page.documentPageNumber)) {
        throw new Error(`第 ${page.documentPageNumber} 頁被重複指派`)
      }
      seen.add(page.documentPageNumber)
    }
  }
}

const assertPage = (page: number, totalPages: number): void => {
  if (!Number.isInteger(page) || page < 1 || page > totalPages) {
    throw new Error(`頁碼 ${page} 不在有效範圍 1–${totalPages} 內`)
  }
}

export const createSplitPlan = (
  totalPages: number,
  rule: SplitRule,
  pageRegistry: readonly PageRef[] = createSingleSourcePages(totalPages),
): OutputPart[] => {
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error('PDF 至少需要一頁')
  if (pageRegistry.length !== totalPages) throw new Error('頁面登錄資料與 PDF 頁數不一致')

  let groups: PageRef[][]
  if (rule.mode === 'fixed-count') {
    if (!Number.isInteger(rule.fixedCount) || rule.fixedCount < 1) {
      throw new Error('固定頁數必須是大於 0 的整數')
    }
    groups = []
    for (let start = 1; start <= totalPages; start += rule.fixedCount) {
      groups.push(pageRegistry.slice(start - 1, Math.min(start + rule.fixedCount - 1, totalPages)))
    }
  } else {
    const customRanges = rule.customRanges ?? []
    const seen = new Set<number>()
    for (const { start, end } of customRanges) {
      assertPage(start, totalPages)
      assertPage(end, totalPages)
      if (start > end) throw new Error(`起始頁 ${start} 不能大於結束頁 ${end}`)
      for (let page = start; page <= end; page += 1) {
        if (seen.has(page)) throw new Error(`第 ${page} 頁被重複選取`)
        seen.add(page)
      }
    }
    groups = customRanges.map(({ start, end }) => pageRegistry.slice(start - 1, end))
  }

  return groups.map((pages, index) => ({
    index: index + 1,
    pages,
    startPage: pages[0]?.documentPageNumber ?? 0,
    endPage: pages.at(-1)?.documentPageNumber ?? pages[0]?.documentPageNumber ?? 0,
  }))
}

export const formatOutputName = (
  template: string,
  originalName: string,
  part: OutputPart,
  date = new Date(),
): string => {
  const base = originalName.replace(/\.pdf$/i, '')
  const safeTemplate = template.trim() || '{originalName}_part_{partNumber}'
  const name = safeTemplate
    .replaceAll('{originalName}', base)
    .replaceAll('{partNumber}', String(part.index).padStart(2, '0'))
    .replaceAll('{startPage}', String(part.startPage))
    .replaceAll('{endPage}', String(part.endPage))
    .replaceAll('{date}', date.toISOString().slice(0, 10))
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/[. ]+$/g, '')
  return `${name || 'output'}.pdf`
}

export const createUniqueOutputNames = (
  template: string,
  originalName: string,
  parts: readonly OutputPart[],
  date = new Date(),
): string[] => {
  const used = new Set<string>()
  return parts.map((part) => {
    const requested = formatOutputName(template, originalName, part, date)
    const base = requested.replace(/\.pdf$/i, '')
    let candidate = requested
    let suffix = 2
    while (used.has(candidate.toLocaleLowerCase())) {
      candidate = `${base}_${suffix}.pdf`
      suffix += 1
    }
    used.add(candidate.toLocaleLowerCase())
    return candidate
  })
}
