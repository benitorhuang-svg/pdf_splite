interface SourceFileInfo {
  index: number
  pageCount: number
}

interface Props {
  readonly partIndex: number
  readonly sourceFiles: readonly SourceFileInfo[]
  readonly selectedSourceIdx: number
  readonly setSelectedSourceIdx: (idx: number) => void
  readonly startPage: number
  readonly setStartPage: (page: number) => void
  readonly endPage: number
  readonly setEndPage: (page: number) => void
  readonly currentSourceFile: SourceFileInfo | undefined
  readonly onAddVisualRange: () => void
  readonly onSelectAllSourcePages: () => void
  readonly onClearSourcePages: () => void
}

export const SourceRangeAssist = ({
  partIndex,
  sourceFiles,
  selectedSourceIdx,
  setSelectedSourceIdx,
  startPage,
  setStartPage,
  endPage,
  setEndPage,
  currentSourceFile,
  onAddVisualRange,
  onSelectAllSourcePages,
  onClearSourcePages,
}: Props) => {
  return (
    <div className="range-assist-flat-row">
      <div className="assist-flat-group">
        <label htmlFor={`assist-source-select-${partIndex}`}>來源</label>
        <select
          id={`assist-source-select-${partIndex}`}
          value={selectedSourceIdx}
          onChange={(e) => setSelectedSourceIdx(Number(e.target.value))}
          className="assist-flat-select"
        >
          {sourceFiles.map((file) => (
            <option key={file.index} value={file.index}>
              資料源 {file.index + 1} ({file.pageCount}頁)
            </option>
          ))}
        </select>
      </div>

      {currentSourceFile && (
        <div className="assist-flat-group assist-flat-range">
          <label htmlFor={`assist-start-page-${partIndex}`}>範圍</label>
          <input
            id={`assist-start-page-${partIndex}`}
            type="number"
            min={1}
            max={currentSourceFile.pageCount}
            value={startPage}
            onChange={(e) =>
              setStartPage(
                Math.max(1, Math.min(currentSourceFile.pageCount, Number(e.target.value)))
              )
            }
            className="assist-flat-number-input"
          />
          <span className="assist-flat-separator">至</span>
          <input
            id={`assist-end-page-${partIndex}`}
            type="number"
            min={1}
            max={currentSourceFile.pageCount}
            value={endPage}
            onChange={(e) =>
              setEndPage(
                Math.max(1, Math.min(currentSourceFile.pageCount, Number(e.target.value)))
              )
            }
            className="assist-flat-number-input"
          />
          <span className="assist-flat-unit">頁</span>
        </div>
      )}

      <div className="assist-flat-actions">
        <button
          type="button"
          className="assist-flat-btn primary"
          onClick={onAddVisualRange}
          disabled={!currentSourceFile}
        >
          + 加入
        </button>
        <button
          type="button"
          className="assist-flat-btn secondary"
          onClick={onSelectAllSourcePages}
          disabled={!currentSourceFile}
        >
          全選
        </button>
        <button
          type="button"
          className="assist-flat-btn danger"
          onClick={onClearSourcePages}
          disabled={!currentSourceFile}
        >
          清除
        </button>
      </div>
    </div>
  )
}
