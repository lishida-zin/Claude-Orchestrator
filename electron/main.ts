import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import * as pty from 'node-pty'
import { fileURLToPath } from 'url'

// ESM で __dirname を取得
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ログ機能
const getLogPath = () => {
  const appPath = app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : process.cwd()
  return path.join(appPath, 'logs', 'app')
}

const log = (level: 'DEBUG' | 'INFO' | 'ERROR', message: string) => {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toISOString().split('T')[1].split('.')[0]
  const logDir = getLogPath()

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }

  const logFile = path.join(logDir, `${dateStr}.log`)
  const logEntry = `[${timeStr}] [${level}] ${message}\n`

  fs.appendFileSync(logFile, logEntry)
  console.log(logEntry.trim())
}

// 設定ファイルパス
const getConfigPath = () => {
  const appPath = app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : process.cwd()
  return path.join(appPath, 'config', 'settings.json')
}

// 設定読み込み
const loadSettings = () => {
  const configPath = getConfigPath()
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch (error) {
    log('ERROR', `Failed to load settings: ${error}`)
  }
  return {
    lastOpenedPath: '',
    windowBounds: { width: 1400, height: 900 },
    panelSizes: { left: 300, right: 500 }
  }
}

// 設定保存
const saveSettings = (settings: Record<string, unknown>) => {
  const configPath = getConfigPath()
  const configDir = path.dirname(configPath)

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  fs.writeFileSync(configPath, JSON.stringify(settings, null, 2))
  log('INFO', 'Settings saved')
}

let mainWindow: BrowserWindow | null = null
const ptyProcesses: Map<string, pty.IPty> = new Map()

const createWindow = () => {
  const settings = loadSettings()

  mainWindow = new BrowserWindow({
    width: settings.windowBounds?.width || 1400,
    height: settings.windowBounds?.height || 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0a0e14',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  log('INFO', 'Application started')

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('resize', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      const settings = loadSettings()
      settings.windowBounds = { width: bounds.width, height: bounds.height }
      saveSettings(settings)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  // すべてのptyプロセスを終了
  ptyProcesses.forEach((ptyProcess, id) => {
    log('INFO', `Terminating pty process: ${id}`)
    ptyProcess.kill()
  })
  ptyProcesses.clear()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC: ウィンドウ操作
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window:close', () => {
  log('INFO', 'Close window requested')
  if (mainWindow) {
    // DevToolsを閉じてからウィンドウを閉じる
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools()
    }
    mainWindow.close()
  }
})

// IPC: ファイルシステム操作
ipcMain.handle('fs:readDirectory', async (_event, dirPath: string) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return entries.map(entry => ({
      name: entry.name,
      path: path.join(dirPath, entry.name),
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile()
    }))
  } catch (error) {
    log('ERROR', `Failed to read directory: ${dirPath} - ${error}`)
    throw error
  }
})

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    log('ERROR', `Failed to read file: ${filePath} - ${error}`)
    throw error
  }
})

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    log('INFO', `File saved: ${filePath}`)
    return true
  } catch (error) {
    log('ERROR', `Failed to write file: ${filePath} - ${error}`)
    throw error
  }
})

ipcMain.handle('fs:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0]
    const settings = loadSettings()
    settings.lastOpenedPath = selectedPath
    saveSettings(settings)
    log('INFO', `Directory selected: ${selectedPath}`)
    return selectedPath
  }
  return null
})

ipcMain.handle('fs:getLastOpenedPath', async () => {
  const settings = loadSettings()
  return settings.lastOpenedPath || null
})

