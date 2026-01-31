/**
 * OutputParser.ts
 * PM/Worker Agent の出力から XML タグを検出・解析するユーティリティ
 */

// ============================================================================
// 型定義
// ============================================================================

export interface SpawnWorkerCommand {
  type: 'spawn_worker'
  id: string
  role: string
}

export interface DispatchCommand {
  type: 'dispatch'
  target: string
  command: string
}

export interface WaitCommand {
  type: 'wait'
  target: string
}

export interface StatusCommand {
  type: 'status'
  status: 'COMPLETED' | 'ERROR'
  message?: string // ERROR の場合のエラーメッセージ
}

export type ParsedCommand =
  | SpawnWorkerCommand
  | DispatchCommand
  | WaitCommand
  | StatusCommand

// ============================================================================
// 正規表現パターン
// ============================================================================

const PATTERNS = {
  // <spawn_worker id="worker-1" role="frontend" />
  spawnWorker: /<spawn_worker\s+id="([^"]+)"\s+role="([^"]+)"\s*\/>/gi,

  // <dispatch target="worker-1">コマンド内容</dispatch>
  dispatch: /<dispatch\s+target="([^"]+)">([\s\S]*?)<\/dispatch>/gi,

  // <wait target="worker-1" />
  wait: /<wait\s+target="([^"]+)"\s*\/>/gi,

  // <status>COMPLETED</status> または <status>ERROR: メッセージ</status>
  status: /<status>(COMPLETED|ERROR:?\s*(.*))<\/status>/gi,

  // Windows パス: C:\path\to\file.ts
  windowsPath: /[A-Z]:\\[^\s<>"]+\.(ts|tsx|js|jsx|json|md|css|html)/gi,

  // Unix パス: /path/to/file.ts または ./relative/path.ts
  unixPath: /(?:\/|\.\/)[^\s<>"]+\.(ts|tsx|js|jsx|json|md|css|html)/gi,
} as const

// ============================================================================
// 個別解析関数
// ============================================================================

/**
 * spawn_worker タグを解析
 */
function parseSpawnWorker(output: string): SpawnWorkerCommand[] {
  const results: SpawnWorkerCommand[] = []
  const regex = new RegExp(PATTERNS.spawnWorker.source, 'gi')
  let match: RegExpExecArray | null

  while ((match = regex.exec(output)) !== null) {
    results.push({
      type: 'spawn_worker',
      id: match[1],
      role: match[2],
    })
  }

  return results
}

/**
 * dispatch タグを解析
 */
function parseDispatch(output: string): DispatchCommand[] {
  const results: DispatchCommand[] = []
  const regex = new RegExp(PATTERNS.dispatch.source, 'gi')
  let match: RegExpExecArray | null

  while ((match = regex.exec(output)) !== null) {
    results.push({
      type: 'dispatch',
      target: match[1],
      command: match[2].trim(),
    })
  }

  return results
}

/**
 * wait タグを解析
 */
function parseWait(output: string): WaitCommand[] {
  const results: WaitCommand[] = []
  const regex = new RegExp(PATTERNS.wait.source, 'gi')
  let match: RegExpExecArray | null

  while ((match = regex.exec(output)) !== null) {
    results.push({
      type: 'wait',
      target: match[1],
    })
  }

  return results
}

/**
 * status タグを解析
 */
function parseStatus(output: string): StatusCommand[] {
  const results: StatusCommand[] = []
  const regex = new RegExp(PATTERNS.status.source, 'gi')
  let match: RegExpExecArray | null

  while ((match = regex.exec(output)) !== null) {
    const fullStatus = match[1]

    if (fullStatus === 'COMPLETED') {
      results.push({
        type: 'status',
        status: 'COMPLETED',
      })
    } else {
      // ERROR または ERROR: メッセージ
      const errorMessage = match[2]?.trim()
      results.push({
        type: 'status',
        status: 'ERROR',
        message: errorMessage || undefined,
      })
    }
  }

  return results
}

// ============================================================================
// メイン解析関数
// ============================================================================

/**
 * 出力文字列から全ての XML コマンドを解析
 * @param output - 解析対象の出力文字列
 * @returns 検出されたコマンドの配列（出現順）
 */
export function parseOutput(output: string): ParsedCommand[] {
  const commands: Array<{ command: ParsedCommand; index: number }> = []

  // 各コマンドタイプを解析し、出現位置と共に収集
  const spawnWorkers = parseSpawnWorker(output)
  const dispatches = parseDispatch(output)
  const waits = parseWait(output)
  const statuses = parseStatus(output)

  // spawn_worker の位置を取得
  const spawnWorkerRegex = new RegExp(PATTERNS.spawnWorker.source, 'gi')
  let match: RegExpExecArray | null
  let swIndex = 0
  while ((match = spawnWorkerRegex.exec(output)) !== null) {
    if (spawnWorkers[swIndex]) {
      commands.push({ command: spawnWorkers[swIndex], index: match.index })
      swIndex++
    }
  }

  // dispatch の位置を取得
  const dispatchRegex = new RegExp(PATTERNS.dispatch.source, 'gi')
  let dIndex = 0
  while ((match = dispatchRegex.exec(output)) !== null) {
    if (dispatches[dIndex]) {
      commands.push({ command: dispatches[dIndex], index: match.index })
      dIndex++
    }
  }

  // wait の位置を取得
  const waitRegex = new RegExp(PATTERNS.wait.source, 'gi')
  let wIndex = 0
  while ((match = waitRegex.exec(output)) !== null) {
    if (waits[wIndex]) {
      commands.push({ command: waits[wIndex], index: match.index })
      wIndex++
    }
  }

  // status の位置を取得
  const statusRegex = new RegExp(PATTERNS.status.source, 'gi')
  let sIndex = 0
  while ((match = statusRegex.exec(output)) !== null) {
    if (statuses[sIndex]) {
      commands.push({ command: statuses[sIndex], index: match.index })
      sIndex++
    }
  }

  // 出現順でソート
  commands.sort((a, b) => a.index - b.index)

  return commands.map((c) => c.command)
}

// ============================================================================
// ファイルパス検出
// ============================================================================

/**
 * 出力からファイルパスを検出（コンフリクト検出用）
 * @param output - 解析対象の出力文字列
 * @returns 検出されたファイルパスの配列（重複なし）
 */
export function detectFilePaths(output: string): string[] {
  const paths = new Set<string>()

  // Windows パスを検出
  const windowsRegex = new RegExp(PATTERNS.windowsPath.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = windowsRegex.exec(output)) !== null) {
    paths.add(match[0])
  }

  // Unix パスを検出
  const unixRegex = new RegExp(PATTERNS.unixPath.source, 'gi')
  while ((match = unixRegex.exec(output)) !== null) {
    paths.add(match[0])
  }

  return Array.from(paths)
}

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * 特定タイプのコマンドのみをフィルタリング
 */
export function filterCommandsByType<T extends ParsedCommand['type']>(
  commands: ParsedCommand[],
  type: T
): Extract<ParsedCommand, { type: T }>[] {
  return commands.filter((cmd) => cmd.type === type) as Extract<
    ParsedCommand,
    { type: T }
  >[]
}

/**
 * コマンドが存在するかチェック
 */
export function hasCommand(
  commands: ParsedCommand[],
  type: ParsedCommand['type']
): boolean {
  return commands.some((cmd) => cmd.type === type)
}

/**
 * 出力に XML コマンドが含まれているか簡易チェック
 */
export function containsCommands(output: string): boolean {
  return (
    /<spawn_worker\s/i.test(output) ||
    /<dispatch\s/i.test(output) ||
    /<wait\s/i.test(output) ||
    /<status>/i.test(output)
  )
}
