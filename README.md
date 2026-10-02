<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo.svg">
    <img src="docs/images/logo.svg" alt="Hono React Board App Logo" width="180" height="180">
  </picture>
</p>

<p align="center">
  <em>End-to-End 型安全なフルスタック・カンバンアプリ</em>
</p>

<p align="center">
  <a href="https://github.com/ryu1/hono-react-board-app/actions/workflows/ci.yml">
    <img src="https://github.com/ryu1/hono-react-board-app/actions/workflows/ci.yml/badge.svg" alt="CI Status">
  </a>
  <a href="https://pnpm.io/">
    <img src="https://img.shields.io/badge/pnpm-12.8.2-F69220?logo=pnpm&logoColor=white" alt="pnpm version">
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-26.10.0-339933?logo=node.js&logoColor=white" alt="Node.js version">
  </a>
  <a href="https://hono.dev/">
    <img src="https://img.shields.io/badge/Hono-4.6-E36002?logo=hono&logoColor=white" alt="Hono version">
  </a>
  <a href="https://nextjs.org/">
    <img src="https://img.shields.io/badge/Next.js-15.1-000000?logo=next.js&logoColor=white" alt="Next.js version">
  </a>
  <a href="https://www.prisma.io/">
    <img src="https://img.shields.io/badge/Prisma-7.10-2D3748?logo=prisma&logoColor=white" alt="Prisma version">
  </a>
  <a href="https://zod.dev/">
    <img src="https://img.shields.io/badge/Zod-3.25-3E67B1?logo=zod&logoColor=white" alt="Zod version">
  </a>
  <a href="https://conform.guide/">
    <img src="https://img.shields.io/badge/Conform-1.2-000000?logo=conform&logoColor=white" alt="Conform version">
  </a>
  <a href="https://vitest.dev/">
    <img src="https://img.shields.io/badge/Vitest-3.0-6E9F18?logo=vitest&logoColor=white" alt="Vitest version">
  </a>
  <a href="https://playwright.dev/">
    <img src="https://img.shields.io/badge/Playwright-1.63-2EAD33?logo=playwright&logoColor=white" alt="Playwright version">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript version">
  </a>
</p>

---

## 🚀 概要

**Hono RPC × Next.js 15 Kanban App** は、フルスタック TypeScript による **End-to-End 型安全** なインタラクティブ・タスクボード（カンバンアプリ）です。

### 主な特長

- 🔒 **完全な型安全性**: Hono RPC (`hc<AppType>`) によるフロント・バック間の型共有、OpenAPI 定義不要
- ⚡ **モダンなデータフロー**: Next.js 15 App Router (RSC + Server Actions) でサーバーファースト
- 📦 **最小依存**: 認証・WebSocket・重い状態管理ライブラリなし、コア機能に集中
- 🎯 **モダンスタック**: React 19, Next.js 15 (RSC/Server Actions), Prisma ORM, Zod, Conform
- 🧪 **テストファースト**: Vitest + React Testing Library + Playwright で TDD 実践
- 🎨 **ゼロ CSS**: インラインスタイル (`React.CSSProperties`) のみ、ビルド不要

---

## 📚 ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [`docs/product.md`](docs/product.md) | プロダクトビジョン・要件・ユーザーストーリー・成功の定義 |
| [`docs/architecture.md`](docs/architecture.md) | システム構成・データモデル・コンポーネント設計・データフロー |
| [`docs/design.md`](docs/design.md) | GUI デザイン・カラーパレット・タイポグラフィ・コンポーネント仕様・アクセシビリティ |
| [`docs/api.md`](docs/api.md) | **REST API 仕様の唯一の正本** (エンドポイント・リクエスト/レスポンス・エラー・バリデーション) |
| [`docs/tech.md`](docs/tech.md) | 技術選定理由・制約・パフォーマンス要件・ADR |
| [`docs/conventions.md`](docs/conventions.md) | コーディング規約・命名規則・テスト規約・Git 規約・セットアップ・CI/CD |
| [`docs/security.md`](docs/security.md) | 脅威モデル・バリデーション・インジェクション対策・通信セキュリティ・既知リスク |
| [`docs/operations.md`](docs/operations.md) | 環境変数・日常運用・ログ・障害切り分け・デプロイチェックリスト |
| [`docs/review.md`](docs/review.md) | レビュー観点・PR プロセス・承認ルール・コメントガイドライン・セルフレビュー |
| [`docs/glossary.md`](docs/glossary.md) | ユビキタス言語・英日対応表・命名規則パターン |
| [`docs/documentation-guideline.md`](docs/documentation-guideline.md) | ドキュメント作成・更新規約・完了チェックリスト |

---

## 🔗 重要リンク

- **API 仕様**: [`docs/api.md`](docs/api.md) (唯一の正本)
- **リポジトリ**: [`github.com/ryu1/hono-react-board-app`](https://github.com/ryu1/hono-react-board-app)
- **用語定義**: [`docs/glossary.md`](docs/glossary.md)
