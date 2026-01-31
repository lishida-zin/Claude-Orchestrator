import { create } from 'zustand'
import { Model, IJsonModel, TabNode, TabSetNode } from 'flexlayout-react'

// デフォルトレイアウト定義
export const defaultLayout: IJsonModel = {
  global: {
    tabEnableClose: true,
    tabEnableDrag: true,
    tabSetMinWidth: 100,
    tabSetMinHeight: 100,
  },
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'row',
        weight: 30,
        children: [
          {
            type: 'tabset',
            weight: 40,
            children: [
              {
                type: 'tab',
                name: 'Explorer',
                component: 'FileExplorer',
                enableClose: false,
              }
            ]
          },
          {
            type: 'tabset',
            weight: 60,
            children: [
              {
                type: 'tab',
                name: 'Editor',
                component: 'Editor',
                enableClose: false,
              }
            ]
          }
        ]
      },
      {
        type: 'row',
        weight: 70,
        children: [
          {
            type: 'tabset',
            weight: 20,
            children: [
              {
                type: 'tab',
                name: 'Command Palette',
                component: 'CommandPalette',
                enableClose: false,
              }
            ]
          },
          {
            type: 'tabset',
            weight: 80,
            id: 'terminal-tabset',
            children: [
              {
                type: 'tab',
                name: 'Terminal',
                component: 'TerminalManager',
                enableClose: false,
              }
            ]
          }
        ]
      }
    ]
  }
}

// ショートカット設定型
export interface ShortcutConfig {
  toggleExplorer: string
  toggleTerminal: string
  toggleCommandPalette: string
  resetLayout: string
  newFile: string
  saveFile: string
  newPMTerminal: string
  newWorkerTerminal: string
  emergencyStop: string
}

// デフォルトショートカット
export const defaultShortcuts: ShortcutConfig = {
  toggleExplorer: 'Ctrl+B',
  toggleTerminal: 'Ctrl+`',
  toggleCommandPalette: 'Ctrl+Shift+P',
  resetLayout: 'Ctrl+Shift+R',
  newFile: 'Ctrl+N',
  saveFile: 'Ctrl+S',
  newPMTerminal: 'Ctrl+Shift+T',
  newWorkerTerminal: 'Ctrl+Shift+W',
  emergencyStop: 'Ctrl+Shift+Q'
}

// パネル表示状態
export interface PanelVisibility {
  explorer: boolean
  editor: boolean
  commandPalette: boolean
  terminal: boolean
}

interface LayoutState {
  // FlexLayout Model
  model: Model
  setModel: (model: Model) => void

  // レイアウトJSON（永続化用）
  layoutJson: IJsonModel
  setLayoutJson: (json: IJsonModel) => void

  // パネル表示状態
  panelVisibility: PanelVisibility
  togglePanel: (panel: keyof PanelVisibility) => void
  setPanelVisibility: (panel: keyof PanelVisibility, visible: boolean) => void

  // ショートカット設定
  shortcuts: ShortcutConfig
  setShortcuts: (shortcuts: ShortcutConfig) => void
  updateShortcut: (key: keyof ShortcutConfig, value: string) => void

  // レイアウト操作
  resetLayout: () => void
  saveCurrentLayout: () => IJsonModel

  // 初期化フラグ
  initialized: boolean
  setInitialized: (initialized: boolean) => void
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  // FlexLayout Model
  model: Model.fromJson(defaultLayout),
  setModel: (model) => set({ model }),

  // レイアウトJSON
  layoutJson: defaultLayout,
  setLayoutJson: (json) => set({ layoutJson: json }),

  // パネル表示状態
  panelVisibility: {
    explorer: true,
    editor: true,
    commandPalette: true,
    terminal: true
  },
  togglePanel: (panel) => set((state) => ({
    panelVisibility: {
      ...state.panelVisibility,
      [panel]: !state.panelVisibility[panel]
    }
  })),
  setPanelVisibility: (panel, visible) => set((state) => ({
    panelVisibility: {
      ...state.panelVisibility,
      [panel]: visible
    }
  })),

  // ショートカット設定
  shortcuts: defaultShortcuts,
  setShortcuts: (shortcuts) => set({ shortcuts }),
  updateShortcut: (key, value) => set((state) => ({
    shortcuts: {
      ...state.shortcuts,
      [key]: value
    }
  })),

  // レイアウト操作
  resetLayout: () => {
    const newModel = Model.fromJson(defaultLayout)
    set({
      model: newModel,
      layoutJson: defaultLayout,
      panelVisibility: {
        explorer: true,
        editor: true,
        commandPalette: true,
        terminal: true
      }
    })
  },
  saveCurrentLayout: () => {
    const { model } = get()
    const json = model.toJson() as IJsonModel
    set({ layoutJson: json })
    return json
  },

  // 初期化フラグ
  initialized: false,
  setInitialized: (initialized) => set({ initialized })
}))

// ユーティリティ関数
export const findTabByComponent = (model: Model, componentName: string): TabNode | undefined => {
  let foundTab: TabNode | undefined
  model.visitNodes((node) => {
    if (node instanceof TabNode && node.getComponent() === componentName) {
      foundTab = node
    }
  })
  return foundTab
}

export const findTabSet = (model: Model, id: string): TabSetNode | undefined => {
  return model.getNodeById(id) as TabSetNode | undefined
}
