# GUI デザイン設計書

## 1. デザインコンセプト・トーン&マナー

### コンセプト
**「超高速・型安全・ミニマル」** — フルスタック TypeScript の型安全性を視覚的にも体感できる、余計な装飾を排した機能美を追求する。

### トーン&マナー
- **クリーン**: 余白を活かし、情報密度を適度に保つ
- **高速感**: スナップするようなアニメーションレスな切り替え
- **信頼感**: 青系のアクセントカラーで「型安全」を暗示
- **親しみやすさ**: 絵文字（📝 🚀 ✅）でカラムの役割を直感的に伝達

---

## 2. カラーパレット

| 用途 | カラー名 | Hex / RGB | 使用箇所 |
|------|----------|-----------|----------|
| **背景（全体）** | Slate 50 | `#f8fafc` / `rgb(248, 250, 252)` | ページ全体背景 |
| **カラム背景** | Slate 100 | `#f1f5f9` / `rgb(241, 245, 249)` | カラムコンテナ |
| **カード背景** | White | `#ffffff` / `rgb(255, 255, 255)` | タスクカード |
| **ボーダー** | Slate 200 | `#e2e8f0` / `rgb(226, 232, 240)` | カードボーダー、入力枠 |
| **プライマリ** | Blue 600 | `#2563eb` / `rgb(37, 99, 235)` | 「追加」ボタン |
| **セカンダリ（成功）** | Emerald 500 | `#10b981` / `rgb(16, 185, 129)` | 「保存」ボタン |
| **ミュート（キャンセル/削除）** | Slate 400 | `#94a3b8` / `rgb(148, 163, 184)` | 「閉じる」ボタン、削除ボタン |
| **テキスト（プライマリ）** | Slate 900 | `#0f172a` / `rgb(15, 23, 42)` | 見出し、タイトル |
| **テキスト（セカンダリ）** | Slate 500 | `#64748b` / `rgb(100, 116, 139)` | サブタイトル、説明文 |
| **テキスト（カード）** | Slate 800 | `#1e293b` / `rgb(30, 41, 59)` | カードタイトル |
| **テキスト（説明）** | Slate 500 | `#64748b` | カード説明文 |
| **バッジ背景** | Slate 200 | `#cbd5e1` / `rgb(203, 213, 229)` | タスク数バッジ |
| **バッジテキスト** | Slate 600 | `#475569` / `rgb(71, 85, 105)` | タスク数バッジ |
| **シャドウ** | `rgba(0,0,0,0.05)` / `rgba(0,0,0,0.1)` | カラム・カード影 |

### ダークモード対応
現状未対応。将来拡張時は CSS カスタムプロパティ + `prefers-color-scheme` メディアクエリで対応予定。

---

## 3. タイポグラフィ

| 要素 | フォントファミリー | サイズ | 太さ | 色 | 行高 |
|------|-------------------|--------|------|-----|------|
| ページタイトル | System UI Stack | 28px | 800 (ExtraBold) | `#0f172a` | 1.2 |
| サブタイトル | System UI Stack | 14px | 400 (Regular) | `#64748b` | 1.5 |
| カラムタイトル | System UI Stack | 16px | 700 (Bold) | `#334155` | 1.2 |
| タスク数バッジ | System UI Stack | 12px | 600 (SemiBold) | `#475569` | 1 |
| カードタイトル | System UI Stack | 14px | 600 (SemiBold) | `#1e293b` | 1.3 |
| カード説明 | System UI Stack | 12px | 400 (Regular) | `#64748b` | 1.5 |
| 入力フィールド | System UI Stack | 14px | 400 (Regular) | `#0f172a` | 1.4 |
| ボタンテキスト | System UI Stack | 14px | 600 (SemiBold) | White / `#fff` | 1 |

**フォントスタック:**
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

---

## 4. アイコン規約

| アイコン | 用途 | 実装方法 |
|----------|------|----------|
| 📝 | Todo カラム識別 | カラムタイトルに直接埋め込み |
| 🚀 | In Progress カラム識別 | カラムタイトルに直接埋め込み |
| ✅ | Done カラム識別 | カラムタイトルに直接埋め込み |
| × | タスク削除 | `×` 文字（Unicode U+00D7） |
| （グリップ） | ドラッグ操作ヒント | `cursor: grab` / `cursor: grabbing` |

