import { create } from 'zustand'

// ターミナルのロール
export type TerminalRole = 'pm' | 'worker' | 'general'

// ターミナルのステータス
export type TerminalStatus = 'idle' | 'running' | 'completed' | 'error'

// ターミナル情報
export interface Terminal {
  id: string
  title: string
  role: TerminalRole
  status: TerminalStatus
  claudeActive: boolean
  ptyReady: boolean  // PTY作成完了フラグ
}

// 会話ログエントリ
export interface ConversationLogEntry {
  timestamp: Date
  terminalId: string
  terminalTitle: string
  type: 'input' | 'output'
  content: string
}

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

  // ターミナル（拡張版）
  terminals: Terminal[]
  activeTerminal: string | null
  addTerminal: (id: string, title: string, role?: TerminalRole) => void
  removeTerminal: (id: string) => void
  setActiveTerminal: (id: string | null) => void
  updateTerminalStatus: (id: string, status: TerminalStatus) => void
  updateTerminalClaudeActive: (id: string, active: boolean) => void
  updateTerminalRole: (id: string, role: TerminalRole) => void
  updateTerminalPtyReady: (id: string, ready: boolean) => void

  // 緊急停止
  isEmergencyStopping: boolean
  setEmergencyStopping: (stopping: boolean) => void

  // 会話履歴
  conversationLogs: ConversationLogEntry[]
  addConversationLog: (entry: Omit<ConversationLogEntry, 'timestamp'>) => void
  clearConversationLogs: () => void

  // 自動セットアップ設定
  autoLaunchClaude: boolean
  setAutoLaunchClaude: (enabled: boolean) => void
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

  // ターミナル（拡張版）
  terminals: [],
  activeTerminal: null,
  addTerminal: (id, title, role = 'general') => set((state) => ({
    terminals: [...state.terminals, {
      id,
      title,
      role,
      status: 'idle',
      claudeActive: false,
      ptyReady: false
    }],
    activeTerminal: id
  })),
  removeTerminal: (id) => set((state) => {
    const newTerminals = state.terminals.filter((t) => t.id !== id)
    const newActiveTerminal = state.activeTerminal === id
      ? (newTerminals.length > 0 ? newTerminals[newTerminals.length - 1].id : null)
      : state.activeTerminal
    return { terminals: newTerminals, activeTerminal: newActiveTerminal }
  }),
  setActiveTerminal: (id) => set({ activeTerminal: id }),
  updateTerminalStatus: (id, status) => set((state) => ({
    terminals: state.terminals.map((t) =>
      t.id === id ? { ...t, status } : t
    )
  })),
  updateTerminalClaudeActive: (id, active) => set((state) => ({
    terminals: state.terminals.map((t) =>
      t.id === id ? { ...t, claudeActive: active } : t
    )
  })),
  updateTerminalRole: (id, role) => set((state) => ({
    terminals: state.terminals.map((t) =>
      t.id === id ? { ...t, role } : t
    )
  })),
  updateTerminalPtyReady: (id, ready) => set((state) => ({
    terminals: state.terminals.map((t) =>
      t.id === id ? { ...t, ptyReady: ready } : t
    )
  })),

  // 緊急停止
  isEmergencyStopping: false,
  setEmergencyStopping: (stopping) => set({ isEmergencyStopping: stopping }),

  // 会話履歴
  conversationLogs: [],
  addConversationLog: (entry) => set((state) => ({
    conversationLogs: [...state.conversationLogs, { ...entry, timestamp: new Date() }]
  })),
  clearConversationLogs: () => set({ conversationLogs: [] }),

  // 自動セットアップ設定
  autoLaunchClaude: true,
  setAutoLaunchClaude: (enabled) => set({ autoLaunchClaude: enabled })
}))
