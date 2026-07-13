import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OutputPart, SplitMode, SplitRule } from '@/domain/split-plan'
import { createSplitPlan, validateSplitPlan } from '@/domain/split-plan'
import { getPdfWorkloadWarning } from '@/domain/pdf-limits'
import { createPageRegistry, fileSourceId } from '@/domain/page-ref'
import type { PageRef } from '@/domain/page-ref'
import type { GeneratedFile, LoadedPdf } from '@/infrastructure/pdf-service'
import { loadPdfFiles, splitPdf } from '@/infrastructure/pdf-service'
import { useThumbnailQueue } from './use-thumbnail-queue'
import { setExportProgress } from './export-progress-store'

export interface WorkspaceState {
  file: File | null
  loaded: LoadedPdf | null
  thumbnails: readonly string[]
  rule: SplitRule
  plan: readonly OutputPart[]
  planError: string
  files: readonly GeneratedFile[]
  status: 'idle' | 'loading' | 'ready' | 'processing' | 'completed' | 'failed'
  error: string
  warning: string
}

const initialRule: SplitRule = {
  mode: 'fixed-count', fixedCount: 5, customRanges: [{ start: 1, end: 1 }],
}
const normalizePlan = (parts: readonly OutputPart[]): OutputPart[] => parts.map((part, index) => ({
  ...part,
  index: index + 1,
  startPage: part.pages[0]?.documentPageNumber ?? 0,
  endPage: part.pages.at(-1)?.documentPageNumber ?? part.pages[0]?.documentPageNumber ?? 0,
}))
const errorMessage = (cause: unknown, fallback: string): string =>
  cause instanceof Error ? cause.message : fallback

