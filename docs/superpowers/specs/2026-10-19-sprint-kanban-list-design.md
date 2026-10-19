# スプリント対応カンバン一覧画面 設計書

**作成日**: 2026-10-19
**ステータス**: 承認済み（チャット内でセクション毎に合意済み）

---

## 1. 概要

スプリント単位でカンバンボードを管理するための「スプリント一覧画面」を追加する。1 スプリント = 1 カンバンボードとし、トップ `/` をスプリント一覧、`/sprints/[id]` をカンバン画面とする。

### 1.1 目的・ゴール

- スプリント毎に独立したカンバンボードを持ち、スプリント間でタスクを混在させない
- 一覧画面からスプリントの進捗（完了タスク率）を俯瞰できる
- スプリントの作成・編集・削除を画面から行える

### 1.2 スコープ

**含まれる機能**:

- スプリント一覧画面（表示項目: 名前・期間・タスク数・進捗率、開始日降順）
- スプリント CRUD（作成・編集・削除）フォーム
- スプリント毎のカンバン画面（`/sprints/[id]`、既存 `<Board>` を再利用）
- スプリント作成時に 3 カラム（Todo / In Progress / Done）を自動生成
- 進捗率 = Done タスク数 ÷ 全タスク数（タスク 0 件は 0%、小数第 1 位に丸め）

**含まない機能**:

- スプリントの状態管理（計画中/進行中/完了 などのステータス）
- 期限超過表示・ベロシティ・振り返り等のスプリントメタデータ
- カラム構成のカスタマイズ（固定 3 カラムのまま = BR-D02 維持）
- 認証・認可、リアルタイム同期（従来どおりスコープ外）
- 既存のタスク CRUD・移動操作後の手動リロード課題（タスク操作系 Server Action は従来どおり変更しない。`revalidatePath` はスプリント操作の Server Action のみに適用）

### 1.3 前提・決定事項

| 項目 | 決定 |
|---|---|
| スプリントとボードの関係 | 1 スプリント = 1 カンバンボード（案 1: `Sprint` を親とし `Column.sprintId` で直接所属） |
| スプリントの持つ情報 | 名前・開始日・終了日（状態は持たない） |
| 既存データ | 手動移行なし。スキーマ新造、既存 `local.db` のデータは無視 |
| データモデル案 | `Board` エンティティは作らない（論理的集約の定義を踏襲） |

---

## 2. ドメインモデル・データモデル

### 2.1 Prisma スキーマ変更（`apps/backend/prisma/schema.prisma`）

```prisma
model Sprint {
  id        String   @id
  /// @zod.min(1, 'タイトルは必須です')
  name      String
  startDate String   // ISO 日付文字列 (YYYY-MM-DD)
  endDate   String
  columns   Column[]

  @@map("sprints")
}

model Column {
  id       String
  /// @zod.min(1, 'タイトルは必須です')
  title    String
  position Int
  sprintId String @map("sprint_id")
  sprint   Sprint @relation(fields: [sprintId], references: [id], onDelete: Cascade)
  tasks    Task[]

  @@map("columns")
}

model Task {
  // 変更なし
}
```

- ID はクライアント供給の文字列（現行パターン踏襲）
- スキーマ変更は `prisma db push`（マイグレーションなし、現行運用どおり）
- 既存データとの整合は取らない（開発段階のため `local.db` を作り直してよい）

### 2.2 削除ルール

- スプリント削除 → カラムをカスケード削除 → タスクも現行のカスケードで削除（不可逆）

### 2.3 ビジネスルール

| ID | ルール | 扱い |
|---|---|---|
| BR-008 | 「複数ボード対応はスコープ外」 | 「スプリント単位の複数ボード対応」に**反転** |
| BR-D02 | カラムは固定 3 つ（追加・削除・改名はスコープ外） | **維持**。ただし所有者がグローバル→スプリント毎に変更 |
| 新規 | スプリント期間は `startDate ≤ endDate` | Zod バリデーションで保証（API・フォームの二重ガード） |

### 2.4 ユースケース（`docs/usecases.md`）

| UC | 内容 |
|---|---|
| UC-006 | スプリント一覧表示（進捗率・タスク数を含む） |
| UC-007 | スプリント作成（3 カラム自動生成） |
| UC-008 | スプリント編集（名前・期間） |
| UC-009 | スプリント削除（配下ごと） |
| UC-001 改訂 | 「指定スプリントのボード表示」（旧「単一ボード表示」から改訂） |

---

## 3. API 設計（`docs/api.md` 更新）

### 3.1 エンドポイント

| Method | Path | 説明 | バリデーション |
|---|---|---|---|
| GET | `/api/sprints` | 一覧。`startDate` 降順。各要素に集計を含む | なし |
| POST | `/api/sprints` | 作成 + 3 カラム自動生成（トランザクション） | `insertSprintSchema` |
| PATCH | `/api/sprints/:id` | 名前・期間を更新 | `updateSprintSchema` |
| DELETE | `/api/sprints/:id` | 配下カラム・タスクごと削除 | なし（404） |
| GET | `/api/sprints/:id/board` | 指定スプリントの `{ columns, tasks }` | なし（404） |

- **旧 `GET /api/board` は削除**（アプリ内に旧 API を利用する他者なし）
- 旧 API を起動テストで参照していた `apps/backend/src/server.test.ts` は新 API に更新

### 3.2 レスポンス例

```json
// GET /api/sprints
[
  {
    "id": "…", "name": "スプリント2",
    "startDate": "2026-10-13", "endDate": "2026-10-26",
    "taskCount": 8, "doneCount": 3, "progress": 37.5
  }
]
```

