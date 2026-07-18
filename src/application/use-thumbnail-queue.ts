import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { LoadedPdf } from '@/infrastructure/pdf-service'
import { renderThumbnail } from '@/infrastructure/pdf-service'

interface ThumbnailJob {
  readonly version: number
  readonly page: number
}

interface Options {
  readonly loadedRef: RefObject<LoadedPdf | null>
  readonly versionRef: RefObject<number>
  readonly onError: (message: string) => void
}

const MAX_CACHED_THUMBNAILS = 160

export const useThumbnailQueue = ({ loadedRef, versionRef, onError }: Options) => {
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const thumbnailRef = useRef<string[]>([])
  const queue = useRef<ThumbnailJob[]>([])
  const pending = useRef(new Set<string>())
  const usage = useRef(new Map<number, number>())
  const usageSequence = useRef(0)
  const activeCount = useRef(0)

  const touch = (page: number): void => {
    usageSequence.current += 1
    usage.current.set(page, usageSequence.current)
  }

  const evictOldThumbnails = (next: string[]): void => {
    while (usage.current.size > MAX_CACHED_THUMBNAILS) {
      const oldest = [...usage.current.entries()].sort(([, left], [, right]) => left - right)[0]
      if (!oldest) return
      const [page] = oldest
      usage.current.delete(page)
      const url = next[page - 1]
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      next[page - 1] = ''
    }
  }

  const releaseThumbnails = useCallback((): void => {
    thumbnailRef.current.forEach((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    })
    thumbnailRef.current = []
    usage.current.clear()
    setThumbnails([])
  }, [])

  const resetThumbnailQueue = useCallback((): void => {
    queue.current = []
    pending.current.clear()
  }, [])

  const pumpQueue = useCallback((): void => {
    const pump = (): void => {
      while (activeCount.current < 2 && queue.current.length > 0) {
        const job = queue.current.shift()
        if (!job) return
        const key = `${job.version}:${job.page}`
        const currentPdf = loadedRef.current
        if (job.version !== versionRef.current || !currentPdf) {
          pending.current.delete(key)
          continue
        }
        activeCount.current += 1
        void renderThumbnail(currentPdf.preview, job.page).then((url) => {
          if (job.version !== versionRef.current) {
            URL.revokeObjectURL(url)
            return
          }
          setThumbnails((current) => {
            if (current[job.page - 1]) {
              URL.revokeObjectURL(url)
              return current
            }
            const next = [...current]
            next[job.page - 1] = url
            thumbnailRef.current = next
            touch(job.page)
            evictOldThumbnails(next)
            return next
          })
        }).catch((cause: unknown) => {
          if (job.version === versionRef.current) {
            onError(cause instanceof Error ? cause.message : '無法建立頁面縮圖。')
          }
        }).finally(() => {
          activeCount.current -= 1
          pending.current.delete(key)
          pump()
        })
      }
    }
    pump()
  }, [loadedRef, onError, versionRef])

  const requestThumbnail = useCallback((page: number): void => {
    const current = loadedRef.current
    if (!current || page < 1 || page > current.pageCount) return
    if (thumbnailRef.current[page - 1]) {
      touch(page)
      return
    }
    const version = versionRef.current
    const key = `${version}:${page}`
    if (pending.current.has(key)) return
    pending.current.add(key)
    queue.current.push({ version, page })
    pumpQueue()
  }, [loadedRef, pumpQueue, versionRef])

  useEffect(() => () => {
    thumbnailRef.current.forEach((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    })
  }, [])

  return { thumbnails, requestThumbnail, releaseThumbnails, resetThumbnailQueue }
}
