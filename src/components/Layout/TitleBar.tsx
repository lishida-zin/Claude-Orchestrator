import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'

const TitleBar = () => {
  const { currentPath, terminals, isEmergencyStopping, setEmergencyStopping } = useAppStore()
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [activeCount, setActiveCount] = useState(0)

  // アクティブなPTYプロセス数を取得
  useEffect(() => {
    const updateCount = async () => {
      // APIが利用可能かチェック
      if (!window.electronAPI?.pty?.getActiveCount) {
        return
      }
      try {
        const count = await window.electronAPI.pty.getActiveCount()
        setActiveCount(count)
      } catch (error) {
        // 初期化中のエラーは無視
        if (error instanceof Error && !error.message.includes('destroyed')) {
          console.error('Failed to get active PTY count:', error)
        }
      }
    }
    updateCount()
    const interval = setInterval(updateCount, 2000)
    return () => clearInterval(interval)
  }, [terminals])

  // 緊急停止処理
  const handleEmergencyStop = useCallback(async () => {
    if (!window.electronAPI?.pty?.killAll) {
      setShowStopConfirm(false)
      return
    }
    setEmergencyStopping(true)
    try {
      const killedCount = await window.electronAPI.pty.killAll()
      console.log(`Emergency stop: ${killedCount} processes killed`)
    } catch (error) {
      console.error('Emergency stop failed:', error)
    } finally {
      setEmergencyStopping(false)
      setShowStopConfirm(false)
    }
  }, [setEmergencyStopping])

  // キーボードショートカット: Ctrl+Shift+Q
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'Q' || e.key === 'q')) {
        e.preventDefault()
        setShowStopConfirm(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeCount])

  const handleMinimize = () => {
    window.electronAPI.window.minimize()
  }

  const handleMaximize = () => {
    window.electronAPI.window.maximize()
  }

  const handleClose = () => {
    window.electronAPI.window.close()
  }

  return (
    <>
      <div className="h-9 flex items-center justify-between bg-cockpit-bg border-b border-cockpit-border drag-region">
        {/* 左側: ロゴとタイトル */}
        <div className="flex items-center gap-2 px-3 no-drag">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-cockpit-accent to-cockpit-accent-dim flex items-center justify-center">
            <span className="text-xs font-bold text-cockpit-bg">C</span>
          </div>
          <span className="text-sm font-semibold text-cockpit-text">
            Claude Orchestrator
          </span>
          {currentPath && (
            <span className="text-xs text-cockpit-text-dim ml-2">
              {currentPath.split('\\').pop() || currentPath.split('/').pop()}
            </span>
          )}

          {/* 緊急停止ボタン */}
          {activeCount > 0 && (
            <button
              onClick={() => setShowStopConfirm(true)}
              className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors"
              title="緊急停止 (Ctrl+Shift+Q)"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5 3.5h6A1.5 1.5 0 0112.5 5v6a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 11V5A1.5 1.5 0 015 3.5z"/>
              </svg>
              停止 ({activeCount})
            </button>
          )}
        </div>

        {/* 右側: ウィンドウコントロール */}
        <div className="flex items-center no-drag">
          <button
            onClick={handleMinimize}
            className="w-12 h-9 flex items-center justify-center hover:bg-cockpit-panel transition-colors"
            title="最小化"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 8h8v1H4z" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="w-12 h-9 flex items-center justify-center hover:bg-cockpit-panel transition-colors"
            title="最大化"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3 3h10v10H3V3zm1 1v8h8V4H4z" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-12 h-9 flex items-center justify-center hover:bg-cockpit-error transition-colors"
            title="閉じる"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 緊急停止確認ダイアログ */}
      {showStopConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cockpit-panel border border-cockpit-border rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-bold text-red-500 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.982 1.566a1.13 1.13 0 00-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 01-1.1 0L7.1 5.995A.905.905 0 018 5zm.002 6a1 1 0 110 2 1 1 0 010-2z"/>
              </svg>
              緊急停止
            </h3>
            <p className="text-cockpit-text mb-4">
              すべてのターミナルプロセス ({activeCount}個) を強制終了しますか？
            </p>
            <p className="text-cockpit-text-dim text-sm mb-6">
              実行中のClaude CLIも含め、すべてのプロセスが終了します。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="px-4 py-2 bg-cockpit-border text-cockpit-text rounded hover:bg-cockpit-panel transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleEmergencyStop}
                disabled={isEmergencyStopping}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isEmergencyStopping ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    停止中...
                  </>
                ) : (
                  '全プロセスを停止'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TitleBar