export const usePdfWorkspace = () => {
  const [file, setFile] = useState<File | null>(null)
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null)
  const [rule, setRule] = useState<SplitRule>(initialRule)
  const [plan, setPlan] = useState<OutputPart[]>([])
  const [ruleError, setRuleError] = useState('')
  const [files, setFiles] = useState<GeneratedFile[]>([])
  const [status, setStatus] = useState<WorkspaceState['status']>('idle')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const loadedRef = useRef<LoadedPdf | null>(null)
  const pageRegistryRef = useRef<readonly PageRef[]>([])
  const workspaceVersion = useRef(0)
  const thumbnails = useThumbnailQueue({ loadedRef, versionRef: workspaceVersion, onError: setError })

  const applyRule = (nextRule: SplitRule, pageCount = loadedRef.current?.pageCount): void => {
    setRule(nextRule)
    setFiles([])
    if (!pageCount) {
      setPlan([])
      setRuleError('')
      return
    }
    try {
      setPlan(createSplitPlan(pageCount, nextRule, pageRegistryRef.current))
      setRuleError('')
    } catch (cause) {
      setPlan([])
      setRuleError(errorMessage(cause, '拆分規則無效。'))
    }
  }

  const clear = useCallback((): void => {
    workspaceVersion.current += 1
    thumbnails.resetThumbnailQueue()
    loadedRef.current?.preview.cleanup()
    loadedRef.current = null
    pageRegistryRef.current = []
    thumbnails.releaseThumbnails()
    setFile(null)
    setLoaded(null)
    setPlan([])
    setRuleError('')
    setFiles([])
    setStatus('idle')
    setExportProgress(0)
    setError('')
    setWarning('')
  }, [thumbnails])

  useEffect(() => () => {
    workspaceVersion.current += 1
    loadedRef.current?.preview.cleanup()
  }, [])

  const importFiles = async (nextFiles: readonly File[]): Promise<void> => {
    if (nextFiles.length === 0) {
      clear()
      return
    }
    const version = workspaceVersion.current + 1
    workspaceVersion.current = version
    thumbnails.resetThumbnailQueue()
    loadedRef.current?.preview.cleanup()
    loadedRef.current = null
    thumbnails.releaseThumbnails()
    setLoaded(null)
    setStatus('loading')
    setError('')
    setWarning('')
    setFiles([])
    try {
      const nextLoaded = await loadPdfFiles(nextFiles)
      if (version !== workspaceVersion.current) {
        nextLoaded.preview.cleanup()
        return
      }
      loadedRef.current = nextLoaded
      pageRegistryRef.current = createPageRegistry(nextFiles.map((sourceFile, index) => ({
        id: fileSourceId(sourceFile),
        pageCount: nextLoaded.sourcePageCounts[index] ?? 0,
      })))
      setFile(nextFiles[0])
      setLoaded(nextLoaded)
      setWarning(getPdfWorkloadWarning(nextLoaded.totalBytes, nextLoaded.pageCount))
      const nextRule: SplitRule = {
        ...rule,
        customRanges: [{ start: 1, end: Math.min(3, nextLoaded.pageCount) }],
      }
      applyRule(nextRule, nextLoaded.pageCount)
      setStatus('ready')
    } catch (cause) {
      if (version !== workspaceVersion.current) return
      setFile(null)
      setPlan([])
      setStatus('failed')
      setError(errorMessage(cause, '無法讀取 PDF。'))
    }
  }

  const updateMode = (mode: SplitMode): void => {
    if (mode === 'page-ranges' && !rule.customRanges?.length) {
      const pageCount = loadedRef.current?.pageCount ?? 1
      applyRule({ ...rule, mode, customRanges: [{ start: 1, end: Math.min(3, pageCount) }] })
      return
    }
    applyRule({ ...rule, mode })
  }
  const updateFixedCount = (fixedCount: number): void => applyRule({ ...rule, fixedCount })
  const updatePlan = (transform: (parts: readonly OutputPart[]) => OutputPart[]): void => {
    setFiles([])
    setPlan((current) => normalizePlan(transform(current)))
  }
  const movePage = (pageNumber: number, targetPartIdx: number, targetPageIdx?: number): void => {
    updatePlan((current) => current.map((part, index) => {
      const movedPage = pageRegistryRef.current[pageNumber - 1]
      const pages = part.pages.filter((page) => page.documentPageNumber !== pageNumber)
      if (index !== targetPartIdx) return { ...part, pages }
      const nextPages = [...pages]
      if (movedPage) nextPages.splice(targetPageIdx ?? nextPages.length, 0, movedPage)
      return { ...part, pages: nextPages }
    }))
  }
  const reorderPageInPart = (partIdx: number, fromPageIdx: number, toPageIdx: number): void => {
    updatePlan((current) => current.map((part, index) => {
      if (index !== partIdx) return part
      const pages = [...part.pages]
      const [removed] = pages.splice(fromPageIdx, 1)
      pages.splice(toPageIdx, 0, removed)
      return { ...part, pages }
    }))
  }
  const removePage = (pageNumber: number): void => updatePlan((current) => current.map((part) => ({
    ...part, pages: part.pages.filter((page) => page.documentPageNumber !== pageNumber),
  })))
  const clearPlan = (): void => { setFiles([]); setPlan([]); setRuleError('') }
  const addEmptyPart = (): void => updatePlan((current) => [
    ...current, { index: 0, pages: [], startPage: 0, endPage: 0 },
  ])
  const deletePart = (partIdx: number): void => updatePlan((current) =>
    current.filter((_, index) => index !== partIdx))
  const setPartPages = (partIdx: number, nextPages: readonly number[]): void => {
    const requested = new Set(nextPages)
    const requestedPages = nextPages.flatMap((page) => pageRegistryRef.current[page - 1] ?? [])
    updatePlan((current) => current.map((part, index) => ({
      ...part,
      pages: index === partIdx
        ? requestedPages
        : part.pages.filter((page) => !requested.has(page.documentPageNumber)),
    })))
  }

  const planValidationError = useMemo(() => {
    if (ruleError || !loaded || plan.length === 0) return ruleError
    try {
      validateSplitPlan(plan, loaded.pageCount)
      return ''
    } catch (cause) {
      return errorMessage(cause, '拆分設定無效。')
    }
  }, [loaded, plan, ruleError])

  const execute = async (template: string): Promise<GeneratedFile[] | null> => {
    const currentLoaded = loadedRef.current
    if (!currentLoaded || !file || plan.length === 0) return null
    const version = workspaceVersion.current
    setStatus('processing')
    setExportProgress(0)
    setError('')
    try {
      validateSplitPlan(plan, currentLoaded.pageCount)
      const output = await splitPdf(
        currentLoaded.bytes, plan, file.name, template,
        (value) => { if (version === workspaceVersion.current) setExportProgress(value) },
        () => version !== workspaceVersion.current,
      )
      if (version !== workspaceVersion.current) return null
      setFiles(output)
      setStatus('completed')
      return output
    } catch (cause) {
      if (version !== workspaceVersion.current) return null
      setStatus('failed')
      setError(errorMessage(cause, 'PDF 拆分失敗。'))
      return null
    }
  }

  return {
    state: {
      file, loaded, thumbnails: thumbnails.thumbnails, rule, plan,
      planError: planValidationError, files, status, error, warning,
    },
    importFile: (nextFile: File) => importFiles([nextFile]),
    importFiles, updateMode, updateFixedCount, requestThumbnail: thumbnails.requestThumbnail,
    execute, clear, movePage, removePage, clearPlan, reorderPageInPart, addEmptyPart, deletePart,
    setPartPages,
  }
}
