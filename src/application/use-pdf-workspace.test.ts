import { act, renderHook } from '@testing-library/react'
import type { LoadedPdf } from '@/infrastructure/pdf-service'
import { usePdfWorkspace } from './use-pdf-workspace'

const pdfMocks = vi.hoisted(() => ({
  loadPdfFiles: vi.fn(),
  renderThumbnail: vi.fn(),
  splitPdf: vi.fn(),
}))

vi.mock('@/infrastructure/pdf-service', () => pdfMocks)

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

const deferred = <T,>(): Deferred<T> => {
  let resolvePromise: (value: T) => void = () => undefined
  const promise = new Promise<T>((resolve) => { resolvePromise = resolve })
  return { promise, resolve: resolvePromise }
}

const loadedPdf = (pageCount: number): LoadedPdf => ({
  bytes: new Uint8Array([pageCount]),
  pageCount,
  sourcePageCounts: [pageCount],
  totalBytes: pageCount,
  preview: { cleanup: vi.fn() } as unknown as LoadedPdf['preview'],
})

describe('usePdfWorkspace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('只接受最新匯入工作的結果', async () => {
    const first = deferred<LoadedPdf>()
    const second = deferred<LoadedPdf>()
    pdfMocks.loadPdfFiles.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => usePdfWorkspace())
    const firstFile = new File(['first'], 'first.pdf', { type: 'application/pdf' })
    const secondFile = new File(['second'], 'second.pdf', { type: 'application/pdf' })

    let firstImport: Promise<void> = Promise.resolve()
    let secondImport: Promise<void> = Promise.resolve()
    act(() => { firstImport = result.current.importFiles([firstFile]) })
    act(() => { secondImport = result.current.importFiles([secondFile]) })
    const latest = loadedPdf(2)
    second.resolve(latest)
    await act(async () => secondImport)
    const stale = loadedPdf(9)
    first.resolve(stale)
    await act(async () => firstImport)

    expect(result.current.state.file?.name).toBe('second.pdf')
    expect(result.current.state.loaded?.pageCount).toBe(2)
    expect(stale.preview.cleanup).toHaveBeenCalledOnce()
  })

  it('清除工作區會使尚未完成的匯入失效', async () => {
    const pending = deferred<LoadedPdf>()
    pdfMocks.loadPdfFiles.mockReturnValueOnce(pending.promise)
    const { result } = renderHook(() => usePdfWorkspace())
    let importing: Promise<void> = Promise.resolve()
    act(() => { importing = result.current.importFiles([new File(['x'], 'x.pdf')]) })
    act(() => result.current.clear())
    const stale = loadedPdf(4)
    pending.resolve(stale)
    await act(async () => importing)

    expect(result.current.state.status).toBe('idle')
    expect(result.current.state.loaded).toBeNull()
    expect(stale.preview.cleanup).toHaveBeenCalledOnce()
  })
})
