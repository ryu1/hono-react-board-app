# 用語定義・ユビキタス言語

## 1. ドメイン用語 (ビジネス・機能)

| 日本語 | 英語 | 定義 | コード上の表現 |
|--------|------|------|----------------|
| **ボード** | Board | カンバンボード全体。複数のカラムを含む | `BoardResponse` (API), `Board` (Component), `BoardProps` |
| **カラム** | Column | タスクを分類する縦の列 (Todo/In Progress/Done) | `Column` (Type/Interface), `ColumnModel` (Prisma) |
| **タスク** | Task | 作業単位。タイトル・説明・所属カラム・順序を持つ | `Task` (Type/Interface), `TaskModel` (Prisma) |
| **カラム位置** | Column Position | カラムの左右順序 (0: Todo, 1: In Progress, 2: Done) | `Column.position`, `ColumnModel.position` |
| **タスク位置** | Task Position | カラム内での上下順序 (0 から連番) | `Task.position`, `TaskModel.position` |
| **ドラッグ&ドロップ** | Drag and Drop (DnD) | マウス/タッチでタスクを移動する操作 | `onDragStart`, `onDrop`, `handleTaskMove` |
| **Server Action** | Server Action | Next.js `'use server'` 関数、サーバー専用ミューテーション | `createTaskAction`, `moveTaskAction` 等 |
| **RSC** | React Server Component | サーバーでレンダリング、データ取得完結 | `page.tsx` (デフォルト) |
| **Client Component** | Client Component | `'use client'` でクライアント側インタラクティブ化 | `components/*.tsx` |
| **インライン編集** | Inline Editing | タスクカードクリックでその場編集モード遷移 | `useState` (編集モード), `useActionState(updateTaskAction)` |
| **シードデータ** | Seed Data | 初回起動時に自動投入される初期カラム 3 つ | `seed.ts`, `col-todo/col-progress/col-done` |

---

## 2. 技術用語 (アーキテクチャ・実装)

| 日本語 | 英語 | 定義 | 関連ファイル |
|--------|------|------|--------------|
| **モノレポ** | Monorepo | 複数パッケージを単一リポジトリで管理 | `pnpm-workspace.yaml` |
| **ワークスペース** | Workspace | pnpm で管理するパッケージ群 | `apps/*`, `packages/*` |
| **共有パッケージ** | Shared Package | フロント・バック共通の Zod スキーマ・型 | `packages/shared/` |
| **RPC (Remote Procedure Call)** | RPC | 関数呼び出し感覚で API 通信、型推論込み | `hc<AppType>`, `client.ts` |
| **AppType** | AppType | Hono アプリの型定義、フロントで `hc<AppType>` に渡す | `apps/backend/src/index.ts` |
| **RSC (React Server Component)** | RSC | サーバーでレンダリング、初期データ取得 | `app/page.tsx` |
| **Server Actions** | Server Actions | `'use server'` 関数、フォーム送信・ミューテーション | `app/actions.ts` |
| **useActionState** | useActionState | React 19 フック、Server Action 状態管理 | `components/*.tsx` |
| **Conform** | Conform | Progressive Enhancement 対応フォームライブラリ | `useForm`, `parseWithZod` |
| **Zod** | Zod | TypeScript ファーストなスキーマバリデーション | `insertTaskSchema` 等 |
| **Prisma ORM** | Prisma ORM | 型安全・成熟した ORM、マイグレーション管理 | `db`, `TaskModel`, `ColumnModel` |
| **prisma-zod-generator** | prisma-zod-generator | Prisma スキーマから Zod スキーマ自動生成 | `pureModels: true` |
| **better-sqlite3** | better-sqlite3 | 高速 SQLite バインディング、Prisma Adapter 対応 | `@prisma/adapter-better-sqlite3` |
| **App Router** | App Router | Next.js 13+ のファイルベースルーティング | `app/` ディレクトリ |
| **インラインスタイル** | Inline Styles | CSS ファイル使わず `React.CSSProperties` で定義 | `styles` object in components |
| **HTML5 DnD** | HTML5 Drag & Drop | ネイティブ API でドラッグ&ドロップ実装 | `onDragStart`, `onDragOver`, `onDrop` |

---

## 3. UI/UX 用語