- アイコンフォント・SVG アイコンライブラリは不使用
- 絵文字・Unicode 文字で代用し、依存をゼロに保つ

---

## 5. コンポーネント仕様

### 5.1 ページレイアウト (`app/layout.tsx` + `app/page.tsx`)

```typescript
// layout.tsx - メタデータ + ルートレイアウト
export const metadata: Metadata = {
  title: '🚀 超高速フルスタック・タスクボード',
  description: 'End-to-End 型安全なフルスタック・カンバンアプリ',
}

// page.tsx - RSC でデータ取得、Board に渡す
export default async function BoardPage() {
  const res = await client.api.board.$get()
  const { columns, tasks } = await res.json()
  return <Board initialColumns={columns} initialTasks={tasks} />
}
```

### 5.2 ボードコンテナ (`components/Board.tsx`)
```typescript
container: {
  padding: '40px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  backgroundColor: '#f8fafc',
  minHeight: '100vh',
}
header: { marginBottom: '32px' },
title: { fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 },
subtitle: { fontSize: '14px', color: '#64748b', marginTop: '6px' },
board: { display: 'flex', gap: '24px', alignItems: 'flex-start' },
```
- 3 カラムを横並び (`flex`)
- カラム間ギャップ: 24px
- 縦位置: `flex-start` で上揃え

### 5.3 カラム (`components/Column.tsx`)
```typescript
column: {
  width: '300px',
  backgroundColor: '#f1f5f9',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '85vh',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
}
columnHeader: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
},
columnTitle: { fontSize: '16px', fontWeight: 700, color: '#334155', margin: 0 },
badge: {
  backgroundColor: '#cbd5e1',
  color: '#475569',
  fontSize: '12px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '9999px',
},
taskList: {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  overflowY: 'auto',
  flex: 1,
  minHeight: '50px',
}
```
- 固定幅 300px（レスポンシブ非対応）
- 最大高さ 85vh、内部スクロール対応
- 角丸 12px、微細な影
- ドロップターゲット: `onDragOver`, `onDrop` ハンドラ

### 5.4 タスクカード (`components/TaskCard.tsx`)
```typescript
card: {
  backgroundColor: '#ffffff',
  padding: '14px',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  border: '1px solid #e2e8f0',
  cursor: 'grab',
}
cardTitle: { fontSize: '14px', fontWeight: 600, color: '#1e293b', flex: 1, cursor: 'pointer' },
cardDesc: { fontSize: '12px', color: '#64748b', marginTop: '6px', whiteSpace: 'pre-wrap' },
deleteBtn: {
  background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px',
  cursor: 'pointer', padding: '0 4px', lineHeight: 1,
},
```
- 白背景、ボーダー、微細な影
- `cursor: grab` でドラッグ可能を示唆
- ドラッグ中は `cursor: grabbing` に切替
- タイトルクリックで編集モード遷移 (`useState` でローカル管理)
- 右上に削除ボタン (×) - `useActionState(deleteTaskAction)` で連携

#### 5.4.1 編集モード
```typescript
editInput: {
  width: '100%', padding: '6px', borderRadius: '4px',
  border: '1px solid #cbd5e1', fontSize: '14px',
  marginBottom: '6px', boxSizing: 'border-box',
},
editTextarea: {
  width: '100%', padding: '6px', borderRadius: '4px',
  border: '1px solid #cbd5e1', fontSize: '12px',
  height: '60px', resize: 'vertical', boxSizing: 'border-box',
},
saveBtn: {
  padding: '4px 10px', backgroundColor: '#10b981', color: '#fff',
  border: 'none', borderRadius: '4px', fontSize: '12px',
  fontWeight: 600, cursor: 'pointer',
},
cancelBtn: {
  padding: '4px 10px', backgroundColor: '#94a3b8', color: '#fff',
  border: 'none', borderRadius: '4px', fontSize: '12px',
  fontWeight: 600, cursor: 'pointer',
},
```
- インラインフォームでタイトル・説明編集
- `useActionState(updateTaskAction)` で Server Action 連携
- 保存: Emerald 500、キャンセル: Slate 400
- 送信中はボタン無効化・ラベル変更 (`isUpdating` 状態)

