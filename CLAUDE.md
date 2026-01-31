# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Claude Orchestrator** - AI開発部隊の指揮所（Command Center）として、PM Agent と Worker Agents を統合管理する Electron デスクトップアプリケーション。

## Development Environment

- **Platform**: Windows (PowerShell preferred)
- **Path Style**: Use backslashes for Windows paths
- **Node.js**: Required (v18+)
- **Package Manager**: npm

## Build Commands

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# 型チェック
npm run typecheck

# ポータブルビルド（Windows）
npm run build:win
```

## Architecture Overview

```
Claude-Orchestrator/
├── electron/           # Electron メインプロセス
│   ├── main.ts        # アプリエントリポイント、IPC、PTY管理
│   └── preload.ts     # セキュアなAPI公開
├── src/
│   ├── App.tsx        # メインReactコンポーネント（FlexLayout統合）
│   ├── components/
│   │   ├── Editor/    # Monaco Editor（コード編集）
│   │   ├── Terminal/  # xterm.js + node-pty（ターミナル）
│   │   ├── FileExplorer/ # カスタムファイルツリー
│   │   ├── Layout/    # TitleBar, MenuBar
│   │   ├── CommandPalette/ # GUIコマンドパレット
│   │   └── Toast/     # トースト通知
│   ├── stores/        # Zustand グローバル状態
│   │   ├── appStore.ts      # アプリ状態
│   │   ├── layoutStore.ts   # レイアウト状態
│   │   └── orchestrationStore.ts # オーケストレーション状態
│   ├── hooks/         # カスタムフック
│   │   └── useShortcuts.ts  # キーボードショートカット
│   ├── styles/        # カスタムCSS
│   │   └── flexlayout-cockpit.css # FlexLayoutテーマ
│   ├── utils/         # ユーティリティ
│   │   └── OutputParser.ts  # XMLタグパーサー
│   └── types/         # TypeScript 型定義
├── config/            # ポータブル設定
│   ├── settings.json  # アプリ設定・レイアウト
│   └── shortcuts.json # ショートカット設定
├── logs/              # アプリログ、会話履歴
├── dev-records/       # 開発記録
└── docs/              # 要件定義書
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| electron | デスクトップアプリフレームワーク |
| @monaco-editor/react | コードエディタ |
| @xterm/xterm + node-pty | ターミナルエミュレータ |
| flexlayout-react | ドッキング可能なレイアウトシステム |
| zustand | 状態管理 |
| tailwindcss | スタイリング |
| vite + vite-plugin-electron | ビルドツール |
| electron-builder | パッケージング |

## IPC API

### Window
- `window:minimize`, `window:maximize`, `window:close`

### File System
- `fs:readDirectory`, `fs:readFile`, `fs:writeFile`
- `fs:selectDirectory`, `fs:getLastOpenedPath`

### PTY (Terminal)
- `pty:getShells` - 利用可能なシェル一覧
- `pty:create`, `pty:write`, `pty:resize`, `pty:kill`
- `pty:data:{id}`, `pty:exit:{id}` (events)

### Settings
- `settings:load`, `settings:save`

### Shortcuts
- `shortcuts:load`, `shortcuts:save`

## Phase 1 Status ✅

- [x] プロジェクト初期構成
- [x] Monaco Editor 統合
- [x] xterm.js + node-pty 統合
- [x] カスタムファイルエクスプローラー
- [x] 基本レイアウト（分割パネル）
- [x] ダークモード基本UI
- [x] 設定ファイル管理
- [x] 基本ログ機能
- [x] electron-builder でポータブルビルド検証

## Phase 2 Status ✅

- [x] ターミナル動的追加（タブUI）
- [x] PM/Worker/General ロール区別
- [x] 緊急停止ボタン（Ctrl+Shift+Q）
- [x] 自動セットアップ（claude起動）
- [x] GUIコマンドパレット（/cost, /compact, /clear, /help）
- [x] 会話履歴保存（マークダウン形式）

## Phase 3 Status ✅

- [x] Router機能（XMLタグ解析・Worker自動転送）
- [x] Status Monitor（Worker完了/エラー検知→PMフィードバック）
- [x] Rulebook Injection（プロジェクトルール自動読込）
- [x] コンフリクト防止（同一ファイル編集警告）
- [x] トースト通知システム

### XMLタグ仕様

```xml
<!-- PM → Worker -->
<spawn_worker id="worker1" role="frontend" />
<dispatch target="worker1">指示内容</dispatch>
<wait target="worker1" />

<!-- Worker → PM -->
<status>COMPLETED</status>
<status>ERROR: エラー内容</status>
```

### Rulebook探索順序

1. `CLAUDE.md`
2. `RULEBOOK.md`
3. `.claude/rules.md`
4. `PROJECT_RULES.md`

## Phase 4 Status ✅

- [x] flexlayout-react によるドッキング可能なレイアウト
- [x] ドラッグ&ドロップでパネル配置変更
- [x] メニューバー（ファイル/表示/ターミナル）
- [x] キーボードショートカットシステム
- [x] レイアウト永続化（再起動時復元）
- [x] カスタムCSSテーマ（cockpit-dark）

### キーボードショートカット

| ショートカット | 機能 |
|---------------|------|
| `Ctrl+B` | Explorer表示切替 |
| `Ctrl+`` | Terminal表示切替 |
| `Ctrl+Shift+P` | Command Palette表示切替 |
| `Ctrl+Shift+R` | レイアウトリセット |
| `Ctrl+S` | ファイル保存 |
| `Ctrl+Shift+T` | 新規PMターミナル |
| `Ctrl+Shift+W` | 新規Workerターミナル |
| `Ctrl+Shift+Q` | 緊急停止 |

### レイアウト設定

- `config/shortcuts.json` - ショートカットカスタマイズ
- `config/settings.json` の `layout` フィールド - レイアウト状態保存
