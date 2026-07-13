import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))
const supportedExtensions = new Set(['.ts', '.tsx', '.css'])
const maximumLines = 300

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(path) : [path]
  }))
  return nested.flat()
}

const files = (await collectFiles(sourceRoot)).filter((file) => supportedExtensions.has(extname(file)))
const violations = []

for (const file of files) {
  const content = await readFile(file, 'utf8')
  const lines = content.split(/\r?\n/).length
  if (lines > maximumLines) violations.push(`${relative(root, file)}: ${lines} lines`)
}

if (violations.length > 0) {
  console.error(`Files must not exceed ${maximumLines} lines:\n${violations.join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`Line limit passed: ${files.length} source files are within ${maximumLines} lines.`)
}
