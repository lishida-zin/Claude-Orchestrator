const { contextBridge, ipcRenderer } = require('electron')

// Electron API をレンダラープロセスに公開
contextBridge.exposeInMainWorld('electronAPI', {
  // ウィンドウ操作
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },

  // ファイルシステム操作
  fs: {
    readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    selectDirectory: () => ipcRenderer.invoke('fs:selectDirectory'),
    getLastOpenedPath: () => ipcRenderer.invoke('fs:getLastOpenedPath')
  },

  // ターミナル（PTY）操作
  pty: {
    getShells: () => ipcRenderer.invoke('pty:getShells'),
    create: (id: string, cwd: string, shellId?: string) => ipcRenderer.invoke('pty:create', id, cwd, shellId),
    write: (id: string, data: string) => ipcRenderer.send('pty:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.send('pty:resize', id, cols, rows),
    kill: (id: string) => ipcRenderer.send('pty:kill', id),
    killAll: () => ipcRenderer.invoke('pty:killAll'),
    sendCommand: (id: string, command: string) => ipcRenderer.send('pty:sendCommand', id, command),
    getActiveCount: () => ipcRenderer.invoke('pty:getActiveCount'),
    onData: (id: string, callback: (data: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
      ipcRenderer.on(`pty:data:${id}`, handler)
      return () => ipcRenderer.removeListener(`pty:data:${id}`, handler)
    },
    onExit: (id: string, callback: (exitCode: number) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, exitCode: number) => callback(exitCode)
      ipcRenderer.on(`pty:exit:${id}`, handler)
      return () => ipcRenderer.removeListener(`pty:exit:${id}`, handler)
    }
  },

  // 会話履歴操作
  conversation: {
    save: (projectName: string, content: string) => ipcRenderer.invoke('conversation:save', projectName, content),
    load: (projectName: string, date: string) => ipcRenderer.invoke('conversation:load', projectName, date),
    list: (projectName: string) => ipcRenderer.invoke('conversation:list', projectName)
  },

  // 設定操作
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:save', settings)
  }
})

// 型定義
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
}

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
