import { useMemo, useRef, useState, type DragEvent } from 'react'
import { usePdfWorkspace } from '@/application/use-pdf-workspace'
import { useNamingTemplate } from '@/application/use-naming-template'
import { Icon } from '@/components/icons'
import { PagePool } from '@/components/page-pool'
import { PartsBoard } from '@/components/parts-board'
import { NamingPage } from '@/components/naming-page'
import { AppHeader, type AppTab } from '@/components/app-header'
import { createSourcePageInfo, sourceThemeClass } from '@/domain/source-theme'
import { downloadPdf, downloadZip } from '@/infrastructure/pdf-service'

const fileKey = (file: File): string => `${file.name}:${file.size}:${file.lastModified}`

export default function App() {
  const workspace = usePdfWorkspace()
  const { state } = workspace
  const naming = useNamingTemplate(state.file?.name)
  const [dark, setDark] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const generatedTemplate = useRef<string | null>(null)
  const [selectedPage, setSelectedPage] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<AppTab>('import')
  const [importedFiles, setImportedFiles] = useState<File[]>([])
  const importedFilesRef = useRef<File[]>([])
  const importedFilePages = useMemo(() => Object.fromEntries(
    importedFiles.map((file, index) => [fileKey(file), state.loaded?.sourcePageCounts[index] ?? 0]),
  ), [importedFiles, state.loaded?.sourcePageCounts])

  const assignedPageGroups = useMemo(() => {
    const groups = new Map<number, number>()
    state.plan.forEach((part, partIndex) => {
      part.pages.forEach((page) => groups.set(page.documentPageNumber, partIndex))
    })
    return groups
  }, [state.plan])
  const assignedPages = useMemo(() => new Set(assignedPageGroups.keys()), [assignedPageGroups])
  const sourcePages = useMemo(
    () => createSourcePageInfo(importedFiles, importedFilePages),
    [importedFiles, importedFilePages],
  )
  const visibleError = state.planError || state.error
  const activePage = state.loaded
    ? selectedPage && selectedPage <= state.loaded.pageCount ? selectedPage : 1
    : null

  const accept = (files: FileList | null): void => {
    const pdfFiles = Array.from(files ?? []).filter((file) =>
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
    if (pdfFiles.length === 0) return

    const known = new Set(importedFilesRef.current.map(fileKey))
    const nextFiles = [...importedFilesRef.current, ...pdfFiles.filter((file) => !known.has(fileKey(file)))]
    importedFilesRef.current = nextFiles
    setImportedFiles(nextFiles)

    void workspace.importFiles(nextFiles)
  }
  const onDrop = (event: DragEvent): void => {
    event.preventDefault()
    accept(event.dataTransfer.files)
  }

  const removeImportedFile = (file: File): void => {
    const removedKey = fileKey(file)
    const remaining = importedFilesRef.current.filter((item) => fileKey(item) !== removedKey)
    importedFilesRef.current = remaining
    setImportedFiles(remaining)
    void workspace.importFiles(remaining)
  }

  const handleDownloadZip = async () => {
    const confirmed = window.confirm(`將 ${state.plan.length} 個拆分檔案打包成 ZIP 下載，是否繼續？`)
    if (!confirmed) return
    setDownloading(true)
    try {
      const output = await workspace.execute(naming.template)
      if (output && output.length > 0) {
        generatedTemplate.current = naming.template
        await downloadZip(output, state.file?.name ?? '')
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadPart = async (partIndex: number) => {
    setDownloading(true)
    try {
      const output = state.files.length === state.plan.length && generatedTemplate.current === naming.template
        ? state.files
        : await workspace.execute(naming.template)
      if (output) generatedTemplate.current = naming.template
      const selected = output?.[partIndex]
      if (selected) downloadPdf(selected)
    } finally {
      setDownloading(false)
    }
  }

  const handleClearAll = (): void => {
    if (!window.confirm('確定要清除全部拆分檔案與頁面指派嗎？來源 PDF 不會被刪除。')) return
    workspace.clearPlan()
  }

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <AppHeader activeTab={activeTab} onTab={setActiveTab} onDrop={onDrop} onToggleTheme={() => setDark((value) => !value)} />
      {state.error && activeTab !== 'workspace' && <div className="workload-error" role="alert">⚠️ {state.error}</div>}
      {state.warning && <div className="workload-warning" role="status">{state.warning}</div>}

      {activeTab === 'import' ? (
        <main className="import-workspace">
          <section className="import-card import-card-batch">
            <div className="import-card-main">
            <div className="import-card-heading">
              <div className="import-step-identity">
                <span className="import-step-mark"><Icon name="upload" /></span>
                <span className="naming-eyebrow">步驟 1</span>
              </div>
              <div className="import-heading-copy">
                <h2>匯入 PDF 檔案</h2>
                <p>檔案只會在瀏覽器中處理，不會上傳至伺服器。</p>
              </div>
            </div>
            <label className="import-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
              <strong>{state.status === 'loading' ? '正在讀取 PDF…' : '點擊選擇 PDF，或拖曳至此'}</strong>
              <small>支援 .pdf 檔案</small>
              <input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => { accept(event.target.files); event.currentTarget.value = '' }} disabled={state.status === 'loading'} />
            </label>
            </div>
            <aside className="imported-files-panel" aria-labelledby="imported-files-title">
              <div className="imported-files-heading">
                <div>
                  <h3 id="imported-files-title">已匯入檔案</h3>
                  <p>{importedFiles.length} 份 PDF</p>
                </div>
                <button type="button" className="primary imported-files-next" disabled={!state.file || state.status === 'loading'} onClick={() => setActiveTab('naming')}>
                  下一步 <span aria-hidden="true">→</span>
                </button>
              </div>
              {importedFiles.length > 0 ? (
                <ul className="imported-files-list">
                  {importedFiles.map((file, sourceIndex) => (
                      <li key={fileKey(file)} className={sourceThemeClass(sourceIndex)}>
                        <div className="imported-file-select">
                          <span className="imported-file-icon" aria-hidden="true">PDF</span>
                          <span className="imported-file-copy">
                            <strong title={file.name}>{file.name}</strong>
                            <small>
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                              {importedFilePages[fileKey(file)] ? ` · 共 ${importedFilePages[fileKey(file)]} 頁` : ' · 讀取頁數中…'}
                            </small>
                          </span>
                        </div>
                        <button type="button" className="imported-file-remove" onClick={() => removeImportedFile(file)} aria-label={`移除 ${file.name}`} title="移除檔案">×</button>
                      </li>
                  ))}
                </ul>
              ) : (
                <div className="imported-files-empty">
                  <span aria-hidden="true">PDF</span>
                  <p>尚未匯入檔案</p>
                  <small>選取或拖曳多份 PDF 後，檔案會顯示在這裡。</small>
                </div>
              )}
            </aside>
          </section>
        </main>
      ) : activeTab === 'naming' ? (
        <NamingPage
          segments={naming.segments}
          setSegments={naming.setSegments}
          draggedIndex={naming.draggedIndex}
          setDraggedIndex={naming.setDraggedIndex}
          draggedBlock={naming.draggedBlock}
          setDraggedBlock={naming.setDraggedBlock}
          storageOpen={naming.storageOpen}
          setStorageOpen={naming.setStorageOpen}
          preview={naming.preview}
          onAddBlock={naming.addBlock}
          onReorder={naming.reorder}
          onDone={() => setActiveTab('workspace')}
        />
      ) : (
      <div className="workspace">
        <PagePool
          pageCount={state.loaded?.pageCount ?? 0}
          thumbnails={state.thumbnails}
          assignedPages={assignedPages}
          assignedPageGroups={assignedPageGroups}
          loading={state.status === 'loading'}
          files={importedFiles}
          filePageCounts={importedFilePages}
          status={state.status}
          activePage={activePage}
          onSelectPage={setSelectedPage}
          onImportFiles={accept}
          onRequestThumbnail={workspace.requestThumbnail}
          onRemovePage={workspace.removePage}
        />
        <PartsBoard
          parts={state.plan}
          thumbnails={state.thumbnails}
          pageCount={state.loaded?.pageCount ?? 0}
          loading={state.status === 'loading'}
          mode={state.rule.mode}
          onMode={workspace.updateMode}
          rule={state.rule}
          sourcePages={sourcePages}
          error={state.error}
          planError={state.planError}
          activePage={activePage}
          onSelectPage={setSelectedPage}
          downloading={downloading}
          status={state.status}
          onDownloadZip={handleDownloadZip}
          onDownloadPart={handleDownloadPart}
          onClearAll={handleClearAll}
          downloadDisabled={!state.loaded || state.plan.length === 0 || Boolean(visibleError) || state.status === 'processing'}
          onMovePage={workspace.movePage}
          onRemovePage={workspace.removePage}
          onReorderPage={workspace.reorderPageInPart}
          onAddPart={workspace.addEmptyPart}
          onDeletePart={workspace.deletePart}
          onSetPartPages={workspace.setPartPages}
          onFixedCount={workspace.updateFixedCount}
          onRequestThumbnail={workspace.requestThumbnail}
        />
      </div>
      )}
    </div>
  )
}
