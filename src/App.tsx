import { useEffect, useRef, useCallback } from 'react'
import { Layout, Model, TabNode, ITabSetRenderValues, IJsonModel, TabSetNode, BorderNode } from 'flexlayout-react'
import 'flexlayout-react/style/light.css'
import './styles/flexlayout-cockpit.css'

import { useAppStore } from './stores/appStore'
import { useOrchestrationStore } from './stores/orchestrationStore'
import { useLayoutStore } from './stores/layoutStore'

import TitleBar from './components/Layout/TitleBar'
import MenuBar from './components/Layout/MenuBar'
import FileExplorer from './components/FileExplorer/FileExplorer'
import Editor from './components/Editor/Editor'
import TerminalManager from './components/Terminal/TerminalManager'
import CommandPalette from './components/CommandPalette/CommandPalette'
import Toast from './components/Toast/Toast'
import { useShortcuts } from './hooks/useShortcuts'

function App() {
  const {
    currentPath,
    setCurrentPath,
    addTerminal,
    terminals,
    autoLaunchClaude,
    updateTerminalClaudeActive,
    conversationLogs,
    clearConversationLogs
  } = useAppStore()

  const { setRulebook } = useOrchestrationStore()

  const {
    model,
    setModel,
    setLayoutJson,
    initialized,
    setInitialized,
    saveCurrentLayout
  } = useLayoutStore()

  const appInitialized = useRef(false)
  const lastProjectPath = useRef<string | null>(null)
  const pendingClaudeLaunch = useRef<string | null>(null)
  const layoutSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ショートカットシステム
  useShortcuts({
    onSaveFile: async () => {
      const { openFiles, activeFile, markFileClean } = useAppStore.getState()
      const currentFile = openFiles.find(f => f.path === activeFile)
      if (currentFile) {
        try {
          await window.electronAPI.fs.writeFile(currentFile.path, currentFile.content)
          markFileClean(currentFile.path)
        } catch (error) {
          console.error('Failed to save file:', error)
        }
      }
    },
    onResetLayout: () => {
      // レイアウトリセット後に保存
      saveLayout()
    }
  })

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

    const content = conversationLogs.map(log => {
      const time = log.timestamp.toISOString().split('T')[1].split('.')[0]
      const prefix = log.type === 'input' ? '> **入力**' : '**出力**'
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
    setTimeout(() => {
      window.electronAPI.pty.sendCommand(terminalId, 'claude')
      updateTerminalClaudeActive(terminalId, true)
    }, 500)
  }, [updateTerminalClaudeActive])

  // Rulebook読み込み
  const loadRulebook = useCallback(async (projectPath: string) => {
    if (!window.electronAPI?.fs?.readFile) return

    const rulebookFiles = [
      'CLAUDE.md',
      'RULEBOOK.md',
      '.claude/rules.md',
      'PROJECT_RULES.md'
    ]

    for (const filename of rulebookFiles) {
      const filepath = projectPath + '\\' + filename
      try {
        const content = await window.electronAPI.fs.readFile(filepath)
        if (content) {
          console.log('[Rulebook] Loaded:', filepath)
          setRulebook(filepath, content)
          return
        }
      } catch {
        // ファイルが存在しない場合は次を試す
      }
    }

    console.log('[Rulebook] No rulebook found in project')
    setRulebook(null, null)
  }, [setRulebook])

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

  // レイアウト永続化：保存
  const saveLayout = useCallback(async () => {
    if (!window.electronAPI?.settings?.save) return
    try {
      const json = saveCurrentLayout()
      const settings = await window.electronAPI.settings.load()
      await window.electronAPI.settings.save({
        ...settings,
        layout: json
      })
      console.log('[Layout] Saved')
    } catch (error) {
      console.error('Failed to save layout:', error)
    }
  }, [saveCurrentLayout])

  // レイアウト永続化：読み込み
  const loadLayout = useCallback(async () => {
    if (!window.electronAPI?.settings?.load) return
    try {
      const settings = await window.electronAPI.settings.load()
      if (settings.layout && typeof settings.layout === 'object') {
        const layoutJson = settings.layout as IJsonModel
        const loadedModel = Model.fromJson(layoutJson)
        setModel(loadedModel)
        setLayoutJson(layoutJson)
        console.log('[Layout] Loaded from settings')
      }
    } catch (error) {
      console.error('Failed to load layout:', error)
    }
  }, [setModel, setLayoutJson])

  // 初期化
  useEffect(() => {
    if (appInitialized.current) return
    appInitialized.current = true

    const init = async () => {
      // レイアウト復元
      await loadLayout()
      setInitialized(true)

      // 初期PMターミナルを作成
      const terminalId = `terminal-${Date.now()}`
      addTerminal(terminalId, 'PM: PowerShell', 'pm')

      if (!window.electronAPI?.fs?.getLastOpenedPath) return

      try {
        const lastPath = await window.electronAPI.fs.getLastOpenedPath()
        if (lastPath) {
          setCurrentPath(lastPath)
          lastProjectPath.current = lastPath
          loadRulebook(lastPath)

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
  }, [setCurrentPath, addTerminal, autoLaunchClaude, loadLayout, setInitialized, loadRulebook])

  // プロジェクトパスが変更されたらclaude自動起動 + Rulebook読み込み
  useEffect(() => {
    if (!currentPath) return
    if (currentPath === lastProjectPath.current) return

    lastProjectPath.current = currentPath
    loadRulebook(currentPath)

    if (autoLaunchClaude) {
      const pmTerminal = terminals.find(t => t.role === 'pm' && !t.claudeActive && t.ptyReady)
      if (pmTerminal) {
        launchClaudeInTerminal(pmTerminal.id)
      }
    }
  }, [currentPath, autoLaunchClaude, terminals, launchClaudeInTerminal, loadRulebook])

  // コンポーネントファクトリー
  const factory = useCallback((node: TabNode) => {
    const component = node.getComponent()

    switch (component) {
      case 'FileExplorer':
        return (
          <div className="panel-explorer h-full">
            <FileExplorer />
          </div>
        )
      case 'Editor':
        return (
          <div className="panel-editor h-full">
            <Editor />
          </div>
        )
      case 'TerminalManager':
        return (
          <div className="panel-terminal h-full">
            <TerminalManager />
          </div>
        )
      case 'CommandPalette':
        return (
          <div className="panel-command-palette h-full">
            <CommandPalette />
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full text-cockpit-text-dim">
            Unknown component: {component}
          </div>
        )
    }
  }, [])

  // モデル変更時
  const handleModelChange = useCallback((newModel: Model) => {
    setModel(newModel)

    // debounce付き自動保存
    if (layoutSaveTimer.current) {
      clearTimeout(layoutSaveTimer.current)
    }
    layoutSaveTimer.current = setTimeout(() => {
      saveLayout()
    }, 1000)
  }, [setModel, saveLayout])

  // タブセットのレンダーカスタマイズ
  const onRenderTabSet = useCallback((
    _node: TabSetNode | BorderNode,
    _renderValues: ITabSetRenderValues
  ) => {
    // タブセットのヘッダーボタンをカスタマイズ可能
  }, [])

  return (
    <div className="h-full flex flex-col bg-cockpit-bg">
      {/* タイトルバー */}
      <TitleBar />

      {/* メニューバー */}
      <MenuBar onSaveLayout={saveLayout} />

      {/* メインコンテンツ: FlexLayout */}
      <div className="flex-1 overflow-hidden">
        {initialized && (
          <Layout
            model={model}
            factory={factory}
            onModelChange={handleModelChange}
            onRenderTabSet={onRenderTabSet}
          />
        )}
      </div>

      {/* トースト通知 */}
      <Toast />
    </div>
  )
}

export default App
