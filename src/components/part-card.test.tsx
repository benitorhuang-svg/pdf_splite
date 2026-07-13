import { fireEvent, render, screen } from '@testing-library/react'
import { PartCard } from './part-card'
import type { usePartsBoardDrag } from './use-parts-board-drag'
import { createSingleSourcePages } from '@/domain/page-ref'

const drag = {
  activeDropPart: null,
  activeDropPage: null,
  draggingPage: null,
  setActiveDropPart: vi.fn(),
  setActiveDropPage: vi.fn(),
  setDraggingPage: vi.fn(),
  handleDragOverContainer: vi.fn(),
  handleDragLeaveContainer: vi.fn(),
  handleDropContainer: vi.fn(),
  handleDragStartCard: vi.fn(),
  handleDragOverCard: vi.fn(),
  handleDropCard: vi.fn(),
} as unknown as ReturnType<typeof usePartsBoardDrag>

describe('PartCard', () => {
  it('預設縮合並可切換頁碼與縮圖內容', () => {
    render(
      <PartCard
        part={{ index: 1, pages: [], startPage: 0, endPage: 0 }}
        partIndex={0}
        totalParts={1}
        pageCount={3}
        manualMode={false}
        thumbnails={[]}
        sourcePages={new Map()}
        activePage={null}
        downloading={false}
        canDelete={false}
        drag={drag}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
        onSetPages={vi.fn()}
        onRemovePage={vi.fn()}
        onMovePage={vi.fn()}
        onReorderPage={vi.fn()}
        onSelectPage={vi.fn()}
        onRequestThumbnail={vi.fn()}
        onAnnounce={vi.fn()}
        validationMessage=""
      />,
    )

    expect(screen.getByRole('button', { name: '縮合檔案 1' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '縮合檔案 1' }))
    expect(screen.queryByText('無頁面')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '顯示頁碼' }))
    expect(screen.getByText('無頁面')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: '顯示縮圖' }))
    expect(screen.getByText('拖曳分頁至此')).toBeVisible()
    expect(screen.getByRole('button', { name: '顯示縮圖' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: '放大檔案 1 縮圖' }))
    expect(screen.getByText('110%')).toBeVisible()
    const thumbnailList = document.querySelector('.part-pages-list') as HTMLElement
    expect(thumbnailList.style.getPropertyValue('--part-thumbnail-width')).toBe('52.8px')
  })

  it('方向鍵可重新排序並公告結果', () => {
    const onReorderPage = vi.fn()
    const onAnnounce = vi.fn()
    const pages = createSingleSourcePages(2)
    render(
      <PartCard
        part={{ index: 1, pages, startPage: 1, endPage: 2 }}
        partIndex={0}
        totalParts={1}
        pageCount={2}
        manualMode={false}
        thumbnails={[]}
        sourcePages={new Map()}
        activePage={1}
        downloading={false}
        canDelete={false}
        drag={drag}
        onDownload={vi.fn()}
        onDelete={vi.fn()}
        onSetPages={vi.fn()}
        onRemovePage={vi.fn()}
        onMovePage={vi.fn()}
        onReorderPage={onReorderPage}
        onSelectPage={vi.fn()}
        onRequestThumbnail={vi.fn()}
        onAnnounce={onAnnounce}
        validationMessage=""
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '顯示縮圖' }))
    fireEvent.keyDown(screen.getByRole('button', { name: /輸出第 2 頁.*使用方向鍵/ }), {
      key: 'ArrowLeft',
    })

    expect(onReorderPage).toHaveBeenCalledWith(0, 1, 0)
    expect(onAnnounce).toHaveBeenCalledWith('第 2 頁已向前移動')
  })
})
