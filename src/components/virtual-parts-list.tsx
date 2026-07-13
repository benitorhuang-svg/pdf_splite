import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { OutputPart, SplitMode } from '@/domain/split-plan'
import type { SourcePageInfo } from '@/domain/source-theme'
import { PartCard } from './part-card'
import type { usePartsBoardDrag } from './use-parts-board-drag'

interface Props {
  readonly parts: readonly OutputPart[]
  readonly mode: SplitMode
  readonly pageCount: number
  readonly thumbnails: readonly string[]
  readonly sourcePages: ReadonlyMap<number, SourcePageInfo>
  readonly activePage: number | null
  readonly downloading: boolean
  readonly loading: boolean
  readonly emptyPartIndex?: number
  readonly planError: string
  readonly drag: ReturnType<typeof usePartsBoardDrag>
  readonly onDownloadPart: (index: number) => void
  readonly onDeletePart: (index: number) => void
  readonly onSetPartPages: (index: number, pages: readonly number[]) => void
  readonly onRemovePage: (page: number) => void
  readonly onMovePage: (page: number, target: number) => void
  readonly onReorderPage: (part: number, from: number, to: number) => void
  readonly onSelectPage: (page: number) => void
  readonly onRequestThumbnail: (page: number) => void
  readonly onAnnounce: (message: string) => void
  readonly onAddPart: () => void
}

export const VirtualPartsList = ({
  parts, mode, pageCount, thumbnails, sourcePages, activePage, downloading, loading,
  emptyPartIndex, planError, drag, onDownloadPart, onDeletePart, onSetPartPages,
  onRemovePage, onMovePage, onReorderPage, onSelectPage, onRequestThumbnail,
  onAnnounce, onAddPart,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  // TanStack Virtual intentionally exposes imperative functions for scroll measurement.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: parts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 92,
    getItemKey: (index) => parts[index].index,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 5,
  })

  return (
    <div ref={scrollRef} className="parts-list is-virtualized" aria-busy={loading}>
      <div className="virtual-parts-canvas" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const part = parts[item.index]
          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="virtual-part-row"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <PartCard
                part={part}
                partIndex={item.index}
                totalParts={parts.length}
                pageCount={pageCount}
                manualMode={mode === 'page-ranges'}
                thumbnails={thumbnails}
                sourcePages={sourcePages}
                activePage={activePage}
                downloading={downloading}
                canDelete={mode !== 'page-ranges' || parts.length > 1}
                drag={drag}
                onDownload={() => onDownloadPart(item.index)}
                onDelete={() => onDeletePart(item.index)}
                onSetPages={(pages) => onSetPartPages(item.index, pages)}
                onRemovePage={onRemovePage}
                onMovePage={onMovePage}
                onReorderPage={onReorderPage}
                onSelectPage={onSelectPage}
                onRequestThumbnail={onRequestThumbnail}
                onAnnounce={onAnnounce}
                validationMessage={emptyPartIndex === part.index ? planError : ''}
              />
            </div>
          )
        })}
      </div>
      {mode === 'page-ranges' && (
        <button className="add-part-btn-bottom" type="button" onClick={onAddPart}>
          + 新增自訂範圍
        </button>
      )}
    </div>
  )
}
