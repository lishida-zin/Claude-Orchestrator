import { create } from 'zustand'

interface AppState {
  // 現在のプロジェクトパス
  currentPath: string | null
  setCurrentPath: (path: string | null) => void

  // 開いているファイル
  openFiles: { path: string; content: string; isDirty: boolean }[]
  activeFile: string | null
  openFile: (path: string, content: string) => void
  closeFile: (path: string) => void
  setActiveFile: (path: string | null) => void
  updateFileContent: (path: string, content: string) => void
  markFileClean: (path: string) => void

  // パネルサイズ
  leftPanelWidth: number
  setLeftPanelWidth: (width: number | ((prev: number) => number)) => void

  // ターミナル
  terminals: { id: string; title: string }[]
  activeTerminal: string | null
  addTerminal: (id: string, title: string) => void
  removeTerminal: (id: string) => void
  setActiveTerminal: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  // 現在のプロジェクトパス
  currentPath: null,
  setCurrentPath: (path) => set({ currentPath: path }),

  // 開いているファイル
  openFiles: [],
  activeFile: null,
  openFile: (path, content) => set((state) => {
    const existing = state.openFiles.find((f) => f.path === path)
    if (existing) {
      return { activeFile: path }
    }
    return {
      openFiles: [...state.openFiles, { path, content, isDirty: false }],
      activeFile: path
    }
  }),
  closeFile: (path) => set((state) => {
    const newFiles = state.openFiles.filter((f) => f.path !== path)
    const newActiveFile = state.activeFile === path
      ? (newFiles.length > 0 ? newFiles[newFiles.length - 1].path : null)
      : state.activeFile
    return { openFiles: newFiles, activeFile: newActiveFile }
  }),
  setActiveFile: (path) => set({ activeFile: path }),
  updateFileContent: (path, content) => set((state) => ({
    openFiles: state.openFiles.map((f) =>
      f.path === path ? { ...f, content, isDirty: true } : f
    )
  })),
  markFileClean: (path) => set((state) => ({
    openFiles: state.openFiles.map((f) =>
      f.path === path ? { ...f, isDirty: false } : f
    )
  })),

  // パネルサイズ
  leftPanelWidth: 280,
  setLeftPanelWidth: (width) => set((state) => ({
    leftPanelWidth: typeof width === 'function' ? width(state.leftPanelWidth) : width
  })),

  // ターミナル
  terminals: [],
  activeTerminal: null,
  addTerminal: (id, title) => set((state) => ({
    terminals: [...state.terminals, { id, title }],
    activeTerminal: id
  })),
  removeTerminal: (id) => set((state) => {
    const newTerminals = state.terminals.filter((t) => t.id !== id)
    const newActiveTerminal = state.activeTerminal === id
      ? (newTerminals.length > 0 ? newTerminals[newTerminals.length - 1].id : null)
      : state.activeTerminal
    return { terminals: newTerminals, activeTerminal: newActiveTerminal }
  }),
  setActiveTerminal: (id) => set({ activeTerminal: id })
}))
