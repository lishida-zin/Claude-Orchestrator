import { useEffect, useState, useCallback } from 'react'
import { useOrchestrationStore, ToastMessage } from '../../stores/orchestrationStore'

// 各トーストアイテムのコンポーネント
const ToastItem = ({
  toast,
  onRemove
}: {
  toast: ToastMessage
  onRemove: (id: string) => void
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const duration = toast.duration ?? 3000

  // マウント時にアニメーション開始
  useEffect(() => {
    // 次のフレームで表示状態に
    const showTimer = requestAnimationFrame(() => {
      setIsVisible(true)
    })

    return () => cancelAnimationFrame(showTimer)
  }, [])

  // 自動消去タイマー
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  // 閉じる処理
  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300) // アニメーション時間
  }, [onRemove, toast.id])

  // タイプ別のスタイル
  const typeStyles = {
    success: {
      border: 'border-l-green-500',
      icon: (
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      iconBg: 'bg-green-500/20'
    },
    error: {
      border: 'border-l-red-500',
      icon: (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      iconBg: 'bg-red-500/20'
    },
    info: {
      border: 'border-l-blue-500',
      icon: (
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-blue-500/20'
    },
    warning: {
      border: 'border-l-yellow-500',
      icon: (
        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: 'bg-yellow-500/20'
    }
  }

  const style = typeStyles[toast.type]

  return (
    <div
      className={`
        flex items-start gap-3 p-4 mb-2
        bg-gray-800/90 backdrop-blur-sm
        border-l-4 ${style.border}
        rounded-r-lg shadow-lg
        transition-all duration-300 ease-out
        ${isVisible && !isExiting
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
        }
        max-w-sm w-full
      `}
      role="alert"
    >
      {/* アイコン */}
      <div className={`flex-shrink-0 p-1.5 rounded-full ${style.iconBg}`}>
        {style.icon}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cockpit-text">
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-1 text-xs text-cockpit-text-dim">
            {toast.message}
          </p>
        )}
      </div>

      {/* 閉じるボタン */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded hover:bg-gray-700 transition-colors text-cockpit-text-dim hover:text-cockpit-text"
        aria-label="閉じる"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* プログレスバー（オプション） */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700 rounded-b overflow-hidden">
        <div
          className={`h-full ${
            toast.type === 'success' ? 'bg-green-500' :
            toast.type === 'error' ? 'bg-red-500' :
            toast.type === 'info' ? 'bg-blue-500' :
            'bg-yellow-500'
          }`}
          style={{
            animation: `shrink ${duration}ms linear forwards`
          }}
        />
      </div>
    </div>
  )
}

// トーストコンテナ
const Toast = () => {
  const { toasts, removeToast } = useOrchestrationStore()

  if (toasts.length === 0) {
    return null
  }

  return (
    <>
      {/* プログレスバーアニメーション用のスタイル */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {/* トーストコンテナ - 右下固定 */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col-reverse items-end pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </>
  )
}

export default Toast
