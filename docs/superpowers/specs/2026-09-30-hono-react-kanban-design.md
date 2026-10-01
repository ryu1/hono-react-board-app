# Hono RPC × React Router v7 フルスタック Kanban アプリ設計書

**作成日**: 2026-09-30  
**ステータス**: 承認済み

---

## 1. 概要

pnpm ワークスペースを用いたモノレポ構成で、Hono RPC、React Router v7 (SPA モード)、Prisma ORM、Conform、Zod を組み合わせた End-to-End 型安全なインタラクティブ・タスクボード（カンバンアプリ）を構築する。

### 1.1 目的・ゴール

- フルスタック TypeScript による型安全な開発体験
- 楽観的 UI とネイティブ Drag & Drop による高速な操作感
- 最小限の依存関係で保守性の高いコードベース

### 1.2 スコープ

**含まれる機能**:
- カラム（Todo / In Progress / Done）の表示
- タスクの CRUD（作成・読取・更新・削除）
- タスクのドラッグ&ドロップによるカラム間移動
- インライン編集（タイトル・説明）
- 楽観的 UI（即座に反映、サーバー同期はバックグラウンド）
- Conform + Zod によるバリデーション

**含まない機能**:
- ユーザー認証・認可
- リアルタイム同期（WebSocket）
- 複数ボード対応
- タスクの並び替え（カラム内 position 更新のみ）

---

## 2. アーキテクチャ

### 2.1 ディレクトリ構造

```
my-fullstack-app/
├── pnpm-workspace.yaml
├── package.json                    # root scripts + concurrently
├── apps/
│   ├── backend/                    # Hono + Prisma
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts       # 生成 Zod スキーマのアダプタ
│   │   │   │   ├── index.ts        # DB connection (PrismaClient)
│   │   │   │   └── seed.ts         # Initial data seeding
│   │   │   └── index.ts            # Hono app with RPC routes
│   │   ├── prisma/
│   │   │   └── schema.prisma       # Prisma schema + @zod 注釈
│   │   ├── prisma.config.ts        # datasource URL 設定
│   │   └── package.json
│   └── frontend/                   # React Router v7 SPA
│       ├── app/
│       │   ├── client.ts           # Hono RPC client (hc)
│       │   ├── routes/
│       │   │   └── board.tsx       # Main board component
│       │   └── root.tsx            # Root layout
│       ├── vite.config.ts
│       └── package.json
└── packages/
    └── shared/                     # Shared Zod schemas + types
        ├── src/
        │   └── index.ts
        └── package.json
```

### 2.2 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|------------|
| Package Manager | pnpm | 12.8.2 |
| Runtime | Node.js | 26.10.0 |
| Backend Framework | Hono | latest |
| Database | SQLite (better-sqlite3) | latest |
| ORM | Prisma ORM | 7.x |
| Zod 生成 | prisma-zod-generator | 3.x |
| Validation | Zod | 3.25.x |
| Frontend Framework | React Router v7 (SPA) | latest |
| Forms | Conform | latest |
| Testing | Vitest + React Testing Library | latest |
| Dev Tooling | concurrently, TypeScript | latest |

### 2.3 データフロー

```
┌─────────────┐     RPC (hc)      ┌─────────────┐      Prisma      ┌──────────┐
│  Frontend   │ ◄───────────────► │   Backend   │ ◄─────────────►  │ SQLite   │
│ (React R7)  │   JSON + Types    │   (Hono)    │  Type-safe ORM   │(better-sqlite3)
└─────────────┘                   └─────────────┘                  └──────────┘
       │                                │
       │                                │
       ▼                                ▼
  useLoaderData                  zValidator + Prisma
  useFetcher (actions)           schema validation
  optimistic UI                  seed on startup
```

---

## 3. コンポーネント設計

### 3.1 共有パッケージ (`@my-app/shared`)

**責務**: バックエンドの Prisma スキーマから `prisma-zod-generator` により自動生成される Zod スキーマをフロントエンドへ中継・エクスポート

**エクスポート**:
- `insertTaskSchema` - タスク作成用 Zod スキーマ
- `insertColumnSchema` - カラム作成用 Zod スキーマ
- `CreateTaskInput` - `z.infer<typeof insertTaskSchema>` 型

### 3.2 バックエンド (`apps/backend`)

#### 3.2.1 データベーススキーマ (`prisma/schema.prisma` + `src/db/schema.ts`)

```typescript
// columns テーブル
- id: text (PK)
- title: text (NOT NULL)
- position: integer (NOT NULL)

// tasks テーブル
- id: text (PK)
- columnId: text (FK → columns.id, cascade delete)
- title: text (NOT NULL)
- description: text (nullable)
- position: integer (NOT NULL)
```

`src/db/schema.ts` は生成済み Zod スキーマ (`TaskModelSchema` / `ColumnModelSchema`) を import し、
`position` の文字列 coerce と `description` の nullish 正規化を行うアダプタとして機能する。

