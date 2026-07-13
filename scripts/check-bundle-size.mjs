import { readdir, stat } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const budgets = new Map([
  ['.js', 500 * 1024],
  ['.css', 80 * 1024],
  ['.mjs', 1_300 * 1024],
])

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(path) : [path]
  }))
  return nested.flat()
}

const violations = []
for (const file of await collectFiles(dist)) {
  const budget = budgets.get(extname(file))
  if (!budget) continue
  const { size } = await stat(file)
  if (size > budget) {
    violations.push(`${relative(root, file)}: ${(size / 1024).toFixed(1)} KiB > ${(budget / 1024).toFixed(0)} KiB`)
  }
}

if (violations.length > 0) {
  console.error(`Bundle size budget exceeded:\n${violations.join('\n')}`)
  process.exitCode = 1
} else {
  console.log('Bundle size budget passed.')
}
