# REST API 仕様書

> **このファイルは REST API 仕様の唯一の正本です。**  
> 他のドキュメント（`architecture.md`、`conventions.md`、`tech.md` 等）では API 詳細を記載せず、本ファイルへの参照リンクのみ記載します。

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

| メソッド | パス | 説明 | バリデーション |
|----------|------|------|----------------|
| `GET` | `/api/board` | 全カラム・タスク取得 | なし |
| `POST` | `/api/tasks` | タスク作成 | `insertTaskSchema` |
| `PATCH` | `/api/tasks/move` | タスク移動 (カラム・位置) | `moveTaskSchema` |
| `PUT` | `/api/tasks/update` | タスク詳細更新 (タイトル・説明) | `updateTaskSchema` |
| `DELETE` | `/api/tasks/:id` | タスク削除 | なし |

---

## 4. エンドポイント詳細

### 4.1 GET `/api/board`

全カラムと全タスクを取得する。カラムは `position` 昇順、タスクは `position` 昇順で返却。

#### リクエスト
```http
GET /api/board HTTP/1.1
Host: localhost:3001
Accept: application/json
```

#### レスポンス (200 OK)
```json
{
  "success": true,
  "data": {
    "columns": [
      { "id": "col-todo", "title": "Todo 📝", "position": 0 },
      { "id": "col-progress", "title": "In Progress 🚀", "position": 1 },
      { "id": "col-done", "title": "Done ✅", "position": 2 }
    ],
    "tasks": [
      { "id": "t1", "columnId": "col-todo", "title": "Task 1", "description": "desc", "position": 0 },
      { "id": "t2", "columnId": "col-todo", "title": "Task 2", "description": null, "position": 1 }
    ]
  }
}
```

#### レスポンススキーマ
```typescript
interface BoardResponse {
  success: true
  data: {
    columns: Column[]
    tasks: Task[]
  }
}

interface Column {
  id: string
  title: string
  position: number
}

interface Task {
  id: string
  columnId: string
  title: string
  description: string | null
  position: number
}
```

#### エラーレスポンス
| ステータス | 条件 | 内容 |
|------------|------|------|
| 500 | DB エラー | `{ "success": false, "error": "Internal server error" }` |

---

### 4.2 POST `/api/tasks`

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
    board: {
      $get: () => Promise<BoardResponse>
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
type CreateTaskInput = z.infer<typeof insertTaskSchema>
type MoveTaskInput = z.infer<typeof moveTaskSchema>
type UpdateTaskInput = z.infer<typeof updateTaskSchema>

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

| API フィールド | Prisma フィールド | DB カラム | 型 | 備考 |
|----------------|------------------|-----------|-----|------|
| `id` | `id` | `id` | TEXT PK | UUID v4 |
| `columnId` | `columnId` | `column_id` | TEXT FK | `columns.id` 参照, `onDelete: Cascade` |
| `title` | `title` | `title` | TEXT NOT NULL | 1-255 文字想定, `@zod.min(1)` |
| `description` | `description` | `description` | TEXT NULLABLE | 長文対応 |
| `position` | `position` | `position` | INTEGER NOT NULL | カラム内順序 |

| API フィールド | Prisma フィールド | DB カラム | 型 | 備考 |
|----------------|------------------|-----------|-----|------|
| `id` | `id` | `id` | TEXT PK | 固定値 (`col-todo` 等) |
| `title` | `title` | `title` | TEXT NOT NULL | 絵文字込み, `@zod.min(1)` |
| `position` | `position` | `position` | INTEGER NOT NULL | 0, 1, 2 固定 |

---

## 9. シードデータ

起動時（`seed.ts`）に以下の 3 カラムをべき等的に投入（`upsert`）：

```typescript
const initialColumns = [
  { id: 'col-todo', title: 'Todo 📝', position: 0 },
  { id: 'col-progress', title: 'In Progress 🚀', position: 1 },
  { id: 'col-done', title: 'Done ✅', position: 2 },
]
```

タスクの初期データは投入しない（空状態から開始）。

---

## 10. 今後の拡張予定

| 機能 | エンドポイント案 | 備考 |
|------|------------------|------|
| 認証追加 | `POST /api/auth/login`, `GET /api/auth/me` | JWT ベース、Hono middleware で保護 |
| 複数ボード | `GET /api/boards`, `POST /api/boards` | `boards` テーブル追加、ルートパラメータ `/boards/:boardId` |
| タスク並び替え | `PATCH /api/tasks/reorder` | 位置正規化バッチ処理、または `@dnd-kit` 導入 |
| WebSocket 同期 | `GET /api/ws` | Hono `ws` ミドルウェア、Next.js リアルタイム更新 |

---

## 11. テスト用サンプルリクエスト

### 11.1 タスク作成
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-task-1",
    "columnId": "col-todo",
    "title": "Test Task",
    "position": 0
  }'
```

### 11.2 ボード取得
```bash
curl http://localhost:3001/api/board
```

### 11.3 タスク移動
```bash
curl -X PATCH http://localhost:3001/api/tasks/move \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-task-1",
    "columnId": "col-progress",
    "position": 999
  }'
```

### 11.4 タスク更新
```bash
curl -X PUT http://localhost:3001/api/tasks/update \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-task-1",
    "title": "Updated Title",
    "description": "Updated description"
  }'
```

### 11.5 タスク削除
```bash
curl -X DELETE http://localhost:3001/api/tasks/test-task-1
```