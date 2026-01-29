import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'
import type { FileEntry } from '../../types/electron'

interface TreeNode extends FileEntry {
  children?: TreeNode[]
  isExpanded?: boolean
  isLoading?: boolean
}

const FileExplorer = () => {
  const { currentPath, setCurrentPath, openFile } = useAppStore()
  const [tree, setTree] = useState<TreeNode[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // ディレクトリを読み込む
  const loadDirectory = useCallback(async (dirPath: string): Promise<TreeNode[]> => {
    try {
      const entries = await window.electronAPI.fs.readDirectory(dirPath)
      return entries
        .sort((a, b) => {
          // ディレクトリを先に
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })
        .map((entry) => ({
          ...entry,
          isExpanded: false,
          children: entry.isDirectory ? undefined : undefined
        }))
    } catch (error) {
      console.error('Failed to load directory:', error)
      return []
    }
  }, [])

  // プロジェクトパスが変更されたら読み込む
  useEffect(() => {
    if (currentPath) {
      setIsLoading(true)
      loadDirectory(currentPath).then((entries) => {
        setTree(entries)
        setIsLoading(false)
      })
    } else {
      setTree([])
    }
  }, [currentPath, loadDirectory])

  // フォルダを開く
  const handleSelectFolder = async () => {
    const selectedPath = await window.electronAPI.fs.selectDirectory()
    if (selectedPath) {
      setCurrentPath(selectedPath)
    }
  }

  // ノードをクリック
  const handleNodeClick = async (node: TreeNode, path: number[]) => {
    if (node.isDirectory) {
      // ディレクトリの展開/折りたたみ
      setTree((prevTree) => {
        const newTree = [...prevTree]
        let current: TreeNode[] = newTree

        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]].children || []
        }

        const targetNode = current[path[path.length - 1]]

        if (targetNode.isExpanded) {
          targetNode.isExpanded = false
        } else {
          targetNode.isExpanded = true
          targetNode.isLoading = true

          loadDirectory(targetNode.path).then((children) => {
            setTree((prevTree) => {
              const newTree = [...prevTree]
              let current: TreeNode[] = newTree

              for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]].children || []
              }

              current[path[path.length - 1]].children = children
              current[path[path.length - 1]].isLoading = false
              return newTree
            })
          })
        }

        return newTree
      })
    } else {
      // ファイルを開く
      try {
        const content = await window.electronAPI.fs.readFile(node.path)
        openFile(node.path, content)
      } catch (error) {
        console.error('Failed to open file:', error)
      }
    }
  }

  // ツリーノードをレンダリング
  const renderNode = (node: TreeNode, index: number, path: number[], depth: number) => {
    const currentPath = [...path, index]
    const paddingLeft = depth * 16 + 8

    return (
      <div key={node.path}>
        <div
          className="flex items-center gap-1 py-1 px-2 hover:bg-cockpit-border cursor-pointer text-sm"
          style={{ paddingLeft }}
          onClick={() => handleNodeClick(node, currentPath)}
        >
          {/* アイコン */}
          {node.isDirectory ? (
            <span className="w-4 text-cockpit-accent">
              {node.isLoading ? (
                <svg className="w-4 h-4 animate-spin\" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : node.isExpanded ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1.5 2.5A.5.5 0 012 2h12a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5v-2zM2 3v1h12V3H2zm0 3.5h12v8a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-8zm1 1V14h10V7.5H3z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M9.828 3h3.982a2 2 0 011.992 2.181l-.637 7A2 2 0 0113.174 14H2.826a2 2 0 01-1.991-1.819l-.637-7a1.99 1.99 0 01.342-1.31L.5 3a2 2 0 012-2h3.672a2 2 0 011.414.586l.828.828A2 2 0 009.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 006.172 2H2.5a1 1 0 00-1 .981l.006.139z" />
                </svg>
              )}
            </span>
          ) : (
            <span className="w-4 text-cockpit-text-dim">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4 0a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4.414A2 2 0 0013.414 3L11 .586A2 2 0 009.586 0H4zm5.5 1.5v3a.5.5 0 00.5.5h3L9.5 1.5z" />
              </svg>
            </span>
          )}

          {/* ファイル名 */}
          <span className={node.isDirectory ? 'text-cockpit-text' : 'text-cockpit-text-dim'}>
            {node.name}
          </span>
        </div>

        {/* 子ノード */}
        {node.isDirectory && node.isExpanded && node.children && (
          <div>
            {node.children.map((child, i) => renderNode(child, i, currentPath, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cockpit-border">
        <span className="text-xs font-semibold text-cockpit-text-dim uppercase tracking-wider">
          Explorer
        </span>
        <button
          onClick={handleSelectFolder}
          className="p-1 hover:bg-cockpit-border rounded transition-colors"
          title="フォルダを開く"
        >
          <svg className="w-4 h-4 text-cockpit-text-dim" fill="currentColor" viewBox="0 0 16 16">
            <path d="M9.828 3h3.982a2 2 0 011.992 2.181l-.637 7A2 2 0 0113.174 14H2.826a2 2 0 01-1.991-1.819l-.637-7a1.99 1.99 0 01.342-1.31L.5 3a2 2 0 012-2h3.672a2 2 0 011.414.586l.828.828A2 2 0 009.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 006.172 2H2.5a1 1 0 00-1 .981l.006.139z" />
          </svg>
        </button>
      </div>

      {/* ファイルツリー */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-cockpit-text-dim text-sm">Loading...</span>
          </div>
        ) : currentPath ? (
          tree.length > 0 ? (
            tree.map((node, index) => renderNode(node, index, [], 0))
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-cockpit-text-dim text-sm">Empty folder</span>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
            <span className="text-cockpit-text-dim text-sm text-center">
              フォルダを選択してください
            </span>
            <button
              onClick={handleSelectFolder}
              className="px-4 py-2 bg-cockpit-accent text-cockpit-bg text-sm font-medium rounded hover:bg-cockpit-accent-dim transition-colors"
            >
              フォルダを開く
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileExplorer
