import { useState, useRef, useEffect } from 'react'
import { useAppStore, TerminalRole } from '../../stores/appStore'
import { useLayoutStore } from '../../stores/layoutStore'

interface MenuBarProps {
  onSaveLayout: () => void
}

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  divider?: boolean
  disabled?: boolean
}

interface Menu {
  label: string
  items: MenuItem[]
}

const MenuBar = ({ onSaveLayout }: MenuBarProps) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  const {
    activeFile,
    openFiles,
    markFileClean,
    addTerminal,
    isEmergencyStopping,
    setEmergencyStopping
  } = useAppStore()

  const {
    resetLayout,
    panelVisibility,
    togglePanel,
    shortcuts
  } = useLayoutStore()

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ファイル保存
  const handleSaveFile = async () => {
    const currentFile = openFiles.find(f => f.path === activeFile)
    if (currentFile) {
      try {
        await window.electronAPI.fs.writeFile(currentFile.path, currentFile.content)
        markFileClean(currentFile.path)
      } catch (error) {
        console.error('Failed to save file:', error)
      }
    }
    setOpenMenu(null)
  }

  // 新しいターミナル追加
  const addNewTerminal = (role: TerminalRole) => {
    const id = `terminal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const roleLabel = role === 'pm' ? 'PM' : role === 'worker' ? 'Worker' : 'General'
    addTerminal(id, `${roleLabel}: PowerShell`, role)
    setOpenMenu(null)
  }

  // 緊急停止
  const handleEmergencyStop = async () => {
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
    setOpenMenu(null)
  }

  // レイアウトリセット
  const handleResetLayout = () => {
    resetLayout()
    onSaveLayout()
    setOpenMenu(null)
  }

  // メニュー定義
  const menus: Menu[] = [
    {
      label: 'ファイル',
      items: [
        {
          label: '新しいファイル',
          shortcut: shortcuts.newFile,
          action: () => {
            // TODO: 新しいファイル作成機能
            setOpenMenu(null)
          },
          disabled: true
        },
        {
          label: '保存',
          shortcut: shortcuts.saveFile,
          action: handleSaveFile,
          disabled: !activeFile
        }
      ]
    },
    {
      label: '表示',
      items: [
        {
          label: `${panelVisibility.explorer ? '✓ ' : ''}Explorer`,
          shortcut: shortcuts.toggleExplorer,
          action: () => {
            togglePanel('explorer')
            setOpenMenu(null)
          }
        },
        {
          label: `${panelVisibility.editor ? '✓ ' : ''}Editor`,
          action: () => {
            togglePanel('editor')
            setOpenMenu(null)
          }
        },
        {
          label: `${panelVisibility.commandPalette ? '✓ ' : ''}Command Palette`,
          shortcut: shortcuts.toggleCommandPalette,
          action: () => {
            togglePanel('commandPalette')
            setOpenMenu(null)
          }
        },
        {
          label: `${panelVisibility.terminal ? '✓ ' : ''}Terminal`,
          shortcut: shortcuts.toggleTerminal,
          action: () => {
            togglePanel('terminal')
            setOpenMenu(null)
          }
        },
        { label: '', divider: true },
        {
          label: 'レイアウトをリセット',
          shortcut: shortcuts.resetLayout,
          action: handleResetLayout
        }
      ]
    },
    {
      label: 'ターミナル',
      items: [
        {
          label: '新しいPMターミナル',
          shortcut: shortcuts.newPMTerminal,
          action: () => addNewTerminal('pm')
        },
        {
          label: '新しいWorkerターミナル',
          shortcut: shortcuts.newWorkerTerminal,
          action: () => addNewTerminal('worker')
        },
        {
          label: '新しい汎用ターミナル',
          action: () => addNewTerminal('general')
        },
        { label: '', divider: true },
        {
          label: '緊急停止',
          shortcut: shortcuts.emergencyStop,
          action: handleEmergencyStop,
          disabled: isEmergencyStopping
        }
      ]
    }
  ]

  return (
    <div
      ref={menuBarRef}
      className="flex items-center bg-cockpit-bg border-b border-cockpit-border h-7 px-2 select-none"
    >
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          {/* メニューボタン */}
          <button
            className={`
              px-3 py-1 text-xs font-medium rounded transition-colors
              ${openMenu === menu.label
                ? 'bg-cockpit-panel text-cockpit-text'
                : 'text-cockpit-text-dim hover:bg-cockpit-panel hover:text-cockpit-text'
              }
            `}
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
          >
            {menu.label}
          </button>

          {/* ドロップダウンメニュー */}
          {openMenu === menu.label && (
            <div className="absolute left-0 top-full mt-1 bg-cockpit-panel border border-cockpit-border rounded shadow-lg z-50 min-w-[220px] py-1">
              {menu.items.map((item, index) => (
                item.divider ? (
                  <div key={index} className="border-t border-cockpit-border my-1" />
                ) : (
                  <button
                    key={index}
                    className={`
                      w-full px-3 py-1.5 text-left text-xs flex items-center justify-between
                      ${item.disabled
                        ? 'text-cockpit-text-dim cursor-not-allowed'
                        : 'text-cockpit-text hover:bg-cockpit-border'
                      }
                    `}
                    onClick={() => !item.disabled && item.action?.()}
                    disabled={item.disabled}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="text-cockpit-text-dim ml-4">{item.shortcut}</span>
                    )}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      ))}

      {/* 右側のステータス表示 */}
      <div className="flex-1" />

      {/* 緊急停止中インジケータ */}
      {isEmergencyStopping && (
        <div className="flex items-center gap-2 px-3 text-xs text-red-500 animate-pulse">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          緊急停止中...
        </div>
      )}
    </div>
  )
}

export default MenuBar
