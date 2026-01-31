import { useEffect, useCallback } from 'react'
import { useAppStore, TerminalRole } from '../stores/appStore'
import { useLayoutStore, ShortcutConfig, defaultShortcuts } from '../stores/layoutStore'

// ショートカット文字列をパースしてキーイベントと比較
const parseShortcut = (shortcut: string): { ctrl: boolean; shift: boolean; alt: boolean; key: string } => {
  const parts = shortcut.toLowerCase().split('+')
  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts[parts.length - 1]
  }
}

const matchesShortcut = (e: KeyboardEvent, shortcut: string): boolean => {
  const parsed = parseShortcut(shortcut)

  // バッククォートの特別処理
  let key = e.key.toLowerCase()
  if (key === '`' || key === 'backquote') {
    key = '`'
  }

  return (
    e.ctrlKey === parsed.ctrl &&
    e.shiftKey === parsed.shift &&
    e.altKey === parsed.alt &&
    key === parsed.key
  )
}

interface UseShortcutsOptions {
  onSaveFile?: () => void
  onNewFile?: () => void
  onResetLayout?: () => void
}

export const useShortcuts = (options: UseShortcutsOptions = {}) => {
  const {
    addTerminal,
    setEmergencyStopping,
    isEmergencyStopping
  } = useAppStore()

  const {
    shortcuts,
    setShortcuts,
    togglePanel,
    resetLayout
  } = useLayoutStore()

  // ショートカット設定を読み込み
  const loadShortcuts = useCallback(async () => {
    if (!window.electronAPI?.shortcuts?.load) return
    try {
      const loaded = await window.electronAPI.shortcuts.load()
      if (loaded) {
        setShortcuts({ ...defaultShortcuts, ...loaded })
        console.log('[Shortcuts] Loaded:', loaded)
      }
    } catch (error) {
      console.error('Failed to load shortcuts:', error)
    }
  }, [setShortcuts])

  // ショートカット設定を保存
  const saveShortcuts = useCallback(async (newShortcuts: ShortcutConfig) => {
    if (!window.electronAPI?.shortcuts?.save) return
    try {
      await window.electronAPI.shortcuts.save(newShortcuts as unknown as Record<string, string>)
      setShortcuts(newShortcuts)
      console.log('[Shortcuts] Saved')
    } catch (error) {
      console.error('Failed to save shortcuts:', error)
    }
  }, [setShortcuts])

  // 新しいターミナル追加
  const addNewTerminal = useCallback((role: TerminalRole) => {
    const id = `terminal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const roleLabel = role === 'pm' ? 'PM' : role === 'worker' ? 'Worker' : 'General'
    addTerminal(id, `${roleLabel}: PowerShell`, role)
  }, [addTerminal])

  // 緊急停止
  const handleEmergencyStop = useCallback(async () => {
    if (isEmergencyStopping) return
    setEmergencyStopping(true)

    try {
      const count = await window.electronAPI.pty.killAll()
      console.log(`[Emergency Stop] Killed ${count} PTY processes`)
    } catch (error) {
      console.error('Emergency stop failed:', error)
    } finally {
      setEmergencyStopping(false)
    }
  }, [isEmergencyStopping, setEmergencyStopping])

  // キーボードイベントハンドラ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フォーカス中は一部のショートカットを無効化
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' ||
                      target.tagName === 'TEXTAREA' ||
                      target.isContentEditable

      // Explorerトグル
      if (matchesShortcut(e, shortcuts.toggleExplorer)) {
        e.preventDefault()
        togglePanel('explorer')
        return
      }

      // Terminalトグル
      if (matchesShortcut(e, shortcuts.toggleTerminal)) {
        e.preventDefault()
        togglePanel('terminal')
        return
      }

      // CommandPaletteトグル
      if (matchesShortcut(e, shortcuts.toggleCommandPalette)) {
        e.preventDefault()
        togglePanel('commandPalette')
        return
      }

      // レイアウトリセット
      if (matchesShortcut(e, shortcuts.resetLayout)) {
        e.preventDefault()
        resetLayout()
        options.onResetLayout?.()
        return
      }

      // 新規PMターミナル
      if (matchesShortcut(e, shortcuts.newPMTerminal)) {
        e.preventDefault()
        addNewTerminal('pm')
        return
      }

      // 新規Workerターミナル
      if (matchesShortcut(e, shortcuts.newWorkerTerminal)) {
        e.preventDefault()
        addNewTerminal('worker')
        return
      }

      // 緊急停止
      if (matchesShortcut(e, shortcuts.emergencyStop)) {
        e.preventDefault()
        handleEmergencyStop()
        return
      }

      // ファイル保存（入力中でも有効）
      if (matchesShortcut(e, shortcuts.saveFile)) {
        e.preventDefault()
        options.onSaveFile?.()
        return
      }

      // 新規ファイル（入力中は無効）
      if (!isInput && matchesShortcut(e, shortcuts.newFile)) {
        e.preventDefault()
        options.onNewFile?.()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    shortcuts,
    togglePanel,
    resetLayout,
    addNewTerminal,
    handleEmergencyStop,
    options
  ])

  // 初期読み込み
  useEffect(() => {
    loadShortcuts()
  }, [loadShortcuts])

  return {
    shortcuts,
    loadShortcuts,
    saveShortcuts
  }
}

export default useShortcuts
