import JSZip from 'jszip'

export interface ZipInputFile {
  readonly name: string
  readonly bytes: Uint8Array
}

const createZip = (files: readonly ZipInputFile[]): JSZip => {
  const zip = new JSZip()
  files.forEach((file) => zip.file(file.name, file.bytes))
  return zip
}

export const generateZipBytes = async (files: readonly ZipInputFile[]): Promise<Uint8Array> => {
  return createZip(files).generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

export const generateZipBlob = async (files: readonly ZipInputFile[]): Promise<Blob> =>
  createZip(files).generateAsync({ type: 'blob', compression: 'DEFLATE' })
