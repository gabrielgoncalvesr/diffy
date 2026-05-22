import type * as monaco from 'monaco-editor'

export type Theme = 'light' | 'dark'

export interface DiffDecoration {
  range: monaco.IRange
  options: monaco.editor.IModelDecorationOptions
}

export interface DiffResult {
  leftDecorations: DiffDecoration[]
  rightDecorations: DiffDecoration[]
  diffCount: number
}

export interface ElectronAPI {
  openFile: () => Promise<{ content: string; name: string } | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