#### 3.2.2 API エンドポイント (`src/index.ts`)

| メソッド | パス | 説明 | バリデーション |
|----------|------|------|----------------|
| GET | `/api/board` | 全カラム・タスク取得 | - |
| POST | `/api/tasks` | タスク作成 | `insertTaskSchema` |
| PATCH | `/api/tasks/move` | タスク移動 (カラム・位置) | `moveTaskSchema` |
| DELETE | `/api/tasks/:id` | タスク削除 | - |
| PUT | `/api/tasks/update` | タスク詳細更新 | `updateTaskSchema` |

**共通**:
- CORS: `http://localhost:5173` 許可
- 起動時自動シード実行（初期カラム 3 つ）

#### 3.2.3 型定義

`AppType` を `hc<AppType>` 用にエクスポート

### 3.3 フロントエンド (`apps/frontend`)

#### 3.3.1 RPC クライアント (`app/client.ts`)

```typescript
import { hc } from 'hono/client'
import type { AppType } from '../../backend/src/index'

export const client = hc<AppType>('http://localhost:3000/')
```

#### 3.3.2 ボード画面 (`app/routes/board.tsx`)

**データ取得**: `loader` で `client.api.board.$get()`

**アクション** (`action`):
- `intent: 'create'` - Conform + Zod バリデーション後、`$post`
- `intent: 'delete'` - `$delete` (楽観的 UI 対応)
- `intent: 'update'` - `$put` (インライン編集保存)

**楽観的 UI**:
- `useFetchers` で削除アクションを検知し、即座にローカル state から除外
- 移動は `$patch` 後 `moveFetcher.load('/board')` で再取得

**Drag & Drop**:
- HTML5 標準 API (`onDragStart`, `onDragOver`, `onDrop`)
- `dataTransfer.setData('text/plain', taskId)` で ID 受け渡し

**インライン編集**:
- `editingTaskId` state で編集モード切替
- 専用 Form で `$put` 送信

#### 3.3.3 スタイリング

- インラインスタイル (`React.CSSProperties`)
- レスポンシブ非対応（固定 3 カラムレイアウト）

---

## 4. エラーハンドリング

### 4.1 バックエンド

- `zValidator` による自動バリデーション（失敗時 400 + エラー詳細）
- Prisma エラーは try-catch で捕捉、500 返却
- 存在しないリソース: 404（`updateMany` / `deleteMany` の count で判定）

### 4.2 フロントエンド

- `loader` 失敗時: `throw new Error` → React Router error boundary
- `action` 失敗時: Conform `submission.reply()` でフォームにエラー表示
- ネットワークエラー: トースト通知（未実装、将来拡張）

---

## 5. テスト戦略

### 5.1 単体テスト (Vitest)

| 対象 | ツール | 観点 |
|------|--------|------|
| Shared スキーマ | Vitest | Zod スキーマの型推論・バリデーション |
| Backend ルート | Vitest + Hono test client | 各エンドポイントの正常/異常系 |
| Conform フォーム | Vitest | parseWithZod の振る舞い |

### 5.2 統合テスト (React Testing Library)

| 対象 | 観点 |
|------|------|
| Board コンポーネント | レンダリング、フォーム送信、削除、編集モード切替 |
| Drag & Drop | ユーザー操作シミュレーション（fireEvent） |
| 楽観的 UI | fetcher 経由の即座な UI 更新 |

### 5.3 E2E テスト (将来拡張)

- Playwright で実ユーザーシナリオ検証

---

## 6. 開発ワークフロー

### 6.1 初回セットアップ

```bash
cd my-fullstack-app
pnpm install                 # postinstall で prisma generate が自動実行
cd apps/backend && pnpm db:push
cd ../..
pnpm dev
```

### 6.2 開発コマンド

| コマンド | 説明 |
|----------|------|
| `pnpm dev` | Backend (3000) + Frontend (5173) 同時起動 |
| `pnpm dev:backend` | Backend のみ起動 |
| `pnpm dev:frontend` | Frontend のみ起動 |
| `pnpm test` | 全テスト実行 |
| `pnpm test:backend` | Backend テストのみ |
| `pnpm test:frontend` | Frontend テストのみ |

### 6.3 ポート構成

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- CORS: Frontend → Backend 許可

---

## 7. 今後の拡張余地

1. **認証追加**: Hono middleware + JWT、React Router loader でユーザー取得
2. **リアルタイム**: WebSocket (Hono ws) + React Router subscriptions
3. **複数ボード**: `boards` テーブル追加、ルートパラメータで切替
4. **並び替え**: `@dnd-kit` 導入、position 正規化バッチ処理
5. **PostgreSQL 移行**: Prisma datasource provider 変更のみで移行可能

---

## 8. 承認記録

- [x] 設計レビュー完了
- [x] ユーザー承認取得 (2026-09-30)
- [ ] 実装計画作成 (次のステップ)