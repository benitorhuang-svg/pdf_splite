import { act, renderHook } from '@testing-library/react'
import type { DragEvent } from 'react'
import { usePartsBoardDrag } from './use-parts-board-drag'

const dragEvent = (
  currentTarget: HTMLElement,
  overrides: Partial<DragEvent<HTMLElement>> = {},
): DragEvent<HTMLElement> => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  currentTarget,
  relatedTarget: null,
  clientX: 0,
  clientY: 0,
  ...overrides,
} as unknown as DragEvent<HTMLElement>)

describe('usePartsBoardDrag', () => {
  it('游標仍在分件子元素內時不清除 drop highlight', () => {
    const container = document.createElement('div')
    const child = document.createElement('div')
    container.append(child)
    const { result } = renderHook(() => usePartsBoardDrag({
      onMovePage: vi.fn(),
      onReorderPage: vi.fn(),
    }))

    act(() => result.current.handleDragOverContainer(dragEvent(container), 1))
    act(() => result.current.handleDragLeaveContainer(dragEvent(container, { relatedTarget: child })))

    expect(result.current.activeDropPart).toBe(1)
  })

  it('相同縮圖的重複 dragover 保留同一個狀態物件', () => {
    const container = document.createElement('div')
    const { result } = renderHook(() => usePartsBoardDrag({
      onMovePage: vi.fn(),
      onReorderPage: vi.fn(),
    }))
    const event = dragEvent(container)

    act(() => result.current.handleDragOverCard(event, 2, 3))
    const first = result.current.activeDropPage
    act(() => result.current.handleDragOverCard(event, 2, 3))

    expect(result.current.activeDropPage).toBe(first)
  })
})
