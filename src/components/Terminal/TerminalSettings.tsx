import { useState, useEffect } from 'react'

export interface TerminalConfig {
  fontFamily: string
  fontSize: number
  cursorStyle: 'bar' | 'block' | 'underline'
  cursorBlink: boolean
  opacity: number
  colorScheme: string
}

export const colorSchemes: Record<string, {
  name: string
  background: string
  foreground: string
  cursor: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}> = {
  'cockpit': {
    name: 'Cockpit (Default)',
    background: '#111820',
    foreground: '#e6edf3',
    cursor: '#00d9ff',
    black: '#0a0e14',
    red: '#ff4466',
    green: '#00ff88',
    yellow: '#ffaa00',
    blue: '#00d9ff',
    magenta: '#ff66aa',
    cyan: '#00d9ff',
    white: '#e6edf3',
    brightBlack: '#8b949e',
    brightRed: '#ff6688',
    brightGreen: '#44ffaa',
    brightYellow: '#ffcc44',
    brightBlue: '#44ddff',
    brightMagenta: '#ff88cc',
    brightCyan: '#44ddff',
    brightWhite: '#ffffff'
  },
  'one-dark': {
    name: 'One Dark',
    background: '#282c34',
    foreground: '#abb2bf',
    cursor: '#528bff',
    black: '#282c34',
    red: '#e06c75',
    green: '#98c379',
    yellow: '#e5c07b',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#abb2bf',
    brightBlack: '#5c6370',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#e5c07b',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff'
  },
  'dracula': {
    name: 'Dracula',
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff'
  },
  'nord': {
    name: 'Nord',
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',
    brightBlack: '#4c566a',
    brightRed: '#bf616a',
    brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1',
    brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb',
    brightWhite: '#eceff4'
  },
  'monokai': {
    name: 'Monokai',
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#f4bf75',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
    brightBlack: '#75715e',
    brightRed: '#f92672',
    brightGreen: '#a6e22e',
    brightYellow: '#f4bf75',
    brightBlue: '#66d9ef',
    brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4',
    brightWhite: '#f9f8f5'
  },
  'solarized-dark': {
    name: 'Solarized Dark',
    background: '#002b36',
    foreground: '#839496',
    cursor: '#839496',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#586e75',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3'
  },
  'tokyo-night': {
    name: 'Tokyo Night',
    background: '#1a1b26',
    foreground: '#a9b1d6',
    cursor: '#c0caf5',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5'
  },
  'gruvbox': {
    name: 'Gruvbox Dark',
    background: '#282828',
    foreground: '#ebdbb2',
    cursor: '#ebdbb2',
    black: '#282828',
    red: '#cc241d',
    green: '#98971a',
    yellow: '#d79921',
    blue: '#458588',
    magenta: '#b16286',
    cyan: '#689d6a',
    white: '#a89984',
    brightBlack: '#928374',
    brightRed: '#fb4934',
    brightGreen: '#b8bb26',
    brightYellow: '#fabd2f',
    brightBlue: '#83a598',
    brightMagenta: '#d3869b',
    brightCyan: '#8ec07c',
    brightWhite: '#ebdbb2'
  }
}

export const defaultTerminalConfig: TerminalConfig = {
  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
  fontSize: 14,
  cursorStyle: 'bar',
  cursorBlink: true,
  opacity: 100,
  colorScheme: 'cockpit'
}

