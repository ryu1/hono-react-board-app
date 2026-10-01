# Hono RPC × React Router v7 Kanban Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end type-safe kanban task board with Hono RPC backend, React Router v7 SPA frontend, Drizzle ORM, Conform, and Zod in a pnpm workspace monorepo.

**Architecture:** pnpm workspace monorepo with three packages: `apps/backend` (Hono + Drizzle + libsql), `apps/frontend` (React Router v7 SPA mode), `packages/shared` (Zod schema re-exports). Backend exports `AppType` for Hono RPC client inference. Frontend uses React Router loaders/actions with Conform for forms and native HTML5 drag & drop with optimistic UI.

**Tech Stack:** pnpm 12.8.2, Node.js 26.10.0, Hono, Drizzle ORM, libsql (SQLite), Zod 3.23.8, React Router v7 (SPA), Conform, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-09-30-hono-react-kanban-design.md`

## Global Constraints

- Package manager: pnpm 12.8.2, Node.js 26.10.0 (per `.tool-versions`)
- All packages are `"private": true`
- Frontend is SPA mode (no SSR) via `react-router.config.ts` with `ssr: false`
- Styling: inline `React.CSSProperties` only — no CSS files, no Tailwind
- Backend port 3000, frontend port 5173, CORS origin `http://localhost:5173`
- Testing: Vitest + React Testing Library — no Jest, no Playwright
- Every task follows TDD: write failing test → verify fail → implement → verify pass → commit
- No authentication, no WebSocket, no multi-board support (per spec scope)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `pnpm-workspace.yaml` | Workspace package globs |
| `package.json` (root) | Root scripts (`dev`, `test`) + concurrently |
| `packages/shared/package.json` | Shared package manifest |
| `packages/shared/src/index.ts` | Re-export Zod schemas from backend |
| `apps/backend/package.json` | Backend manifest |
| `apps/backend/src/db/schema.ts` | Drizzle table definitions + `createInsertSchema` |
| `apps/backend/src/db/index.ts` | libsql client + drizzle instance |
| `apps/backend/src/db/seed.ts` | Idempotent seed (3 columns) |
| `apps/backend/drizzle.config.ts` | drizzle-kit config for `push` |
| `apps/backend/src/index.ts` | Hono app, all routes, `AppType` export |
| `apps/backend/src/index.test.ts` | Backend route tests |
| `apps/backend/vitest.config.ts` | Backend Vitest config |
| `apps/frontend/package.json` | Frontend manifest |
| `apps/frontend/react-router.config.ts` | SPA mode (`ssr: false`) |
| `apps/frontend/vite.config.ts` | Vite + React Router plugin |
| `apps/frontend/app/root.tsx` | Root layout |
| `apps/frontend/app/routes.ts` | Route declarations |
| `apps/frontend/app/client.ts` | Hono RPC client instance |
| `apps/frontend/app/routes/board.tsx` | Board loader, action, component |
| `apps/frontend/app/routes/board.test.tsx` | Board component tests |
| `apps/frontend/vitest.config.ts` | Frontend Vitest config (jsdom) |
| `apps/frontend/app/test-setup.ts` | RTL cleanup setup |
| `packages/shared/src/index.test.ts` | Shared schema tests |

---

### Task 1: Root Workspace Scaffolding

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `.gitignore`

**Interfaces:**
- Produces: workspace layout that all subsequent tasks install into.

