# 技術選定書

## 1. テクノロジースタック

| レイヤー | 技術 | バージョン | 選定理由 |
|----------|------|------------|----------|
| **Package Manager** | pnpm | 12.8.2 | ワークスペース対応、高速、ディスク効率良好 |
| **Runtime** | Node.js | 26.10.0 | 最新安定版、ESM ネイティブ対応 |
| **Backend Framework** | Hono | 4.6.x | 軽量、高速、RPC 型推論ネイティブ対応 |
| **Database** | SQLite (better-sqlite3) | 最新 | ファイルベース、ゼロ設定、Prisma Adapter 対応 |
| **ORM** | Prisma ORM | 7.10.x | 型安全、成熟したエコシステム、Prisma Zod Generator 連携 |
| **Zod 生成** | prisma-zod-generator | 3.3.x | Prisma スキーマから Zod スキーマ自動生成 (pureModels) |
| **Validation** | Zod | 3.25.x | TypeScript ファースト、Hono/Conform と親和性高 |
| **Frontend Framework** | Next.js | 15.1.x | App Router、RSC、Server Actions、型安全ルーティング |
| **UI Library** | React | 19.0.x | 最新安定版、Concurrent Features、Server Components |
| **Forms** | Conform | 1.2.x | Progressive Enhancement、Zod ネイティブ、Server Actions 連携 |
| **Testing** | Vitest | 3.0.x | Vite ネイティブ、高速、ESM 対応、jsdom 環境 |
| **Testing (React)** | React Testing Library | 16.0.x | ユーザー視点テスト、アクセシビリティ重視 |
| **E2E Testing** | Playwright | 1.63.x | 実ブラウザ、クロスブラウザ、CI 統合 |
| **Dev Tooling** | concurrently, TypeScript | 最新 | 複数プロセス同時実行、型チェック |

---

## 2. 開発ツール選定理由

### 2.1 リンター・フォーマッター

| ツール | 採用 | 理由 |
|--------|------|------|
| **TypeScript (tsc)** | ✅ | 型チェック専用、ビルドレス検証、`strict: true` |
| **ESLint** | ⚠️ | Next.js 標準 (`next lint`)、必要最小限 |
| **Prettier** | ⚠️ | Next.js 標準統合、フォーマット統一 |

> **注意**: 本プロジェクトでは主に `tsc --noEmit` と Next.js 標準ツールで品質担保。

### 2.2 テストフレームワーク

| ツール | 採用 | 理由 |
|--------|------|------|
| **Vitest** | ✅ | Vite 統合、Node/jsdom 両環境、高速、TypeScript ネイティブ |
| **React Testing Library** | ✅ | 実装詳細非依存、ユーザー操作シミュレーション |
| **@testing-library/user-event** | ✅ | よりリアルなユーザーインタラクション |
| **jsdom** | ✅ | ブラウザ環境模擬、軽量 |
| **Playwright** | ✅ | 実ブラウザ E2E、クロスブラウザ、CI 統合 |

> **不採用**: Jest (Vitest で代替)

### 2.3 CI/CD

| ツール | 採用 | 理由 |
|--------|------|------|
| **GitHub Actions** | ✅ | リポジトリ統合、無料枠充実、マトリックスビルド対応 |

---

## 3. 技術的制約と要件

### 3.1 動作環境

| 環境 | 要件 |
|------|------|
| **Node.js** | 26.10.0 以上 (`.tool-versions` で固定) |
| **pnpm** | 12.8.2 以上 (`.tool-versions` で固定) |
| **OS** | Linux, macOS, Windows (WSL2 推奨) |
| **ブラウザ** | モダンブラウザ (ES2022 対応、RSC 対応) |

### 3.2 バージョン要件

| パッケージ | 制約 | 理由 |
|------------|------|------|
| `react` / `react-dom` | `^19.0.0` | React 19 固定、RSC・Server Actions 対応 |
| `next` | `15.1.x` | Next.js 15 系列固定 (App Router 安定版) |
| `hono` | `^4.6.0` | v4 系列固定 |
| `prisma` / `@prisma/client` | `^7.10.0` | v7 系列固定 |
| `zod` | `^3.25.0` | v3 系列固定 |
| `typescript` | `^5.6.0` | v5 系列固定 |

