import { serve } from '@hono/node-server'
import app from './index'

const port = Number(process.env.PORT ?? 3000)

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Hono backend listening on http://localhost:${info.port}`)
})

function shutdown() {
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 2000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
