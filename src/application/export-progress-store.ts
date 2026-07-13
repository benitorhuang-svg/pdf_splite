import { useSyncExternalStore } from 'react'

let progress = 0
const listeners = new Set<() => void>()

export const setExportProgress = (value: number): void => {
  const normalized = Math.max(0, Math.min(100, Math.round(value)))
  if (normalized === progress) return
  progress = normalized
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = (): number => progress

export const useExportProgress = (): number =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
