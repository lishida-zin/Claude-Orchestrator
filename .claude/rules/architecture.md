# Architecture

## Directory Structure

```
Claude-Orchestrator/
├── electron/           # Electron メインプロセス
│   ├── main.ts        # アプリエントリポイント、IPC、PTY管理
│   └── preload.ts     # セキュアなAPI公開
├── src/
│   ├── App.tsx        # メインReactコンポーネント（FlexLayout統合）
│   ├── components/
│   │   ├── Editor/    # Monaco Editor
│   │   ├── Terminal/  # xterm.js + node-pty
│   │   ├── FileExplorer/
│   │   ├── Layout/    # TitleBar, MenuBar
│   │   ├── CommandPalette/
│   │   └── Toast/
│   ├── stores/        # Zustand
│   │   ├── appStore.ts
│   │   ├── layoutStore.ts
│   │   └── orchestrationStore.ts
│   ├── hooks/
│   ├── styles/
│   ├── utils/
│   └── types/
├── config/            # settings.json, shortcuts.json
├── logs/
└── dev-records/
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| electron | デスクトップアプリ |
| @monaco-editor/react | コードエディタ |
| @xterm/xterm + node-pty | ターミナル |
| flexlayout-react | ドッキングレイアウト |
| zustand | 状態管理 |
| tailwindcss | スタイリング |