const fontOptions = [
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
  { value: "'Cascadia Code', monospace", label: 'Cascadia Code' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'Source Code Pro', monospace", label: 'Source Code Pro' },
  { value: "'Consolas', monospace", label: 'Consolas' },
  { value: "'Courier New', monospace", label: 'Courier New' },
]

interface TerminalSettingsProps {
  config: TerminalConfig
  onConfigChange: (config: TerminalConfig) => void
  onClose: () => void
}

const TerminalSettings = ({ config, onConfigChange, onClose }: TerminalSettingsProps) => {
  const [localConfig, setLocalConfig] = useState<TerminalConfig>(config)

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const handleChange = <K extends keyof TerminalConfig>(key: K, value: TerminalConfig[K]) => {
    const newConfig = { ...localConfig, [key]: value }
    setLocalConfig(newConfig)
    onConfigChange(newConfig)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-cockpit-panel border border-cockpit-border rounded-lg shadow-2xl w-[500px] max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cockpit-border">
          <h2 className="text-lg font-semibold text-cockpit-text">Terminal Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-cockpit-border rounded transition-colors"
          >
            <svg className="w-5 h-5 text-cockpit-text-dim" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(80vh-60px)]">
          {/* フォント設定 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cockpit-text uppercase tracking-wider">Font</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-cockpit-text-dim mb-1">Font Family</label>
                <select
                  value={localConfig.fontFamily}
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                  className="w-full bg-cockpit-bg border border-cockpit-border rounded px-3 py-2 text-sm text-cockpit-text focus:outline-none focus:border-cockpit-accent"
                >
                  {fontOptions.map((font) => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-cockpit-text-dim mb-1">Font Size: {localConfig.fontSize}px</label>
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={localConfig.fontSize}
                  onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                  className="w-full accent-cockpit-accent"
                />
              </div>
            </div>
          </div>

          {/* カーソル設定 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cockpit-text uppercase tracking-wider">Cursor</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-cockpit-text-dim mb-1">Cursor Style</label>
                <div className="flex gap-2">
                  {(['bar', 'block', 'underline'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => handleChange('cursorStyle', style)}
                      className={`
                        flex-1 px-3 py-2 text-sm rounded border transition-colors
                        ${localConfig.cursorStyle === style
                          ? 'bg-cockpit-accent text-cockpit-bg border-cockpit-accent'
                          : 'bg-cockpit-bg text-cockpit-text border-cockpit-border hover:border-cockpit-accent'
                        }
                      `}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-cockpit-text-dim mb-1">Cursor Blink</label>
                <button
                  onClick={() => handleChange('cursorBlink', !localConfig.cursorBlink)}
                  className={`
                    w-full px-3 py-2 text-sm rounded border transition-colors
                    ${localConfig.cursorBlink
                      ? 'bg-cockpit-accent text-cockpit-bg border-cockpit-accent'
                      : 'bg-cockpit-bg text-cockpit-text border-cockpit-border hover:border-cockpit-accent'
                    }
                  `}
                >
                  {localConfig.cursorBlink ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </div>

          {/* 透明度 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cockpit-text uppercase tracking-wider">Appearance</h3>

            <div>
              <label className="block text-xs text-cockpit-text-dim mb-1">Background Opacity: {localConfig.opacity}%</label>
              <input
                type="range"
                min="50"
                max="100"
                value={localConfig.opacity}
                onChange={(e) => handleChange('opacity', parseInt(e.target.value))}
                className="w-full accent-cockpit-accent"
              />
            </div>
          </div>

          {/* カラースキーム */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cockpit-text uppercase tracking-wider">Color Scheme</h3>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(colorSchemes).map(([id, scheme]) => (
                <button
                  key={id}
                  onClick={() => handleChange('colorScheme', id)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded border transition-colors
                    ${localConfig.colorScheme === id
                      ? 'border-cockpit-accent'
                      : 'border-cockpit-border hover:border-cockpit-accent'
                    }
                  `}
                >
                  {/* カラープレビュー */}
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-mono"
                    style={{
                      backgroundColor: scheme.background,
                      color: scheme.foreground
                    }}
                  >
                    Aa
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm text-cockpit-text">{scheme.name}</div>
                    <div className="flex gap-0.5 mt-1">
                      {[scheme.red, scheme.green, scheme.yellow, scheme.blue, scheme.magenta, scheme.cyan].map((color, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* プレビュー */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-cockpit-text uppercase tracking-wider">Preview</h3>
            <div
              className="rounded p-3 font-mono"
              style={{
                backgroundColor: colorSchemes[localConfig.colorScheme]?.background || '#111820',
                opacity: localConfig.opacity / 100,
                fontFamily: localConfig.fontFamily,
                fontSize: localConfig.fontSize
              }}
            >
              <div style={{ color: colorSchemes[localConfig.colorScheme]?.foreground }}>
                <span style={{ color: colorSchemes[localConfig.colorScheme]?.green }}>user@host</span>
                <span style={{ color: colorSchemes[localConfig.colorScheme]?.white }}>:</span>
                <span style={{ color: colorSchemes[localConfig.colorScheme]?.blue }}>~/projects</span>
                <span style={{ color: colorSchemes[localConfig.colorScheme]?.white }}>$ </span>
                <span style={{ color: colorSchemes[localConfig.colorScheme]?.foreground }}>ls -la</span>
              </div>
              <div style={{ color: colorSchemes[localConfig.colorScheme]?.cyan }}>drwxr-xr-x  5 user  staff   160 Jan 30 15:00 .</div>
              <div style={{ color: colorSchemes[localConfig.colorScheme]?.yellow }}>-rw-r--r--  1 user  staff  1234 Jan 30 14:55 package.json</div>
              <div style={{ color: colorSchemes[localConfig.colorScheme]?.red }}>error: something went wrong</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TerminalSettings
