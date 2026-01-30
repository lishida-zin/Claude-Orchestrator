import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from './stores/appStore'
import TitleBar from './components/Layout/TitleBar'
import FileExplorer from './components/FileExplorer/FileExplorer'
import Editor from './components/Editor/Editor'
import TerminalManager from './components/Terminal/TerminalManager'
import CommandPalette from './components/CommandPalette/CommandPalette'
import ResizeHandle from './components/Layout/ResizeHandle'

function App() {
  const {
    currentPath,
    setCurrentPath,
    leftPanelWidth,
    setLeftPanelWidth,
    addTerminal,
    terminals,
    autoLaunchClaude,
    updateTerminalClaudeActive,
    conversationLogs,
    clearConversationLogs
  } = useAppStore()

  const initialized = useRef(false)
  const lastProjectPath = useRef<string | null>(null)
  const pendingClaudeLaunch = useRef<string | null>(null)  // claude起動待ちのターミナルID

  // 会話履歴を保存
  const saveConversationLogs = useCallback(async () => {
    console.log('[ConversationLog] Checking...', { currentPath, logsCount: conversationLogs.length })
    if (!currentPath || conversationLogs.length === 0) {
      console.log('[ConversationLog] Skip: no path or empty logs')
      return
    }
    if (!window.electronAPI?.conversation?.save) {
      console.log('[ConversationLog] Skip: API not available')
      return
    }

    const projectName = currentPath.split('\\').pop() || currentPath.split('/').pop() || 'unknown'

    // マークダウン形式で整形
    const content = conversationLogs.map(log => {
      const time = log.timestamp.toISOString().split('T')[1].split('.')[0]
      const prefix = log.type === 'input' ? '> **入力**' : '**出力**'
      // 制御文字を除去
      const cleanContent = log.content.replace(/\x1b\[[0-9;]*m/g, '').trim()
      if (!cleanContent) return ''
      return `[${time}] ${log.terminalTitle}\n${prefix}\n\`\`\`\n${cleanContent}\n\`\`\`\n`
    }).filter(Boolean).join('\n')

    if (content) {
      try {
        await window.electronAPI.conversation.save(projectName, content)
        clearConversationLogs()
      } catch (error) {
        console.error('Failed to save conversation:', error)
      }
    }
  }, [currentPath, conversationLogs, clearConversationLogs])

  // 定期的に会話履歴を保存（30秒ごと）
  useEffect(() => {
    const interval = setInterval(saveConversationLogs, 30000)
    return () => clearInterval(interval)
  }, [saveConversationLogs])

  // アプリ終了時に会話履歴を保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveConversationLogs()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveConversationLogs])

  // claude自動起動（PTY準備完了時に実行）
  const launchClaudeInTerminal = useCallback((terminalId: string) => {
    if (!window.electronAPI?.pty?.sendCommand) return
    // 少し待ってからコマンド送信（シェルプロンプト表示待ち）
    setTimeout(() => {
      window.electronAPI.pty.sendCommand(terminalId, 'claude')
      updateTerminalClaudeActive(terminalId, true)
    }, 500)
  }, [updateTerminalClaudeActive])

  // PTY準備完了を監視してclaude起動
  useEffect(() => {
    if (!pendingClaudeLaunch.current) return

    const terminal = terminals.find(t => t.id === pendingClaudeLaunch.current)
    console.log('[Claude Auto] Checking terminal:', pendingClaudeLaunch.current, 'ptyReady:', terminal?.ptyReady)
    if (terminal?.ptyReady) {
      console.log('[Claude Auto] Launching claude in terminal:', terminal.id)
      launchClaudeInTerminal(terminal.id)
      pendingClaudeLaunch.current = null
    }
  }, [terminals, launchClaudeInTerminal])

  // 初期化
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const init = async () => {
      // 初期PMターミナルを作成
      const terminalId = `terminal-${Date.now()}`
      addTerminal(terminalId, 'PM: PowerShell', 'pm')

      // APIが利用可能かチェック
      if (!window.electronAPI?.fs?.getLastOpenedPath) return

      // 前回のパスを復元
      try {
        const lastPath = await window.electronAPI.fs.getLastOpenedPath()
        if (lastPath) {
          setCurrentPath(lastPath)
          lastProjectPath.current = lastPath

          // 自動起動設定がONでパスがあればclaude起動予約
          if (autoLaunchClaude) {
            console.log('[Claude Auto] Setting pending launch for:', terminalId)
            pendingClaudeLaunch.current = terminalId
          }
        }
      } catch (error) {
        console.error('Failed to get last opened path:', error)
      }
    }
    init()
  }, [setCurrentPath, addTerminal, autoLaunchClaude])

  // プロジェクトパスが変更されたらclaude自動起動
  useEffect(() => {
    if (!autoLaunchClaude || !currentPath) return
    if (currentPath === lastProjectPath.current) return

    lastProjectPath.current = currentPath

    // 既存のPMターミナル（PTY準備済み）があればそこでclaude起動
    const pmTerminal = terminals.find(t => t.role === 'pm' && !t.claudeActive && t.ptyReady)
    if (pmTerminal) {
      launchClaudeInTerminal(pmTerminal.id)
    }
  }, [currentPath, autoLaunchClaude, terminals, launchClaudeInTerminal])

  return (
    <div className="h-full flex flex-col bg-cockpit-bg">
      {/* タイトルバー */}
      <TitleBar />

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左パネル: ファイルエクスプローラー + エディタ */}
        <div
          className="flex flex-col bg-cockpit-panel border-r border-cockpit-border"
          style={{ width: leftPanelWidth, minWidth: 200 }}
        >
          {/* ファイルエクスプローラー */}
          <div className="h-[40%] border-b border-cockpit-border overflow-hidden">
            <FileExplorer />
          </div>

          {/* エディタ */}
          <div className="flex-1 overflow-hidden">
            <Editor />
          </div>
        </div>

        {/* リサイズハンドル */}
        <ResizeHandle
          onResize={(delta) => {
            setLeftPanelWidth((prev) => Math.max(200, Math.min(600, prev + delta)))
          }}
        />

        {/* 右パネル: コマンドパレット + ターミナル */}
        <div className="flex-1 flex flex-col bg-cockpit-panel overflow-hidden">
          <CommandPalette />
          <TerminalManager />
        </div>
      </div>
    </div>
  )
}

export default App