### 5.5 タスク作成フォーム (`components/CreateForm.tsx`)
```typescript
form: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
input: {
  padding: '8px 12px', borderRadius: '6px',
  border: '1px solid #cbd5e1', fontSize: '14px',
},
button: {
  padding: '8px', backgroundColor: '#2563eb', color: '#ffffff',
  border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer',
},
```
- Conform `useForm` + `zod` バリデーション連携 (`useActionState(createTaskAction)`)
- プレースホルダー: `+ 新しいタスク...`
- 隠しフィールド: `id` (UUID), `columnId`, `position`
- バリデーションエラー表示: `fields.title.errors` で赤文字表示

---

## 6. レイアウト・グリッド・レスポンシブ対応方針

### グリッドシステム
- **非採用**: CSS Grid / Flexbox グリッドシステムなし
- 固定 3 カラム × 固定幅 300px のみ

### ブレークポイント
- **レスポンシブ非対応**（仕様書 `BR-005` 準拠）
- 画面幅 < 960px では横スクロール発生（将来拡張で対応予定）

### コンテナ制約
- 最大幅: なし（フル幅使用）
- パディング: 40px 固定

---

## 7. 画面デザイン詳細

### 7.1 初期表示（シードデータ投入後）
```
┌────────────────────────────────────────────────────────────────────┐
│  🚀 超高速フルスタック・タスクボード                                │
│  End-to-End 型安全なフルスタック・カンバンアプリ                    │
├──────────────────┬──────────────────────┬──────────────────────────┤
│  Todo 📝      3  │ In Progress 🚀   1   │ Done ✅            0    │
│  ┌────────────┐  │ ┌────────────────┐   │ ┌────────────────────┐  │
│  │ Task 1     │  │ │ Task B         │   │ │ (empty)            │  │
│  │ 最初のタスク│  │ │ 説明あり       │   │ │                    │  │
│  └────────────┘  │ └────────────────┘   │ └────────────────────┘  │
│  ┌────────────┐  │                      │                         │
│  │ Task 2     │  │                      │                         │
│  └────────────┘  │                      │                         │
│  [+ 新規...] [追加]                    │ [+ 新規...] [追加]        │
└──────────────────┴──────────────────────┴──────────────────────────┘
```

### 7.2 タスク編集中
```
┌────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ [ タスクタイトルを編集中...                    ]             │  │
│ │ [ 説明を編集中...                                              │  │
│ │ [説明を編集中...                                              ]  │
│ │ [ 保存中... ] [ 閉じる ]                                       │  │
│ └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 7.3 ドラッグ中
- ドラッグ対象カード: `opacity: 0.5`, `cursor: grabbing`
- ドロップターゲットカラム: `background-color: #e2e8f0` (視覚的フィードバック)
- ※現状 CSS のみで実装、JS でのクラス切替は未実装（将来拡張）

---

## 8. 状態管理・データフロー

### 8.1 初期データ取得 (RSC)
```
Server (page.tsx)
  └─ await client.api.board.$get()  // 完全サーバーサイド
       └─ { columns, tasks } → Board コンポーネント props
```

### 8.2 ミューテーション (Server Actions)
```
Client (Component)
  └─ useActionState(action, initialState)
       ├─ createTaskAction(formData)  → POST /api/tasks
       ├─ deleteTaskAction(formData)  → DELETE /api/tasks/:id
       ├─ updateTaskAction(formData)  → PUT /api/tasks/update
       └─ moveTaskAction(formData)    → PATCH /api/tasks/move
```

### 8.3 ローカル状態管理
| 状態 | 管理方法 | 永続化 |
|------|----------|--------|
| **初期タスクリスト** | `useState(initialTasks)` | メモリのみ |
| **編集中タスク ID** | `useState<string \| null>` | メモリのみ |
| **フォーム状態** | Conform `useForm` + `useActionState` | メモリのみ |

