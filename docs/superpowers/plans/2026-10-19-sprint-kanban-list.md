# スプリント対応カンバン一覧画面 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スプリント（名前・期間）単位でカンバンボードを管理し、トップにスプリント一覧画面（CRUD＋進捗率）、`/sprints/[id]` にスプリント別カンバン画面を追加する。

**Architecture:** `Sprint` を親エンティティとし `Column.sprintId` でカラムを所有させる（Board エンティティは作らない）。スプリント作成トランザクションで固定 3 カラム（Todo/In Progress/Done）を自動生成。トップ `/` を RSC でスプリント一覧、詳細を `/sprints/[id]` に移動し、既存 `<Board>` をヘッダー付きで再利用。旧 `GET /api/board` は `GET /api/sprints/:id/board` に置換。

**Tech Stack:** pnpm ワークスペース / Hono 4.6 (RPC) / Next.js 15.1 (RSC + Server Actions) / Prisma 7.10 (SQLite, `db push`) / Zod 3.25 / Conform 1.2 / Vitest 3 / Playwright 1.63。既存依存の追加なし。

**Spec:** `docs/superpowers/specs/2026-10-19-sprint-kanban-list-design.md`（本計画はこの仕様を実装する。Task 10 で仕様の軽微な補正を含む）

## Global Constraints

- インラインスタイルのみ（`React.CSSProperties`）。CSS ファイル・Tailwind 非使用（BR-005）
- 認証・認可なし。全員が同一ユーザー扱い（BR-006）
- 新規依存パッケージの追加禁止
- カラムは固定 3 つ（Todo 📝 / In Progress 🚀 / Done ✅）。カラムの追加・削除・改名はスコープ外（BR-D02）
- API エラー形式: 400 = `{ success: false, error: <ZodError.flatten()> }`、404 = `{ success: false, error: 'Not Found' }`（現行踏襲）
- 日本語のエラーメッセージ・UI コピー
- TDD: 各タスクでまず失敗するテスト → 実装 → パス → コミット
- Conventional Commits（`feat:` / `test:` / `docs:` / `chore:` / `fix:`）
- 進捗率 = Done タスク数 ÷ 全タスク数 × 100、小数第 1 位に丸め（`Math.round(x * 1000) / 10`）、タスク 0 件は `0`
- 期間は `YYYY-MM-DD` 文字列。`startDate <= endDate` を API・フォーム両面で保証
- 既存データ移行なし: `apps/backend/local.db` を作り直す（gitignored）
- タスク操作系 Server Action への `revalidatePath` 追加はスコープ外（スプリント操作のみ対応）

## File Structure

```
apps/backend/
  prisma/schema.prisma          # Sprint 追加、Column.sprintId 追加（変更）
  src/index.ts                  # スプリント 5 エンドポイント追加、旧 /api/board 削除、seed 呼び出し削除（変更）
  src/db/schema.ts              # insertSprintSchema / updateSprintSchema 追加、insertColumnSchema 修正（変更）
  src/db/seed.ts                # 削除（カラム生成はスプリント作成時に移行）
  src/db/test-fixtures.ts       # 新規: テスト共通のスプリント+3カラム投入ヘルパー
  src/index.test.ts             # フィクスチャ利用＋スプリント API テスト追加（変更）
  src/server.test.ts            # ポーリング先/アサーション更新（変更）
  src/db/schema.test.ts         # スプリントスキーマテスト追加（変更）
apps/frontend/
  app/page.tsx                  # スプリント一覧 RSC に書き換え（変更）
  app/sprints/[id]/page.tsx     # 新規: スプリント別カンバン RSC
  app/not-found.tsx             # 新規: 共通 404 ページ
  app/actions.ts                # createSprintAction / updateSprintAction / deleteSprintAction 追加（変更）
  components/SprintList.tsx     # 新規: 一覧コンテナ（Server Component）
  components/SprintCreateForm.tsx # 新規: 作成フォーム（Conform）
  components/SprintCard.tsx     # 新規: スプリントカード（進捗バー・編集・削除）
  components/Board.tsx          # ヘッダーにスプリント名・期間・戻りリンク（変更）
  components/Board.test.tsx     # ヘッダープロパティのテスト追加（変更）
  components/SprintCard.test.tsx # 新規: RTL テスト
packages/shared/src/index.ts    # スプリントスキーマ再エクスポート（変更）
apps/e2e-tests/src/board.spec.ts # スプリントフローに全面書き換え（変更）
docs/                           # Task 10 で正本ドキュメントを同期
```

---

### Task 1: Sprint データモデル移行（スキーマ + Zod + テスト基盤）

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Modify: `apps/backend/src/db/schema.ts`
- Delete: `apps/backend/src/db/seed.ts`
- Create: `apps/backend/src/db/test-fixtures.ts`
- Modify: `apps/backend/src/index.ts:6-13`（seed import/call 削除）
- Modify: `apps/backend/src/db/schema.test.ts`
- Modify: `apps/backend/src/index.test.ts:1-9`
- Modify: `apps/backend/src/server.test.ts:43-68`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/index.test.ts`

**Interfaces:**
- Consumes: なし（最初のタスク）
- Produces:
  - Prisma: `model Sprint { id: string; name: string; startDate: string; endDate: string; columns: Column[] }`、`Column.sprintId: string`（FK, `onDelete: Cascade`）
  - `insertSprintSchema`: `{ id, name, startDate, endDate }`（`startDate <= endDate` を refine、日付は `YYYY-MM-DD` 正規表現）
  - `updateSprintSchema`: `insertSprintSchema` から `id` を除いたもの＋同 refine
  - `ensureTestSprint(sprintId: string): Promise<{ todoId, progressId, doneId }>`（`apps/backend/src/db/test-fixtures.ts`）— テストが後続タスクで参照する既知のカラム ID `col-<sprintId>-todo` / `-progress` / `-done` を保証

- [ ] **Step 1: 失敗するテストを書く（スキーマ）**

`apps/backend/src/db/schema.test.ts` に追記:

```ts
import { insertSprintSchema, updateSprintSchema, insertColumnSchema } from './schema'

