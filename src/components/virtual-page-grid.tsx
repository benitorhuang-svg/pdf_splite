import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { LazyThumbnail } from './lazy-thumbnail'

interface Props {
  readonly sourceName: string
  readonly pageCount: number
  readonly startPage: number
  readonly thumbnailScale: number
  readonly thumbnails: readonly string[]
  readonly assignedPages: ReadonlySet<number>
  readonly assignedPageGroups: ReadonlyMap<number, number>
  readonly activePage: number | null
  readonly draggingPage: number | null
  readonly onDragStart: (event: DragEvent, page: number) => void
  readonly onDragEnd: () => void
  readonly onSelectPage: (page: number) => void
  readonly onRequestThumbnail: (page: number) => void
}

const GAP = 14

export const VirtualPageGrid = ({
  sourceName, pageCount, startPage, thumbnailScale, thumbnails, assignedPages,
  assignedPageGroups, activePage, draggingPage, onDragStart, onDragEnd,
  onSelectPage, onRequestThumbnail,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(320)
  const itemWidth = thumbnailScale * 1.1
  const columns = Math.max(1, Math.floor((width - 28 + GAP) / (itemWidth + GAP)))
  const rowCount = Math.ceil(pageCount / columns)
  const rowHeight = itemWidth / 0.707 + 30
  // TanStack Virtual intentionally exposes imperative functions for scroll measurement.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 3,
  })

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const focusPage = (page: number): void => {
    const bounded = Math.max(startPage, Math.min(startPage + pageCount - 1, page))
    onSelectPage(bounded)
    virtualizer.scrollToIndex(Math.floor((bounded - startPage) / columns), { align: 'auto' })
    window.requestAnimationFrame(() => {
      scrollRef.current?.querySelector<HTMLElement>(`[data-page="${bounded}"]`)?.focus()
    })
  }
  const handleKeyDown = (event: KeyboardEvent, page: number): void => {
    const targets: Partial<Record<string, number>> = {
      ArrowLeft: page - 1,
      ArrowRight: page + 1,
      ArrowUp: page - columns,
      ArrowDown: page + columns,
      Home: startPage,
      End: startPage + pageCount - 1,
    }
    const target = targets[event.key]
    if (target !== undefined) {
      event.preventDefault()
      focusPage(target)
    }
  }

  return (
    <div
      ref={scrollRef}
      className="source-pages-grid is-virtualized"
      style={{ '--pool-thumbnail-width': `${itemWidth}px` } as CSSProperties}
      role="listbox"
      aria-label={`${sourceName} 分頁，共 ${pageCount} 頁`}
    >
      <div className="virtual-page-canvas" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            className="virtual-page-row"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              transform: `translateY(${row.start}px)`,
            }}
          >
            {Array.from({ length: columns }, (_, column) => row.index * columns + column)
              .filter((index) => index < pageCount)
              .map((index) => {
                const page = startPage + index
                const assigned = assignedPages.has(page)
                const groupIndex = assignedPageGroups.get(page)
                const isActive = page === activePage
                return (
                  <div
                    key={page}
                    data-page={page}
                    className={`pool-item ${assigned ? `assigned theme-${(groupIndex ?? 0) % 6 + 1}` : 'unassigned'} ${isActive ? 'active' : ''} ${draggingPage === page ? 'dragging' : ''}`}
                    draggable
                    role="option"
                    aria-selected={isActive}
                    tabIndex={isActive || (!activePage && index === 0) ? 0 : -1}
                    onDragStart={(event) => onDragStart(event, page)}
                    onDragEnd={onDragEnd}
                    onClick={() => onSelectPage(page)}
                    onKeyDown={(event) => handleKeyDown(event, page)}
                  >
                    <div className="pool-thumbnail-wrapper">
                      <LazyThumbnail page={page} src={thumbnails[page - 1]} alt={`${sourceName} 第 ${index + 1} 頁`} onRequest={onRequestThumbnail} />
                      <span className="page-number-badge">{index + 1}</span>
                    </div>
                    <span className={`status-dot ${assigned ? 'assigned' : 'unassigned'}`} aria-label={assigned ? '已指派' : '未指派'}>{assigned ? '✓' : '!'}</span>
                  </div>
                )
              })}
          </div>
        ))}
      </div>
    </div>
  )
}
