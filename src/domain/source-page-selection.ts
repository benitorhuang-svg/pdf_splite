import { parsePageSelection } from './split-plan'
import type { SourcePageInfo } from './source-theme'

const token = (sourceIndex: number, start: number, end: number): string =>
  `S${sourceIndex + 1}:${start === end ? start : `${start}-${end}`}`

export const formatSourcePageSelection = (
  pages: readonly number[],
  sourcePages: ReadonlyMap<number, SourcePageInfo>,
): string => {
  const groups: string[] = []
  let sourceIndex: number | undefined
  let start: number | undefined
  let end: number | undefined
  const flush = (): void => {
    if (sourceIndex !== undefined && start !== undefined && end !== undefined) {
      groups.push(token(sourceIndex, start, end))
    }
  }

  for (const page of pages) {
    const source = sourcePages.get(page)
    if (!source) {
      flush()
      sourceIndex = undefined
      start = undefined
      end = undefined
      groups.push(String(page))
      continue
    }
    if (source.sourceIndex === sourceIndex && source.localPageNumber === (end ?? 0) + 1) {
      end = source.localPageNumber
      continue
    }
    flush()
    sourceIndex = source.sourceIndex
    start = source.localPageNumber
    end = source.localPageNumber
  }
  flush()
  return groups.join(', ')
}

export const parseSourcePageSelection = (
  value: string,
  totalPages: number,
  sourcePages: ReadonlyMap<number, SourcePageInfo>,
): number[] => {
  if (!value.trim()) return []
  const lookup = new Map<string, number>()
  const sources = new Set<number>()
  for (const [page, source] of sourcePages) {
    lookup.set(`${source.sourceIndex}:${source.localPageNumber}`, page)
    sources.add(source.sourceIndex)
  }
  const pages: number[] = []
  const seen = new Set<number>()
  for (const rawSegment of value.split(',')) {
    const segment = rawSegment.trim()
    const match = segment.match(/^(?:S|資料源)\s*(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/i)
    const selected = match
      ? resolveSourceRange(match, sources, lookup)
      : parsePageSelection(segment, totalPages)
    for (const page of selected) {
      if (seen.has(page)) throw new Error(`第 ${page} 頁重複出現`)
      seen.add(page)
      pages.push(page)
    }
  }
  return pages
}

const resolveSourceRange = (
  match: RegExpMatchArray,
  sources: ReadonlySet<number>,
  lookup: ReadonlyMap<string, number>,
): number[] => {
  const sourceNumber = Number(match[1])
  const sourceIndex = sourceNumber - 1
  const start = Number(match[2])
  const end = Number(match[3] ?? match[2])
  if (!sources.has(sourceIndex)) throw new Error(`資料源 ${sourceNumber} 不存在`)
  if (start > end) throw new Error(`起始頁 ${start} 不能大於結束頁 ${end}`)
  const pages: number[] = []
  for (let localPage = start; localPage <= end; localPage += 1) {
    const page = lookup.get(`${sourceIndex}:${localPage}`)
    if (!page) throw new Error(`資料源 ${sourceNumber} 沒有第 ${localPage} 頁`)
    pages.push(page)
  }
  return pages
}
