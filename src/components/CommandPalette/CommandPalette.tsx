import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'
import type { CommandConfig, FavoriteItemConfig } from '../../types/electron'

interface Command {
  id: string
  label: string
  command: string
  icon: string
  description: string
  category?: string
}

interface FavoriteItem {
  type: 'command' | 'folder'
  id: string
  name?: string
  children?: string[] // フォルダの場合、コマンドIDの配列
}

// デフォルトのコマンド一覧（フォールバック用）
const fallbackCommands: Command[] = [
  { id: 'cost', label: '/cost', command: '/cost', icon: '💰', description: 'トークン使用量を確認', category: '基本' },
  { id: 'compact', label: '/compact', command: '/compact', icon: '📦', description: 'コンテキストを圧縮', category: '基本' },
  { id: 'clear', label: '/clear', command: '/clear', icon: '🗑️', description: '会話をクリア', category: '基本' },
  { id: 'help', label: '/help', command: '/help', icon: '❓', description: 'ヘルプを表示', category: '基本' }
]

const fallbackCategories = ['基本', '開発スキル', '開発ツール', '議論・分析', 'ドキュメント', 'Web・デザイン', 'MCP・統合', 'タスク', 'セッション', '設定', 'コンテキスト', 'その他']

// デフォルトのお気に入り
const fallbackFavorites: FavoriteItem[] = [
  { type: 'command', id: 'cost' },
  { type: 'command', id: 'compact' },
  { type: 'command', id: 'clear' },
  { type: 'command', id: 'help' }
]

