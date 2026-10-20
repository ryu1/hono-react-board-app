# REST API 仕様書

> **このファイルは REST API 仕様の唯一の正本です。**  
> 他のドキュメント（`architecture.md`、`conventions.md`、`tech.md` 等）では API 詳細を記載せず、本ファイルへの参照リンクのみ記載します。  
> 各エンドポイントが処理するユースケースの詳細（事前条件・フロー等）は [`docs/usecases.md`](usecases.md) を参照してください。

## 1. 概要

| 項目 | 内容 |
|------|------|
| ベース URL (開発) | `http://localhost:3001` |
| ベース URL (本番) | 未定 |
| プロトコル | HTTP/1.1, HTTP/2 |
| データ形式 | JSON |
| 文字エンコーディング | UTF-8 |
| 認証 | なし（スコープ外） |
| CORS | `http://localhost:3000`, `http://localhost:3001` 許可 |
| 型定義 | Hono RPC `AppType` からフロントエンドへ型推論 |

---

## 2. 共通仕様

### 2.1 リクエストヘッダー
| ヘッダー | 必須 | 値 |
|----------|------|-----|
| `Content-Type` | POST/PATCH/PUT 時 | `application/json` |
| `Accept` | 常時 | `application/json` |

### 2.2 レスポンスヘッダー
| ヘッダー | 値 |
|----------|-----|
| `Content-Type` | `application/json; charset=utf-8` |
| `Access-Control-Allow-Origin` | `http://localhost:3000`, `http://localhost:3001` |
| `Access-Control-Allow-Methods` | `GET, POST, PATCH, PUT, DELETE, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type` |

### 2.3 共通レスポンス形式

#### 成功時
```typescript
interface SuccessResponse<T> {
  success: true
  data: T
}
```

#### エラー時（バリデーションエラー）
```typescript
interface ValidationErrorResponse {
  success: false
  error: {
    formErrors: string[]
    fieldErrors: Record<string, string[]>
  }
}
```

#### エラー時（リソース不存在）
```typescript
interface NotFoundResponse {
  success: false
  error: 'Not Found'
}
```

#### エラー時（サーバーエラー）
```typescript
interface ServerErrorResponse {
  success: false
  error: string  // 汎用メッセージ
}
```

---

## 3. エンドポイント一覧

| メソッド | パス | 関連要求 ID | 対応 UC | 説明 | バリデーション |
|----------|------|------------|---------|------|----------------|
| `GET` | `/api/sprints` | F-009, FR-001, FR-006 | UC-006 | 一覧。`startDate` 降順。各要素に集計を含む | なし |
| `POST` | `/api/sprints` | F-010, F-007, FR-001, FR-005 | UC-007 | 作成 + 3 カラム自動生成（トランザクション） | `insertSprintSchema` |
| `PATCH` | `/api/sprints/:id` | F-011, F-007, FR-001, FR-005 | UC-008 | 名前・期間を更新 | `updateSprintSchema` |
| `DELETE` | `/api/sprints/:id` | F-012, FR-001, FR-005 | UC-009 | 配下カラム・タスクごと削除 | なし（404） |
| `GET` | `/api/sprints/:id/board` | F-013, FR-001, FR-006 | UC-001 | 指定スプリントの `{ sprint, columns, tasks }` | なし（404） |
| `POST` | `/api/tasks` | F-002, F-007, FR-001 | UC-002 | タスク作成 | `insertTaskSchema` |
| `PATCH` | `/api/tasks/move` | F-006, FR-001 | UC-003 | タスク移動 (カラム・位置) | `moveTaskSchema` |
| `PUT` | `/api/tasks/update` | F-004, F-007, FR-001 | UC-004 | タスク詳細更新 (タイトル・説明) | `updateTaskSchema` |
| `DELETE` | `/api/tasks/:id` | F-005, FR-001 | UC-005 | タスク削除 | なし |

---

## 4. エンドポイント詳細

### 4.1 GET `/api/sprints`

スプリント一覧を取得する。`startDate` 降順で返却。各スプリントにタスク集計（`taskCount`, `doneCount`, `progress`）を含む。

#### リクエスト
```http
GET /api/sprints HTTP/1.1
Host: localhost:3001
Accept: application/json
```

#### レスポンス (200 OK)
```json
[
  {
    "id": "sprint-1",
    "name": "スプリント1",
    "startDate": "2026-10-01",
    "endDate": "2026-10-14",
    "taskCount": 5,
    "doneCount": 2,
    "progress": 40.0
  },
  {
    "id": "sprint-2",
    "name": "スプリント2",
    "startDate": "2026-09-15",
    "endDate": "2026-09-28",
    "taskCount": 0,
    "doneCount": 0,
    "progress": 0
  }
]
```