### 3.3 インフラ制約

| 項目 | 制約 |
|------|------|
| **データベース** | SQLite (ファイルベース)、本番は PostgreSQL/Turso 移行可能 |
| **ポート** | Backend: 3001, Frontend: 3000 (開発時) |
| **CORS** | `http://localhost:3000`, `http://localhost:3001` 許可 |
| **HTTPS** | 開発時は HTTP、本番はリバースプロキシで終端 |

### 3.4 パフォーマンス要件

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| **初回ロード (TTFB)** | < 200ms | Lighthouse / Web Vitals |
| **初回レンダリング (FCP)** | < 500ms | Lighthouse |
| **インタラクション遅延 (INP)** | < 100ms | 手動計測 / Web Vitals |
| **API レスポンス (p95)** | < 100ms | `wrk` / `hey` 負荷テスト |
| **フロントエンドバンドル** | 適切なサイズ | `next build` 後確認 |
| **テスト実行時間 (全パッケージ)** | < 60秒 | `pnpm test` (E2E 除く) |

---

## 4. アーキテクチャ決定記録 (ADR)

### ADR-001: pnpm ワークスペース + モノレポ採用
- **ステータス**: 採用
- **背景**: フロント・バック・共有スキーマを単一リポジトリで管理し、型共有を容易にする
- **決定**: `apps/*`, `packages/*` 構成で pnpm ワークスペース構築
- **影響**: 依存解決高速化、バージョン統一、CI 簡素化

### ADR-002: Hono RPC (`hc<AppType>`) で型安全性確保
- **ステータス**: 採用
- **背景**: OpenAPI/Swagger 定義の二重管理を避け、TypeScript ネイティブな型推論を実現
- **決定**: バックエンドで `AppType` export、フロントで `hc<AppType>` インポート
- **影響**: エンドポイント変更時コンパイルエラーで検知、ドキュメント自動同期

### ADR-003: Prisma ORM + prisma-zod-generator でスキーマ単一管理
- **ステータス**: 採用
- **背景**: Drizzle より成熟、Zod スキーマ自動生成でバリデーション二重定義排除、pureModels で型安全
- **決定**: `prisma-zod-generator` の `pureModels: true` で Zod 生成、`omit`/`extend` でフロント用調整
- **影響**: スキーマ変更時に型・バリデーション自動追従、Prisma マイグレーション連携

### ADR-004: Next.js 15 App Router (RSC + Server Actions) 採用
- **ステータス**: 採用
- **背景**: React 19 の Server Components・Actions をネイティブ活用、SEO・初期表示高速化、型安全
- **決定**: `app/` ディレクトリで RSC (`page.tsx`) + Server Actions (`actions.ts`) + Client Components (`components/`)
- **影響**: データ取得はサーバー完結、ミューテーションは Server Actions、バンドルサイズ削減

### ADR-005: Conform + Zod でフォーム管理
- **ステータス**: 採用
- **背景**: React Hook Form 等の外部状態管理ライブラリ非依存、Progressive Enhancement 対応、Server Actions とネイティブ連携
- **決定**: `useForm` + `parseWithZod` + `submission.reply()` パターン、Client Component で使用
- **影響**: JS 無効時もフォーム送信可能、バリデーションロジック共通化、Server Actions との相性良好

### ADR-006: インラインスタイル (`React.CSSProperties`) 採用
- **ステータス**: 採用
- **背景**: CSS ファイル・Tailwind 等のビルド依存排除、TypeScript でスタイルも型安全、ランタイムオーバーヘッド最小
- **決定**: 全スタイルを `const styles: Record<string, React.CSSProperties>` で定義
- **影響**: CSS 抽出不要、ホットリロード高速、テーマ切替は将来 CSS 変数で対応