const CommandPalette = () => {
  const { activeTerminal, terminals } = useAppStore()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showManager, setShowManager] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteItem[]>(fallbackFavorites)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [dragItem, setDragItem] = useState<{ index: number; type: 'bar' | 'manager' } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')

  // 外部ファイルから読み込んだコマンド
  const [allCommands, setAllCommands] = useState<Command[]>(fallbackCommands)
  const [categoryOrder, setCategoryOrder] = useState<string[]>(fallbackCategories)
  const [defaultFavorites, setDefaultFavorites] = useState<FavoriteItem[]>(fallbackFavorites)
  const [isLoaded, setIsLoaded] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<HTMLDivElement>(null)

  // 外部ファイルからコマンドを読み込む
  useEffect(() => {
    const loadCommands = async () => {
      try {
        const config = await window.electronAPI?.commands?.load()
        if (config) {
          // コマンドを読み込み
          if (config.commands && config.commands.length > 0) {
            setAllCommands(config.commands as Command[])
          }
          // カテゴリ順序を読み込み
          if (config.categories && config.categories.length > 0) {
            setCategoryOrder(config.categories)
          }
          // デフォルトお気に入りを読み込み
          if (config.defaultFavorites && config.defaultFavorites.length > 0) {
            setDefaultFavorites(config.defaultFavorites as FavoriteItem[])
          }
          console.log('[CommandPalette] Loaded commands from config:', config.commands?.length || 0)
        } else {
          console.log('[CommandPalette] No config found, using fallback commands')
        }
        setIsLoaded(true)
      } catch (error) {
        console.error('[CommandPalette] Failed to load commands:', error)
        setIsLoaded(true)
      }
    }
    loadCommands()
  }, [])

  // お気に入りを設定から読み込む（コマンド読み込み後）
  useEffect(() => {
    if (!isLoaded) return

    const loadFavorites = async () => {
      try {
        const settings = await window.electronAPI?.settings?.load()
        if (settings?.commandFavorites) {
          setFavorites(settings.commandFavorites as FavoriteItem[])
        } else {
          // 設定がなければデフォルトを使用
          setFavorites(defaultFavorites)
        }
      } catch (error) {
        console.error('Failed to load command favorites:', error)
      }
    }
    loadFavorites()
  }, [isLoaded, defaultFavorites])

  // お気に入りを保存
  const saveFavorites = useCallback(async (newFavorites: FavoriteItem[]) => {
    try {
      const settings = await window.electronAPI?.settings?.load() || {}
      await window.electronAPI?.settings?.save({ ...settings, commandFavorites: newFavorites })
    } catch (error) {
      console.error('Failed to save command favorites:', error)
    }
  }, [])

  // フォルダを追加
  const addFolder = () => {
    const folderId = `folder-${Date.now()}`
    const newFavorites = [...favorites, { type: 'folder' as const, id: folderId, name: '新規フォルダ', children: [] }]
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
    setEditingFolder(folderId)
    setNewFolderName('新規フォルダ')
  }

  // フォルダ名を更新
  const updateFolderName = (folderId: string, name: string) => {
    const newFavorites = favorites.map(item =>
      item.id === folderId ? { ...item, name } : item
    )
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
    setEditingFolder(null)
  }

  // アイテムを削除
  const removeItem = (itemId: string) => {
    const newFavorites = favorites.filter(item => item.id !== itemId)
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
  }

  // コマンドをフォルダに追加
  const addToFolder = (folderId: string, commandId: string) => {
    const newFavorites = favorites.map(item => {
      if (item.id === folderId && item.type === 'folder') {
        const children = item.children || []
        if (!children.includes(commandId)) {
          return { ...item, children: [...children, commandId] }
        }
      }
      return item
    })
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
  }

  // コマンドをフォルダから削除
  const removeFromFolder = (folderId: string, commandId: string) => {
    const newFavorites = favorites.map(item => {
      if (item.id === folderId && item.type === 'folder') {
        return { ...item, children: (item.children || []).filter(id => id !== commandId) }
      }
      return item
    })
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
  }

  // お気に入りに追加/削除
  const toggleFavorite = (commandId: string) => {
    const exists = favorites.some(item => item.type === 'command' && item.id === commandId)
    const newFavorites = exists
      ? favorites.filter(item => !(item.type === 'command' && item.id === commandId))
      : [...favorites, { type: 'command' as const, id: commandId }]
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
  }

  // ドラッグ開始
  const handleDragStart = (index: number, type: 'bar' | 'manager') => {
    setDragItem({ index, type })
  }

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  // ドロップ
  const handleDrop = (targetIndex: number) => {
    if (dragItem === null) return

    const newFavorites = [...favorites]
    const [removed] = newFavorites.splice(dragItem.index, 1)
    newFavorites.splice(targetIndex, 0, removed)

    setFavorites(newFavorites)
    saveFavorites(newFavorites)
    setDragItem(null)
    setDragOverIndex(null)
  }

  // ドラッグ終了
  const handleDragEnd = () => {
    setDragItem(null)
    setDragOverIndex(null)
  }

  // フォルダ展開/折りたたみ
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
      if (managerRef.current && !managerRef.current.contains(event.target as Node)) {
        setShowManager(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCommand = (command: string) => {
    if (!activeTerminal) return
    const terminal = terminals.find(t => t.id === activeTerminal)
    if (!terminal?.claudeActive) return
    if (!window.electronAPI?.pty?.sendCommand) return
    window.electronAPI.pty.sendCommand(activeTerminal, command)
    setShowDropdown(false)
    setExpandedFolders(new Set())
  }

  const activeTerminalData = terminals.find(t => t.id === activeTerminal)
  const isClaudeActive = activeTerminalData?.claudeActive || false

  // コマンドを取得
  const getCommand = (id: string) => allCommands.find(cmd => cmd.id === id)

  // お気に入りにあるコマンドIDを取得
  const getFavoriteCommandIds = (): string[] => {
    const ids: string[] = []
    favorites.forEach(item => {
      if (item.type === 'command') {
        ids.push(item.id)
      } else if (item.type === 'folder' && item.children) {
        ids.push(...item.children)
      }
    })
    return ids
  }

  // カテゴリでグループ化
  const groupedCommands = categoryOrder.reduce((acc, category) => {
    const cmds = allCommands.filter(cmd => cmd.category === category)
    if (cmds.length > 0) acc[category] = cmds
    return acc
  }, {} as Record<string, Command[]>)

  const favoriteIds = getFavoriteCommandIds()

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-cockpit-bg border-b border-cockpit-border">
      <span className="text-xs text-cockpit-text-dim mr-2">コマンド:</span>

      {/* お気に入りバー */}
      {favorites.map((item, index) => {
        if (item.type === 'command') {
          const cmd = getCommand(item.id)
          if (!cmd) return null
          return (
            <button
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index, 'bar')}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              onClick={() => handleCommand(cmd.command)}
              disabled={!isClaudeActive}
              className={`
                flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors cursor-move
                ${dragOverIndex === index ? 'border-l-2 border-blue-500' : ''}
                ${isClaudeActive ? 'bg-cockpit-panel hover:bg-cockpit-border text-cockpit-text' : 'bg-cockpit-panel/50 text-cockpit-text-dim cursor-not-allowed'}
              `}
              title={cmd.description}
            >
              <span>{cmd.icon}</span>
              <span>{cmd.label}</span>
            </button>
          )
        } else {
          // フォルダ
          const isExpanded = expandedFolders.has(item.id)
          return (
            <div
              key={item.id}
              className="relative"
              draggable
              onDragStart={() => handleDragStart(index, 'bar')}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
            >
              <button
                onClick={() => toggleFolder(item.id)}
                disabled={!isClaudeActive}
                className={`
                  flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors cursor-move
                  ${dragOverIndex === index ? 'border-l-2 border-blue-500' : ''}
                  ${isClaudeActive ? 'bg-cockpit-panel hover:bg-cockpit-border text-cockpit-text' : 'bg-cockpit-panel/50 text-cockpit-text-dim cursor-not-allowed'}
                `}
                title={item.name}
              >
                <span>📁</span>
                <span>{item.name}</span>
                <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 16 16">
                  <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 01.753 1.659l-4.796 5.48a1 1 0 01-1.506 0z"/>
                </svg>
              </button>
              {isExpanded && isClaudeActive && (
                <div className="absolute top-full left-0 mt-1 bg-cockpit-panel border border-cockpit-border rounded shadow-lg z-50 min-w-[150px]">
                  {(item.children || []).map(cmdId => {
                    const cmd = getCommand(cmdId)
                    if (!cmd) return null
                    return (
                      <button
                        key={cmdId}
                        onClick={() => handleCommand(cmd.command)}
                        className="w-full px-3 py-1.5 text-left text-xs text-cockpit-text hover:bg-cockpit-border flex items-center gap-2"
                      >
                        <span>{cmd.icon}</span>
                        <span>{cmd.label}</span>
                      </button>
                    )
                  })}
                  {(!item.children || item.children.length === 0) && (
                    <div className="px-3 py-2 text-xs text-cockpit-text-dim">空のフォルダ</div>
                  )}
                </div>
              )}
            </div>
          )
        }
      })}

      {/* スペーサー - 右側に固定するため */}
      <div className="flex-1" />

      {/* 全コマンドドロップダウン */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={!isClaudeActive}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${isClaudeActive ? 'bg-cockpit-panel hover:bg-cockpit-border text-cockpit-text' : 'bg-cockpit-panel/50 text-cockpit-text-dim cursor-not-allowed'}`}
          title="全コマンド"
        >
          <span>📋</span>
          <span>全コマンド</span>
          <svg className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 16 16">
            <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 01.753 1.659l-4.796 5.48a1 1 0 01-1.506 0z"/>
          </svg>
        </button>

        {showDropdown && isClaudeActive && (
          <div className="absolute top-full left-0 mt-1 bg-cockpit-panel border border-cockpit-border rounded-lg shadow-lg z-50 min-w-[300px] max-h-[500px] overflow-y-auto">
            {Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-xs text-cockpit-text-dim bg-cockpit-bg/50 border-b border-cockpit-border sticky top-0">{category}</div>
                {cmds.map((cmd) => (
                  <div key={cmd.id} className="flex items-center">
                    <button onClick={() => handleCommand(cmd.command)} className="flex-1 px-3 py-2 text-left text-sm text-cockpit-text hover:bg-cockpit-border flex items-center gap-2">
                      <span>{cmd.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium">{cmd.label}</div>
                        <div className="text-xs text-cockpit-text-dim">{cmd.description}</div>
                      </div>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(cmd.id) }} className="px-2 py-2 hover:bg-cockpit-border" title={favoriteIds.includes(cmd.id) ? 'お気に入りから削除' : 'お気に入りに追加'}>
                      <span className={favoriteIds.includes(cmd.id) ? 'text-yellow-500' : 'text-cockpit-text-dim'}>{favoriteIds.includes(cmd.id) ? '★' : '☆'}</span>
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ブックマークマネージャー */}
      <div className="relative" ref={managerRef}>
        <button onClick={() => setShowManager(!showManager)} className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors bg-cockpit-panel hover:bg-cockpit-border text-cockpit-text" title="ブックマーク管理">
          <span>⚙️</span>
        </button>

        {showManager && (
          <div className="absolute top-full right-0 mt-1 bg-cockpit-panel border border-cockpit-border rounded-lg shadow-lg z-50 w-[400px] max-h-[500px] overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-cockpit-border bg-cockpit-bg/50 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-cockpit-text">ブックマーク管理</div>
                <div className="text-xs text-cockpit-text-dim">ドラッグで並び替え、フォルダで整理</div>
              </div>
              <button onClick={addFolder} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded">+ フォルダ</button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {favorites.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index, 'manager')}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={`mb-1 ${dragOverIndex === index ? 'border-t-2 border-blue-500' : ''}`}
                >
                  {item.type === 'command' ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-cockpit-border/50 rounded cursor-move">
                      <span className="cursor-move">⋮⋮</span>
                      <span>{getCommand(item.id)?.icon}</span>
                      <span className="flex-1 text-sm">{getCommand(item.id)?.label}</span>
                      <button onClick={() => removeItem(item.id)} className="text-cockpit-text-dim hover:text-red-400 text-xs">✕</button>
                    </div>
                  ) : (
                    <div className="bg-cockpit-border/30 rounded">
                      <div className="flex items-center gap-2 px-2 py-1.5 cursor-move">
                        <span className="cursor-move">⋮⋮</span>
                        <span>📁</span>
                        {editingFolder === item.id ? (
                          <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onBlur={() => updateFolderName(item.id, newFolderName)}
                            onKeyDown={(e) => e.key === 'Enter' && updateFolderName(item.id, newFolderName)}
                            className="flex-1 px-1 py-0.5 text-sm bg-cockpit-bg border border-cockpit-border rounded"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="flex-1 text-sm cursor-text"
                            onDoubleClick={() => { setEditingFolder(item.id); setNewFolderName(item.name || '') }}
                          >
                            {item.name}
                          </span>
                        )}
                        <button onClick={() => removeItem(item.id)} className="text-cockpit-text-dim hover:text-red-400 text-xs">✕</button>
                      </div>
                      <div className="pl-6 pb-1">
                        {(item.children || []).map(cmdId => {
                          const cmd = getCommand(cmdId)
                          if (!cmd) return null
                          return (
                            <div key={cmdId} className="flex items-center gap-2 px-2 py-1 text-xs">
                              <span>{cmd.icon}</span>
                              <span className="flex-1">{cmd.label}</span>
                              <button onClick={() => removeFromFolder(item.id, cmdId)} className="text-cockpit-text-dim hover:text-red-400">✕</button>
                            </div>
                          )
                        })}
                        <div className="relative group">
                          <button className="w-full px-2 py-1 text-xs text-cockpit-text-dim hover:bg-cockpit-border/50 rounded text-left">+ コマンドを追加...</button>
                          <div className="hidden group-hover:block absolute left-0 top-full bg-cockpit-panel border border-cockpit-border rounded shadow-lg z-10 max-h-[200px] overflow-y-auto w-[200px]">
                            {allCommands.filter(cmd => !(item.children || []).includes(cmd.id)).slice(0, 20).map(cmd => (
                              <button key={cmd.id} onClick={() => addToFolder(item.id, cmd.id)} className="w-full px-2 py-1 text-xs text-left hover:bg-cockpit-border flex items-center gap-1">
                                <span>{cmd.icon}</span>
                                <span>{cmd.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-cockpit-border">
              <button onClick={() => { setFavorites(defaultFavorites); saveFavorites(defaultFavorites) }} className="w-full px-3 py-1.5 text-xs bg-cockpit-border hover:bg-cockpit-panel rounded">デフォルトに戻す</button>
            </div>
          </div>
        )}
      </div>

      {!isClaudeActive && activeTerminal && <span className="text-xs text-cockpit-text-dim ml-2">(Claude未起動)</span>}
      {!activeTerminal && <span className="text-xs text-cockpit-text-dim ml-2">(ターミナルを選択してください)</span>}
    </div>
  )
}

export default CommandPalette
