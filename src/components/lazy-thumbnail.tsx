import { useEffect, useRef } from 'react'

interface Props {
  readonly page: number
  readonly src?: string
  readonly alt: string
  readonly onRequest: (page: number) => void
}

export const LazyThumbnail = ({ page, src, alt, onRequest }: Props) => {
  const placeholderRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (src) return
    const element = placeholderRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      onRequest(page)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      onRequest(page)
      observer.disconnect()
    }, { rootMargin: '240px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [alt, onRequest, page, src])

  return src
    ? <img src={src} alt={alt} loading="lazy" />
    : <div ref={placeholderRef} className="skeleton" role="img" aria-label={`${alt}載入中`} />
}