### ADR-007: HTML5 標準 Drag & Drop API 採用
- **ステータス**: 採用
- **背景**: `@dnd-kit` 等の重いライブラリ非依存、ネイティブ API で十分な機能、バンドルサイズ削減
- **決定**: `onDragStart`, `onDragOver`, `onDrop` で実装
- **影響**: 依存ゼロ、アクセシビリティ対応は自前実装必要

### ADR-008: Server Actions でミューテーション実装 (楽観的 UI 不採用)
- **ステータス**: 採用
- **背景**: Next.js Server Actions でサーバー側処理完結、クライアント状態管理簡素化
- **決定**: `'use server'` 関数でフォーム処理、RPC 経由でバックエンド呼び出し、ローカル楽観的更新は当面見送り
- **影響**: 実装簡素、再取得・ロールバックは将来拡張、UX は通常のフォーム送信相当

---

## 5. 依存関係グラフ

```mermaid
graph TD
    subgraph Root
        ROOT[package.json]
        ROOT --> CONCURRENTLY[concurrently]
    end

    subgraph Backend
        BE[apps/backend]
        BE --> HONO[hono]
        BE --> HONO_ZOD[@hono/zod-validator]
        BE --> HONO_NODE[@hono/node-server]
        BE --> PRISMA_CLIENT[@prisma/client]
        BE --> PRISMA_ADAPTER[@prisma/adapter-better-sqlite3]
        BE --> ZOD[zod]
        BE --> VITEST[vitest]
        BE --> TSX[tsx]
        BE --> PRISMA[prisma]
        BE --> PRISMA_ZOD_GEN[prisma-zod-generator]
    end

    subgraph Frontend
        FE[apps/frontend]
        FE --> NEXT[next]
        FE --> REACT[react]
        FE --> REACT_DOM[react-dom]
        FE --> HONO_CLIENT[hono/client]
        FE --> CONFORM_R[@conform-to/react]
        FE --> CONFORM_ZOD[@conform-to/zod]
        FE --> ZOD2[zod]
        FE --> SHARED[@my-app/shared]
        FE --> VITEST2[vitest]
        FE --> JSDOM[jsdom]
        FE --> RTL[@testing-library/react]
        FE --> JEST_DOM[@testing-library/jest-dom]
        FE --> USER_EVENT[@testing-library/user-event]
        FE --> PLAYWRIGHT[playwright]
    end

    subgraph Shared
        SH[packages/shared]
        SH --> ZOD3[zod]
        SH --> VITEST3[vitest]
        SH -.->|re-export| BE_SCHEMA[backend/src/db/schema.ts]
    end

    BE -.->|export AppType| FE
    BE -.->|export schemas| SH
    SH -.->|re-export schemas| FE
```

---

## 6. 既知の技術的負債・制限事項

| 項目 | 内容 | 対応方針 |
|------|------|----------|
| **認証なし** | 全 API 公開状態 | 将来 Hono middleware + JWT で実装 |
| **楽観的 UI なし** | Server Action 完了後ローカル状態更新なし | `useOptimistic` (React 19) または手動再取得で実装予定 |
| **位置正規化なし** | 移動時 `position: 999` 固定、重複許容 | 正規化バッチ処理または `@dnd-kit` 導入時に実装 |
| **レスポンシブ非対応** | 固定 3 カラム 300px | CSS Grid / Flexbox + メディアクエリで対応予定 |
| **ダークモード非対応** | ライトモード固定 | CSS カスタムプロパティ + `prefers-color-scheme` で対応予定 |
| **E2E テスト最小限** | 基本フローのみ | Playwright でシナリオ拡充予定 |
| **ログ出力最小限** | `console.error` のみ | 構造化ログ (pino 等) 導入予定 |
| **Error Boundary 未実装** | RSC エラー時のフォールバック UI なし | `app/error.tsx` 実装予定 |
| **Prisma generated client コミット** | `generated/prisma/` が Git 管理下 | `.gitignore` 追加、CI で生成推奨 |