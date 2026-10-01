import { fileURLToPath } from 'node:url'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../../generated/prisma/client'

const dbUrl = 'file:' + fileURLToPath(new URL('../../local.db', import.meta.url))
const adapter = new PrismaBetterSqlite3({ url: dbUrl })

export const db = new PrismaClient({ adapter })
