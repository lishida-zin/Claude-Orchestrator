import { useAppStore } from '../../stores/appStore'

const TitleBar = () => {
  const { currentPath } = useAppStore()

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
  )
}

export default TitleBar
