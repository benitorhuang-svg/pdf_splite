import type { OutputPart, SplitMode, SplitRule } from '@/domain/split-plan'
import type { SourcePageInfo } from '@/domain/source-theme'

export interface PartsBoardProps {
  parts: readonly OutputPart[]
  thumbnails: readonly string[]
  pageCount: number
  loading: boolean
  mode: SplitMode
  onMode: (mode: SplitMode) => void
  rule: SplitRule
  sourcePages: ReadonlyMap<number, SourcePageInfo>
  error: string
  planError: string
  activePage: number | null
  onSelectPage: (pageNumber: number) => void
  downloading: boolean
  status: string
  onDownloadZip: () => void
  onDownloadPart: (partIndex: number) => void
  onClearAll: () => void
  downloadDisabled: boolean
  onMovePage: (pageNumber: number, targetPartIdx: number, targetPageIdx?: number) => void
  onRemovePage: (pageNumber: number) => void
  onReorderPage: (partIdx: number, fromPageIdx: number, toPageIdx: number) => void
  onAddPart: () => void
  onDeletePart: (partIdx: number) => void
  onSetPartPages: (partIdx: number, pages: readonly number[]) => void
  onFixedCount: (value: number) => void
  onRequestThumbnail: (page: number) => void
}
