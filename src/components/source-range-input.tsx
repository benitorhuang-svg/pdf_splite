import { useState, useRef, useMemo, type FormEvent, type KeyboardEvent } from 'react'
import { parseSourcePageSelection } from '@/domain/source-page-selection'
import type { SourcePageInfo } from '@/domain/source-theme'
import { sourceThemeClass } from '@/domain/source-theme'
import { SourceRangeAssist } from './source-range-assist'

interface Props {
  readonly partIndex: number
  readonly pageCount: number
  readonly defaultValue: string
  readonly sourcePages: ReadonlyMap<number, SourcePageInfo>
  readonly onSetPages: (pages: readonly number[]) => void
}

interface SourceFileInfo {
  index: number
  pageCount: number
}

export const SourceRangeInput = ({
  partIndex,
  pageCount,
  defaultValue,
  sourcePages,
  onSetPages,
}: Props) => {
  const [tags, setTags] = useState<string[]>(() =>
    defaultValue.split(',').map((s) => s.trim()).filter(Boolean)
  )
  const [inputValue, setInputValue] = useState('')
  const [rangeError, setRangeError] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const sourceFiles = useMemo<SourceFileInfo[]>(() => {
    const map = new Map<number, number>()
    for (const pageInfo of sourcePages.values()) {
      const currentMax = map.get(pageInfo.sourceIndex) ?? 0
      if (pageInfo.localPageNumber > currentMax) {
        map.set(pageInfo.sourceIndex, pageInfo.localPageNumber)
      }
    }
    return Array.from(map.entries())
      .map(([index, count]) => ({ index, pageCount: count }))
      .sort((a, b) => a.index - b.index)
  }, [sourcePages])

  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0)
  const [startPage, setStartPage] = useState(1)
  const [endPage, setEndPage] = useState(() => {
    const firstFile = sourceFiles[0]
    return firstFile ? firstFile.pageCount : 1
  })

  const currentSourceFile = useMemo(() => {
    return sourceFiles.find((f) => f.index === selectedSourceIdx) || sourceFiles[0]
  }, [sourceFiles, selectedSourceIdx])

  const handleSelectSourceFile = (idx: number) => {
    setSelectedSourceIdx(idx)
    const file = sourceFiles.find((f) => f.index === idx)
    if (file) {
      setStartPage(1)
      setEndPage(file.pageCount)
    }
  }

  const getTagInfo = (tag: string) => {
    const match = tag.match(/^(?:S|資料源)\s*(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/i)
    if (!match) {
      return { isValid: false, sourceIndex: -1, text: tag }
    }
    const sourceNum = Number(match[1])
    const sourceIdx = sourceNum - 1
    const start = Number(match[2])
    const end = Number(match[3] ?? match[2])

    const sourceFile = sourceFiles.find((f) => f.index === sourceIdx)
    const sourceExists = !!sourceFile
    const isRangeValid =
      start > 0 &&
      start <= end &&
      (sourceFile ? end <= sourceFile.pageCount : true)

    return {
      isValid: sourceExists && isRangeValid,
      sourceIndex: sourceIdx,
      text: tag,
    }
  }

  const handleContainerClick = () => {
    inputRef.current?.focus()
  }

  const addTag = (text: string) => {
    const clean = text.trim()
    if (!clean) return
    const newTags = clean.split(',').map((s) => s.trim()).filter(Boolean)
    setTags((prev) => [...prev, ...newTags])
    setInputValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault()
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  const removeSourceTags = (prevTags: string[], sourceNum: number): string[] => {
    const regex = new RegExp(`^(?:S|資料源)\\s*${sourceNum}\\s*:`, 'i')
    return prevTags.filter((t) => !regex.test(t))
  }

  const handleAddVisualRange = () => {
    const sourceNum = selectedSourceIdx + 1
    const tagText = startPage === endPage 
      ? `S${sourceNum}:${startPage}`
      : `S${sourceNum}:${startPage}-${endPage}`
    setTags((prev) => [...prev, tagText])
  }

  const handleSelectAllSourcePages = () => {
    if (!currentSourceFile) return
    const sourceNum = selectedSourceIdx + 1
    const tagText = `S${sourceNum}:1-${currentSourceFile.pageCount}`
    setTags((prev) => {
      const filtered = removeSourceTags(prev, sourceNum)
      return [...filtered, tagText]
    })
  }

  const handleClearSourcePages = () => {
    const sourceNum = selectedSourceIdx + 1
    setTags((prev) => removeSourceTags(prev, sourceNum))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    let finalTags = [...tags]
    const cleanInput = inputValue.trim()
    if (cleanInput) {
      const newSegments = cleanInput.split(',').map((s) => s.trim()).filter(Boolean)
      finalTags = [...finalTags, ...newSegments]
      setTags(finalTags)
      setInputValue('')
    }

    const valStr = finalTags.join(', ')
    try {
      const parsed = parseSourcePageSelection(valStr, pageCount, sourcePages)
      onSetPages(parsed)
      setRangeError('')
    } catch (cause) {
      setRangeError(cause instanceof Error ? cause.message : '分頁範圍無效')
    }
  }

  return (
    <div className="part-range-redesign-form">


      <SourceRangeAssist
        partIndex={partIndex}
        sourceFiles={sourceFiles}
        selectedSourceIdx={selectedSourceIdx}
        setSelectedSourceIdx={handleSelectSourceFile}
        startPage={startPage}
        setStartPage={setStartPage}
        endPage={endPage}
        setEndPage={setEndPage}
        currentSourceFile={currentSourceFile}
        onAddVisualRange={handleAddVisualRange}
        onSelectAllSourcePages={handleSelectAllSourcePages}
        onClearSourcePages={handleClearSourcePages}
      />

      <form className="range-tag-input-wrapper" onSubmit={handleSubmit}>
        <div
          ref={containerRef}
          className={`range-tag-input-container ${rangeError ? 'has-error' : ''}`}
          onClick={handleContainerClick}
        >
          {tags.map((tag, idx) => {
            const info = getTagInfo(tag)
            const themeClass = info.isValid ? sourceThemeClass(info.sourceIndex) : 'invalid-tag'
            return (
              <span key={`${tag}-${idx}`} className={`range-tag-pill ${themeClass}`}>
                {!info.isValid && <span className="error-icon" title="無效的語法或頁碼">⚠️</span>}
                <span className="tag-text">{info.text}</span>
                <button
                  type="button"
                  className="tag-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTag(idx)
                  }}
                  aria-label={`移除 ${tag}`}
                >
                  &times;
                </button>
              </span>
            )
          })}
          <input
            ref={inputRef}
            id={`part-range-input-${partIndex}`}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag(inputValue)}
            placeholder={tags.length === 0 ? '例如 S1:1-3, S2:1-5' : ''}
            className="range-input-element"
          />
          <button type="submit" className="range-apply-btn">
            套用
          </button>
        </div>
      </form>

      {rangeError && (
        <div className="range-error-message" role="alert">
          ⚠️ {rangeError}
        </div>
      )}
    </div>
  )
}