describe('insertSprintSchema', () => {
  it('rejects empty name', () => {
    const result = insertSprintSchema.safeParse({
      id: 's1', name: '', startDate: '2026-10-01', endDate: '2026-10-14',
    })
    expect(result.success).toBe(false)
  })

  it('rejects malformed date', () => {
    const result = insertSprintSchema.safeParse({
      id: 's1', name: 'Sprint 1', startDate: '2026/10/01', endDate: '2026-10-14',
    })
    expect(result.success).toBe(false)
  })

  it('rejects startDate after endDate', () => {
    const result = insertSprintSchema.safeParse({
      id: 's1', name: 'Sprint 1', startDate: '2026-10-14', endDate: '2026-10-01',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid sprint', () => {
    const result = insertSprintSchema.safeParse({
      id: 's1', name: 'Sprint 1', startDate: '2026-10-01', endDate: '2026-10-14',
    })
    expect(result.success).toBe(true)
  })
})

describe('updateSprintSchema', () => {
  it('accepts payload without id', () => {
    const result = updateSprintSchema.safeParse({
      name: 'Sprint 1', startDate: '2026-10-01', endDate: '2026-10-14',
    })
    expect(result.success).toBe(true)
  })

  it('rejects startDate after endDate', () => {
    const result = updateSprintSchema.safeParse({
      name: 'Sprint 1', startDate: '2026-10-14', endDate: '2026-10-01',
    })
    expect(result.success).toBe(false)
  })
})
```

既存の `insertColumnSchema` テスト（37-45 行目）の payload に `sprintId: 's1'` を追加:

```ts
describe('insertColumnSchema', () => {
  it('rejects empty title', () => {
    const result = insertColumnSchema.safeParse({
      id: 'c1', title: '', position: 0, sprintId: 's1',
    })
    expect(result.success).toBe(false)
  })
})
```

`packages/shared/src/index.test.ts` に追記:

```ts
import { insertSprintSchema } from './index'

it('insertSprintSchema rejects inverted dates', () => {
  const result = insertSprintSchema.safeParse({
    id: 's1', name: 'Sprint', startDate: '2026-10-14', endDate: '2026-10-01',
  })
  expect(result.success).toBe(false)
})
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm --filter backend test -- src/db/schema.test.ts`
Expected: FAIL（`insertSprintSchema` is not exported / `sprintId` invalid）

- [ ] **Step 3: Prisma スキーマを変更**

`apps/backend/prisma/schema.prisma` — `Column` の前に追加し、`Column` を修正:

```prisma
model Sprint {
  id        String   @id
  /// @zod.min(1, 'タイトルは必須です')
  name      String
  startDate String
  endDate   String
  columns   Column[]

  @@map("sprints")
}

model Column {
  id       String @id
  /// @zod.min(1, 'タイトルは必須です')
  title    String
  position Int
  sprintId String @map("sprint_id")
  sprint   Sprint @relation(fields: [sprintId], references: [id], onDelete: Cascade)
  tasks    Task[]

  @@map("columns")
}
```

`Task` モデルは変更しない。

- [ ] **Step 4: ローカル DB を作り直してクライアントを再生成**

```bash
rm -f apps/backend/local.db
pnpm --filter backend db:push
pnpm --filter backend db:generate
```

Expected: エラーなく完了し `apps/backend/generated/zod/schemas/variants/pure/Sprint.pure.ts` が生成される

- [ ] **Step 5: Zod スキーマ実装**

`apps/backend/src/db/schema.ts` 全置き換え:

```ts
import { z } from 'zod'
import {
  TaskModelSchema,
  ColumnModelSchema,
  SprintModelSchema,
} from '../../generated/zod/schemas/variants/pure'

export const insertTaskSchema = TaskModelSchema.omit({ column: true }).extend({
  description: z.string().nullish(),
  position: z.coerce.number().int(),
})

export const insertColumnSchema = ColumnModelSchema.omit({ tasks: true, sprint: true })

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式で入力してください')

const sprintFields = SprintModelSchema.omit({ columns: true }).extend({
  startDate: isoDate,
  endDate: isoDate,
})

const dateRangeRule = (data: { startDate: string; endDate: string }) =>
  data.startDate <= data.endDate

export const insertSprintSchema = sprintFields.refine(dateRangeRule, {
  message: '開始日は終了日以降にしてください',
  path: ['endDate'],
})

export const updateSprintSchema = sprintFields.omit({ id: true }).refine(dateRangeRule, {
  message: '開始日は終了日以降にしてください',
  path: ['endDate'],
})

export type CreateTaskInput = z.infer<typeof insertTaskSchema>
export type CreateSprintInput = z.infer<typeof insertSprintSchema>
```

`packages/shared/src/index.ts` 全置き換え:

```ts
export {
  insertTaskSchema,
  insertColumnSchema,
  insertSprintSchema,
  updateSprintSchema,
} from '../../../apps/backend/src/db/schema'
export type { CreateTaskInput, CreateSprintInput } from '../../../apps/backend/src/db/schema'
```

- [ ] **Step 6: seed 削除と共通フィクスチャ追加**

`apps/backend/src/db/seed.ts` を削除。

`apps/backend/src/index.ts` から 7 行目 `import { seed } from './db/seed'` と 13 行目 `seed().catch(console.error)` を削除。

`apps/backend/package.json` から `"db:seed": "tsx src/db/seed.ts"` 行を削除。

`apps/backend/src/db/test-fixtures.ts` を新規作成:

```ts
import { db } from './index'

const initialColumns = [
  { suffix: 'todo', title: 'Todo 📝', position: 0 },
  { suffix: 'progress', title: 'In Progress 🚀', position: 1 },
  { suffix: 'done', title: 'Done ✅', position: 2 },
] as const

export function sprintColumnId(sprintId: string, suffix: string) {
  return `col-${sprintId}-${suffix}`
}

export async function ensureTestSprint(sprintId = 'test-sprint') {
  await db.sprint.upsert({
    where: { id: sprintId },
    create: {
      id: sprintId,
      name: 'テストスプリント',
      startDate: '2026-10-01',
      endDate: '2026-10-14',
    },
    update: {},
  })
  for (const col of initialColumns) {
    await db.column.upsert({
      where: { id: sprintColumnId(sprintId, col.suffix) },
      create: {
        id: sprintColumnId(sprintId, col.suffix),
        title: col.title,
        position: col.position,
        sprintId,
      },
      update: {},
    })
  }
  return {
    todoId: sprintColumnId(sprintId, 'todo'),
    progressId: sprintColumnId(sprintId, 'progress'),
    doneId: sprintColumnId(sprintId, 'done'),
  }
}
```

- [ ] **Step 7: 既存テストをフィクスチャに切り替え**

`apps/backend/src/index.test.ts` の冒頭（1-9 行目）を置換:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import app from './index'
import { db } from './db'
import { ensureTestSprint } from './db/test-fixtures'

let cols: { todoId: string; progressId: string; doneId: string }

beforeAll(async () => {
  await db.task.deleteMany({ where: { id: 'test-task-1' } })
  cols = await ensureTestSprint()
})
```

以降の既存テスト中の `'col-todo'` → `cols.todoId`、`'col-progress'` → `cols.progressId` に置換（`GET /api/board` の `columns.length >= 3` アサーションはタスク 8 まで維持。フィクスチャにより 3 カラム存在するのでパスする）。

`apps/backend/src/server.test.ts` — `beforeAll` の先頭（proc spawn の前）に db インポートとフィクスチャ投入を追加:

```ts
import { db } from './db'
import { ensureTestSprint } from './db/test-fixtures'
// ...既存の describe 内 beforeAll 冒頭に追加:
await ensureTestSprint()
```

`GET /api/board` の poll と `toHaveLength(3)` アサーションはタスク 8 まで維持（フィクスチャで 3 カラム保証）。

- [ ] **Step 8: テスト実行してパスを確認**

```bash
pnpm --filter backend test
pnpm --filter shared test
```

Expected: 全 PASS（旧テストはフィクスチャにより維持、新規スキーマテスト PASS）

- [ ] **Step 9: 型チェック**

```bash
pnpm --filter backend exec tsc --noEmit
pnpm --filter frontend exec tsc --noEmit
```

Expected: エラー 0 件

- [ ] **Step 10: コミット**

```bash
git add -A
git commit -m "feat: add Sprint data model with per-sprint columns"
```

---

### Task 2: スプリント作成・一覧 API（POST/GET /api/sprints）

**Files:**
- Modify: `apps/backend/src/index.ts`（routes チェーンに 2 エンドポイント追加）
- Modify: `apps/backend/src/index.test.ts`

**Interfaces:**
- Consumes: `insertSprintSchema`（Task 1）
- Produces:
  - `POST /api/sprints` body `{ id, name, startDate, endDate }` → `{ success: true, data: Sprint }`。作成時にカラム ID `col-<id>-todo|-progress|-done` をトランザクション生成（タイトルは Todo 📝 / In Progress 🚀 / Done ✅、position 0/1/2）
  - `GET /api/sprints` → `Array<{ id, name, startDate, endDate, taskCount, doneCount, progress }>`（`startDate` 降順、進捗はサーバー計算）

- [ ] **Step 1: 失敗するテストを書く**

`apps/backend/src/index.test.ts` に追記（既存の末尾に、`db` / `app` はインポート済み）:

```ts
async function cleanupSprints(ids: string[]) {
  const sprints = await db.sprint.findMany({
    where: { id: { in: ids } },
    include: { columns: true },
  })
  const columnIds = sprints.flatMap((s) => s.columns.map((c) => c.id))
  await db.task.deleteMany({ where: { columnId: { in: columnIds } } })
  await db.column.deleteMany({ where: { id: { in: columnIds } } })
  await db.sprint.deleteMany({ where: { id: { in: ids } } })
}

async function createSprint(body: unknown) {
  return app.request('/api/sprints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/sprints', () => {
  it('creates a sprint with 3 columns', async () => {
    await cleanupSprints(['sp-create-1'])
    const res = await createSprint({
      id: 'sp-create-1', name: 'Sprint A', startDate: '2026-10-01', endDate: '2026-10-14',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('Sprint A')

    const columns = await db.column.findMany({
      where: { sprintId: 'sp-create-1' },
      orderBy: { position: 'asc' },
    })
    expect(columns.map((c) => c.title)).toEqual(['Todo 📝', 'In Progress 🚀', 'Done ✅'])
    expect(columns.map((c) => c.id)).toEqual([
      'col-sp-create-1-todo', 'col-sp-create-1-progress', 'col-sp-create-1-done',
    ])
  })

  it('rejects inverted dates with 400', async () => {
    const res = await createSprint({
      id: 'sp-create-2', name: 'Bad', startDate: '2026-10-14', endDate: '2026-10-01',
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.success).toBe(false)
  })

  it('rejects empty name with 400', async () => {
    const res = await createSprint({
      id: 'sp-create-3', name: '', startDate: '2026-10-01', endDate: '2026-10-14',
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/sprints', () => {
  it('returns sprints ordered by startDate desc with progress aggregates', async () => {
    await cleanupSprints(['sp-list-a', 'sp-list-b', 'sp-list-prog'])
    await createSprint({ id: 'sp-list-a', name: 'A', startDate: '2026-01-01', endDate: '2026-01-14' })
    await createSprint({ id: 'sp-list-b', name: 'B', startDate: '2026-06-01', endDate: '2026-06-14' })
    await createSprint({ id: 'sp-list-prog', name: 'Prog', startDate: '2026-03-01', endDate: '2026-03-14' })
    await db.task.create({
      data: { id: 'sp-task-1', columnId: 'col-sp-list-prog-todo', title: 'Todo task', position: 0 },
    })
    await db.task.create({
      data: { id: 'sp-task-2', columnId: 'col-sp-list-prog-done', title: 'Done task', position: 0 },
    })

    const res = await app.request('/api/sprints')
    expect(res.status).toBe(200)
    const data: Array<{ id: string; taskCount: number; doneCount: number; progress: number }> =
      await res.json()

    const idxA = data.findIndex((s) => s.id === 'sp-list-a')
    const idxB = data.findIndex((s) => s.id === 'sp-list-b')
    expect(idxB).toBeLessThan(idxA)

    const prog = data.find((s) => s.id === 'sp-list-prog')
    expect(prog).toMatchObject({ taskCount: 2, doneCount: 1, progress: 50 })
  })

  it('returns progress 0 for a sprint with no tasks', async () => {
    await cleanupSprints(['sp-list-empty'])
    await createSprint({ id: 'sp-list-empty', name: 'Empty', startDate: '2026-02-01', endDate: '2026-02-14' })
    const res = await app.request('/api/sprints')
    const data: Array<{ id: string; taskCount: number; doneCount: number; progress: number }> =
      await res.json()
    const empty = data.find((s) => s.id === 'sp-list-empty')
    expect(empty).toMatchObject({ taskCount: 0, doneCount: 0, progress: 0 })
  })
})
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm --filter backend test -- src/index.test.ts`
Expected: 新規 describe が FAIL（404 — ルート未定義）

- [ ] **Step 3: エンドポイント実装**

`apps/backend/src/index.ts` — `const routes = app` のチェーン先頭（`.get('/api/board'` の前）に追加:

```ts
const sprintColumns = [
  { suffix: 'todo', title: 'Todo 📝', position: 0 },
  { suffix: 'progress', title: 'In Progress 🚀', position: 1 },
  { suffix: 'done', title: 'Done ✅', position: 2 },
] as const

// routes チェーン内:
  .post('/api/sprints', zValidator('json', insertSprintSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: result.error.flatten() }, 400)
    }
  }), async (c) => {
    const { id, name, startDate, endDate } = c.req.valid('json')
    const sprint = await db.$transaction(async (tx) => {
      const created = await tx.sprint.create({ data: { id, name, startDate, endDate } })
      for (const col of sprintColumns) {
        await tx.column.create({
          data: {
            id: `col-${id}-${col.suffix}`,
            title: col.title,
            position: col.position,
            sprintId: created.id,
          },
        })
      }
      return created
    })
    return c.json({ success: true, data: sprint })
  })
  .get('/api/sprints', async (c) => {
    const sprints = await db.sprint.findMany({
      orderBy: { startDate: 'desc' },
      include: { columns: { include: { tasks: true } } },
    })
    const result = sprints.map((sprint) => {
      const tasks = sprint.columns.flatMap((col) => col.tasks)
      const doneColumn = sprint.columns.find((col) => col.position === 2)
      const doneCount = doneColumn
        ? tasks.filter((t) => t.columnId === doneColumn.id).length
        : 0
      const taskCount = tasks.length
      const progress = taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 1000) / 10
      const { columns: _columns, ...rest } = sprint
      return { ...rest, taskCount, doneCount, progress }
    })
    return c.json(result)
  })
```

`insertSprintSchema` を `import { insertTaskSchema } from './db/schema'` のインポートに追加。

- [ ] **Step 4: テスト実行してパスを確認**

Run: `pnpm --filter backend test`
Expected: 全 PASS

- [ ] **Step 5: コミット**

```bash
git add apps/backend
git commit -m "feat: add sprint create and list APIs with progress aggregates"
```

---

### Task 3: スプリント更新・削除 API（PATCH/DELETE /api/sprints/:id）

**Files:**
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/src/index.test.ts`

**Interfaces:**
- Consumes: `updateSprintSchema`（Task 1）
- Produces:
  - `PATCH /api/sprints/:id` body `{ name, startDate, endDate }` → `{ success: true, data: Sprint }` / 404 / 400
  - `DELETE /api/sprints/:id` → `{ success: true, id }` / 404。配下カラム・タスクをトランザクションで明示削除（SQLite の FK pragma に依存しない決定的実装）

- [ ] **Step 1: 失敗するテストを書く**

`apps/backend/src/index.test.ts` に追記:

```ts
describe('PATCH /api/sprints/:id', () => {
  it('updates name and period', async () => {
    await cleanupSprints(['sp-patch-1'])
    await createSprint({ id: 'sp-patch-1', name: 'Before', startDate: '2026-10-01', endDate: '2026-10-14' })
    const res = await app.request('/api/sprints/sp-patch-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'After', startDate: '2026-11-01', endDate: '2026-11-14' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.name).toBe('After')
    expect(data.data.startDate).toBe('2026-11-01')
  })

  it('returns 404 for a nonexistent sprint', async () => {
    const res = await app.request('/api/sprints/does-not-exist-patch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', startDate: '2026-10-01', endDate: '2026-10-14' }),
    })
    expect(res.status).toBe(404)
  })

  it('rejects inverted dates with 400', async () => {
    await cleanupSprints(['sp-patch-2'])
    await createSprint({ id: 'sp-patch-2', name: 'Tmp', startDate: '2026-10-01', endDate: '2026-10-14' })
    const res = await app.request('/api/sprints/sp-patch-2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', startDate: '2026-10-14', endDate: '2026-10-01' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/sprints/:id', () => {
  it('deletes sprint with cascading columns and tasks', async () => {
    await cleanupSprints(['sp-del-1'])
    await createSprint({ id: 'sp-del-1', name: 'Doomed', startDate: '2026-10-01', endDate: '2026-10-14' })
    await db.task.create({
      data: { id: 'sp-del-task-1', columnId: 'col-sp-del-1-todo', title: 'Gone', position: 0 },
    })

    const res = await app.request('/api/sprints/sp-del-1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ success: true, id: 'sp-del-1' })

    expect(await db.sprint.findUnique({ where: { id: 'sp-del-1' } })).toBeNull()
    expect(await db.task.findUnique({ where: { id: 'sp-del-task-1' } })).toBeNull()
    const orphans = await db.column.findMany({ where: { sprintId: 'sp-del-1' } })
    expect(orphans).toHaveLength(0)
  })

  it('returns 404 for a nonexistent sprint', async () => {
    const res = await app.request('/api/sprints/does-not-exist-del', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm --filter backend test -- src/index.test.ts`
Expected: 新規 describe が FAIL（405/404 — ルート未定義）

- [ ] **Step 3: エンドポイント実装**

`apps/backend/src/index.ts` の routes チェーン（`GET /api/sprints` の直後）に追加:

```ts
  .patch('/api/sprints/:id', zValidator('json', updateSprintSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: result.error.flatten() }, 400)
    }
  }), async (c) => {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const result = await db.sprint.updateMany({ where: { id }, data })
    if (result.count === 0) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    const updated = await db.sprint.findUniqueOrThrow({ where: { id } })
    return c.json({ success: true, data: updated })
  })
  .delete('/api/sprints/:id', async (c) => {
    const id = c.req.param('id')
    const sprint = await db.sprint.findUnique({
      where: { id },
      include: { columns: true },
    })
    if (!sprint) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    const columnIds = sprint.columns.map((col) => col.id)
    await db.$transaction([
      db.task.deleteMany({ where: { columnId: { in: columnIds } } }),
      db.column.deleteMany({ where: { sprintId: id } }),
      db.sprint.delete({ where: { id } }),
    ])
    return c.json({ success: true, id })
  })
```

`updateSprintSchema` をインポートに追加。

- [ ] **Step 4: テスト実行してパスを確認**

Run: `pnpm --filter backend test`
Expected: 全 PASS

- [ ] **Step 5: コミット**

```bash
git add apps/backend
git commit -m "feat: add sprint update and delete APIs with cascade"
```

---

### Task 4: スプリント別ボード API（GET /api/sprints/:id/board）

**Files:**
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/src/index.test.ts`

**Interfaces:**
- Consumes: Task 2 の作成 API（テストデータ準備）
- Produces:
  - `GET /api/sprints/:id/board` → `{ sprint: Sprint, columns: Column[], tasks: Task[] }`（`sprint` は詳細ページのヘッダー表示用。仕様のレスポンスに追加補正 — Task 10 で spec/api.md に反映）/ 404
  - 旧 `GET /api/board` は**このタスクでは削除しない**（フロント移行後に Task 8 で削除）

- [ ] **Step 1: 失敗するテストを書く**

`apps/backend/src/index.test.ts` に追記:

```ts
describe('GET /api/sprints/:id/board', () => {
  it('returns sprint, its columns, and only its tasks', async () => {
    await cleanupSprints(['sp-board-1', 'sp-board-2'])
    await createSprint({ id: 'sp-board-1', name: 'Board 1', startDate: '2026-10-01', endDate: '2026-10-14' })
    await createSprint({ id: 'sp-board-2', name: 'Board 2', startDate: '2026-10-15', endDate: '2026-10-28' })
    await db.task.create({
      data: { id: 'sp-board-task-1', columnId: 'col-sp-board-1-todo', title: 'Mine', position: 0 },
    })
    await db.task.create({
      data: { id: 'sp-board-task-2', columnId: 'col-sp-board-2-todo', title: 'Others', position: 0 },
    })

    const res = await app.request('/api/sprints/sp-board-1/board')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sprint.id).toBe('sp-board-1')
    expect(data.columns).toHaveLength(3)
    expect(data.columns.map((col: { title: string }) => col.title)).toEqual([
      'Todo 📝', 'In Progress 🚀', 'Done ✅',
    ])
    expect(data.tasks.map((t: { id: string }) => t.id)).toEqual(['sp-board-task-1'])
  })

  it('returns 404 for a nonexistent sprint', async () => {
    const res = await app.request('/api/sprints/does-not-exist-board/board')
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Not Found')
  })
})
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm --filter backend test -- src/index.test.ts`
Expected: 新規 describe が FAIL

- [ ] **Step 3: エンドポイント実装**

`apps/backend/src/index.ts` の routes チェーン（`DELETE /api/sprints/:id` の直後、タスクエンドポイントの前）に追加:

```ts
  .get('/api/sprints/:id/board', async (c) => {
    const id = c.req.param('id')
    const sprint = await db.sprint.findUnique({ where: { id } })
    if (!sprint) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    const columns = await db.column.findMany({
      where: { sprintId: id },
      orderBy: { position: 'asc' },
    })
    const tasks = await db.task.findMany({
      where: { columnId: { in: columns.map((col) => col.id) } },
      orderBy: { position: 'asc' },
    })
    return c.json({ sprint, columns, tasks })
  })
```

- [ ] **Step 4: テスト実行してパスを確認**

Run: `pnpm --filter backend test`
Expected: 全 PASS

- [ ] **Step 5: コミット**

```bash
git add apps/backend
git commit -m "feat: add sprint-scoped board API"
```

---

### Task 5: スプリント Server Actions

**Files:**
- Modify: `apps/frontend/app/actions.ts`

**Interfaces:**
- Consumes: `insertSprintSchema` / `updateSprintSchema`（`@my-app/shared`）、`client.api.sprints`（Task 2/3 の AppType）
- Produces（命名は `docs/conventions.md` §2.2.2 の `{verb}{Noun}Action`）:
  - `createSprintAction(formData: FormData)` — `parseWithZod(insertSprintSchema)` → `POST /api/sprints` → `revalidatePath('/')` → `submission.reply({ resetForm: true })`
  - `updateSprintAction(formData: FormData)` — `parseWithZod(updateSprintSchema)`、`id` は formData から個別取得 → `PATCH /api/sprints/:id` → `revalidatePath('/')` と `revalidatePath(\`/sprints/${id}\`)`
  - `deleteSprintAction(formData: FormData)` — `id` 取得 → `DELETE /api/sprints/:id` → `revalidatePath('/')` → `{ success: true }`

- [ ] **Step 1: Server Actions 実装**

`apps/frontend/app/actions.ts` — 冒頭の import に追加し、末尾に関数を追加:

```ts
import { revalidatePath } from 'next/cache'
import { insertTaskSchema, insertSprintSchema, updateSprintSchema } from '@my-app/shared'
```

```ts
export async function createSprintAction(formData: FormData) {
  const submission = parseWithZod(formData, { schema: insertSprintSchema })
  if (submission.status !== 'success') {
    return submission.reply()
  }
  await client.api.sprints.$post({ json: submission.value })
  revalidatePath('/')
  return submission.reply({ resetForm: true })
}

export async function updateSprintAction(formData: FormData) {
  const id = formData.get('id') as string
  const submission = parseWithZod(formData, { schema: updateSprintSchema })
  if (submission.status !== 'success') {
    return submission.reply()
  }
  if (!id) {
    return submission.reply({ formErrors: ['ID がありません'] })
  }
  await client.api.sprints[':id'].$patch({ param: { id }, json: submission.value })
  revalidatePath('/')
  revalidatePath(`/sprints/${id}`)
  return submission.reply({ resetForm: true })
}

export async function deleteSprintAction(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return { success: false, error: 'Missing id' }
  await client.api.sprints[':id'].$delete({ param: { id } })
  revalidatePath('/')
  return { success: true }
}
```

- [ ] **Step 2: 型チェック**

Run: `pnpm --filter frontend exec tsc --noEmit`
Expected: エラー 0 件（`client.api.sprints` の型が AppType から推論される）

- [ ] **Step 3: 既存フロントテスト実行（回帰確認）**

Run: `pnpm --filter frontend test`
Expected: 全 PASS（変更による既存テストへの影響なし）

- [ ] **Step 4: コミット**

```bash
git add apps/frontend/app/actions.ts
git commit -m "feat: add sprint server actions with revalidatePath"
```

---

### Task 6: スプリント一覧画面（トップ `/`）

**Files:**
- Create: `apps/frontend/components/SprintList.tsx`
- Create: `apps/frontend/components/SprintCreateForm.tsx`
- Create: `apps/frontend/components/SprintCard.tsx`
- Create: `apps/frontend/components/SprintCard.test.tsx`
- Modify: `apps/frontend/app/page.tsx`

**Interfaces:**
- Consumes: `createSprintAction` / `updateSprintAction` / `deleteSprintAction`（Task 5）、`insertSprintSchema`（`@my-app/shared`）
- Produces:
  - `SprintList({ initialSprints }: { initialSprints: SprintListItem[] })` — Server Component。空配列時は「スプリントがありません。最初のスプリントを作成しましょう。」を表示
  - `SprintListItem = { id, name, startDate, endDate, taskCount, doneCount, progress }`
  - `SprintCreateForm()` — Conform フォーム（hidden `id` = `crypto.randomUUID()`、`name` text、`startDate`/`endDate` type=date、送信ボタン「作成」）
  - `SprintCard({ sprint }: { sprint: SprintListItem })` — カード。スプリント名は `<Link href={\`/sprints/${sprint.id}\`}>`、期間 `startDate 〜 endDate`、進捗バー（`role="progressbar"` + `aria-valuenow`）、テキスト `{progress}% ({doneCount}/{taskCount})`、✎ 編集トグル（インラインフォーム）、🗑 削除（`window.confirm`）
  - デザイン注記: 仕様モックの「カード全体をリンク」は `<a>` 内 `<button>` の不正ネストになるため、**スプリント名部分をリンク**とする（カード残りは非リンク領域）。「カード全体がリンク」→「カード内スプリント名がリンク」への軽微な補正は Task 10 で仕様に反映
  - `/` ページ: `client.api.sprints.$get()` → `<SprintList initialSprints={sprints} />`

- [ ] **Step 1: 失敗するテストを書く**

`apps/frontend/components/SprintCard.test.tsx` を新規作成（`Board.test.tsx` の mock パターン踏襲）:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  createSprintResult: { success: true } as unknown,
  updateSprintResult: { success: true } as unknown,
  deleteSprintResult: { success: true } as unknown,
  createSprintSpy: vi.fn(),
  updateSprintSpy: vi.fn(),
  deleteSprintSpy: vi.fn(),
}))

vi.mock('../app/actions', () => ({
  createSprintAction: vi.fn(async (formData: FormData) => {
    mocks.createSprintSpy(formData)
    return mocks.createSprintResult
  }),
  updateSprintAction: vi.fn(async (formData: FormData) => {
    mocks.updateSprintSpy(formData)
    return mocks.updateSprintResult
  }),
  deleteSprintAction: vi.fn(async (formData: FormData) => {
    mocks.deleteSprintSpy(formData)
    return mocks.deleteSprintResult
  }),
}))

import SprintCard from './SprintCard'

const sprint = {
  id: 'sp-1',
  name: 'スプリント1',
  startDate: '2026-10-01',
  endDate: '2026-10-14',
  taskCount: 8,
  doneCount: 3,
  progress: 37.5,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createSprintResult = { success: true }
  mocks.updateSprintResult = { success: true }
  mocks.deleteSprintResult = { success: true }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SprintCard', () => {
  it('renders name, period, and progress', () => {
    render(<SprintCard sprint={sprint} />)
    expect(screen.getByText('スプリント1')).toBeInTheDocument()
    expect(screen.getByText('2026-10-01 〜 2026-10-14')).toBeInTheDocument()
    expect(screen.getByText('37.5% (3/8)')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '37.5')
  })

  it('links the sprint name to the board page', () => {
    render(<SprintCard sprint={sprint} />)
    const link = screen.getByRole('link', { name: 'スプリント1' })
    expect(link).toHaveAttribute('href', '/sprints/sp-1')
  })

  it('submits an edit via updateSprintAction', async () => {
    const user = userEvent.setup()
    render(<SprintCard sprint={sprint} />)

    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.clear(screen.getByDisplayValue('スプリント1'))
    await user.type(screen.getByDisplayValue(''), 'スプリント1改')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mocks.updateSprintSpy).toHaveBeenCalled())
    const calledWith = mocks.updateSprintSpy.mock.calls[0][0]
    expect(calledWith.get('id')).toBe('sp-1')
    expect(calledWith.get('name')).toBe('スプリント1改')
  })

  it('deletes after confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<SprintCard sprint={sprint} />)

    await user.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => expect(mocks.deleteSprintSpy).toHaveBeenCalled())
    expect(mocks.deleteSprintSpy.mock.calls[0][0].get('id')).toBe('sp-1')
  })

  it('does not delete when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<SprintCard sprint={sprint} />)

    await user.click(screen.getByRole('button', { name: '削除' }))
    expect(mocks.deleteSprintSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm --filter frontend test -- components/SprintCard.test.tsx`
Expected: FAIL（`SprintCard` モジュールなし）

- [ ] **Step 3: SprintCard 実装**

`apps/frontend/components/SprintCard.tsx` を新規作成:

```tsx
'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { updateSprintAction, deleteSprintAction } from '../app/actions'

interface Sprint {
  id: string
  name: string
  startDate: string
  endDate: string
  taskCount: number
  doneCount: number
  progress: number
}

interface SprintCardProps {
  sprint: Sprint
}

export default function SprintCard({ sprint }: SprintCardProps) {
  const [editing, setEditing] = useState(false)

  const [updateState, updateAction, isUpdating] = useActionState(
    async (_: unknown, formData: FormData) => {
      return await updateSprintAction(formData)
    },
    undefined
  )

  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (_: unknown, formData: FormData) => {
      return await deleteSprintAction(formData)
    },
    undefined
  )

  if (editing) {
    return (
      <form action={updateAction} style={styles.card}>
        <input type="hidden" name="id" value={sprint.id} />
        <input
          type="text"
          name="name"
          defaultValue={sprint.name}
          style={styles.editInput}
          aria-label="名前"
          required
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <label style={styles.dateLabel}>
            開始日
            <input
              type="date"
              name="startDate"
              defaultValue={sprint.startDate}
              style={styles.editInput}
              required
            />
          </label>
          <label style={styles.dateLabel}>
            終了日
            <input
              type="date"
              name="endDate"
              defaultValue={sprint.endDate}
              style={styles.editInput}
              required
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button type="submit" style={styles.saveBtn} disabled={isUpdating}>
            {isUpdating ? '保存中...' : '保存'}
          </button>
          <button type="button" onClick={() => setEditing(false)} style={styles.cancelBtn}>
            閉じる
          </button>
        </div>
      </form>
    )
  }

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link href={`/sprints/${sprint.id}`} style={styles.nameLink}>
            {sprint.name}
          </Link>
          <div style={styles.period}>
            {sprint.startDate} 〜 {sprint.endDate}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button type="button" onClick={() => setEditing(true)} style={styles.editBtn} aria-label="編集">
            ✎
          </button>
          <form
            action={deleteAction}
            style={{ display: 'inline' }}
            onSubmit={(e) => {
              if (!window.confirm('このスプリントを削除しますか？配下のタスクもすべて削除されます。')) {
                e.preventDefault()
              }
            }}
          >
            <input type="hidden" name="id" value={sprint.id} />
            <button type="submit" style={styles.deleteBtn} disabled={isDeleting} aria-label="削除">
              {isDeleting ? '削除中...' : '🗑'}
            </button>
          </form>
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={sprint.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${sprint.name} の進捗`}
        style={styles.progressTrack}
      >
        <div style={{ ...styles.progressFill, width: `${sprint.progress}%` }} />
      </div>
      <div style={styles.progressText}>
        {sprint.progress}% ({sprint.doneCount}/{sprint.taskCount})
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  nameLink: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1e293b',
    textDecoration: 'none',
  },
  period: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  editBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  progressTrack: {
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '9999px',
    marginTop: '12px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: '9999px',
  },
  progressText: { fontSize: '12px', color: '#475569', marginTop: '6px' },
  editForm: { display: 'flex', flexDirection: 'column', gap: '6px' },
  editInput: {
    padding: '6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
  },
  dateLabel: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' },
  saveBtn: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '6px 12px',
    backgroundColor: '#94a3b8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
```

- [ ] **Step 4: テスト実行してパスを確認**

Run: `pnpm --filter frontend test -- components/SprintCard.test.tsx`
Expected: 全 PASS

- [ ] **Step 5: SprintCreateForm 実装**

`apps/frontend/components/SprintCreateForm.tsx` を新規作成（`CreateForm.tsx` の Conform パターン踏襲）:

```tsx
'use client'

import { useActionState } from 'react'
import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { insertSprintSchema } from '@my-app/shared'
import { createSprintAction } from '../app/actions'

export default function SprintCreateForm() {
  const [formState, formAction, isPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      return await createSprintAction(formData)
    },
    undefined
  )

  const [form, fields] = useForm({
    lastResult: formState,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: insertSprintSchema })
    },
    shouldValidate: 'onBlur',
  })

  return (
    <form action={formAction} {...getFormProps(form)} style={styles.form}>
      <input {...getInputProps(fields.id, { type: 'hidden' })} value={crypto.randomUUID()} readOnly />
      <input
        {...getInputProps(fields.name, { type: 'text' })}
        placeholder="例: スプリント1"
        style={styles.input}
        disabled={isPending}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <label style={styles.dateLabel}>
          開始日
          <input {...getInputProps(fields.startDate, { type: 'date' })} style={styles.input} disabled={isPending} />
        </label>
        <label style={styles.dateLabel}>
          終了日
          <input {...getInputProps(fields.endDate, { type: 'date' })} style={styles.input} disabled={isPending} />
        </label>
      </div>
      {(fields.name.errors || fields.startDate.errors || fields.endDate.errors) && (
        <div style={{ color: '#dc2626', fontSize: '12px' }}>
          {fields.name.errors ?? fields.startDate.errors ?? fields.endDate.errors}
        </div>
      )}
      <button type="submit" style={styles.button} disabled={isPending}>
        {isPending ? '作成中...' : '作成'}
      </button>
    </form>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
  },
  dateLabel: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' },
  button: {
    padding: '8px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
```

- [ ] **Step 6: SprintList 実装**

`apps/frontend/components/SprintList.tsx` を新規作成（Server Component — `'use client'` なし）:

```tsx
import SprintCreateForm from './SprintCreateForm'
import SprintCard from './SprintCard'

export interface SprintListItem {
  id: string
  name: string
  startDate: string
  endDate: string
  taskCount: number
  doneCount: number
  progress: number
}

interface SprintListProps {
  initialSprints: SprintListItem[]
}

export default function SprintList({ initialSprints }: SprintListProps) {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>スプリント一覧</h1>
        <p style={styles.subtitle}>スプリント毎にカンバンを管理します</p>
      </header>

      <SprintCreateForm />

      {initialSprints.length === 0 ? (
        <div style={styles.empty}>スプリントがありません。最初のスプリントを作成しましょう。</div>
      ) : (
        <div style={styles.list}>
          {initialSprints.map((sprint) => (
            <SprintCard key={sprint.id} sprint={sprint} />
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    maxWidth: '720px',
    margin: '0 auto',
  },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', marginTop: '6px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  empty: {
    backgroundColor: '#ffffff',
    padding: '32px',
    borderRadius: '8px',
    border: '1px dashed #cbd5e1',
    color: '#64748b',
    textAlign: 'center',
  },
}
```

- [ ] **Step 7: page.tsx を一覧に書き換え**

`apps/frontend/app/page.tsx` 全置き換え:

```tsx
import { client } from './client'
import SprintList from '@/components/SprintList'

export default async function SprintListPage() {
  const res = await client.api.sprints.$get()
  if (!res.ok) {
    throw new Error('データ取得失敗')
  }
  const sprints = await res.json()

  return <SprintList initialSprints={sprints} />
}
```

- [ ] **Step 8: フロントテスト全実行**

```bash
pnpm --filter frontend test
pnpm --filter frontend exec tsc --noEmit
```

Expected: 全 PASS・型エラー 0 件（既存 `Board.test.tsx` はコンポーネント単体なので引き続き PASS）

- [ ] **Step 9: コミット**

```bash
git add apps/frontend
git commit -m "feat: add sprint list screen as home page"
```

---

### Task 7: スプリント別カンバン画面（`/sprints/[id]`）

**Files:**
- Create: `apps/frontend/app/sprints/[id]/page.tsx`
- Create: `apps/frontend/app/not-found.tsx`
- Modify: `apps/frontend/components/Board.tsx`
- Modify: `apps/frontend/components/Board.test.tsx`

**Interfaces:**
- Consumes: `GET /api/sprints/:id/board` → `{ sprint, columns, tasks }`（Task 4）
- Produces:
  - `SprintBoardPage`（`app/sprints/[id]/page.tsx`）: Next 15 では `params` は Promise — `const { id } = await params`。404 時は `notFound()`
  - `Board` にオプション props `sprintName?: string` / `sprintPeriod?: string` 追加。指定時: ヘッダーに「← 一覧へ戻る」リンク（`next/link`、href `/`）、`h1` = `sprintName`、サブテキスト = `sprintPeriod`。未指定時は従来のタイトル/サブタイトル（後方互換）
  - `app/not-found.tsx`: 「ページが見つかりません」＋トップへのリンク

- [ ] **Step 1: 失敗するテストを書く（Board ヘッダー）**

`apps/frontend/components/Board.test.tsx` に `describe` を追記:

```tsx
describe('Board sprint header', () => {
  it('renders sprint name, period, and back link when sprint props are given', () => {
    render(
      <Board
        {...mockLoaderData}
        sprintName="スプリント1"
        sprintPeriod="2026-10-01 〜 2026-10-14"
      />
    )
    expect(screen.getByRole('link', { name: '← 一覧へ戻る' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('heading', { name: 'スプリント1' })).toBeInTheDocument()
    expect(screen.getByText('2026-10-01 〜 2026-10-14')).toBeInTheDocument()
  })

  it('renders default header when sprint props are omitted', () => {
    render(<Board {...mockLoaderData} />)
    expect(screen.getByRole('heading', { name: '🚀 超高速フルスタック・タスクボード' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '← 一覧へ戻る' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テスト実行して失敗を確認**

Run: `pnpm --filter frontend test -- components/Board.test.tsx`
Expected: 新規テスト FAIL（props 未対応）

- [ ] **Step 3: Board ヘッダー実装**

`apps/frontend/components/Board.tsx` を修正 — import に `Link` を追加し、props とヘッダーを差し替え:

```tsx
import Link from 'next/link'

interface BoardProps {
  initialColumns: { id: string; title: string; position: number }[]
  initialTasks: Task[]
  sprintName?: string
  sprintPeriod?: string
}

export default function Board({ initialColumns, initialTasks, sprintName, sprintPeriod }: BoardProps) {
  // ...既存 state/handleTaskMove は変更なし

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        {sprintName && (
          <Link href="/" style={styles.backLink}>
            ← 一覧へ戻る
          </Link>
        )}
        <h1 style={styles.title}>
          {sprintName ?? '🚀 超高速フルスタック・タスクボード'}
        </h1>
        <p style={styles.subtitle}>
          {sprintPeriod ?? 'End-to-End 型安全なフルスタック・カンバンアプリ'}
        </p>
      </header>

      <div style={styles.board}>
        {/* 既存のまま */}
      </div>
    </div>
  )
}
```

`styles` に追加:

```ts
backLink: {
  display: 'inline-block',
  fontSize: '14px',
  color: '#2563eb',
  textDecoration: 'none',
  marginBottom: '8px',
},
```

- [ ] **Step 4: テスト実行してパスを確認**

Run: `pnpm --filter frontend test -- components/Board.test.tsx`
Expected: 全 PASS

- [ ] **Step 5: 詳細ページと not-found 実装**

`apps/frontend/app/not-found.tsx` を新規作成:

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>ページが見つかりません</h1>
      <Link href="/" style={styles.link}>
        ← スプリント一覧へ戻る
      </Link>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    textAlign: 'center',
    paddingTop: '80px',
  },
  title: { fontSize: '24px', fontWeight: 700, color: '#0f172a' },
  link: { color: '#2563eb', fontSize: '14px' },
}
```

`apps/frontend/app/sprints/[id]/page.tsx` を新規作成:

```tsx
import { notFound } from 'next/navigation'
import { client } from '../../client'
import Board from '@/components/Board'

export default async function SprintBoardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const res = await client.api.sprints[':id'].board.$get({ param: { id } })
  if (res.status === 404) {
    notFound()
  }
  if (!res.ok) {
    throw new Error('データ取得失敗')
  }
  const { sprint, columns, tasks } = await res.json()

  return (
    <Board
      initialColumns={columns}
      initialTasks={tasks}
      sprintName={sprint.name}
      sprintPeriod={`${sprint.startDate} 〜 ${sprint.endDate}`}
    />
  )
}
```

- [ ] **Step 6: テスト・型チェック・手動確認**

```bash
pnpm --filter frontend test
pnpm --filter frontend exec tsc --noEmit
```

Expected: 全 PASS・型エラー 0 件

手動確認: `pnpm dev` 起動 → `/` でスプリント作成 → カード名クリックで `/sprints/<id>` に遷移し 3 カラム表示 → 「← 一覧へ戻る」で `/` へ戻る → 存在しない `/sprints/xxx` で 404 表示。

- [ ] **Step 7: コミット**

```bash
git add apps/frontend
git commit -m "feat: add sprint board detail page with not-found"
```

---

### Task 8: 旧 `GET /api/board` 削除とテスト整備

**Files:**
- Modify: `apps/backend/src/index.ts`（`.get('/api/board', ...)` 削除）
- Modify: `apps/backend/src/index.test.ts`（`GET /api/board` describe 削除）
- Modify: `apps/backend/src/server.test.ts`（ポーリング先を `/api/sprints` に変更）

**Interfaces:**
- Consumes: Task 4 の `GET /api/sprints/:id/board`（旧エンドポイントの代替として確立済み）
- Produces: 旧 `/api/board` は AppType から消滅。`server.test.ts` は `GET /api/sprints` で疎通確認

- [ ] **Step 1: server.test のポーリング先変更**

`apps/backend/src/server.test.ts`:

- beforeAll 内の `fetch(`${BASE}/api/board`)` → `fetch(`${BASE}/api/sprints`)`
- `it` を以下に置換:

```ts
it('serves GET /api/sprints over HTTP', async () => {
  const res = await fetch(`${BASE}/api/sprints`)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(Array.isArray(data)).toBe(true)
})
```

- `ensureTestSprint()` の投入は維持（フィクスチャ前提の疎通確認には不要になったが、後続のタスク API テストが同一 DB を共有するため害はない。単純化のため投入行を削除してもよいが、投入ありで統一する）— **投入なしに変更する**: beforeAll の `await ensureTestSprint()` と未使用になる `db` / `ensureTestSprint` インポートを削除（アサーションが配列型のみになったため不要）。

- [ ] **Step 2: 旧 board テストとエンドポイント削除**

`apps/backend/src/index.test.ts` から `describe('GET /api/board', ...)`（現行 25-35 行目相当）を削除。フィクスチャ変数 `cols` はタスク API テストが引き続き使うため維持。

`apps/backend/src/index.ts` から `.get('/api/board', ...)`（現行 28-32 行目相当）を削除。

- [ ] **Step 3: テスト実行してパスを確認**

```bash
pnpm --filter backend test
pnpm --filter backend exec tsc --noEmit
pnpm --filter frontend exec tsc --noEmit
```

Expected: 全 PASS・型エラー 0 件（フロントは旧 `/api/board` を参照済みのため影響なし）

- [ ] **Step 4: コミット**

```bash
git add apps/backend
git commit -m "feat!: remove legacy GET /api/board in favor of sprint-scoped board"
```

---

### Task 9: E2E テスト（スプリントフロー）

**Files:**
- Modify: `apps/e2e-tests/src/board.spec.ts`

**Interfaces:**
- Consumes: Task 6 の一覧画面 UI、Task 7 の詳細画面 UI
- Produces: ブラウザ 3 系（chromium/firefox/webkit）でスプリント作成→ボード操作→一覧に戻る主フローを検証。テスト名は `docs/conventions.md` §3 に従い UC ID を含める

- [ ] **Step 1: board.spec.ts 全置き換え**

```ts
import { test, expect } from '@playwright/test'

async function createSprintAndOpen(page: import('@playwright/test').Page) {
  const name = `E2E Sprint ${Date.now()}`
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder('例: スプリント1').fill(name)
  await page.getByLabel('開始日').fill('2026-10-01')
  await page.getByLabel('終了日').fill('2026-10-14')
  await page.getByRole('button', { name: '作成' }).click()
  // revalidatePath により一覧が自動更新される。念のためリロードも許容する
  await page.waitForLoadState('networkidle')
  if (!(await page.getByRole('link', { name }).isVisible().catch(() => false))) {
    await page.reload()
    await page.waitForLoadState('networkidle')
  }
  await page.getByRole('link', { name }).click()
  await page.waitForURL(/\/sprints\//)
  await page.waitForLoadState('networkidle')
  return name
}

test.describe('Sprint Kanban E2E', () => {
  test('UC-007: スプリントを作成すると一覧に進捗 0% で表示される', async ({ page }) => {
    const name = `E2E Sprint ${Date.now()}`
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('例: スプリント1').fill(name)
    await page.getByLabel('開始日').fill('2026-10-01')
    await page.getByLabel('終了日').fill('2026-10-14')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForLoadState('networkidle')
    if (!(await page.getByText(name).isVisible().catch(() => false))) {
      await page.reload()
      await page.waitForLoadState('networkidle')
    }
    await expect(page.getByText(name).first()).toBeVisible()
    await expect(page.getByText('2026-10-01 〜 2026-10-14').first()).toBeVisible()
    await expect(page.getByText('0% (0/0)').first()).toBeVisible()
  })

  test('UC-001: スプリントのボードに 3 カラムが表示される', async ({ page }) => {
    await createSprintAndOpen(page)
    await expect(page.getByText('Todo 📝')).toBeVisible()
    await expect(page.getByText('In Progress 🚀')).toBeVisible()
    await expect(page.getByText('Done ✅')).toBeVisible()
    await expect(page.getByRole('link', { name: '← 一覧へ戻る' })).toBeVisible()
  })

  test('UC-002: タスクを作成できる', async ({ page }) => {
    await createSprintAndOpen(page)
    const todoColumn = page.locator('text=Todo 📝').locator('..').locator('..')
    const input = todoColumn.getByPlaceholder('+ 新しいタスク...')
    const uniqueName = `E2E Task ${Date.now()}`
    await input.fill(uniqueName)
    await todoColumn.getByRole('button', { name: '追加' }).click()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 15000 })
  })

  test('UC-002: タイトル空でバリデーションエラーが表示される', async ({ page }) => {
    await createSprintAndOpen(page)
    const todoColumn = page.locator('text=Todo 📝').locator('..').locator('..')
    await todoColumn.getByRole('button', { name: '追加' }).click()
    await expect(page.getByText('Required')).toBeVisible({ timeout: 5000 })
  })

  test('UC-003: ドラッグ&ドロップでタスクを移動できる', async ({ page }) => {
    await createSprintAndOpen(page)
    const todoColumn = page.locator('text=Todo 📝').locator('..').locator('..')
    const input = todoColumn.getByPlaceholder('+ 新しいタスク...')
    const uniqueName = `E2E DnD ${Date.now()}`
    await input.fill(uniqueName)
    await todoColumn.getByRole('button', { name: '追加' }).click()
    await page.reload()
    await page.waitForLoadState('networkidle')

    const task = page.locator('[draggable="true"]').first()
    await expect(task).toBeVisible({ timeout: 15000 })
    const progressColumn = page.locator('text=In Progress 🚀').locator('..').locator('..')
    await task.dragTo(progressColumn)
    await page.waitForTimeout(2000)
    await expect(progressColumn.locator('[draggable="true"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('UC-006: タスクを Done に移すと一覧の進捗率が更新される', async ({ page }) => {
    await createSprintAndOpen(page)
    const todoColumn = page.locator('text=Todo 📝').locator('..').locator('..')
    const input = todoColumn.getByPlaceholder('+ 新しいタスク...')
    const uniqueName = `E2E Progress ${Date.now()}`
    await input.fill(uniqueName)
    await todoColumn.getByRole('button', { name: '追加' }).click()
    await page.reload()
    await page.waitForLoadState('networkidle')

    const task = page.locator('[draggable="true"]').first()
    await expect(task).toBeVisible({ timeout: 15000 })
    const doneColumn = page.locator('text=Done ✅').locator('..').locator('..')
    await task.dragTo(doneColumn)
    await page.waitForTimeout(2000)

    await page.getByRole('link', { name: '← 一覧へ戻る' }).click()
    await page.waitForLoadState('networkidle')
    // Server Action によるタスク操作の revalidate はスコープ外のためリロードで最新化
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('100% (1/1)').first()).toBeVisible({ timeout: 15000 })
  })

  test('UC-009: スプリントを削除すると一覧から消える', async ({ page }) => {
    const name = `E2E Del ${Date.now()}`
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('例: スプリント1').fill(name)
    await page.getByLabel('開始日').fill('2026-10-01')
    await page.getByLabel('終了日').fill('2026-10-14')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForLoadState('networkidle')
    if (!(await page.getByText(name).isVisible().catch(() => false))) {
      await page.reload()
      await page.waitForLoadState('networkidle')
    }

    page.on('dialog', (dialog) => dialog.accept())
    const card = page.locator('div').filter({ hasText: name }).last()
    await card.getByRole('button', { name: '削除' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(name)).toHaveCount(0, { timeout: 15000 })
  })
})
```

- [ ] **Step 2: E2E 実行**

```bash
pnpm test:e2e
```

Expected: 全 PASS（失敗時は `page.reload()` フォローバックの有無、`getByLabel` の実際のアクセシブル名、ダイアログ ハンドラのタイミングを確認して調整）

- [ ] **Step 3: コミット**

```bash
git add apps/e2e-tests
git commit -m "test: rewrite e2e specs for sprint-based kanban flow"
```

---

### Task 10: ドキュメント同期

**Files:**
- Modify: `docs/product.md`
- Modify: `docs/usecases.md`
- Modify: `docs/domain_model.md`
- Modify: `docs/api.md`
- Modify: `docs/architecture.md`
- Modify: `docs/design.md`
- Modify: `docs/glossary.md`
- Modify: `docs/conventions.md`（該当箇所のみ）
- Modify: `docs/superpowers/specs/2026-10-19-sprint-kanban-list-design.md`（軽微な補正を反映）

**Interfaces:**
- Consumes: Task 1-9 の実装内容（本計画の Interfaces ブロックが正）
- Produces: `docs/documentation-guideline.md` の完了チェックリストを満たす同期済みドキュメント群

- [ ] **Step 1: spec への軽微な補正反映**

`docs/superpowers/specs/2026-10-19-sprint-kanban-list-design.md`:

- §3.1 `GET /api/sprints/:id/board` の説明を「指定スプリントの `{ sprint, columns, tasks }`（`sprint` は詳細ページのヘッダー表示用）」に修正
- §4.2 の「カード全体がリンク」を「カード内スプリント名がリンク（`<a>` 内 `<button>` の不正ネスト回避）」に修正

- [ ] **Step 2: product.md 更新**

- システム境界表: 「複数ボード対応（BR-008）」を境界内「スプリント単位の複数ボード管理」に移し、境界外を「スプリントの状態管理・期限超過判定・ベロシティ」に置換
- 主要機能一覧に追加:

| 機能 ID | 機能名 | 概要 | 対応 UC |
|---------|--------|------|---------|
| F-009 | スプリント一覧表示 | 開始日降順でスプリント名・期間・進捗率を表示 (RSC) | UC-006 |
| F-010 | スプリント作成 | フォームから作成、3 カラムを自動生成 (Server Action) | UC-007 |
| F-011 | スプリント編集 | インライン編集で名前・期間を更新 (Server Action) | UC-008 |
| F-012 | スプリント削除 | 確認ダイアログ付きで配下ごと削除 (Server Action) | UC-009 |
| F-013 | スプリント別ボード表示 | `/sprints/[id]` で該当スプリントの 3 カラム・タスクを表示 | UC-001 |

- ビジネス要件: BR-008 を「スプリント単位の複数ボード対応」優先度必須に変更
- FR-004「データベースシード」を「スプリント作成時に 3 カラム（Todo/In Progress/Done）をトランザクション生成 (`apps/backend/src/index.ts`)」に置換
- ユースケースマッピングに UC-006〜UC-009 の行を追加

- [ ] **Step 3: usecases.md 更新**

- ユースケース一覧に追加:

| UC ID | 名称 | アクター | 対応要求 | 概要 |
|-------|------|---------|---------|------|
| UC-006 | スプリント一覧表示 | ユーザー | F-009, FR-006 | スプリントを開始日降順で進捗率付き一覧表示する |
| UC-007 | スプリント作成 | ユーザー | F-010, F-007, FR-005 | 名前・期間を入力してスプリントを作成する（3 カラム自動生成） |
| UC-008 | スプリント編集 | ユーザー | F-011, F-007, FR-005 | スプリントの名前・期間をインライン編集する |
| UC-009 | スプリント削除 | ユーザー | F-012, FR-005 | 確認のうえスプリントを配下タスクごと削除する |

- UC-001 を「指定スプリントのボード表示」に改訂（事前条件: スプリントが存在する。API: `GET /api/sprints/:id/board`）。UC-002〜005 の事前条件も「UC-001 によりスプリントのボードが表示されている」に更新
- ユースケース図に UC6-UC9 を追加
- API 対応表を更新（UC-001 → `GET /api/sprints/:id/board`、UC-006 → `GET /api/sprints`、UC-007 → `POST /api/sprints`、UC-008 → `PATCH /api/sprints/:id`、UC-009 → `DELETE /api/sprints/:id`）

- [ ] **Step 4: domain_model.md 更新**

- Sprint エンティティ（ID/名前/開始日/終了日）と `Sprint 1 ─ * Column 1 ─ * Task` の関連図を追加
- Board の定義を「指定スプリントに属する Column 群 + Task 群の論理的集約」に改訂
- ビジネスルール追加:
  - スプリント期間は `開始日 ≤ 終了日`
  - スプリント作成時に固定 3 カラム（Todo 📝 / In Progress 🚀 / Done ✅、position 0/1/2）を生成する
  - スプリント削除は配下カラム・タスクを巻き込む不可逆操作
- BR-D02 の注記を「カラム所有者はグローバルからスプリント毎に変更」に更新

- [ ] **Step 5: api.md 更新**

- エンドポイント一覧に 5 件を追加、旧 `GET /api/board` を削除:
  - `GET /api/sprints`（200: 配列 `{ id, name, startDate, endDate, taskCount, doneCount, progress }`、startDate 降順、進捗はサーバー計算・小数第 1 位・0 件は 0）
  - `POST /api/sprints`（200: `{ success, data: Sprint }`、400: 期間逆転/名前空/日付形式）
  - `PATCH /api/sprints/:id`（200/400/404）
  - `DELETE /api/sprints/:id`（200: `{ success, id }`/404、配下削除）
  - `GET /api/sprints/:id/board`（200: `{ sprint, columns, tasks }`/404）
- カラム ID 命名 `col-<sprintId>-todo|-progress|-done` を記載
- §10 将来拡張の「複数ボード」草案を実装済み内容（`/api/sprints` 系）に更新

- [ ] **Step 6: architecture.md 更新**

- ER 図に Sprint 追加、`Column.sprintId` FK 追加
- データフロー: `/` = RSC で `GET /api/sprints`、`/sprints/[id]` = RSC で `GET /api/sprints/:id/board`
- BCE マッピング: SprintListBoundary / SprintCreateControl / SprintEntity 等の新規境界・コントロールを追加
- seed 廃止とスプリント作成時カラム生成の記載更新

- [ ] **Step 7: design.md 更新**

- コンポーネント仕様に追加:
  - `SprintList`（Server Component、空状態メッセージ付き）
  - `SprintCreateForm`（Conform、名前 + 開始日/終了日 date 入力、ボタン「作成」）
  - `SprintCard`（進捗バー `role="progressbar"` / `aria-valuenow`、テキスト `{progress}% ({done}/{total})`、✎ 編集トグル、🗑 削除 + `window.confirm`、スプリント名は `/sprints/[id]` への Link）
  - `not-found` ページ
- レイアウト: 一覧は最大幅 720px の縦積み、詳細は既存ボードの横並び + 戻りリンク
- NFR-005（aria 属性）の適用箇所として進捗バーを追記

- [ ] **Step 8: glossary.md 更新**

- ドメイン用語に追加:

| 日本語 | 英語 | 定義 | コード上の表現 |
|--------|------|------|----------------|
| **スプリント** | Sprint | 名前と期間（開始日・終了日）を持ち、専用カンバンボードを所有する作業期間の単位 | `Sprint` (Model/Type), `SprintModel` (Prisma) |
| **進捗率** | Progress | Done カラムのタスク数 ÷ 全タスク数 × 100（小数第 1 位、0 件は 0） | `progress` (API レスポンス) |

- 「ボード」の定義を「指定スプリントに属するカラムとタスクの集合体」に改訂
- 「シードデータ」の行を削除（seed.ts 廃止）
- 命名規則パターン §6 の Server Action 例に `createSprintAction` 等を追記

- [ ] **Step 9: conventions.md 該当箇所のみ確認・更新**

- セットアップ手順から `db:seed` コマンドの記載があれば削除（`rg 'db:seed|seed' docs/conventions.md docs/operations.md` で検索）
- ディレクトリ構成の例に `app/sprints/` を追加（該当箇所がある場合のみ）

- [ ] **Step 10: documentation-guideline.md の完了チェックリストで確認**

`docs/documentation-guideline.md` のチェックリストに従い各ドキュメントをセルフレビュー（重複記載なし・正本リンク維持・図表同期）。

- [ ] **Step 11: 全検証を実行してからコミット**

```bash
pnpm test
pnpm --filter backend exec tsc --noEmit
pnpm --filter frontend exec tsc --noEmit
pnpm test:e2e
```

Expected: 全 PASS。`rg 'GET /api/board' docs/` が `docs/superpowers/` 配下の履歴文档を除きヒットしないこと。

```bash
git add docs
git commit -m "docs: sync specs for sprint-based kanban management"
```

---

## 完了条件（計画全体）

- `pnpm test`（shared / backend / frontend）全 PASS
- `pnpm test:e2e` 全 PASS（3 ブラウザ）
- `tsc --noEmit`（backend / frontend）エラー 0 件
- `/` でスプリント作成・編集・削除・進捗確認ができ、カードから `/sprints/[id]` の 3 カラムボードへ遷移し、タスク CRUD・DnD が既存同様に動作する
- `docs/` 配下の正本ドキュメントが実装と同期している
