# Phase 3: オーケストレーション - 開発記録

## 実装内容

### 完了項目

1. **OrchestrationStore** (`src/stores/orchestrationStore.ts`)
   - Worker管理（追加/削除/ステータス更新/検索）
   - ファイルロック管理（取得/解放/チェック）
   - Rulebook管理（パス/コンテンツ保持）
   - PMターミナルID管理
   - トースト通知キュー
   - Worker待機リスト

2. **OutputParser** (`src/utils/OutputParser.ts`)
   - XMLタグ解析（spawn_worker/dispatch/wait/status）
   - ファイルパス検出（Windows/Unix両対応）
   - ヘルパー関数（filterByType/hasCommand/containsCommands）

3. **Toast通知** (`src/components/Toast/Toast.tsx`)
   - 右下固定表示、複数同時表示対応
   - 4タイプ（success/error/info/warning）
   - アニメーション付き（スライドイン/フェードアウト）
   - プログレスバー、自動消去（デフォルト3秒）

4. **TerminalManager統合**
   - PM出力からXMLコマンド検出
   - spawn_worker → 新Workerターミナル自動生成
   - dispatch → 対象Workerにコマンド送信
   - wait → 待機リスト管理
   - status → PMフィードバック + トースト通知
   - ファイルコンフリクト検出 + 警告

5. **Rulebook Injection**
   - プロジェクト読み込み時に自動探索
   - 探索順: CLAUDE.md > RULEBOOK.md > .claude/rules.md > PROJECT_RULES.md
   - Worker起動時に自動送信

6. **コンフリクト防止**
   - エディタタブにロックアイコン表示
   - ロック解除ボタン（確認ダイアログ付き）
   - ターミナル終了時に自動ロック解除

### 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/stores/orchestrationStore.ts` | 新規作成 |
| `src/utils/OutputParser.ts` | 新規作成 |
| `src/components/Toast/Toast.tsx` | 新規作成 |
| `src/components/Toast/index.ts` | 新規作成 |
| `src/components/Terminal/TerminalManager.tsx` | オーケストレーション統合 |
| `src/components/Editor/Editor.tsx` | ロック警告UI追加 |
| `src/App.tsx` | Toast配置、Rulebook読み込み |

## XMLタグ仕様

```xml
<!-- PMが出力 -->
<spawn_worker id="worker1" role="frontend" />
<dispatch target="worker1">指示内容</dispatch>
<wait target="worker1" />

<!-- Workerが出力 -->
<status>COMPLETED</status>
<status>ERROR: エラー内容</status>
```

## 動作フロー

```
1. PM: <spawn_worker id="w1" role="frontend" />
   → システム: Workerターミナル自動生成、claude起動

2. PM: <dispatch target="w1">Button.tsxを修正</dispatch>
   → システム: Worker w1 に指示送信

3. PM: <wait target="w1" />
   → システム: 待機リストに追加

4. Worker w1: <status>COMPLETED</status>
   → システム: PMにフィードバック送信、トースト表示、待機解除
```

## 得られた知見

### Zustand複数ストア
- appStoreとorchestrationStoreを分離
- 関心の分離でメンテナンス性向上
- 相互参照はコンポーネント側で結合

### XMLパース戦略
- 正規表現で軽量に検出
- 出力バッファで分割チャンク対応
- containsCommands()で高速プリチェック

### トースト通知設計
- requestAnimationFrameでスムーズなアニメーション
- pointer-events-noneでクリック透過
- flex-col-reverseで新しいものを下に

## 発生した問題

1. **出力チャンク分割**
   - 症状: XMLタグが複数チャンクに分かれる
   - 解決: 500文字バッファで結合、タグ完結後に解析

2. **ロック残存**
   - 症状: ターミナル終了後もロックが残る
   - 解決: onExit時にreleaseAllLocks()呼び出し

## 今後の改善提案

- Worker タイムアウト機能（5分で自動終了）
- Rulebook プレビュー/編集UI
- ロック一覧パネル
- 音声通知オプション
- Phase 4: DX向上（マルチウィンドウ、Memory Rollover、コスト監視）
