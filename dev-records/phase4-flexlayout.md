# Phase 4: Drag & Drop Layout System

## Implementation Date
2026-01-31

## Overview
flexlayout-reactを導入し、ドッキング可能なレイアウトシステムを実装。パネルの自由配置、メニューバー、キーボードショートカット、レイアウト永続化を実現。

## Components Created

### 1. layoutStore.ts
- FlexLayout Modelの状態管理
- パネル表示状態（panelVisibility）
- ショートカット設定
- デフォルトレイアウト定義

### 2. MenuBar.tsx
- ファイルメニュー（新規、保存）
- 表示メニュー（パネル表示切替、リセット）
- ターミナルメニュー（新規PM/Worker、緊急停止）
- ドロップダウンUI

### 3. useShortcuts.ts
- キーボードイベント監視
- ショートカット文字列パース（Ctrl+Shift+P形式）
- 設定ファイルからの読み込み・保存

### 4. flexlayout-cockpit.css
- ダークテーマ（cockpit風）
- タブ、スプリッター、ドラッグ&ドロップのスタイル
- カスタムスクロールバー

## Technical Decisions

### Why flexlayout-react?
- React公式対応、TypeScript完全サポート
- JSON永続化（Model.fromJson() / model.toJson()）
- ダークモードテーマ対応
- 週間36,000+ ダウンロード、アクティブメンテナンス

### Layout Persistence Strategy
- `settings.json`のlayoutフィールドに保存
- debounce付き自動保存（1秒遅延）
- 起動時に復元、失敗時はデフォルトレイアウト

### Shortcut System Design
- 設定ファイル（shortcuts.json）でカスタマイズ可能
- 入力フォーカス中は一部ショートカット無効化
- バッククォートの特別処理（Ctrl+`対応）

## Issues Encountered

### 1. FlexLayout TypeScript型エラー
- `IGlobalAttributes`に存在しないプロパティ（tabEnableFloat, tabSetTabStripHeight, borderBarSize）
- 解決: 不要なプロパティを削除

### 2. ResizeObserver対応
- FlexLayoutタブ切り替え時にターミナル/エディタがリサイズされない
- 解決: 親要素も監視するResizeObserverを追加

### 3. 型定義の分散
- preload.tsとelectron.d.tsの両方に型定義が必要
- 解決: 両方に同じ型を追加（今後の改善点）

## Files Modified

| File | Changes |
|------|---------|
| package.json | flexlayout-react追加 |
| src/App.tsx | FlexLayout統合、MenuBar追加 |
| src/components/Editor/Editor.tsx | ResizeObserver追加 |
| src/components/Terminal/TerminalManager.tsx | ResizeObserver強化 |
| electron/main.ts | shortcuts IPC追加 |
| electron/preload.ts | shortcuts API追加 |
| src/types/electron.d.ts | shortcuts型追加 |

## New Files

- `src/stores/layoutStore.ts`
- `src/components/Layout/MenuBar.tsx`
- `src/hooks/useShortcuts.ts`
- `src/styles/flexlayout-cockpit.css`
- `config/shortcuts.json`

## Future Improvements

1. **ショートカット設定UI**: GUIでショートカットを変更できる設定パネル
2. **レイアウトプリセット**: 複数のレイアウトを保存・切り替え
3. **パネルの最小化/最大化**: ダブルクリックで最大化など
4. **ドラッグプレビュー改善**: ドロップ先のハイライト強化
