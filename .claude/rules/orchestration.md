# Orchestration System

## XMLタグ仕様

PM → Worker:
```xml
<spawn_worker id="worker1" role="frontend" />
<dispatch target="worker1">指示内容</dispatch>
<wait target="worker1" />
```

Worker → PM:
```xml
<status>COMPLETED</status>
<status>ERROR: エラー内容</status>
```

## Rulebook探索順序

1. `CLAUDE.md`
2. `RULEBOOK.md`
3. `.claude/rules.md`
4. `PROJECT_RULES.md`

## ターミナルロール

| Role | Icon | Purpose |
|------|------|---------|
| pm | 👔 | プロジェクトマネージャー |
| worker | ⚙️ | 作業員 |
| general | 💻 | 汎用 |
