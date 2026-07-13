import { describe, expect, it } from 'vitest'
import { formatSourcePageSelection, parseSourcePageSelection } from './source-page-selection'
import type { SourcePageInfo } from './source-theme'

const sourcePages = new Map<number, SourcePageInfo>([
  [1, { sourceIndex: 0, localPageNumber: 1 }],
  [2, { sourceIndex: 0, localPageNumber: 2 }],
  [3, { sourceIndex: 1, localPageNumber: 1 }],
  [4, { sourceIndex: 1, localPageNumber: 2 }],
  [5, { sourceIndex: 1, localPageNumber: 3 }],
])

describe('source page selection', () => {
  it('formats global pages with source sequence and local page ranges', () => {
    expect(formatSourcePageSelection([1, 2, 3, 5], sourcePages)).toBe('S1:1-2, S2:1, S2:3')
  })

  it('parses source-aware ranges into global pages', () => {
    expect(parseSourcePageSelection('S1:1-2, S2:1, S2:3', 5, sourcePages)).toEqual([1, 2, 3, 5])
  })

  it('keeps legacy global page ranges compatible', () => {
    expect(parseSourcePageSelection('1-2, 5', 5, sourcePages)).toEqual([1, 2, 5])
  })

  it('rejects local pages that do not exist in the source', () => {
    expect(() => parseSourcePageSelection('S1:3', 5, sourcePages)).toThrow('資料源 1 沒有第 3 頁')
  })
})
