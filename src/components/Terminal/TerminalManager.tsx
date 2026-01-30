import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useAppStore, TerminalRole } from '../../stores/appStore'
import TerminalSettings, { TerminalConfig, defaultTerminalConfig, colorSchemes } from './TerminalSettings'
import '@xterm/xterm/css/xterm.css'

interface Shell {
  id: string
  name: string
  path: string
}

// ロールごとの色設定
const roleColors: Record<TerminalRole, { bg: string; border: string; icon: string }> = {
  pm: { bg: 'bg-blue-900/30', border: 'border-blue-500', icon: '👔' },
  worker: { bg: 'bg-green-900/30', border: 'border-green-500', icon: '⚙️' },
  general: { bg: 'bg-cockpit-panel', border: 'border-cockpit-border', icon: '💻' }
}

const TerminalManager = () => {
  const {
    currentPath,
    terminals,
    activeTerminal,
    addTerminal,
    removeTerminal,
    setActiveTerminal,
    updateTerminalStatus,
    updateTerminalClaudeActive,
    updateTerminalPtyReady,
    addConversationLog,
    autoLaunchClaude
  } = useAppStore()

  const [shells, setShells] = useState<Shell[]>([])
  const [selectedShell, setSelectedShell] = useState<string>('powershell')
  const [showShellMenu, setShowShellMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [terminalConfig, setTerminalConfig] = useState<TerminalConfig>(defaultTerminalConfig)

  const terminalRefs = useRef<Map<string, { term: XTerm; fitAddon: FitAddon; shellId: string }>>(new Map())
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const pendingShells = useRef<Map<string, { shellId: string; role: TerminalRole }>>(new Map())

  const [shellsLoaded, setShellsLoaded] = useState(false)

  // 設定を読み込む
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const settings = await window.electronAPI.settings.load()
        if (settings.terminalConfig) {
          setTerminalConfig(settings.terminalConfig as TerminalConfig)
        }
      } catch (error) {
        console.error('Failed to load terminal config:', error)
      }
    }
    loadConfig()
  }, [])

  // 設定を保存
  const saveConfig = async (config: TerminalConfig) => {
    try {
      const settings = await window.electronAPI.settings.load()
      await window.electronAPI.settings.save({ ...settings, terminalConfig: config })
    } catch (error) {
      console.error('Failed to save terminal config:', error)
    }
  }

  // 設定変更時
  const handleConfigChange = (config: TerminalConfig) => {
    setTerminalConfig(config)
    saveConfig(config)

    // すべてのターミナルに設定を適用
    terminalRefs.current.forEach((ref) => {
      applyConfigToTerminal(ref.term, config)
    })
  }

  // ターミナルに設定を適用
  const applyConfigToTerminal = (term: XTerm, config: TerminalConfig) => {
    const scheme = colorSchemes[config.colorScheme] || colorSchemes['cockpit']

    term.options.fontFamily = config.fontFamily
    term.options.fontSize = config.fontSize
    term.options.cursorStyle = config.cursorStyle
    term.options.cursorBlink = config.cursorBlink
    term.options.theme = {
      background: scheme.background,
      foreground: scheme.foreground,
      cursor: scheme.cursor,
      cursorAccent: scheme.background,
      selectionBackground: `${scheme.foreground}33`,
      black: scheme.black,
      red: scheme.red,
      green: scheme.green,
      yellow: scheme.yellow,
      blue: scheme.blue,
      magenta: scheme.magenta,
      cyan: scheme.cyan,
      white: scheme.white,
      brightBlack: scheme.brightBlack,
      brightRed: scheme.brightRed,
      brightGreen: scheme.brightGreen,
      brightYellow: scheme.brightYellow,
      brightBlue: scheme.brightBlue,
      brightMagenta: scheme.brightMagenta,
      brightCyan: scheme.brightCyan,
      brightWhite: scheme.brightWhite
    }
  }

  // シェル一覧を取得
  useEffect(() => {
    const loadShells = async () => {
      try {
        const availableShells = await window.electronAPI.pty.getShells()
        setShells(availableShells)
        if (availableShells.length > 0) {
          setSelectedShell(availableShells[0].id)
        }
        setShellsLoaded(true)
      } catch (error) {
        console.error('Failed to load shells:', error)
        setShellsLoaded(true)
      }
    }
    loadShells()
  }, [])

  // ターミナルを初期化
  const initTerminal = useCallback(async (id: string, container: HTMLDivElement, shellId: string) => {
    if (terminalRefs.current.has(id)) return

    const scheme = colorSchemes[terminalConfig.colorScheme] || colorSchemes['cockpit']

    const term = new XTerm({
      fontFamily: terminalConfig.fontFamily,
      fontSize: terminalConfig.fontSize,
      cursorStyle: terminalConfig.cursorStyle,
      cursorBlink: terminalConfig.cursorBlink,
      theme: {
        background: scheme.background,
        foreground: scheme.foreground,
        cursor: scheme.cursor,
        cursorAccent: scheme.background,
        selectionBackground: `${scheme.foreground}33`,
        black: scheme.black,
        red: scheme.red,
        green: scheme.green,
        yellow: scheme.yellow,
        blue: scheme.blue,
        magenta: scheme.magenta,
        cyan: scheme.cyan,
        white: scheme.white,
        brightBlack: scheme.brightBlack,
        brightRed: scheme.brightRed,
        brightGreen: scheme.brightGreen,
        brightYellow: scheme.brightYellow,
        brightBlue: scheme.brightBlue,
        brightMagenta: scheme.brightMagenta,
        brightCyan: scheme.brightCyan,
        brightWhite: scheme.brightWhite
      },
      scrollback: 5000
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(container)
    fitAddon.fit()

    terminalRefs.current.set(id, { term, fitAddon, shellId })

    // PTYプロセスを作成
    try {
      await window.electronAPI.pty.create(id, currentPath || '', shellId)

      const terminal = terminals.find(t => t.id === id)

      const removeDataListener = window.electronAPI.pty.onData(id, (data) => {
        term.write(data)

        // 会話ログに追加
        if (terminal) {
          addConversationLog({
            terminalId: id,
            terminalTitle: terminal.title,
            type: 'output',
            content: data
          })
        }

        // claude関連の出力を検知
        if (data.includes('claude') || data.includes('Claude')) {
          updateTerminalClaudeActive(id, true)
        }
      })

      const removeExitListener = window.electronAPI.pty.onExit(id, () => {
        updateTerminalStatus(id, 'completed')
        updateTerminalClaudeActive(id, false)
        removeTerminal(id)
      })

      term.onData((data) => {
        window.electronAPI.pty.write(id, data)

        // 入力ログに追加
        if (terminal) {
          addConversationLog({
            terminalId: id,
            terminalTitle: terminal.title,
            type: 'input',
            content: data
          })
        }
      })

      term.onResize(({ cols, rows }) => {
        window.electronAPI.pty.resize(id, cols, rows)
      })

      updateTerminalStatus(id, 'running')
      updateTerminalPtyReady(id, true)

      // PM/Workerロールの場合、claudeを自動起動
      if (autoLaunchClaude && terminal && (terminal.role === 'pm' || terminal.role === 'worker')) {
        setTimeout(() => {
          window.electronAPI.pty.write(id, 'claude\r')
          updateTerminalClaudeActive(id, true)
        }, 500)
      }

      const cleanup = () => {
        removeDataListener()
        removeExitListener()
        window.electronAPI.pty.kill(id)
        term.dispose()
        terminalRefs.current.delete(id)
      }

      ;(terminalRefs.current.get(id) as any).cleanup = cleanup
    } catch (error) {
      console.error('Failed to create PTY:', error)
      term.writeln('\x1b[31mターミナルの初期化に失敗しました\x1b[0m')
      updateTerminalStatus(id, 'error')
    }
  }, [currentPath, terminals, removeTerminal, terminalConfig, updateTerminalStatus, updateTerminalClaudeActive, addConversationLog])

  // リサイズオブザーバー
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      terminalRefs.current.forEach((ref) => {
        ref.fitAddon.fit()
      })
    })

    const container = document.getElementById('terminal-container')
    if (container) {
      resizeObserver.observe(container)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [terminals])

  // ターミナル数が変わったらリサイズ
  useEffect(() => {
    setTimeout(() => {
      const activeRef = activeTerminal ? terminalRefs.current.get(activeTerminal) : null
      if (activeRef) {
        activeRef.fitAddon.fit()
      }
    }, 100)
  }, [terminals.length, activeTerminal])

  // クリーンアップ
  useEffect(() => {
    return () => {
      terminalRefs.current.forEach((ref: any) => {
        if (ref.cleanup) {
          ref.cleanup()
        }
      })
    }
  }, [])

  // 新しいターミナルを追加
  const handleAddTerminal = (shellId?: string, role: TerminalRole = 'general') => {
    const id = `terminal-${Date.now()}`
    const shell = shells.find(s => s.id === (shellId || selectedShell))
    const roleLabel = role === 'pm' ? 'PM' : role === 'worker' ? 'Worker' : ''
    const title = roleLabel ? `${roleLabel}: ${shell?.name || 'Terminal'}` : (shell?.name || `Terminal ${terminals.length + 1}`)
    addTerminal(id, title, role)
    pendingShells.current.set(id, { shellId: shellId || selectedShell, role })
    setShowShellMenu(false)
  }

  // ターミナルを閉じる
  const handleCloseTerminal = (id: string) => {
    const ref = terminalRefs.current.get(id) as any
    if (ref?.cleanup) {
      ref.cleanup()
    }
    removeTerminal(id)
  }

  // ターミナルにフォーカス
  const handleFocusTerminal = (id: string) => {
    setActiveTerminal(id)
    setTimeout(() => {
      const ref = terminalRefs.current.get(id)
      if (ref) {
        ref.term.focus()
        ref.fitAddon.fit()
      }
    }, 50)
  }

  // 透明度スタイル
  const containerStyle = {
    opacity: terminalConfig.opacity / 100
  }

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー: タブバー */}
      <div className="flex items-center bg-cockpit-bg border-b border-cockpit-border">
        {/* タブ */}
        <div className="flex-1 flex items-center overflow-x-auto">
          {terminals.map((terminal) => {
            const isActive = terminal.id === activeTerminal
            const colors = roleColors[terminal.role]

            return (
              <div
                key={terminal.id}
                className={`
                  flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-cockpit-border
                  transition-colors min-w-[120px] max-w-[200px]
                  ${isActive ? `${colors.bg} border-b-2 ${colors.border}` : 'hover:bg-cockpit-panel'}
                `}
                onClick={() => handleFocusTerminal(terminal.id)}
              >
                {/* ロールアイコン */}
                <span className="text-sm">{colors.icon}</span>

                {/* タイトル */}
                <span className={`text-xs truncate flex-1 ${isActive ? 'text-cockpit-text' : 'text-cockpit-text-dim'}`}>
                  {terminal.title}
                </span>

                {/* ステータスインジケータ */}
                <div className={`w-2 h-2 rounded-full ${
                  terminal.status === 'running' ? 'bg-green-500 animate-pulse' :
                  terminal.status === 'error' ? 'bg-red-500' :
                  terminal.status === 'completed' ? 'bg-gray-500' :
                  'bg-yellow-500'
                }`} />

                {/* Claude アクティブ */}
                {terminal.claudeActive && (
                  <span className="text-xs text-purple-400" title="Claude起動中">🤖</span>
                )}

                {/* 閉じるボタン */}
                <button
                  className="p-0.5 hover:bg-cockpit-border rounded opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCloseTerminal(terminal.id)
                  }}
                  title="閉じる"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        {/* 右側ボタン群 */}
        <div className="flex items-center gap-1 px-2 relative">
          {/* 設定ボタン */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 hover:bg-cockpit-border rounded transition-colors"
            title="ターミナル設定"
          >
            <svg className="w-4 h-4 text-cockpit-text-dim" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 00-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 001.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 003.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.115l.094-.319z" />
            </svg>
          </button>

          {/* シェル選択ドロップダウン */}
          <div className="relative">
            <button
              onClick={() => setShowShellMenu(!showShellMenu)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-cockpit-text-dim hover:bg-cockpit-border rounded transition-colors"
              title="新しいターミナルを追加"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z" />
              </svg>
            </button>

            {/* ドロップダウンメニュー */}
            {showShellMenu && (
              <div className="absolute top-full right-0 mt-1 bg-cockpit-panel border border-cockpit-border rounded shadow-lg z-50 min-w-[180px]">
                <div className="px-2 py-1 text-xs text-cockpit-text-dim border-b border-cockpit-border">
                  PM (マネージャー)
                </div>
                {shells.map((shell) => (
                  <button
                    key={`pm-${shell.id}`}
                    onClick={() => handleAddTerminal(shell.id, 'pm')}
                    className="w-full px-3 py-2 text-left text-sm text-cockpit-text hover:bg-cockpit-border transition-colors flex items-center gap-2"
                  >
                    <span>👔</span>
                    {shell.name}
                  </button>
                ))}

                <div className="px-2 py-1 text-xs text-cockpit-text-dim border-b border-t border-cockpit-border mt-1">
                  Worker (作業員)
                </div>
                {shells.map((shell) => (
                  <button
                    key={`worker-${shell.id}`}
                    onClick={() => handleAddTerminal(shell.id, 'worker')}
                    className="w-full px-3 py-2 text-left text-sm text-cockpit-text hover:bg-cockpit-border transition-colors flex items-center gap-2"
                  >
                    <span>⚙️</span>
                    {shell.name}
                  </button>
                ))}

                <div className="px-2 py-1 text-xs text-cockpit-text-dim border-b border-t border-cockpit-border mt-1">
                  General (汎用)
                </div>
                {shells.map((shell) => (
                  <button
                    key={`general-${shell.id}`}
                    onClick={() => handleAddTerminal(shell.id, 'general')}
                    className="w-full px-3 py-2 text-left text-sm text-cockpit-text hover:bg-cockpit-border transition-colors flex items-center gap-2"
                  >
                    <span>💻</span>
                    {shell.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* メニュー外クリックで閉じる */}
      {showShellMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowShellMenu(false)}
        />
      )}

      {/* ターミナルコンテナ */}
      <div id="terminal-container" className="flex-1 overflow-hidden" style={containerStyle}>
        {terminals.map((terminal) => (
          <div
            key={terminal.id}
            className={`h-full ${terminal.id === activeTerminal ? 'block' : 'hidden'}`}
            ref={(el) => {
              if (el && shellsLoaded) {
                containerRefs.current.set(terminal.id, el)
                if (!terminalRefs.current.has(terminal.id)) {
                  const pending = pendingShells.current.get(terminal.id)
                  const shellId = pending?.shellId || selectedShell
                  initTerminal(terminal.id, el, shellId)
                  pendingShells.current.delete(terminal.id)
                }
              }
            }}
          />
        ))}

        {terminals.length === 0 && (
          <div className="h-full flex items-center justify-center text-cockpit-text-dim">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="currentColor" viewBox="0 0 16 16">
                <path d="M6 9a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3A.5.5 0 016 9zM3.854 4.146a.5.5 0 10-.708.708L4.793 6.5 3.146 8.146a.5.5 0 10.708.708l2-2a.5.5 0 000-.708l-2-2z" />
                <path d="M2 1a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V3a2 2 0 00-2-2H2zm12 1a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1h12z" />
              </svg>
              <p className="text-sm mb-4">ターミナルがありません</p>
              <button
                onClick={() => handleAddTerminal(undefined, 'pm')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors mr-2"
              >
                👔 PM ターミナル
              </button>
              <button
                onClick={() => handleAddTerminal(undefined, 'worker')}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
              >
                ⚙️ Worker ターミナル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 設定モーダル */}
      {showSettings && (
        <TerminalSettings
          config={terminalConfig}
          onConfigChange={handleConfigChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default TerminalManager
