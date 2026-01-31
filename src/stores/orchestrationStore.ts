import { create } from 'zustand'

// Worker状態
export interface WorkerState {
  id: string           // ユーザー定義ID（spawn_workerのid属性）
  terminalId: string   // 内部ターミナルID
  role: string         // 役割（frontend, backend等）
  status: 'spawning' | 'idle' | 'working' | 'completed' | 'error'
  lastCommand?: string
  lastOutput?: string
  createdAt: Date
}

// ファイルロック
export interface FileLock {
  filepath: string
  terminalId: string
  terminalTitle: string
  lockedAt: Date
}

// トースト通知
export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number  // ms, default 3000
}

interface OrchestrationState {
  // Worker管理
  workers: WorkerState[]
  addWorker: (worker: Omit<WorkerState, 'createdAt'>) => void
  removeWorker: (id: string) => void
  updateWorkerStatus: (id: string, status: WorkerState['status'], output?: string) => void
  getWorkerByTerminalId: (terminalId: string) => WorkerState | undefined
  getWorkerById: (id: string) => WorkerState | undefined

  // ファイルロック
  fileLocks: FileLock[]
  acquireLock: (filepath: string, terminalId: string, terminalTitle: string) => boolean
  releaseLock: (filepath: string) => void
  releaseAllLocks: (terminalId: string) => void
  checkLock: (filepath: string) => FileLock | null

  // Rulebook
  rulebookPath: string | null
  rulebookContent: string | null
  setRulebook: (path: string | null, content: string | null) => void

  // PM ターミナルID（フィードバック送信先）
  pmTerminalId: string | null
  setPmTerminalId: (id: string | null) => void

  // トースト通知
  toasts: ToastMessage[]
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void

  // 待機中のWorker
  waitingFor: string[]  // Worker IDのリスト
  addWaiting: (workerId: string) => void
  removeWaiting: (workerId: string) => void
}

export const useOrchestrationStore = create<OrchestrationState>((set, get) => ({
  // Worker管理
  workers: [],
  addWorker: (worker) => set((state) => ({
    workers: [...state.workers, { ...worker, createdAt: new Date() }]
  })),
  removeWorker: (id) => set((state) => ({
    workers: state.workers.filter((w) => w.id !== id)
  })),
  updateWorkerStatus: (id, status, output) => set((state) => ({
    workers: state.workers.map((w) =>
      w.id === id
        ? { ...w, status, ...(output !== undefined ? { lastOutput: output } : {}) }
        : w
    )
  })),
  getWorkerByTerminalId: (terminalId) => {
    return get().workers.find((w) => w.terminalId === terminalId)
  },
  getWorkerById: (id) => {
    return get().workers.find((w) => w.id === id)
  },

  // ファイルロック
  fileLocks: [],
  acquireLock: (filepath, terminalId, terminalTitle) => {
    const state = get()
    const existingLock = state.fileLocks.find((l) => l.filepath === filepath)
    if (existingLock) {
      // 既にロックされている場合、同じターミナルならtrue、違えばfalse
      return existingLock.terminalId === terminalId
    }
    // 新規ロック取得
    set((s) => ({
      fileLocks: [...s.fileLocks, {
        filepath,
        terminalId,
        terminalTitle,
        lockedAt: new Date()
      }]
    }))
    return true
  },
  releaseLock: (filepath) => set((state) => ({
    fileLocks: state.fileLocks.filter((l) => l.filepath !== filepath)
  })),
  releaseAllLocks: (terminalId) => set((state) => ({
    fileLocks: state.fileLocks.filter((l) => l.terminalId !== terminalId)
  })),
  checkLock: (filepath) => {
    const lock = get().fileLocks.find((l) => l.filepath === filepath)
    return lock || null
  },

  // Rulebook
  rulebookPath: null,
  rulebookContent: null,
  setRulebook: (path, content) => set({
    rulebookPath: path,
    rulebookContent: content
  }),

  // PM ターミナルID
  pmTerminalId: null,
  setPmTerminalId: (id) => set({ pmTerminalId: id }),

  // トースト通知
  toasts: [],
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: Date.now().toString() }]
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),

  // 待機中のWorker
  waitingFor: [],
  addWaiting: (workerId) => set((state) => ({
    waitingFor: state.waitingFor.includes(workerId)
      ? state.waitingFor
      : [...state.waitingFor, workerId]
  })),
  removeWaiting: (workerId) => set((state) => ({
    waitingFor: state.waitingFor.filter((id) => id !== workerId)
  }))
}))