| 日本語 | 英語 | 定義 | 実装箇所 |
|--------|------|------|----------|
| **カード** | Card | タスク 1 件分の表示コンポーネント | `TaskCard.tsx` |
| **バッジ** | Badge | カラムヘッダーのタスク数表示 | `Column.tsx` `.badge` style |
| **ゴーストイメージ** | Ghost Image | ドラッグ中にマウスに付いてくる半透明カード | ブラウザ標準挙動 |
| **ドロップターゲット** | Drop Target | ドラッグ受け入れ可能エリア (カラム全体) | `Column.tsx` `onDragOver`, `onDrop` |
| **プレースホルダー** | Placeholder | 入力欄のヒントテキスト | `+ 新しいタスク...` |
| **トースト通知** | Toast Notification | 一時的なフィードバック表示 (未実装) | 将来拡張 |

---

## 4. 英語・日本語対応表

### 4.1 API・データモデル

| 英語 | 日本語 | 備考 |
|------|--------|------|
| `id` | ID / 識別子 | UUID v4 文字列 |
| `title` | タイトル | 必須、1 文字以上 |
| `description` | 説明 | 任意、null 許容 |
| `columnId` | カラム ID | 外部キー、`Column.id` 参照 |
| `position` | 位置 / 順序 | 0 始まり整数 |
| `createdAt` | 作成日時 | 未実装 (将来) |
| `updatedAt` | 更新日時 | 未実装 (将来) |

### 4.2 HTTP・API

| 英語 | 日本語 | 備考 |
|------|--------|------|
| `GET` | 取得 | `/api/board` |
| `POST` | 作成 | `/api/tasks` |
| `PATCH` | 部分更新 | `/api/tasks/move` |
| `PUT` | 全体更新 | `/api/tasks/update` |
| `DELETE` | 削除 | `/api/tasks/:id` |
| `200 OK` | 成功 | 全正常系 |
| `400 Bad Request` | バリデーションエラー | Zod エラー詳細込み |
| `404 Not Found` | リソース不在 | `updateMany`/`deleteMany` count=0 |
| `500 Internal Server Error` | サーバーエラー | 汎用メッセージのみ |

### 4.3 開発・運用

| 英語 | 日本語 | 備考 |
|------|--------|------|
| `dev` | 開発モード | `pnpm dev` |
| `build` | 本番ビルド | `pnpm --filter frontend build` |
| `test` | テスト実行 | `pnpm test` |
| `typecheck` | 型チェック | `tsc --noEmit` |
| `lint` | 静的解析 | `next lint` |
| `db:push` | スキーマ反映 | `prisma db push` |
| `db:generate` | Prisma Client 生成 | `prisma generate` |
| `db:seed` | シード投入 | 初期データ作成 |
| `db:migrate` | マイグレーション実行 | `prisma migrate dev` (将来) |

---

## 5. コード上の命名規則

### 5.1 ファイル・ディレクトリ

| 対象 | 規則 | 正例 | 誤例 |
|------|------|------|------|
| **TypeScript ファイル (App Router)** | kebab-case | `page.tsx`, `layout.tsx`, `actions.ts` | `Page.tsx`, `actions.ts` |
| **TypeScript ファイル (Components)** | PascalCase | `Board.tsx`, `TaskCard.tsx` | `board.tsx`, `taskCard.tsx` |
| **テストファイル** | `{file}.test.{ts,tsx}` | `Board.test.tsx`, `actions.test.ts` | `Board.spec.tsx` |
| **ディレクトリ** | kebab-case | `app/`, `components/`, `src/db/` | `app/`, `src/DB/` |
| **設定ファイル** | kebab-case + `.config` | `next.config.ts`, `vitest.config.ts` | `nextConfig.ts` |

### 5.2 変数・関数・定数

