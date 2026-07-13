import { createPageRegistry, rotatePage } from './page-ref'

describe('PageRef', () => {
  it('跨來源建立穩定識別與合併文件頁碼', () => {
    const pages = createPageRegistry([
      { id: 'first', pageCount: 2 },
      { id: 'second', pageCount: 1 },
    ])

    expect(pages.map((page) => [page.id, page.documentPageNumber])).toEqual([
      ['first#1', 1], ['first#2', 2], ['second#1', 3],
    ])
    expect(rotatePage(rotatePage(pages[0], 90), 270).rotation).toBe(0)
  })
})