> **注意**: 現状、Server Action 完了後のローカル状態自動同期（楽観的 UI または再取得）は未実装。手動リロードまたは実装追加が必要。

---

## 9. アクセシビリティ方針

### 9.1 対応済み項目
| 項目 | 対応内容 |
|------|----------|
| キーボード操作 | `tabIndex` 管理、フォーム要素は標準でフォーカス可能 |
| フォーカス表示 | ブラウザ標準アウトライン維持（`outline: none` 禁止） |
| セマンティック HTML | `<header>`, `<main>`, `<section>`, `<form>`, `<button>` 適切使用 |
| ラベル関連付け | Conform `getInputProps` / `getFormProps` で `id`/`htmlFor` 自動生成 |
| プレースホルダー | 入力ヒントとして機能（ラベル代替ではない） |
| ドラッグ操作 | `draggable` 属性、キーボード代替未実装（将来対応） |

### 9.2 未対応・将来対応項目
| 項目 | 対応方針 |
|------|----------|
| ARIA ライブリージョン | Server Action 完了時のスクリーンリーダー通知 (`aria-live="polite"`) |
| カラーコントラスト比 | 現状 WCAG AA 準拠確認済み（テキスト 4.5:1 以上） |
| ドラッグ操作の代替 | キーボードのみでのタスク移動（`Enter`/`Space` + 矢印キー） |
| フォーカストラップ | 編集モード時のフォーカス管理強化 |
| スキップリンク | メインコンテンツへのスキップリンク追加 |

### 9.3 検証方法
- axe-core / Lighthouse Accessibility スコア 90 以上を目標
- 手動テスト: キーボードのみでの全操作フロー確認

---

## 10. 状態遷移・インタラクション

### 10.1 タスクカード ホバー/フォーカス
```css
.card:hover, .card:focus-within {
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  transform: translateY(-1px);
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}
```

### 10.2 ボタン ホバー/アクティブ
```css
.button:hover { filter: brightness(1.1); }
.button:active { filter: brightness(0.95); transform: scale(0.98); }
```

### 10.3 入力フィールド フォーカス
```css
input:focus, textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}
```

### 10.4 ドラッグ&ドロップ フィードバック
| 状態 | 視覚変化 |
|------|----------|
| ドラッグ開始 | ゴーストイメージ表示（ブラウザ標準）、元カード `opacity: 0.5` |
| ドラッグオーバー (有効) | 対象カラム背景 `#e2e8f0`、ボーダー `#2563eb` 点線 |
| ドロップ完了 | Server Action 送信、完了待ち（ローカル即時反映なし） |

---

## 11. アセット管理

### 画像ファイル
- **不使用**: アイコン・イラスト・背景画像なし
- ロゴのみ `docs/images/logo.svg` に配置（README 表示用）

### フォント
- システムフォントスタック使用（Web フォント不使用）

---

## 12. 実装メモ（開発者向け）

### インラインスタイル採用理由
- **CSS ファイルゼロ**: ビルド工程簡素化、ランタイムオーバーヘッドゼロ
- **TypeScript 連携**: `React.CSSProperties` で型安全なスタイル記述
- **コロケーション**: コンポーネントとスタイルを同一ファイルで管理

### スタイル定義パターン
```typescript
const styles: Record<string, React.CSSProperties> = {
  container: { /* ... */ },
  // ...
}

// 使用
<div style={styles.container}>
```

### Server Actions 連携パターン
```typescript
// actions.ts
'use server'
export async function createTaskAction(formData: FormData) {
  const submission = parseWithZod(formData, { schema: insertTaskSchema })
  if (submission.status !== 'success') return submission.reply()
  await client.api.tasks.$post({ json: submission.value })
  return submission.reply({ resetForm: true })
}

// Component (Client Component)
'use client'
const [formState, formAction, isPending] = useActionState(createTaskAction, undefined)
const [form, fields] = useForm({ lastResult: formState, onValidate: parseWithZod })
return <form action={formAction} {...getFormProps(form)}>...</form>
```

### 将来の CSS Modules / Tailwind 移行時の指針
- `styles` オブジェクトを CSS Modules クラス名に置換可能な構造を維持
- キー名は BEM 風 (`.block__element--modifier`) を意識