import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = 3457
const BASE = `http://localhost:${PORT}`
const here = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(here, '..')
const tsx = path.join(backendRoot, 'node_modules', '.bin', 'tsx')

let proc: ChildProcess

describe('HTTP server bootstrap (src/server.ts)', () => {
  beforeAll(async () => {
    proc = spawn(tsx, ['src/server.ts'], {
      cwd: backendRoot,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    let stdout = ''
    let exited = false
    proc.stderr!.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    proc.stdout!.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    proc.on('exit', () => {
      exited = true
    })

    const deadline = Date.now() + 10_000
    let lastError: unknown = null
    while (Date.now() < deadline) {
      if (exited) {
        throw new Error(
          `server process exited early.\nstdout: ${stdout}\nstderr: ${stderr}`,
        )
      }
      try {
        const res = await fetch(`${BASE}/api/board`)
        if (res.ok) return
        lastError = `status ${res.status}`
      } catch (err) {
        lastError = err
      }
      await new Promise((r) => setTimeout(r, 150))
    }
    throw new Error(`server not ready within 10s: ${lastError}`)
  }, 15_000)

  afterAll(() => {
    proc?.kill('SIGTERM')
  })

  it('serves GET /api/board over HTTP with 3 columns', async () => {
    const res = await fetch(`${BASE}/api/board`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.columns).toHaveLength(3)
    expect(data.columns.map((c: { id: string }) => c.id)).toEqual([
      'col-todo',
      'col-progress',
      'col-done',
    ])
  })
})