- `progress` はサーバー側で計算。`doneCount / taskCount * 100`、小数第 1 位に丸め（`Math.round(x * 10) / 10`）。タスク 0 件は `0`
- 400（Zod flattened errors）・404（`updateMany/deleteMany` の count チェック）は現行パターンを踏襲

### 3.3 スキーマ

- `insertSprintSchema`: `id`（クライアント生成 `randomUUID`）、`name`（必須・min 1）、`startDate` / `endDate`（`YYYY-MM-DD` 形式 + `start ≤ end` の refine）
- `updateSprintSchema`: `name` / `startDate` / `endDate`（`id` 除く）
- `packages/shared` から再エクスポート（現行パターン踏襲）

---

## 4. 画面・ルーティング・UI フロー

### 4.1 ルート構成

| ルート | ファイル | 種別 | 責務 |
|---|---|---|---|
| `/` | `apps/frontend/app/page.tsx`（改訂） | RSC | `GET /api/sprints` → 一覧＋作成フォーム |
| `/sprints/[id]` | `apps/frontend/app/sprints/[id]/page.tsx`（新規） | RSC | `GET /api/sprints/:id/board` → 既存 `<Board>` |

- 命名規約は `docs/conventions.md` の `{Route}Page` パターンに従う
- 詳細ページで 404 → `notFound()` → ルート直下の `not-found.tsx`（新規）で表示
- 既存 `<Board>` はほぼ無変更で再利用。ヘッダーにスプリント名・期間・一覧へ戻るリンクを追加する最小限

### 4.2 一覧画面構成（インラインスタイルのみ = BR-005）

```
┌─────────────────────────────────────┐
│ スプリント一覧                       │
│ ┌─────────────────────────────────┐ │
│ │ ＋ 新規スプリント作成（フォーム） │ │  ← 名前/開始/終了 + 送信
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ スプリント2   10/13〜10/26       │ │  ← カード全体がリンク
│ │ ████████░░░░  37.5% (3/8)  ✎ 🗑 │ │     編集・削除はカード内の操作
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- 並び順: `startDate` 降順（API 側で保証）
- 進捗: 水平バー + `%` + `(done/total)`。NFR-005 対応でバーに `role="progressbar"` / `aria-valuenow` を付与
- 編集: カード内 ✎ → インライン編集フォーム切替（既存 `TaskCard` パターン踏襲）
- 削除: 🗑 → `window.confirm`（既存タスク削除の挙動に合わせる）→ 削除
- フォーム: Conform + Zod（既存 `CreateForm` パターン踏襲）、Server Action 経由

### 4.3 Server Actions（`apps/frontend/app/actions.ts` 追加）

`createSprintAction` / `updateSprintAction` / `deleteSprintAction`
（命名は `docs/conventions.md` の `{verb}{Noun}Action` パターン）

- 実行後に `revalidatePath` で一覧 / 詳細を更新
- 既存ボード画面の「手動リロード必須」課題は今回のスコープ外（新画面のみ解消）

---

## 5. エラー処理

- **API**: 400 / 404 の形式は現行仕様を踏襲。スプリント不存在時も同一形式
- **詳細ページ**: `GET /api/sprints/:id/board` が 404 → `notFound()` を投げる
- **フォーム**: Conform のフィールドエラー表示。期間逆転はフォーム側 Zod と API 側の二重ガード

---

## 6. テスト計画（TDD: まず失敗するテストを書く）

| 層 | 対象 | 内容 |
|---|---|---|
| バックエンド単体（Vitest） | `/api/sprints` CRUD | 作成時 3 カラム生成・一覧の降順と progress 計算・400（期間逆転含む）・404・削除カスケード |
| バックエンド | `/api/sprints/:id/board` | 正常取得・404・他スプリントのタスクが混入しないこと |
| Zod スキーマ | `insertSprintSchema` | 期間形式・`start ≤ end`・name 必須 |
| フロント単体（RTL） | 一覧ページコンポーネント | 一覧表示・進捗率表示・作成/編集/削除インタラクション（Server Action は `vi.mock`、既存パターン踏襲） |
| E2E（Playwright） | 主要フロー | スプリント作成 → 一覧で確認 → 詳細へ遷移 → タスク作成 → 一覧へ戻り進捗率更新を確認（既存 E2E 同様 `page.reload()` を許容） |

---

## 7. ドキュメント同期（同一変更内で、AGENTS.md に従う）

| 正本 | 更新内容 |
|---|---|
| `docs/product.md` | BR-008 反転、新機能 F-009〜、UC マッピング、システム境界 |
| `docs/usecases.md` | UC-006〜009 追加、UC-001 改訂 |
| `docs/domain_model.md` | Sprint エンティティ、状態遷移、BR 追加 |
| `docs/api.md` | 新エンドポイント 5 件、旧 `/api/board` 削除、§10 将来拡張の反映 |
| `docs/architecture.md` | ER 図・BCE マッピング・データフロー更新 |
| `docs/design.md` | 一覧画面のコンポーネント仕様・進捗バー仕様 |
| `docs/glossary.md` | Sprint/スプリント の用語追加 |
| `docs/conventions.md` | 追加コードの命名規約反映 |

---

## 8. スコープ外（明示的に今回やらないこと）

- スプリントの状態（計画中/進行中/完了）管理
- 期限超過表示、ベロシティ、振り返り
- カラム構成のカスタマイズ
- 既存のタスク CRUD・移動操作系 Server Action への `revalidatePath` 追加（スプリント操作のみ対応）
- タスクのカラム内並び替え（現行どおり未実装のまま）
