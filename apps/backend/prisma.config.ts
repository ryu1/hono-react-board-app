import { defineConfig } from 'prisma/config'
import { fileURLToPath } from 'node:url'

const dbFile = fileURLToPath(new URL('./local.db', import.meta.url))

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: `file:${dbFile}`,
  },
})