- [ ] **Step 1: Create pnpm-workspace.yaml**

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "my-fullstack-app",
  "private": true,
  "scripts": {
    "dev:backend": "pnpm --filter backend dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "dev": "concurrently -n \"Hono,ReactRouter\" -c \"blue,magenta\" \"pnpm dev:backend\" \"pnpm dev:frontend\"",
    "test": "pnpm -r test",
    "test:backend": "pnpm --filter backend test",
    "test:frontend": "pnpm --filter frontend test",
    "install:all": "pnpm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 3: Create .gitignore**

```gitignore
node_modules
*.local
.DS_Store
dist
apps/backend/local.db
apps/backend/drizzle/meta
```

- [ ] **Step 4: Verify workspace config**

Run: `pnpm install`
Expected: succeeds, creates `node_modules` and `pnpm-lock.yaml`

- [ ] **Step 5: Commit**

```bash
git init
git add pnpm-workspace.yaml package.json .gitignore .tool-versions
git commit -m "chore: init pnpm workspace root"
```

---

### Task 2: Shared Package (`@my-app/shared`)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/index.test.ts`

**Interfaces:**
- Consumes: `insertTaskSchema`, `insertColumnSchema` from `apps/backend/src/db/schema.ts` (Task 3)
- Produces: `insertTaskSchema`, `insertColumnSchema`, `CreateTaskInput` re-exported for frontend use.

**Note:** This task defines the shared package structure with a placeholder test that will be connected in Task 3 once the backend schema exists. The import path is fixed now so Task 3 knows exactly what to export.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { insertTaskSchema } from './index'

describe('shared schemas', () => {
  it('insertTaskSchema rejects empty title', () => {
    const result = insertTaskSchema.safeParse({
      id: 't1',
      columnId: 'c1',
      title: '',
      position: 0,
    })
    expect(result.success).toBe(false)
  })

  it('insertTaskSchema accepts valid task', () => {
    const result = insertTaskSchema.safeParse({
      id: 't1',
      columnId: 'c1',
      title: 'My task',
      position: 0,
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @my-app/shared test` (will fail because package.json/test config don't exist yet, or import fails because backend schema doesn't exist)
Expected: FAIL — module not found or schema not exported

- [ ] **Step 3: Create package.json with test script**

Create `packages/shared/package.json`:

```json
{
  "name": "@my-app/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 4: Create index.ts re-exporting from backend**

Create `packages/shared/src/index.ts`:

```typescript
export { insertTaskSchema, insertColumnSchema } from '../../../apps/backend/src/db/schema'
export type { CreateTaskInput } from '../../../apps/backend/src/db/schema'
```

- [ ] **Step 5: Run test to verify it still fails (schema doesn't exist yet)**

Run: `pnpm install && pnpm --filter @my-app/shared test`
Expected: FAIL — cannot resolve `apps/backend/src/db/schema`

- [ ] **Step 6: Commit (test intentionally red, blocked on Task 3)**

```bash
git add packages/shared/
git commit -m "feat: shared package scaffold with schema re-exports"
```

---

### Task 3: Backend DB Layer (Drizzle Schema, Connection, Seed)

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/src/db/schema.ts`
- Create: `apps/backend/src/db/index.ts`
- Create: `apps/backend/src/db/seed.ts`
- Create: `apps/backend/src/db/schema.test.ts`
- Create: `apps/backend/vitest.config.ts`

**Interfaces:**
- Produces: `columns`, `tasks` Drizzle tables; `insertTaskSchema`, `insertColumnSchema`, `CreateTaskInput` exports consumed by shared package (Task 2) and Hono routes (Task 5).

- [ ] **Step 1: Write the failing schema test**

Create `apps/backend/src/db/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { insertTaskSchema, insertColumnSchema } from './schema'

describe('insertTaskSchema', () => {
  it('rejects empty title', () => {
    const result = insertTaskSchema.safeParse({
      id: 't1',
      columnId: 'c1',
      title: '',
      position: 0,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid task with optional description', () => {
    const result = insertTaskSchema.safeParse({
      id: 't1',
      columnId: 'c1',
      title: 'Valid',
      position: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe('insertColumnSchema', () => {
  it('rejects empty title', () => {
    const result = insertColumnSchema.safeParse({
      id: 'c1',
      title: '',
      position: 0,
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test`
Expected: FAIL — cannot resolve `./schema`

- [ ] **Step 3: Create backend package.json**

Create `apps/backend/package.json`:

```json
{
  "name": "backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx src/db/seed.ts"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "@hono/zod-validator": "^0.4.0",
    "@libsql/client": "^0.14.0",
    "drizzle-orm": "^0.36.0",
    "drizzle-zod": "^0.5.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 4: Create Drizzle schema**

Create `apps/backend/src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'

export const columns = sqliteTable('columns', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  position: integer('position').notNull(),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  columnId: text('column_id')
    .notNull()
    .references(() => columns.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  position: integer('position').notNull(),
})

export const insertTaskSchema = createInsertSchema(tasks, {
  title: (schema) => schema.min(1, 'タイトルは必須です'),
})
export const insertColumnSchema = createInsertSchema(columns, {
  title: (schema) => schema.min(1, 'タイトルは必須です'),
})

export type CreateTaskInput = z.infer<typeof insertTaskSchema>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter backend test`
Expected: PASS (2 test suites, 3 tests)

- [ ] **Step 6: Create vitest.config.ts**

Create `apps/backend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 7: Run full backend test**

Run: `pnpm --filter backend test`
Expected: PASS

- [ ] **Step 8: Create DB connection and seed**

Create `apps/backend/src/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({ url: 'file:local.db' })
export const db = drizzle(client, { schema })
```

Create `apps/backend/src/db/seed.ts`:

```typescript
import { db } from './index'
import { columns } from './schema'

export async function seed() {
  const existing = await db.select().from(columns).limit(1)
  if (existing.length > 0) return

  await db.insert(columns).values([
    { id: 'col-todo', title: 'Todo 📝', position: 0 },
    { id: 'col-progress', title: 'In Progress 🚀', position: 1 },
    { id: 'col-done', title: 'Done ✅', position: 2 },
  ])
}
```

- [ ] **Step 9: Run tests still pass**

Run: `pnpm --filter backend test`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add apps/backend/ packages/shared/
git commit -m "feat: backend Drizzle schema, connection, seed"
```

---

### Task 4: Shared Package Test Passes (Close Task 2 Red Test)

**Files:**
- Modify: `packages/shared/package.json` (add test script config if needed)
- Create: `packages/shared/vitest.config.ts`

**Interfaces:**
- Consumes: `insertTaskSchema`, `insertColumnSchema` from Task 3.
- Produces: passing shared package test.

- [ ] **Step 1: Create shared vitest config**

Create `packages/shared/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: Install workspace dependencies**

Run: `pnpm install`
Expected: succeeds

- [ ] **Step 3: Run shared test**

Run: `pnpm --filter @my-app/shared test`
Expected: PASS (2 tests from Task 2)

- [ ] **Step 4: Run all tests so far**

Run: `pnpm --filter backend test && pnpm --filter @my-app/shared test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat: shared package schema re-exports pass tests"
```

---

### Task 5: Backend Hono API Routes

**Files:**
- Create: `apps/backend/src/index.ts`
- Create: `apps/backend/src/index.test.ts`
- Modify: `apps/backend/vitest.config.ts` (add setup if needed)

**Interfaces:**
- Consumes: `db` from `./db`, `columns`/`tasks`/`insertTaskSchema` from `./db/schema`, `seed` from `./db/seed`.
- Produces: `AppType = typeof routes` exported from `apps/backend/src/index.ts`, consumed by frontend RPC client (Task 7).

- [ ] **Step 1: Write failing route tests**

Create `apps/backend/src/index.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import app from './index'

async function getBoard() {
  const res = await app.request('/api/board')
  return res
}

async function createTask(body: unknown) {
  const res = await app.request('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res
}

describe('GET /api/board', () => {
  it('returns columns and tasks', async () => {
    const res = await getBoard()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('columns')
    expect(data).toHaveProperty('tasks')
    expect(Array.isArray(data.columns)).toBe(true)
    expect(data.columns.length).toBeGreaterThanOrEqual(3)
  })
})

describe('POST /api/tasks', () => {
  it('rejects empty title with 400', async () => {
    const res = await createTask({
      id: 'test-invalid',
      columnId: 'col-todo',
      title: '',
      position: 0,
    })
    expect(res.status).toBe(400)
  })

  it('creates a valid task', async () => {
    const res = await createTask({
      id: 'test-task-1',
      columnId: 'col-todo',
      title: 'Test Task',
      position: 0,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.title).toBe('Test Task')
  })
})

describe('PATCH /api/tasks/move', () => {
  it('moves a task to another column', async () => {
    const res = await app.request('/api/tasks/move', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-task-1',
        columnId: 'col-progress',
        position: 0,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.columnId).toBe('col-progress')
  })
})

describe('PUT /api/tasks/update', () => {
  it('updates task title and description', async () => {
    const res = await app.request('/api/tasks/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-task-1',
        title: 'Updated Title',
        description: 'Updated desc',
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.title).toBe('Updated Title')
    expect(data.data.description).toBe('Updated desc')
  })

  it('rejects empty title with 400', async () => {
    const res = await app.request('/api/tasks/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-task-1',
        title: '',
        description: null,
      }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task', async () => {
    const res = await app.request('/api/tasks/test-task-1', {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.id).toBe('test-task-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test`
Expected: FAIL — cannot resolve `./index`

- [ ] **Step 3: Implement Hono app with routes**

Create `apps/backend/src/index.ts`:

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from './db'
import { tasks, insertTaskSchema } from './db/schema'
import { seed } from './db/seed'

const app = new Hono()

app.use('/api/*', cors({ origin: 'http://localhost:5173' }))

seed().catch(console.error)

const moveTaskSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  position: z.integer(),
})

const updateTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().nullable(),
})

const routes = app
  .get('/api/board', async (c) => {
    const allColumns = await db.query.columns.findMany({
      orderBy: (columns, { asc }) => [asc(columns.position)],
    })
    const allTasks = await db.query.tasks.findMany({
      orderBy: (tasks, { asc }) => [asc(tasks.position)],
    })
    return c.json({ columns: allColumns, tasks: allTasks })
  })
  .post('/api/tasks', zValidator('json', (value, c) => {
    const result = insertTaskSchema.safeParse(value)
    if (!result.success) {
      return c.json({ success: false, error: result.error.flatten() }, 400)
    }
    return result.data
  }), async (c) => {
    const validated = c.req.valid('json')
    const [inserted] = await db.insert(tasks).values(validated).returning()
    return c.json({ success: true, data: inserted })
  })
  .patch('/api/tasks/move', zValidator('json', moveTaskSchema), async (c) => {
    const { id, columnId, position } = c.req.valid('json')
    const [updated] = await db
      .update(tasks)
      .set({ columnId, position })
      .where(eq(tasks.id, id))
      .returning()
    return c.json({ success: true, data: updated })
  })
  .delete('/api/tasks/:id', async (c) => {
    const id = c.req.param('id')
    await db.delete(tasks).where(eq(tasks.id, id))
    return c.json({ success: true, id })
  })
  .put('/api/tasks/update', zValidator('json', updateTaskSchema), async (c) => {
    const { id, title, description } = c.req.valid('json')
    const [updated] = await db
      .update(tasks)
      .set({ title, description })
      .where(eq(tasks.id, id))
      .returning()
    return c.json({ success: true, data: updated })
  })

export type AppType = typeof routes
export default app
```

- [ ] **Step 4: Push database schema**

Run: `pnpm --filter backend db:push`
Expected: creates `local.db` with `columns` and `tasks` tables

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter backend test`
Expected: PASS (all route tests)

- [ ] **Step 6: Verify AppType export**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: no type errors

- [ ] **Step 7: Commit**

```bash
git add apps/backend/
git commit -m "feat: Hono API routes with RPC type export"
```

---

### Task 6: Frontend SPA Scaffold (React Router v7)

**Files:**
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/tsconfig.json`
- Create: `apps/frontend/react-router.config.ts`
- Create: `apps/frontend/vite.config.ts`
- Create: `apps/frontend/app/root.tsx`
- Create: `apps/frontend/app/routes.ts`
- Create: `apps/frontend/app/main.tsx`
- Create: `apps/frontend/index.html`

**Interfaces:**
- Produces: runnable SPA shell at port 5173, routing infrastructure that Task 8 mounts the board route into.

- [ ] **Step 1: Create frontend package.json**

Create `apps/frontend/package.json`:

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.6.0",
    "hono": "^4.6.0",
    "@conform-to/react": "^1.2.0",
    "@conform-to/zod": "^1.2.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@react-router/dev": "^7.6.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^26.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0"
  }
}
```

- [ ] **Step 2: Create react-router.config.ts (SPA mode)**

Create `apps/frontend/react-router.config.ts`:

```typescript
import type { Config } from '@react-router/dev/config'

export default {
  ssr: false,
} satisfies Config
```

- [ ] **Step 3: Create vite.config.ts**

Create `apps/frontend/vite.config.ts`:

```typescript
import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [reactRouter()],
  server: {
    port: 5173,
  },
})
```

- [ ] **Step 4: Create tsconfig.json**

Create `apps/frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["app/**/*", "react-router.config.ts", "vite.config.ts"]
}
```

- [ ] **Step 5: Create index.html**

Create `apps/frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>🚀 超高速フルスタック・タスクボード</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/app/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create root.tsx**

Create `apps/frontend/app/root.tsx`:

```typescript
import { Outlet } from 'react-router'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>🚀 超高速フルスタック・タスクボード</title>
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}

export default function Root() {
  return <Outlet />
}
```

- [ ] **Step 7: Create routes.ts**

Create `apps/frontend/app/routes.ts`:

```typescript
import type { RouteConfig } from '@react-router/dev/routes'

export default [
  { path: '/', load: () => import('./routes/board') },
] satisfies RouteConfig
```

- [ ] **Step 8: Install and verify dev server starts**

Run: `pnpm install`
Run: `pnpm --filter frontend dev &` then `sleep 5 && curl -s http://localhost:5173 | head -20`
Expected: HTML served from Vite dev server

- [ ] **Step 9: Stop dev server and commit**

```bash
kill %1 2>/dev/null || true
git add apps/frontend/
git commit -m "feat: React Router v7 SPA scaffold"
```

---

### Task 7: Frontend Hono RPC Client

**Files:**
- Create: `apps/frontend/app/client.ts`
- Create: `apps/frontend/tsconfig.json` (update path references for backend AppType)

**Interfaces:**
- Consumes: `AppType` from `apps/backend/src/index.ts` (Task 5).
- Produces: `client` instance typed with `hc<AppType>`, used by board loader/action (Task 8).

- [ ] **Step 1: Create RPC client**

Create `apps/frontend/app/client.ts`:

```typescript
import { hc } from 'hono/client'
import type { AppType } from '../../backend/src/index'

export const client = hc<AppType>('http://localhost:3000/')
```

- [ ] **Step 2: Verify type inference works**

Run: `pnpm --filter frontend exec tsc --noEmit`
Expected: no errors (AppType resolves, client methods are typed)

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/client.ts
git commit -m "feat: Hono RPC client with AppType inference"
```

---

### Task 8: Frontend Board Route (Loader, Action, Component)

**Files:**
- Create: `apps/frontend/app/routes/board.tsx`
- Modify: `apps/frontend/app/routes.ts` (path `/` → `board` route)

**Interfaces:**
- Consumes: `client` from `../client`, `insertTaskSchema` from `@my-app/shared`.
- Produces: fully interactive board page with loader, action, optimistic UI, drag & drop, inline editing.

- [ ] **Step 1: Write failing board component test**

Create `apps/frontend/app/routes/board.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockLoaderData = {
  columns: [
    { id: 'col-todo', title: 'Todo 📝', position: 0 },
    { id: 'col-progress', title: 'In Progress 🚀', position: 1 },
    { id: 'col-done', title: 'Done ✅', position: 2 },
  ],
  tasks: [
    { id: 't1', columnId: 'col-todo', title: 'Task 1', description: 'desc', position: 0 },
  ],
}

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useLoaderData: () => mockLoaderData,
    useFetcher: () => ({
      data: undefined,
      state: 'idle',
      submit: vi.fn(),
      load: vi.fn(),
      formData: undefined,
      Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
    }),
    useFetchers: () => [],
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  }
})

vi.mock('../client', () => ({
  client: {
    api: {
      board: { $get: vi.fn() },
      tasks: {
        $post: vi.fn(),
        $delete: vi.fn(),
        update: { $put: vi.fn() },
        move: { $patch: vi.fn() },
      },
    },
  },
}))

import Board from './board'

describe('Board component', () => {
  it('renders all three columns', () => {
    render(<Board />)
    expect(screen.getByText('Todo 📝')).toBeInTheDocument()
    expect(screen.getByText('In Progress 🚀')).toBeInTheDocument()
    expect(screen.getByText('Done ✅')).toBeInTheDocument()
  })

  it('renders tasks in correct column', () => {
    render(<Board />)
    expect(screen.getByText('Task 1')).toBeInTheDocument()
  })

  it('renders create form with input', () => {
    render(<Board />)
    expect(screen.getByPlaceholderText('+ 新しいタスク...')).toBeInTheDocument()
  })

  it('renders task count badge', () => {
    render(<Board />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test`
Expected: FAIL — cannot resolve `./board`

- [ ] **Step 3: Create vitest config for frontend**

Create `apps/frontend/vitest.config.ts`:

```typescript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['app/**/*.test.{ts,tsx}'],
    setupFiles: ['app/test-setup.ts'],
  },
})
```

Create `apps/frontend/app/test-setup.ts`:

```typescript
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 4: Run test to verify it fails on missing board module**

Run: `pnpm --filter frontend test`
Expected: FAIL — cannot resolve `./board`

- [ ] **Step 5: Implement board route**

Create `apps/frontend/app/routes/board.tsx`:

```tsx
import { useState } from 'react'
import { useLoaderData, useFetcher, useFetchers } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { insertTaskSchema } from '@my-app/shared'
import { client } from '../client'

export async function loader() {
  const res = await client.api.board.$get()
  if (!res.ok) throw new Error('データ取得失敗')
  return await res.json()
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'delete') {
    const id = String(formData.get('id'))
    await client.api.tasks[':id'].$delete({ param: { id } })
    return { success: true }
  }

  if (intent === 'update') {
    const id = String(formData.get('id'))
    const title = String(formData.get('title'))
    const description = String(formData.get('description'))
    await client.api.tasks.update.$put({ json: { id, title, description } })
    return { success: true }
  }

  const submission = parseWithZod(formData, { schema: insertTaskSchema })
  if (submission.status !== 'success') return submission.reply()
  await client.api.tasks.$post({ json: submission.value })
  return submission.reply({ resetForm: true })
}

export default function Board() {
  const { columns, tasks: serverTasks } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()
  const moveFetcher = useFetcher()
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  const fetchers = useFetchers()
  let tasks = [...serverTasks]

  for (const f of fetchers) {
    if (!f.formData) continue
    const intent = f.formData.get('intent')
    if (intent === 'delete') {
      const id = String(f.formData.get('id'))
      tasks = tasks.filter((t) => t.id !== id)
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    await client.api.tasks.move.$patch({
      json: { id: taskId, columnId: targetColumnId, position: 999 },
    })
    moveFetcher.load('/')
  }

  const [form, fields] = useForm({
    lastResult: fetcher.data as any,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: insertTaskSchema })
    },
    shouldValidate: 'onBlur',
  })

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🚀 超高速フルスタック・タスクボード</h1>
        <p style={styles.subtitle}>End-to-End 型安全なフルスタック・カンバンアプリ</p>
      </header>

      <div style={styles.board}>
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.columnId === column.id)

          return (
            <div
              key={column.id}
              style={styles.column}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div style={styles.columnHeader}>
                <h3 style={styles.columnTitle}>{column.title}</h3>
                <span style={styles.badge}>{columnTasks.length}</span>
              </div>

              <div style={styles.taskList}>
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    style={styles.card}
                  >
                    {editingTaskId === task.id ? (
                      <moveFetcher.Form method="post" onSubmit={() => setEditingTaskId(null)}>
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={task.id} />
                        <input
                          type="text"
                          name="title"
                          defaultValue={task.title}
                          style={styles.editInput}
                          required
                        />
                        <textarea
                          name="description"
                          defaultValue={task.description || ''}
                          style={styles.editTextarea}
                          placeholder="説明..."
                        />
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          <button type="submit" style={styles.saveBtn}>保存</button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            style={styles.cancelBtn}
                          >閉じる</button>
                        </div>
                      </moveFetcher.Form>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div
                            style={styles.cardTitle}
                            onClick={() => setEditingTaskId(task.id)}
                          >
                            {task.title}
                          </div>
                          <moveFetcher.Form method="post" style={{ display: 'inline' }}>
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={task.id} />
                            <button type="submit" style={styles.deleteBtn}>×</button>
                          </moveFetcher.Form>
                        </div>
                        {task.description && <div style={styles.cardDesc}>{task.description}</div>}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <fetcher.Form method="post" {...getFormProps(form)} style={styles.form}>
                <input {...getInputProps(fields.id, { type: 'hidden' })} value={crypto.randomUUID()} readOnly />
                <input {...getInputProps(fields.columnId, { type: 'hidden' })} value={column.id} readOnly />
                <input {...getInputProps(fields.position, { type: 'hidden' })} value={columnTasks.length} readOnly />
                <input
                  {...getInputProps(fields.title, { type: 'text' })}
                  placeholder="+ 新しいタスク..."
                  style={styles.input}
                />
                <button type="submit" style={styles.button}>追加</button>
              </fetcher.Form>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', marginTop: '6px' },
  board: { display: 'flex', gap: '24px', alignItems: 'flex-start' },
  column: {
    width: '300px',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85vh',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  },
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
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '14px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    cursor: 'grab',
  },
  cardTitle: { fontSize: '14px', fontWeight: 600, color: '#1e293b', flex: 1, cursor: 'pointer' },
  cardDesc: { fontSize: '12px', color: '#64748b', marginTop: '6px', whiteSpace: 'pre-wrap' },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  editInput: {
    width: '100%',
    padding: '6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    marginBottom: '6px',
    boxSizing: 'border-box',
  },
  editTextarea: {
    width: '100%',
    padding: '6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
    height: '60px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  saveBtn: {
    padding: '4px 10px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '4px 10px',
    backgroundColor: '#94a3b8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  form: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
  },
  button: {
    padding: '8px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter frontend test`
Expected: PASS (4 tests)

- [ ] **Step 7: Add `@my-app/shared` workspace dependency**

Run: `pnpm --filter frontend add @my-app/shared --workspace`
Expected: workspace link created

- [ ] **Step 8: Run all tests**

Run: `pnpm test`
Expected: PASS across all packages

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/
git commit -m "feat: board route with loader, action, optimistic UI, DnD"
```

---

### Task 9: Full-Stack Integration Verification

**Files:**
- Modify: none (verification only)

**Interfaces:**
- Consumes: all previous tasks.
- Produces: working `pnpm dev` and `pnpm test` at root level.

- [ ] **Step 1: Push DB and seed**

Run: `pnpm --filter backend db:push && pnpm --filter backend db:seed`
Expected: tables created, 3 columns seeded

- [ ] **Step 2: Run all tests**

Run: `pnpm test`
Expected: PASS (shared: 2, backend: all, frontend: 4)

- [ ] **Step 3: Start dev servers**

Run: `pnpm dev &` then `sleep 8`
Expected: both backend (3000) and frontend (5173) running

- [ ] **Step 4: Verify API responds**

Run: `curl -s http://localhost:3000/api/board | head -100`
Expected: JSON with 3 columns

- [ ] **Step 5: Verify frontend serves**

Run: `curl -s http://localhost:5173 | grep -o '<title>.*</title>'`
Expected: `<title>🚀 超高速フルスタック・タスクボード</title>`

- [ ] **Step 6: Stop servers**

```bash
kill %1 2>/dev/null || true
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: full-stack integration verified"
```

---

## Task Dependency Graph

```
Task 1 (Root) ──► Task 2 (Shared) ──┐
                                    ├──► Task 4 (Shared tests pass)
Task 3 (Backend DB) ────────────────┘
       │
       ▼
Task 5 (Backend Routes) ──► Task 6 (Frontend Scaffold) ──► Task 7 (RPC Client) ──► Task 8 (Board Route) ──► Task 9 (Integration)
```
