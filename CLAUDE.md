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
│   ├── App.tsx        # メインReactコンポーネント
│   ├── components/
│   │   ├── Editor/    # Monaco Editor（コード編集）
│   │   ├── Terminal/  # xterm.js + node-pty（ターミナル）
│   │   ├── FileExplorer/ # カスタムファイルツリー
│   │   └── Layout/    # タイトルバー、リサイズハンドル
│   ├── stores/        # Zustand グローバル状態
│   └── types/         # TypeScript 型定義
├── config/            # ポータブル設定（settings.json）
├── logs/              # アプリログ、会話履歴
└── docs/              # 要件定義書
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| electron | デスクトップアプリフレームワーク |
| @monaco-editor/react | コードエディタ |
| @xterm/xterm + node-pty | ターミナルエミュレータ |
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
