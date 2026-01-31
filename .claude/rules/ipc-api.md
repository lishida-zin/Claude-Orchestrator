# IPC API Reference

## Window
- `window:minimize`, `window:maximize`, `window:close`

## File System
- `fs:readDirectory`, `fs:readFile`, `fs:writeFile`
- `fs:selectDirectory`, `fs:getLastOpenedPath`

## PTY (Terminal)
- `pty:getShells` - 利用可能なシェル一覧
- `pty:create`, `pty:write`, `pty:resize`, `pty:kill`, `pty:killAll`
- `pty:sendCommand` - コマンド送信
- `pty:data:{id}`, `pty:exit:{id}` (events)

## Settings
- `settings:load`, `settings:save`

## Shortcuts
- `shortcuts:load`, `shortcuts:save`

## Conversation
- `conversation:save`, `conversation:load`, `conversation:list`
