import JSZip from 'jszip'

export interface ZipInputFile {
  readonly name: string
  readonly bytes: Uint8Array
}

export const generateZipBytes = async (files: readonly ZipInputFile[]): Promise<Uint8Array> => {
  const zip = new JSZip()
  files.forEach((file) => zip.file(file.name, file.bytes))
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
