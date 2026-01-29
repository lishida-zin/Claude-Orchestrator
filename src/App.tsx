import { useEffect, useRef } from 'react'
import { useAppStore } from './stores/appStore'
import TitleBar from './components/Layout/TitleBar'
import FileExplorer from './components/FileExplorer/FileExplorer'
import Editor from './components/Editor/Editor'
import Terminal from './components/Terminal/Terminal'
import ResizeHandle from './components/Layout/ResizeHandle'

function App() {
  const {
    setCurrentPath,
    leftPanelWidth,
    setLeftPanelWidth,
    addTerminal
  } = useAppStore()

  const initialized = useRef(false)

  // 初期化
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const init = async () => {
      // 前回のパスを復元
      const lastPath = await window.electronAPI.fs.getLastOpenedPath()
      if (lastPath) {
        setCurrentPath(lastPath)
      }

      // 初期ターミナルを作成
      const terminalId = `terminal-${Date.now()}`
      addTerminal(terminalId, 'Terminal 1')
    }
    init()
  }, [setCurrentPath, addTerminal])

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

        {/* 右パネル: ターミナル */}
        <div className="flex-1 flex flex-col bg-cockpit-panel overflow-hidden">
          <Terminal />
        </div>
      </div>
    </div>
  )
}

export default App