// 利用可能なシェル一覧を取得
const getAvailableShells = () => {
  const shells: { id: string; name: string; path: string }[] = []

  if (process.platform === 'win32') {
    // PowerShell 7 (pwsh) - デフォルト
    const pwshPaths = [
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe'
    ]
    for (const p of pwshPaths) {
      if (fs.existsSync(p)) {
        shells.push({ id: 'pwsh', name: 'PowerShell 7', path: p })
        break
      }
    }

    // PowerShell (Windows標準)
    shells.push({ id: 'powershell', name: 'PowerShell', path: 'powershell.exe' })

    // Command Prompt
    shells.push({ id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' })

    // Git Bash
    const gitBashPaths = [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe'
    ]
    for (const p of gitBashPaths) {
      if (fs.existsSync(p)) {
        shells.push({ id: 'gitbash', name: 'Git Bash', path: p })
        break
      }
    }

    // WSL
    shells.push({ id: 'wsl', name: 'WSL', path: 'wsl.exe' })
  } else {
    shells.push({ id: 'bash', name: 'Bash', path: '/bin/bash' })
    shells.push({ id: 'zsh', name: 'Zsh', path: '/bin/zsh' })
  }

  return shells
}

// IPC: 利用可能なシェル一覧
ipcMain.handle('pty:getShells', async () => {
  return getAvailableShells()
})

// IPC: ターミナル（PTY）操作
ipcMain.handle('pty:create', async (_event, id: string, cwd: string, shellId?: string) => {
  try {
    const shells = getAvailableShells()
    const selectedShell = shells.find(s => s.id === shellId) || shells[0]
    const shell = selectedShell.path

    log('INFO', `Creating PTY with shell: ${selectedShell.name} (${shell})`)

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: cwd || process.cwd(),
      env: process.env as { [key: string]: string }
    })

    ptyProcesses.set(id, ptyProcess)
    log('INFO', `PTY process created: ${id}`)

    ptyProcess.onData((data) => {
      mainWindow?.webContents.send(`pty:data:${id}`, data)
    })

    ptyProcess.onExit(({ exitCode }) => {
      log('INFO', `PTY process exited: ${id} (code: ${exitCode})`)
      ptyProcesses.delete(id)
      mainWindow?.webContents.send(`pty:exit:${id}`, exitCode)
    })

    return true
  } catch (error) {
    log('ERROR', `Failed to create PTY: ${error}`)
    throw error
  }
})

ipcMain.on('pty:write', (_event, id: string, data: string) => {
  const ptyProcess = ptyProcesses.get(id)
  if (ptyProcess) {
    ptyProcess.write(data)
  }
})

ipcMain.on('pty:resize', (_event, id: string, cols: number, rows: number) => {
  const ptyProcess = ptyProcesses.get(id)
  if (ptyProcess) {
    ptyProcess.resize(cols, rows)
  }
})

ipcMain.on('pty:kill', (_event, id: string) => {
  const ptyProcess = ptyProcesses.get(id)
  if (ptyProcess) {
    ptyProcess.kill()
    ptyProcesses.delete(id)
    log('INFO', `PTY process killed: ${id}`)
  }
})

// IPC: 全PTYプロセス一括終了（緊急停止）
ipcMain.handle('pty:killAll', async () => {
  const count = ptyProcesses.size
  log('INFO', `Emergency stop: killing ${count} PTY processes`)

  ptyProcesses.forEach((ptyProcess, id) => {
    try {
      ptyProcess.kill()
      log('INFO', `PTY process killed: ${id}`)
    } catch (error) {
      log('ERROR', `Failed to kill PTY process ${id}: ${error}`)
    }
  })
  ptyProcesses.clear()

  return count
})

// IPC: ターミナルにコマンド送信
ipcMain.on('pty:sendCommand', (_event, id: string, command: string) => {
  const ptyProcess = ptyProcesses.get(id)
  if (ptyProcess) {
    // コマンドを送信（改行付き）
    ptyProcess.write(command + '\r')
    log('INFO', `Command sent to ${id}: ${command}`)
  } else {
    log('ERROR', `PTY process not found: ${id}`)
  }
})

// IPC: アクティブなPTYプロセス数を取得
ipcMain.handle('pty:getActiveCount', async () => {
  return ptyProcesses.size
})

// IPC: 設定操作
ipcMain.handle('settings:load', async () => {
  return loadSettings()
})

ipcMain.handle('settings:save', async (_event, settings: Record<string, unknown>) => {
  saveSettings(settings)
  return true
})

// 会話履歴ディレクトリパス取得
const getConversationPath = (projectName: string) => {
  const appPath = app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : process.cwd()
  // プロジェクト名をサニタイズ（ファイルシステムセーフな名前に）
  const safeName = projectName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50)
  return path.join(appPath, 'logs', 'conversations', safeName)
}

