# Claude Orchestrator

AI開発部隊の指揮所（Command Center）として、PM Agent と Worker Agents を統合管理する Electron デスクトップアプリケーション。

![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Electron](https://img.shields.io/badge/Electron-28-47848F)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

## 概要

Claude Orchestrator は、複数の Claude Code エージェントを一元管理するためのデスクトップアプリケーションです。PM（プロジェクトマネージャー）エージェントと Worker エージェントを効率的に操作し、AI駆動の開発ワークフローを実現します。

### 主な機能

- **マルチターミナル管理**: PM/Worker/General の3種類のターミナルロールをタブUIで管理
- **Claude 自動起動**: PM/Worker ターミナル作成時に Claude を自動起動
- **コマンドパレット**: 44種類のコマンドをGUIから即座に実行（クリックのみ、Enter不要）
- **ブックマークマネージャー**: Chrome風のドラッグ&ドロップでコマンドを整理
- **緊急停止機能**: Ctrl+Shift+Q で全エージェントを即座に停止
- **会話履歴保存**: プロジェクト別にMarkdown形式で自動保存
- **Monaco Editor**: シンタックスハイライト付きコードエディタ
- **ファイルエクスプローラー**: カスタムファイルツリー

## スクリーンショット

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Orchestrator                    ─  □  ×            │
├─────────────────────────────────────────────────────────────┤
│ コマンド: [/cost][/compact][/clear][/help]  [全コマンド][⚙️]│
├──────────┬──────────────────────────┬───────────────────────┤
│ Explorer │      Monaco Editor       │   PM Terminal [×]    │
│          │                          │   Worker 1    [×]    │
│ ▼ src/   │  // Your code here       │   Worker 2    [×]    │
│   App.tsx│                          │   + Add Terminal     │
│   ...    │                          ├───────────────────────┤
│          │                          │ $ claude             │
│          │                          │ > Ready for tasks... │
└──────────┴──────────────────────────┴───────────────────────┘
```

## インストール

### 必要要件

- Node.js v18 以上
- npm
- Windows 10/11

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/lishida-zin/Claude-Orchestrator.git
cd Claude-Orchestrator

# 依存関係をインストール
npm install

# node-pty をリビルド（Electron用）
npm run rebuild

# 開発サーバーを起動
npm run dev
```

### ビルド

```bash
# Windows用ポータブルビルド
npm run build:win
```

## 使い方

### ターミナル管理

1. **PM Terminal**: プロジェクト管理用のメインエージェント
2. **Worker Terminal**: 実装タスクを担当するワーカーエージェント
3. **General Terminal**: 汎用ターミナル（Claude自動起動なし）

右サイドバーの「+ Add Terminal」から新しいターミナルを追加できます。

### コマンドパレット

画面上部のコマンドバーから各種コマンドを実行できます。

| カテゴリ | コマンド例 |
|---------|-----------|
| 基本 | /cost, /compact, /clear, /help |
| 開発スキル | /plan-architect, /implement, /debug, /refactor |
| 開発ツール | /review, /commit, /pr-create |
| ドキュメント | /pdf, /docx, /xlsx, /pptx |

「全コマンド」ドロップダウンから44種類すべてのコマンドにアクセスできます。

### ブックマーク管理

⚙️ ボタンからブックマークマネージャーを開き、よく使うコマンドを整理できます。

- ドラッグ&ドロップで並び替え
- フォルダを作成してグループ化
- ★マークでお気に入りに追加

### キーボードショートカット

| ショートカット | 機能 |
|--------------|------|
| Ctrl+Shift+Q | 緊急停止（全エージェント停止） |

## アーキテクチャ

```
Claude-Orchestrator/
├── electron/              # Electron メインプロセス
│   ├── main.ts           # IPC、PTY管理、ウィンドウ制御
│   └── preload.cjs       # セキュアなAPI公開
├── src/
│   ├── App.tsx           # メインReactコンポーネント
│   ├── components/
│   │   ├── CommandPalette/  # コマンドパレット
│   │   ├── Editor/          # Monaco Editor
│   │   ├── FileExplorer/    # ファイルツリー
│   │   ├── Terminal/        # ターミナル管理
│   │   └── Layout/          # タイトルバー
│   ├── stores/            # Zustand 状態管理
│   └── types/             # TypeScript 型定義
├── config/
│   ├── settings.json      # アプリ設定
│   └── commands.json      # コマンド定義
└── logs/                  # ログ、会話履歴
```

## 技術スタック

| 技術 | 用途 |
|-----|------|
| Electron | デスクトップアプリフレームワーク |
| React 18 | UIライブラリ |
| TypeScript | 型安全な開発 |
| Vite | ビルドツール |
| Monaco Editor | コードエディタ |
| xterm.js + node-pty | ターミナルエミュレータ |
| Zustand | 状態管理 |
| Tailwind CSS | スタイリング |
| electron-builder | パッケージング |

## 設定

### コマンドのカスタマイズ

`config/commands.json` を編集して、独自のコマンドを追加できます。

```json
{
  "commands": [
    {
      "id": "my-command",
      "label": "/my-command",
      "command": "/my-command",
      "icon": "🚀",
      "description": "カスタムコマンド",
      "category": "カスタム"
    }
  ],
  "categories": ["基本", "カスタム", ...]
}
```

## 開発状況

### Phase 1 ✅ 完了
- プロジェクト初期構成
- Monaco Editor 統合
- xterm.js + node-pty 統合
- カスタムファイルエクスプローラー
- 基本レイアウト（分割パネル）
- ダークモード基本UI
- 設定ファイル管理
- 基本ログ機能

### Phase 2 ✅ 完了
- ターミナル動的追加（タブUI）
- PM/Worker/General ロール区別
- 緊急停止ボタン（Ctrl+Shift+Q）
- Claude自動起動
- GUIコマンドパレット
- 会話履歴保存

### 今後の予定
- PM/Worker間のタスク連携
- エージェント間通信
- ダッシュボード/監視UI
- マルチプロジェクト対応

## ライセンス

MIT License

## 作者

[@lishida-zin](https://github.com/lishida-zin)
