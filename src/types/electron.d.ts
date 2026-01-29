export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

export interface ShellInfo {
  id: string
  name: string
  path: string
}

export interface ElectronAPI {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  fs: {
    readDirectory: (dirPath: string) => Promise<FileEntry[]>
    readFile: (filePath: string) => Promise<string>
    writeFile: (filePath: string, content: string) => Promise<boolean>
    selectDirectory: () => Promise<string | null>
    getLastOpenedPath: () => Promise<string | null>
  }
  pty: {
    getShells: () => Promise<ShellInfo[]>
    create: (id: string, cwd: string, shellId?: string) => Promise<boolean>
    write: (id: string, data: string) => void
    resize: (id: string, cols: number, rows: number) => void
    kill: (id: string) => void
    onData: (id: string, callback: (data: string) => void) => () => void
    onExit: (id: string, callback: (exitCode: number) => void) => () => void
  }
  settings: {
    load: () => Promise<Record<string, unknown>>
    save: (settings: Record<string, unknown>) => Promise<boolean>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
