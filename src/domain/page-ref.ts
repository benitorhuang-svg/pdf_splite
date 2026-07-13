export type PageRotation = 0 | 90 | 180 | 270

export interface PageRef {
  readonly id: string
  readonly sourceFileId: string
  readonly sourcePageNumber: number
  readonly documentPageNumber: number
  readonly rotation: PageRotation
}

export interface PageSource {
  readonly id: string
  readonly pageCount: number
}

export const fileSourceId = (file: Pick<File, 'name' | 'size' | 'lastModified'>): string =>
  `${file.name}:${file.size}:${file.lastModified}`

export const createPageRegistry = (sources: readonly PageSource[]): PageRef[] => {
  const pages: PageRef[] = []
  let documentPageNumber = 1
  for (const source of sources) {
    for (let sourcePageNumber = 1; sourcePageNumber <= source.pageCount; sourcePageNumber += 1) {
      pages.push({
        id: `${source.id}#${sourcePageNumber}`,
        sourceFileId: source.id,
        sourcePageNumber,
        documentPageNumber,
        rotation: 0,
      })
      documentPageNumber += 1
    }
  }
  return pages
}

export const createSingleSourcePages = (pageCount: number): PageRef[] =>
  createPageRegistry([{ id: 'document', pageCount }])

export const rotatePage = (page: PageRef, degrees: PageRotation): PageRef => ({
  ...page,
  rotation: ((page.rotation + degrees) % 360) as PageRotation,
})
