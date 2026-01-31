# CLAUDE.md

**Claude Orchestrator** - PM Agent と Worker Agents を統合管理する Electron デスクトップアプリ。

## Environment

- Windows / PowerShell / backslash paths
- Node.js v18+, npm

## Commands

```bash
npm install      # 依存関係
npm run dev      # 開発サーバー
npm run typecheck # 型チェック
npm run build:win # ポータブルビルド
```

## Rules

詳細は `.claude/rules/` を参照:
- `architecture.md` - ディレクトリ構造、依存関係
- `ipc-api.md` - Electron IPC API
- `orchestration.md` - XMLタグ仕様、Rulebook
- `shortcuts.md` - キーボードショートカット

## Current Status

Phase 1-4 完了。詳細は `dev-records/` を参照。