- `progress` はサーバー側で計算。`doneCount / taskCount * 100`、小数第 1 位に丸め（`Math.round(x * 10) / 10`）。タスク 0 件は `0`
- 400（Zod flattened errors）・404（`updateMany/deleteMany` の count チェック）は現行パターンを踏襲

#### レスポンススキーマ
```typescript
interface SprintListResponse {
  id: string
  name: string
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
  taskCount: number
  doneCount: number
  progress: number   // 小数第 1 位、0 件は 0
}
```

#### エラーレスポンス
| ステータス | 条件 | 内容 |
|------------|------|------|
| 500 | DB エラー | `{ "success": false, "error": "Internal server error" }` |

---

### 4.2 POST `/api/sprints`

新規スプリントを作成し、3 カラム（Todo / In Progress / Done）をトランザクションで自動生成する。

#### リクエスト
```http
POST /api/sprints HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "id": "uuid-v4-string",
  "name": "スプリント1",
  "startDate": "2026-10-01",
  "endDate": "2026-10-14"
}
```

#### リクエストボディスキーマ (`insertSprintSchema`)
```typescript
// apps/backend/src/db/schema.ts から再エクスポート
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式で入力してください')

const insertSprintSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'タイトルは必須です'),
  startDate: isoDate,
  endDate: isoDate,
}).refine(data => data.startDate <= data.endDate, {
  message: '開始日は終了日以前にしてください',
  path: ['endDate'],
})
```

#### レスポンス (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4-string",
    "name": "スプリント1",
    "startDate": "2026-10-01",
    "endDate": "2026-10-14"
  }
}
```

#### エラーレスポンス
| ステータス | 条件 | 内容 |
|------------|------|------|
| 400 | バリデーション失敗 (期間逆転/名前空/日付形式) | `{ "success": false, "error": { "formErrors": [], "fieldErrors": { "endDate": ["開始日は終了日以前にしてください"] } } }` |
| 400 | 不正な JSON | `{ "success": false, "error": "Invalid JSON" }` |
| 500 | DB エラー | `{ "success": false, "error": "Internal server error" }` |

---

### 4.3 PATCH `/api/sprints/:id`

指定スプリントの名前・期間を更新する。

#### リクエスト
```http
PATCH /api/sprints/sprint-1 HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "name": "スプリント1 (更新)",
  "startDate": "2026-10-01",
  "endDate": "2026-10-21"
}
```

#### リクエストボディスキーマ (`updateSprintSchema`)
```typescript
// apps/backend/src/db/schema.ts から再エクスポート
const updateSprintSchema = z.object({
  name: z.string().min(1, 'タイトルは必須です').optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
}).refine(data => {
  if (data.startDate && data.endDate) return data.startDate <= data.endDate
  return true
}, {
  message: '開始日は終了日以前にしてください',
  path: ['endDate'],
})
```

#### レスポンス (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "sprint-1",
    "name": "スプリント1 (更新)",
    "startDate": "2026-10-01",
    "endDate": "2026-10-21"
  }
}
```

#### エラーレスポンス
| ステータス | 条件 | 内容 |
|------------|------|------|
| 400 | バリデーション失敗 | バリデーションエラー詳細 |
| 404 | スプリントが存在しない | `{ "success": false, "error": "Not Found" }` |
| 500 | DB エラー | `{ "success": false, "error": "Internal server error" }` |

**実装詳細**: `updateMany` で更新 → `count` で存在確認 → `findUniqueOrThrow` で最新取得

---

### 4.4 DELETE `/api/sprints/:id`

指定スプリントを配下のカラム・タスクごと削除する（不可逆）。

#### リクエスト
```http
DELETE /api/sprints/sprint-1 HTTP/1.1
Host: localhost:3001
```

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `id` | string | Yes | 削除対象スプリント ID |

#### レスポンス (200 OK)
```json
{
  "success": true,
  "id": "sprint-1"
}
```

#### エラーレスポンス
| ステータス | 条件 | 内容 |
|------------|------|------|
| 404 | スプリントが存在しない | `{ "success": false, "error": "Not Found" }` |
| 500 | DB エラー | `{ "success": false, "error": "Internal server error" }` |

**実装詳細**: トランザクションで `task.deleteMany` → `column.deleteMany` → `sprint.delete` を実行

---

### 4.5 GET `/api/sprints/:id/board`

指定スプリントのボードデータ（スプリント情報 + カラム + タスク）を取得する。

#### リクエスト
```http
GET /api/sprints/sprint-1/board HTTP/1.1
Host: localhost:3001
Accept: application/json
```

