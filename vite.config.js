import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { questions } from './src/questions.js'

const BANK_PATH = fileURLToPath(new URL('./src/questions.js', import.meta.url))
const PUBLIC_BANK_ID = 'virtual:question-bank'

// The browser gets the question bank through `virtual:question-bank`: the
// same questions as src/questions.js with correctAnswer and explanation
// removed. Those two fields only ever leave the server via /api/answer,
// after a student has submitted.
function publicQuestionBank() {
  return {
    name: 'public-question-bank',
    resolveId(id) {
      if (id === PUBLIC_BANK_ID) return '\0' + PUBLIC_BANK_ID
    },
    load(id, options) {
      if (id === '\0' + PUBLIC_BANK_ID) {
        const stripped = questions.map((q) => {
          const copy = { ...q }
          delete copy.correctAnswer
          delete copy.explanation
          return copy
        })
        return `export const questions = ${JSON.stringify(stripped)};`
      }
      // Guard rail: importing the full bank into browser code would ship
      // every answer to students, so fail the build instead.
      if (id.split('?')[0] === BANK_PATH && !options?.ssr) {
        this.error(
          'src/questions.js contains the answers and must not be imported by browser code. ' +
            'Import { questions } from "virtual:question-bank" instead.'
        )
      }
    },
  }
}

// Serves the /api routes during `npm run dev`, backed by an in-process
// Postgres stored in .local-db/, so the whole app (logins, scoring,
// leaderboard) works locally without Vercel or a hosted database. Set
// DATABASE_URL to use a real database instead.
function devApi() {
  return {
    name: 'dev-api',
    apply: 'serve',
    async configureServer(server) {
      if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
        const { PGlite } = await import('@electric-sql/pglite')
        const db = new PGlite('.local-db')
        globalThis.__SAT_DEV_DB = {
          query: async (text, params) => (await db.query(text, params)).rows,
          transaction: (statements) =>
            db.transaction(async (tx) => {
              const results = []
              for (const [text, params] of statements) results.push((await tx.query(text, params)).rows)
              return results
            }),
        }
      }

      server.middlewares.use(async (req, res, next) => {
        const match = /^\/api\/([a-z]+)(?:\?.*)?$/.exec(req.url || '')
        if (!match) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.js`)
          await mod.default(req, res)
        } catch (err) {
          console.error(err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Dev API error — see the terminal.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), publicQuestionBank(), devApi()],
})