// IPC: 会話履歴を保存
ipcMain.handle('conversation:save', async (_event, projectName: string, content: string) => {
  const conversationDir = getConversationPath(projectName)
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const filePath = path.join(conversationDir, `${dateStr}.md`)

  try {
    if (!fs.existsSync(conversationDir)) {
      fs.mkdirSync(conversationDir, { recursive: true })
    }

    // 既存ファイルに追記
    fs.appendFileSync(filePath, content, 'utf-8')
    log('INFO', `Conversation saved: ${filePath}`)
    return filePath
  } catch (error) {
    log('ERROR', `Failed to save conversation: ${error}`)
    throw error
  }
})

// IPC: 会話履歴を読み込み
ipcMain.handle('conversation:load', async (_event, projectName: string, date: string) => {
  const conversationDir = getConversationPath(projectName)
  const filePath = path.join(conversationDir, `${date}.md`)

  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8')
    }
    return null
  } catch (error) {
    log('ERROR', `Failed to load conversation: ${error}`)
    throw error
  }
})

// IPC: 会話履歴ファイル一覧を取得
ipcMain.handle('conversation:list', async (_event, projectName: string) => {
  const conversationDir = getConversationPath(projectName)

  try {
    if (!fs.existsSync(conversationDir)) {
      return []
    }

    const files = fs.readdirSync(conversationDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
      .sort()
      .reverse()

    return files
  } catch (error) {
    log('ERROR', `Failed to list conversations: ${error}`)
    return []
  }
})

// コマンド設定ファイルパス
const getCommandsPath = () => {
  const appPath = app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : process.cwd()
  return path.join(appPath, 'config', 'commands.json')
}

// IPC: コマンド設定を読み込み
ipcMain.handle('commands:load', async () => {
  const commandsPath = getCommandsPath()
  try {
    if (fs.existsSync(commandsPath)) {
      const content = fs.readFileSync(commandsPath, 'utf-8')
      return JSON.parse(content)
    }
    return null
  } catch (error) {
    log('ERROR', `Failed to load commands: ${error}`)
    return null
  }
})

// IPC: コマンド設定を保存
ipcMain.handle('commands:save', async (_event, data: object) => {
  const commandsPath = getCommandsPath()
  const commandsDir = path.dirname(commandsPath)
  try {
    if (!fs.existsSync(commandsDir)) {
      fs.mkdirSync(commandsDir, { recursive: true })
    }
    fs.writeFileSync(commandsPath, JSON.stringify(data, null, 2), 'utf-8')
    log('INFO', 'Commands config saved')
    return true
  } catch (error) {
    log('ERROR', `Failed to save commands: ${error}`)
    return false
  }
})

// ショートカット設定ファイルパス
const getShortcutsPath = () => {
  const appPath = app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : process.cwd()
  return path.join(appPath, 'config', 'shortcuts.json')
}

// IPC: ショートカット設定を読み込み
ipcMain.handle('shortcuts:load', async () => {
  const shortcutsPath = getShortcutsPath()
  try {
    if (fs.existsSync(shortcutsPath)) {
      const content = fs.readFileSync(shortcutsPath, 'utf-8')
      log('INFO', 'Shortcuts config loaded')
      return JSON.parse(content)
    }
    return null
  } catch (error) {
    log('ERROR', `Failed to load shortcuts: ${error}`)
    return null
  }
})

// IPC: ショートカット設定を保存
ipcMain.handle('shortcuts:save', async (_event, data: object) => {
  const shortcutsPath = getShortcutsPath()
  const shortcutsDir = path.dirname(shortcutsPath)
  try {
    if (!fs.existsSync(shortcutsDir)) {
      fs.mkdirSync(shortcutsDir, { recursive: true })
    }
    fs.writeFileSync(shortcutsPath, JSON.stringify(data, null, 2), 'utf-8')
    log('INFO', 'Shortcuts config saved')
    return true
  } catch (error) {
    log('ERROR', `Failed to save shortcuts: ${error}`)
    return false
  }
})