#### レスポンス (200 OK)
```json
{
  "success": true,
  "data": {
    "sprint": {
      "id": "sprint-1",
      "name": "スプリント1",
      "startDate": "2026-10-01",
      "endDate": "2026-10-14"
    },
    "columns": [
      { "id": "col-sprint-1-todo", "title": "Todo 📝", "position": 0 },
      { "id": "col-sprint-1-progress", "title": "In Progress 🚀", "position": 1 },
      { "id": "col-sprint-1-done", "title": "Done ✅", "position": 2 }
    ],
    "tasks": [
      { "id": "t1", "columnId": "col-sprint-1-todo", "title": "Task 1", "description": "desc", "position": 0 }
    ]
  }
}
```

#### レスポンススキーマ
```typescript
interface SprintBoardResponse {
  success: true
  data: {
    sprint: {
      id: string
      name: string
      startDate: string
      endDate: string
    }
    columns: Column[]
    tasks: Task[]
  }
}
```

#### エラーレスポンス
| ステータス | 条件 | 内容 |
|------------|------|------|
| 404 | スプリントが存在しない | `{ "success": false, "error": "Not Found" }` |
| 500 | DB エラー | `{ "success": false, "error": "Internal server error" }` |

---

### 4.6 POST `/api/tasks`

新規タスクを作成する。`columnId` で指定したカラムの末尾（`position = 現在のタスク数`）に追加される。クライアント側で `position` を計算して送信。

#### リクエスト
```http
POST /api/tasks HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "id": "uuid-v4-string",
  "columnId": "col-todo",
  "title": "新しいタスク",
  "description": "タスクの説明（任意）",
  "position": 0
}
```

#### リクエストボディスキーマ (`insertTaskSchema`)
```typescript
// apps/backend/src/db/schema.ts から再エクスポート
const insertTaskSchema = TaskModelSchema.omit({ column: true }).extend({
  description: z.string().nullish(),
  position: z.coerce.number().int(),
})
// 実質的な形状:
{
  id: string           // UUID v4 (クライアント生成: crypto.randomUUID())
  columnId: string     // 既存カラム ID
  title: string        // 1 文字以上 ("タイトルは必須です")
  description?: string // 任意、null 許容
  position: number     // 0 以上の整数 (coerce で文字列から変換)
}
```

#### レスポンス (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4-string",
    "columnId": "col-todo",
    "title": "新しいタスク",
    "description": "タスクの説明",
    "position": 0
  }
}
```

#### エラーレスポンス
| ステータス | 条件 | 内容 |
|------------|------|------|
| 400 | バリデーション失敗 | `{ "success": false, "error": { "formErrors": [], "fieldErrors": { "title": ["タイトルは必須です"] } } }` |
| 400 | 不正な JSON | `{ "success": false, "error": "Invalid JSON" }` |
| 500 | DB エラー | `{ "success": false, "error": "Internal server error" }` |

---

### 4.3 PATCH `/api/tasks/move`

タスクを別カラムへ移動、または同カラム内で位置を変更する。

#### リクエスト
```http
PATCH /api/tasks/move HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "id": "t1",
  "columnId": "col-progress",
  "position": 999
}
```

#### リクエストボディスキーマ (`moveTaskSchema`)
```typescript
const moveTaskSchema = z.object({
  id: z.string().min(1),
  columnId: z.string().min(1),
  position: z.number().int().nonnegative(),
})
```

#### レスポンス (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "t1",
    "columnId": "col-progress",
    "title": "Task 1",
    "description": "desc",
    "position": 999
  }
}
```

#### エラーレスポンス
| ステータス | 条件 | 内容 |
|------------|------|------|
| 400 | バリデーション失敗 | バリデーションエラー詳細 |
| 404 | タスクが存在しない | `{ "success": false, "error": "Not Found" }` |
| 500 | DB エラー | `{ "success": false, "error": "Internal server error" }` |

**実装詳細**: `updateMany` で更新 → `count` で存在確認 → `findUniqueOrThrow` で最新取得

---

### 4.4 PUT `/api/tasks/update`

タスクのタイトルと説明を更新する。

#### リクエスト
```http
PUT /api/tasks/update HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "id": "t1",
  "title": "更新されたタイトル",
  "description": "更新された説明"
}
```

#### リクエストボディスキーマ (`updateTaskSchema`)
```typescript
const updateTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().nullable(),
})
```