| 対象 | 規則 | 正例 | 誤例 |
|------|------|------|------|
| **変数・関数** | camelCase | `fetchBoard`, `createTask`, `handleTaskMove` | `fetch_board`, `create_task` |
| **定数 (モジュールスコープ)** | UPPER_SNAKE_CASE | `MAX_TASKS_PER_COLUMN`, `DEFAULT_COLUMNS` | `maxTasksPerColumn` |
| **定数 (ローカル/オブジェクトプロパティ)** | camelCase | `const styles = { container: ... }` | `const STYLES = { CONTAINER: ... }` |
| **ブール変数・関数** | `is`/`has`/`can`/`should` + PascalCase | `isLoading`, `hasError`, `canEdit`, `shouldValidate` | `loading`, `errorFlag` |
| **Server Actions** | `{verb}{Noun}Action` | `createTaskAction`, `moveTaskAction`, `updateTaskAction` | `create_task_action` |

### 5.3 型・インターフェース・Enum 代替

| 対象 | 規則 | 正例 | 誤例 |
|------|------|------|------|
| **Interface / Type** | PascalCase | `Task`, `BoardProps`, `CreateTaskInput` | `task`, `board_props` |
| **Type Parameter** | PascalCase (単一文字可) | `T`, `TData`, `TError`, `TResponse` | `t`, `data`, `error` |
| **Enum 代替 (const オブジェクト)** | PascalCase + `as const` | `const TaskStatus = { Todo: 'todo', ... } as const` | `enum TaskStatus { ... }` |

### 5.4 React / Next.js 固有

| 対象 | 規則 | 正例 | 誤例 |
|------|------|------|------|
| **RSC (デフォルト)** | PascalCase | `function BoardPage() {}` | `const BoardPage = () => {}` |
| **Client Component** | PascalCase + `'use client'` | `function Board() {}` | `function board() {}` |
| **Props 型** | `ComponentName` + `Props` | `interface BoardProps {}` | `interface Props {}` |
| **カスタムフック** | `use` + PascalCase | `useBoard`, `useOptimisticTasks` | `use_board`, `useBoardData` |
| **イベントハンドラ** | `handle` + PascalCase / `on` + PascalCase | `handleDragStart`, `onDrop`, `handleClick` | `dragStart`, `on_drop` |
| **Ref** | `xxxRef` (camelCase) | `const inputRef = useRef()` | `const input_ref = useRef()` |
| **`useActionState` 戻り値** | `[state, action, isPending]` | `const [state, action, isPending] = useActionState(fn)` | 任意の名前 |

### 5.5 Zod スキーマ・バリデーション

| 対象 | 規則 | 正例 | 誤例 |
|------|------|------|------|
| **スキーマ変数** | `*Schema` suffix (camelCase) | `insertTaskSchema`, `moveTaskSchema`, `updateTaskSchema` | `InsertTaskSchema`, `taskSchema` |
| **推論型** | `z.infer<typeof xxxSchema>` | `CreateTaskInput`, `MoveTaskInput` | `InsertTaskType` |

### 5.6 Hono RPC 固有

| 対象 | 規則 | 正例 | 備考 |
|------|------|------|------|
| **RPC メソッド** | `$` prefix + HTTP メソッド小文字 | `$get()`, `$post()`, `$patch()`, `$put()`, `$delete()` | Hono 標準 |
| **パスパラメータ** | `:paramName` | `/api/tasks/:id` | `:id` 部分 |
| **クエリパラメータ** | `?key=value` | 未使用 | 将来拡張 |

---

## 6. 新しいコンポーネント・関数・変数名のパターン

### 6.1 Client Component 追加時
```
apps/frontend/components/{Feature}.tsx
  └─ 'use client'
  └─ export function {Feature}() {}
  └─ interface {Feature}Props {}
  └─ const styles: Record<string, React.CSSProperties> = {}
```

### 6.2 Server Action 追加時
```
apps/frontend/app/actions.ts
  └─ 'use server'
  └─ export async function {verb}{Noun}Action(formData: FormData) { ... }
```

### 6.3 RSC ページ追加時
```
apps/frontend/app/{route}/page.tsx
  └─ export default async function {Route}Page() { ... }
  └─ // デフォルトで RSC、データ取得完結
```

### 6.4 バックエンドルート追加時
```
apps/backend/src/index.ts
  ├─ const {feature}Schema = z.object({ ... })
  ├─ routes.{httpMethod}('/api/{resource}/{action}', zValidator('json', {feature}Schema), handler)
  └─ export type AppType = typeof routes  // 自動更新
```

