import { describe, expect, it } from 'vitest'
import { createSourcePageInfo, sourceThemeClass } from './source-theme'

const createFile = (name: string, size: number, lastModified: number): File =>
  new File(['x'.repeat(size)], name, { type: 'application/pdf', lastModified })

describe('source themes', () => {
  it('assigns merged pages to their source file indexes', () => {
    const first = createFile('first.pdf', 3, 1)
    const second = createFile('second.pdf', 3, 2)
    const counts = {
      [`${first.name}:${first.size}:${first.lastModified}`]: 2,
      [`${second.name}:${second.size}:${second.lastModified}`]: 3,
    }

    expect([...createSourcePageInfo([first, second], counts)]).toEqual([
      [1, { sourceIndex: 0, localPageNumber: 1 }],
      [2, { sourceIndex: 0, localPageNumber: 2 }],
      [3, { sourceIndex: 1, localPageNumber: 1 }],
      [4, { sourceIndex: 1, localPageNumber: 2 }],
      [5, { sourceIndex: 1, localPageNumber: 3 }],
    ])
  })

  it('does not mislabel later sources while an earlier page count is pending', () => {
    const first = createFile('first.pdf', 3, 1)
    const second = createFile('second.pdf', 3, 2)
    const counts = { [`${second.name}:${second.size}:${second.lastModified}`]: 3 }

    expect(createSourcePageInfo([first, second], counts).size).toBe(0)
  })

  it('cycles the palette after eight source files', () => {
    expect(sourceThemeClass(8)).toBe('source-theme-1')
  })
})
