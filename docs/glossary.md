# 用語定義・ユビキタス言語

> 命名規則（ファイル・変数・型・React/Zod/Hono RPC 固有、禁止識別子）は [`docs/conventions.md`](conventions.md#22-命名規則) が正本です。

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
| **ユースケース** | Use Case | アクターとシステムの対話フロー単位の仕様。`UC-xxx` 形式で ID 付与 | `docs/usecases.md`（振る舞いの正本） |
| **アクター** | Actor | システムの外部境界に関わる主体（ユーザー、間接アクター） | `ACT-xxx` (`docs/product.md`) |
| **事前条件** | Pre-conditions | ユースケース開始時点で満たすべき条件 | `docs/usecases.md` 各 UC |
| **事後条件** | Post-conditions | ユースケース成功/失敗後の状態 | `docs/usecases.md` 各 UC |
| **堅牢性分析** | Robustness Analysis (BCE) | ユースケースを Boundary/Control/Entity に分解する分析 | `docs/architecture.md` |

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

---

## 5. 略語一覧

| 略語 | 正式名称 | 日本語 |
|------|----------|--------|
| **API** | Application Programming Interface | API |
| **BCE** | Boundary-Control-Entity | 堅牢性分析の構成要素（境界-制御-データ） |
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
| **UC** | Use Case | ユースケース |
| **UX** | User Experience | ユーザー体験 |
| **WAL** | Write-Ahead Logging | 書き込み前ログ |
| **WCAG** | Web Content Accessibility Guidelines | ウェブコンテンツアクセシビリティガイドライン |
| **Zod** | Zod (固有名詞) | Zod |