### 6.5 共有スキーマ追加時
```
apps/backend/src/db/schema.ts
  ├─ export const {feature}Schema = TaskModelSchema.omit({...}).extend({...})
  └─ export type {Feature}Input = z.infer<typeof {feature}Schema>

packages/shared/src/index.ts
  └─ export { {feature}Schema } from '../../../apps/backend/src/db/schema'
  └─ export type { {Feature}Input } from '../../../apps/backend/src/db/schema'
```

### 6.6 カスタムフック追加時
```
apps/frontend/hooks/use{Feature}.ts
  └─ export function use{Feature}() { ... }
```

### 6.7 ユーティリティ関数追加時
```
apps/frontend/lib/{feature}.ts  (フロント固有)
apps/backend/src/lib/{feature}.ts   (バック固有)
packages/shared/src/{feature}.ts    (共通)
  └─ export function {verb}{Noun}() { ... }  // 動詞+名詞
```

---

## 7. 略語一覧

| 略語 | 正式名称 | 日本語 |
|------|----------|--------|
| **API** | Application Programming Interface | API |
| **CI/CD** | Continuous Integration / Continuous Deployment | CI/CD |
| **CORS** | Cross-Origin Resource Sharing | クロスオリジンリソース共有 |
| **CRUD** | Create, Read, Update, Delete | CRUD |
| **DB** | Database | データベース |
| **DnD** | Drag and Drop | ドラッグ&ドロップ |
| **DOM** | Document Object Model | DOM |
| **E2E** | End-to-End | エンドツーエンド |
| **ESM** | ECMAScript Modules | ES モジュール |
| **FK** | Foreign Key | 外部キー |
| **HTTP** | HyperText Transfer Protocol | HTTP |
| **HTTPS** | HTTP Secure | HTTPS |
| **IDE** | Integrated Development Environment | 統合開発環境 |
| **INP** | Interaction to Next Paint | インタラクション応答性指標 |
| **JSON** | JavaScript Object Notation | JSON |
| **JWT** | JSON Web Token | JWT |
| **LTS** | Long Term Support | 長期サポート |
| **NPM** | Node Package Manager | npm |
| **ORM** | Object-Relational Mapping | ORM |
| **PK** | Primary Key | 主キー |
| **PR** | Pull Request | プルリクエスト |
| **RPC** | Remote Procedure Call | リモートプロシージャコール |
| **RSC** | React Server Component | React サーバーコンポーネント |
| **RTL** | React Testing Library | React Testing Library |
| **SAST** | Static Application Security Testing | 静的解析セキュリティテスト |
| **SQL** | Structured Query Language | SQL |
| **SSR** | Server-Side Rendering | サーバーサイドレンダリング |
| **TDD** | Test-Driven Development | テスト駆動開発 |
| **TTFB** | Time To First Byte | 初回バイト到達時間 |
| **UI** | User Interface | ユーザーインターフェース |
| **UX** | User Experience | ユーザー体験 |
| **WAL** | Write-Ahead Logging | 書き込み前ログ |
| **WCAG** | Web Content Accessibility Guidelines | ウェブコンテンツアクセシビリティガイドライン |
| **Zod** | Zod (固有名詞) | Zod |

---

## 8. 禁止用語・避けるべき表現

| 避ける表現 | 推奨表現 | 理由 |
|------------|----------|------|
| `data` (汎用的すぎる) | `boardData`, `taskList`, `columns` 等具体名 | 意図不明確 |
| `item` / `element` | `task`, `column`, `card` | ドメイン用語使用 |
| `handle` / `process` (動詞のみ) | `handleDragStart`, `processTaskCreation` | 目的語セットで |
| `util` / `helper` (ディレクトリ名) | `lib` / `hooks` / 機能名 | 役割明確化 |
| `type` / `kind` (区別フィールド) | `intent` (action 種別), `status` (状態) | 意味明確化 |
| `flag` / `flg` | `isEditing`, `hasError` | ブールは `is`/`has`/`can`/`should` |
| `tmp` / `temp` | 用途名 | 一時変数でも意図を名前に |
| `loader` / `action` (React Router 用語) | `page.tsx` (RSC), `actions.ts` (Server Actions) | Next.js 用語に統一 |
| `useFetcher` / `useFetchers` | `useActionState` | React 19 標準フック使用 |