#### レスポンス (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "t1",
    "columnId": "col-todo",
    "title": "更新されたタイトル",
    "description": "更新された説明",
    "position": 0
  }
}
```

#### エラーレスポンス
| ステータス | 条件 | 内容 |
|------------|------|------|
| 400 | バリデーション失敗 (タイトル空) | `{ "success": false, "error": { "fieldErrors": { "title": ["タイトルは必須です"] } } }` |
| 404 | タスクが存在しない | `{ "success": false, "error": "Not Found" }` |
| 500 | DB エラー | `{ "success": false, "error": "Internal server error" }` |

**実装詳細**: `updateMany` で更新 → `count` で存在確認 → `findUniqueOrThrow` で最新取得

---

### 4.5 DELETE `/api/tasks/:id`

指定 ID のタスクを削除する。

#### リクエスト
```http
DELETE /api/tasks/t1 HTTP/1.1
Host: localhost:3001
```

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `id` | string | Yes | 削除対象タスク ID |

#### レスポンス (200 OK)
```json
{
  "success": true,
  "id": "t1"
}
```

#### エラーレスポンス
| ステータス | 条件 | 内容 |
|------------|------|------|
| 404 | タスクが存在しない | `{ "success": false, "error": "Not Found" }` |
| 500 | DB エラー | `{ "success": false, "error": "Internal server error" }` |

**実装詳細**: `deleteMany` で削除 → `count` で存在確認

---

## 5. 型定義（フロントエンド連携用）

フロントエンドは `hc<AppType>` および Server Actions 経由で以下の型を自動推論する。

```typescript
// apps/backend/src/index.ts からエクスポートされる AppType
type AppType = {
  api: {
    sprints: {
      $get: () => Promise<SprintListResponse>
      $post: (options: { json: CreateSprintInput }) => Promise<SprintResponse>
      ':id': {
        $patch: (options: { param: { id: string }, json: UpdateSprintInput }) => Promise<SprintResponse>
        $delete: (options: { param: { id: string } }) => Promise<DeleteResponse>
        board: {
          $get: (options: { param: { id: string } }) => Promise<SprintBoardResponse>
        }
      }
    }
    tasks: {
      $post: (options: { json: CreateTaskInput }) => Promise<TaskResponse>
      $delete: (options: { param: { id: string } }) => Promise<DeleteResponse>
      update: {
        $put: (options: { json: UpdateTaskInput }) => Promise<TaskResponse>
      }
      move: {
        $patch: (options: { json: MoveTaskInput }) => Promise<TaskResponse>
      }
    }
  }
}

// 共有スキーマ (@my-app/shared) から再エクスポート
type CreateSprintInput = z.infer<typeof insertSprintSchema>
type UpdateSprintInput = z.infer<typeof updateSprintSchema>
type CreateTaskInput = z.infer<typeof insertTaskSchema>
type MoveTaskInput = z.infer<typeof moveTaskSchema>
type UpdateTaskInput = z.infer<typeof updateTaskSchema>

interface SprintListResponse {
  id: string
  name: string
  startDate: string
  endDate: string
  taskCount: number
  doneCount: number
  progress: number
}

interface SprintResponse {
  success: true
  data: SprintListResponse
}

interface SprintBoardResponse {
  success: true
  data: {
    sprint: SprintListResponse
    columns: Column[]
    tasks: Task[]
  }
}

interface TaskResponse {
  success: true
  data: Task
}

