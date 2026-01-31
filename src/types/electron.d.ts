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
    killAll: () => Promise<number>
    sendCommand: (id: string, command: string) => void
    getActiveCount: () => Promise<number>
    onData: (id: string, callback: (data: string) => void) => () => void
    onExit: (id: string, callback: (exitCode: number) => void) => () => void
  }
  conversation: {
    save: (projectName: string, content: string) => Promise<string>
    load: (projectName: string, date: string) => Promise<string | null>
    list: (projectName: string) => Promise<string[]>
  }
  settings: {
    load: () => Promise<Record<string, unknown>>
    save: (settings: Record<string, unknown>) => Promise<boolean>
  }
  commands: {
    load: () => Promise<CommandsConfig | null>
    save: (data: CommandsConfig) => Promise<boolean>
  }
  shortcuts: {
    load: () => Promise<Record<string, string> | null>
    save: (shortcuts: Record<string, string>) => Promise<boolean>
  }
}

export interface CommandConfig {
  id: string
  label: string
  command: string
  icon: string
  description: string
  category?: string
}

export interface FavoriteItemConfig {
  type: 'command' | 'folder'
  id: string
  name?: string
  children?: string[]
}

export interface CommandsConfig {
  commands: CommandConfig[]
  categories: string[]
  defaultFavorites: FavoriteItemConfig[]
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
