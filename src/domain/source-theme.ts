const SOURCE_THEME_COUNT = 8

export const sourceThemeClass = (sourceIndex: number): string =>
  `source-theme-${sourceIndex % SOURCE_THEME_COUNT + 1}`

export interface SourcePageInfo {
  readonly sourceIndex: number
  readonly localPageNumber: number
}

export const createSourcePageInfo = (
  files: readonly File[],
  filePageCounts: Readonly<Record<string, number>>,
): ReadonlyMap<number, SourcePageInfo> => {
  const result = new Map<number, SourcePageInfo>()
  let pageNumber = 1

  for (let sourceIndex = 0; sourceIndex < files.length; sourceIndex += 1) {
    const file = files[sourceIndex]
    const key = `${file.name}:${file.size}:${file.lastModified}`
    const pageCount = filePageCounts[key]
    if (!pageCount) break
    for (let offset = 0; offset < pageCount; offset += 1) {
      result.set(pageNumber, { sourceIndex, localPageNumber: offset + 1 })
      pageNumber += 1
    }
  }

  return result
}