interface DeleteResponse {
  success: true
  id: string
}
```

---

## 6. エラーコード体系

| HTTP ステータス | エラーコード | 説明 | 対処 |
|-----------------|--------------|------|------|
| 400 | `VALIDATION_ERROR` | リクエストボディのバリデーション失敗 | フィールドエラーを表示し再入力促す |
| 404 | `NOT_FOUND` | 指定リソースが存在しない | 画面リロードで最新状態に同期 |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー | ログ確認、ユーザーには汎用メッセージ表示 |

※ 現状は HTTP ステータスのみでエラーコードはレスポンスボディに含めていない。将来統一エラーオブジェクト導入時に追加予定。

---

## 7. バリデーションルール詳細

### 7.1 タスク作成 (`insertTaskSchema`)
| フィールド | ルール | エラーメッセージ |
|------------|--------|------------------|
| `id` | UUID v4 形式 (クライアント生成) | "無効な ID 形式です" |
| `columnId` | 非空文字列 | "カラム ID は必須です" |
| `title` | 1 文字以上 | "タイトルは必須です" |
| `description` | 文字列または null (任意) | - |
| `position` | 0 以上の整数 (coerce 対応) | "位置は 0 以上の整数で指定してください" |

### 7.2 タスク移動 (`moveTaskSchema`)
| フィールド | ルール | エラーメッセージ |
|------------|--------|------------------|
| `id` | 非空文字列 | "タスク ID は必須です" |
| `columnId` | 非空文字列 | "移動先カラム ID は必須です" |
| `position` | 0 以上の整数 | "位置は 0 以上の整数で指定してください" |

### 7.3 タスク更新 (`updateTaskSchema`)
| フィールド | ルール | エラーメッセージ |
|------------|--------|------------------|
| `id` | 非空文字列 | "タスク ID は必須です" |
| `title` | 1 文字以上 | "タイトルは必須です" |
| `description` | 文字列または null | - |

---

## 8. データベーススキーマとの対応

### 8.1 Sprint モデル (`sprints` テーブル)

| API フィールド | Prisma フィールド | DB カラム | 型 | 備考 |
|----------------|------------------|-----------|-----|------|
| `id` | `id` | `id` | TEXT PK | UUID v4 (クライアント生成) |
| `name` | `name` | `name` | TEXT NOT NULL | 1 文字以上, `@zod.min(1)` |
| `startDate` | `startDate` | `start_date` | TEXT NOT NULL | ISO 日付 (YYYY-MM-DD) |
| `endDate` | `endDate` | `end_date` | TEXT NOT NULL | ISO 日付 (YYYY-MM-DD) |

### 8.2 Column モデル (`columns` テーブル)

| API フィールド | Prisma フィールド | DB カラム | 型 | 備考 |
|----------------|------------------|-----------|-----|------|
| `id` | `id` | `id` | TEXT PK | `col-<sprintId>-todo|-progress|-done` |
| `title` | `title` | `title` | TEXT NOT NULL | 絵文字込み, `@zod.min(1)` |
| `position` | `position` | `position` | INTEGER NOT NULL | 0, 1, 2 固定 |
| `sprintId` | `sprintId` | `sprint_id` | TEXT FK | `sprints.id` 参照, `onDelete: Cascade` |

### 8.3 Task モデル (`tasks` テーブル)

| API フィールド | Prisma フィールド | DB カラム | 型 | 備考 |
|----------------|------------------|-----------|-----|------|
| `id` | `id` | `id` | TEXT PK | UUID v4 |
| `columnId` | `columnId` | `column_id` | TEXT FK | `columns.id` 参照, `onDelete: Cascade` |
| `title` | `title` | `title` | TEXT NOT NULL | 1-255 文字想定, `@zod.min(1)` |
| `description` | `description` | `description` | TEXT NULLABLE | 長文対応 |
| `position` | `position` | `position` | INTEGER NOT NULL | カラム内順序 |

---

## 9. 今後の拡張予定

| 機能 | エンドポイント案 | 備考 |
|------|------------------|------|
| 認証追加 | `POST /api/auth/login`, `GET /api/auth/me` | JWT ベース、Hono middleware で保護 |
| スプリント機能 | `GET /api/sprints`, `POST /api/sprints` 等 | **実装済み**（スプリント単位の複数ボード管理） |
| タスク並び替え | `PATCH /api/tasks/reorder` | 位置正規化バッチ処理、または `@dnd-kit` 導入 |
| WebSocket 同期 | `GET /api/ws` | Hono `ws` ミドルウェア、Next.js リアルタイム更新 |

---

## 10. テスト用サンプルリクエスト

### 10.1 スプリント一覧取得
```bash
curl http://localhost:3001/api/sprints
```

### 10.2 スプリント作成
```bash
curl -X POST http://localhost:3001/api/sprints \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-sprint-1",
    "name": "Test Sprint",
    "startDate": "2026-10-01",
    "endDate": "2026-10-14"
  }'
```

### 10.3 スプリントボード取得
```bash
curl http://localhost:3001/api/sprints/test-sprint-1/board
```

### 10.4 タスク作成
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-task-1",
    "columnId": "col-test-sprint-1-todo",
    "title": "Test Task",
    "position": 0
  }'
```

### 10.5 タスク移動
```bash
curl -X PATCH http://localhost:3001/api/tasks/move \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-task-1",
    "columnId": "col-test-sprint-1-progress",
    "position": 999
  }'
```

### 10.6 タスク更新
```bash
curl -X PUT http://localhost:3001/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-task-1",
    "title": "Updated Title",
    "description": "Updated description"
  }'
```

### 10.7 タスク削除
```bash
curl -X DELETE http://localhost:3001/api/tasks/test-task-1
```

### 10.8 スプリント更新
```bash
curl -X PATCH http://localhost:3001/api/sprints/test-sprint-1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Sprint",
    "endDate": "2026-10-21"
  }'
```

### 10.9 スプリント削除
```bash
curl -X DELETE http://localhost:3001/api/sprints/test-sprint-1
```