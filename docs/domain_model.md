# ドメインモデル

> ユビキタス言語に基づくドメインオブジェクトの定義書です。用語とコード上の命名対応は [`docs/glossary.md`](glossary.md)、ユースケース仕様は [`docs/usecases.md`](usecases.md) を参照してください。
> 物理データモデル（ER図・テーブル定義）は [`docs/architecture.md`](architecture.md) が正本です。

## 1. ドメイン概要

本システムは**スプリント（Sprint）単位でカンバンボードを管理する**。ドメインの中核概念は **スプリント（Sprint）**、**カラム（Column）**、**タスク（Task）** の 3 つであり、スプリントは名前と期間（開始日・終了日）を持ち、専用のカラム群を所有する。タスクは必ず 1 つのカラムに所属し、カラム内で順序を持つ。

- **スプリント（Sprint）**: 名前と期間（開始日・終了日）を持ち、専用カンバンボードを所有する作業期間の単位
- **ボード（Board）**: 指定スプリントに属する Column 群 + Task 群の論理的集約。独立エンティティではなく、スプリントに従属する論理的な集約として扱う
- **カラム（Column）**: タスクを分類する縦の列（Todo / In Progress / Done）。固定 3 つ、スプリント毎に生成
- **タスク（Task）**: 作業単位。タイトル・説明・所属カラム・カラム内順序を持つ

## 2. ドメインオブジェクト図

```mermaid
classDiagram
    class Sprint {
        <<entity>>
        +id: string
        +name: string
        +startDate: string
        +endDate: string
    }

    class Board {
        <<aggregate>>
        +columns: Column[]
        +tasks: Task[]
    }

    class Column {
        <<entity>>
        +id: string
        +title: string
        +position: number
        +sprintId: string
    }

    class Task {
        <<entity>>
        +id: string
        +columnId: string
        +title: string
        +description: string | null
        +position: number
    }

    Sprint "1" *-- "3" Column : owns (fixed)
    Sprint "1" *-- "1" Board : aggregate
    Board "1" *-- "3" Column : contains
    Board "1" *-- "0..*" Task : contains
    Column "1" *-- "0..*" Task : owns
    Task --> Column : columnId (FK)
```

| 分類 | オブジェクト | 説明 |
|------|-------------|------|
| エンティティ | `Sprint` | 名前と期間（開始日・終了日）を持ち、3 カラムを所有する作業期間の単位 |
| 集約ルート（論理） | `Board` | 指定スプリントに属するカラム群とタスク群を包含するボード全体。API レスポンス `BoardResponse` として表現 |
| エンティティ | `Column` | スプリント毎の固定 ID（`col-<sprintId>-todo` 等）を持ち、位置とタスク集合を管理する |
| エンティティ | `Task` | UUID ID を持ち、所属カラムと順序・内容を持つ |

## 3. ビジネスルール

| ルール ID | ルール | 関連 UC |
|-----------|--------|---------|
| BR-D01 | タスクは必ず 1 つのカラムに所属する（`columnId` は NOT NULL FK） | UC-002, UC-003 |
| BR-D02 | カラムは固定 3 つ（Todo 📝 / In Progress 🚀 / Done ✅、position 0/1/2）。追加・削除・改名はスコープ外。所有者はグローバルからスプリント毎に変更 | UC-001, UC-007 |
| BR-D03 | タスクの `title` は 1 文字以上必須。`description` は任意（null 許容） | UC-002, UC-004 |
| BR-D04 | タスクの `position` は 0 以上の整数。カラム内の並び順を表す | UC-002, UC-003 |
| BR-D05 | カラム削除時、配下タスクはカスケード削除される（`onDelete: Cascade`）※カラム自体の削除はスコープ外 | - |
| BR-D06 | タスクの存在しない ID への更新・削除・移動は 404 とする（`updateMany`/`deleteMany` の `count` で判定） | UC-003, UC-004, UC-005 |
| BR-D07 | タスク作成時の `id` はクライアントが `crypto.randomUUID()` で生成する（UUID v4） | UC-002 |
| BR-D08 | スプリント期間は `開始日 ≤ 終了日` | UC-007, UC-008 |
| BR-D09 | スプリント作成時に固定 3 カラム（Todo 📝 / In Progress 🚀 / Done ✅、position 0/1/2）をトランザクションで生成する | UC-007 |
| BR-D10 | スプリント削除は配下カラム・タスクを巻き込む不可逆操作 | UC-009 |

## 4. タスクのライフサイクル・状態遷移

タスクには明示的なステータスフィールドはない。**所属カラム（`columnId`）の組み合わせが事実上の状態**であり、カンバンの各列が進捗状態を表す。

```mermaid
stateDiagram-v2
    [*] --> Todo : UC-002 タスク作成
    [*] --> InProgress : UC-002 タスク作成
    [*] --> Done : UC-002 タスク作成

    Todo --> InProgress : UC-003 タスク移動
    InProgress --> Done : UC-003 タスク移動
    Done --> InProgress : UC-003 タスク移動
    InProgress --> Todo : UC-003 タスク移動
    Todo --> Done : UC-003 タスク移動
    Done --> Todo : UC-003 タスク移動

    Todo --> [*] : UC-005 タスク削除
    InProgress --> [*] : UC-005 タスク削除
    Done --> [*] : UC-005 タスク削除
```

| 遷移 | トリガー | 変更される属性 |
|------|---------|---------------|
| 作成 | UC-002 タスク作成 | `id`（新規 UUID）, `columnId`, `title`, `description`, `position` |
| カラム間移動 | UC-003 タスク移動 | `columnId`, `position` |
| カラム内並び替え | UC-003 タスク移動（同カラム） | `position` ※現状の実装は末尾固定値 `999` |
| 内容更新 | UC-004 タスク編集 | `title`, `description` |
| 削除 | UC-005 タスク削除 | レコード削除（物理削除） |

## 5. エンティティの不変条件

| 対象 | 不変条件 |
|------|---------|
| `Column` | `position` は 0, 1, 2 の固定値。`id` は `col-todo` / `col-progress` / `col-done` |
| `Task` | `columnId` は必ず既存カラム ID を参照する。`title` は空文字不可。`position` は 0 以上 |
| `Board` | 表示時、カラムは `position` 昇順、タスクは所属カラム内 `position` 昇順 |
