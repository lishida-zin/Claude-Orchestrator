import { useCallback, useRef } from 'react'
import MonacoEditor, { OnMount, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useAppStore } from '../../stores/appStore'
import type { editor } from 'monaco-editor'

// ローカルのmonaco-editorを使用（CDN不要）
loader.config({ monaco })

const Editor = () => {
  const {
    openFiles,
    activeFile,
    setActiveFile,
    closeFile,
    updateFileContent,
    markFileClean
  } = useAppStore()

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  // 現在のファイル
  const currentFile = openFiles.find((f) => f.path === activeFile)

  // エディタマウント時
  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor

    // Ctrl+S で保存
    editor.addCommand(2048 | 49, async () => { // Monaco KeyMod.CtrlCmd | KeyCode.KeyS
      if (currentFile) {
        try {
          await window.electronAPI.fs.writeFile(currentFile.path, currentFile.content)
          markFileClean(currentFile.path)
        } catch (error) {
          console.error('Failed to save file:', error)
        }
      }
    })
  }

  // 内容変更時
  const handleChange = useCallback((value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFileContent(activeFile, value)
    }
  }, [activeFile, updateFileContent])

  // ファイルの拡張子から言語を判定
  const getLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      md: 'markdown',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
      yml: 'yaml',
      yaml: 'yaml',
      xml: 'xml',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      ps1: 'powershell'
    }
    return langMap[ext || ''] || 'plaintext'
  }

  // ファイル名を取得
  const getFileName = (filePath: string) => {
    return filePath.split('\\').pop() || filePath.split('/').pop() || filePath
  }

  return (
    <div className="h-full flex flex-col">
      {/* タブバー */}
      {openFiles.length > 0 && (
        <div className="flex items-center bg-cockpit-bg border-b border-cockpit-border overflow-x-auto">
          {openFiles.map((file) => (
            <div
              key={file.path}
              className={`
                flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer border-r border-cockpit-border
                ${file.path === activeFile
                  ? 'bg-cockpit-panel text-cockpit-text'
                  : 'text-cockpit-text-dim hover:bg-cockpit-panel'
                }
              `}
              onClick={() => setActiveFile(file.path)}
            >
              <span className="whitespace-nowrap">
                {file.isDirty && <span className="text-cockpit-accent mr-1">*</span>}
                {getFileName(file.path)}
              </span>
              <button
                className="p-0.5 hover:bg-cockpit-border rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  closeFile(file.path)
                }}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* エディタ本体 */}
      <div className="flex-1">
        {currentFile ? (
          <MonacoEditor
            height="100%"
            language={getLanguage(currentFile.path)}
            value={currentFile.content}
            onChange={handleChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Consolas', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              padding: { top: 8 }
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-cockpit-text-dim">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4 0a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4.414A2 2 0 0013.414 3L11 .586A2 2 0 009.586 0H4zm5.5 1.5v3a.5.5 0 00.5.5h3L9.5 1.5z" />
              </svg>
              <p className="text-sm">ファイルを選択してください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Editor
