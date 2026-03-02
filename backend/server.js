// //E:\pro\midigenerator_v2\backend\server.js

// 'use strict'

// require('dotenv').config()

// const express    = require('express')
// const cors       = require('cors')
// const morgan     = require('morgan')
// const path       = require('path')
// const fs         = require('fs')

// const composeRoute   = require('./routes/compose')
// const ingestRoute    = require('./routes/ingest')
// const historyRoute   = require('./routes/history')
// const knowledgeRoute = require('./routes/knowledge')
// const errorHandler   = require('./middleware/errorHandler')

// // ── Ensure required directories exist ────────────────────────────────────────
// const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'
// const OUTPUTS_DIR = process.env.OUTPUTS_DIR || './outputs'
// ;[UPLOADS_DIR, OUTPUTS_DIR].forEach(dir => {
//   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
// })

// // ── Simple in-memory rate limiter (no external dep needed) ───────────────────
// const _rateCounts = new Map()
// function rateLimit(maxPerMinute) {
//   return (req, res, next) => {
//     const ip  = req.ip || req.connection.remoteAddress || 'unknown'
//     const now = Date.now()
//     const key = `${ip}`
//     const rec = _rateCounts.get(key) || { count: 0, reset: now + 60000 }
//     if (now > rec.reset) { rec.count = 0; rec.reset = now + 60000 }
//     rec.count++
//     _rateCounts.set(key, rec)
//     if (rec.count > maxPerMinute) {
//       return res.status(429).json({ error: 'Too many requests — please wait a minute' })
//     }
//     next()
//   }
// }


// const app = express()

// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//   credentials: true,
// }))

// app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
// app.use(express.json({ limit: '10mb' }))
// app.use(express.urlencoded({ extended: true }))

// // Serve generated MIDI files as static
// app.use('/outputs', express.static(path.resolve(OUTPUTS_DIR)))

// // ── Routes ────────────────────────────────────────────────────────────────────
// app.use('/api/compose',   rateLimit(10), composeRoute)
// app.use('/api/ingest',    ingestRoute)
// app.use('/api/history',   historyRoute)
// app.use('/api/knowledge', knowledgeRoute)

// // Health check
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'ok', timestamp: new Date().toISOString() })
// })

// // ── Error handler (must be last) ──────────────────────────────────────────────
// app.use(errorHandler)

// // ── Start: init DB first, then listen ────────────────────────────────────────
// const PORT = process.env.PORT || 3001

// const { init: initDb } = require('./db/database')

// initDb()
//   .then(() => {
//     app.listen(PORT, () => {
//       console.log(`\n🎵  MidiGenerator backend running on http://localhost:${PORT}\n`)
//     })
//   })
//   .catch(err => {
//     console.error('Failed to initialise database:', err)
//     process.exit(1)
//   })

// module.exports = app












'use strict'

require('dotenv').config()

const express    = require('express')
const cors       = require('cors')
const morgan     = require('morgan')
const path       = require('path')
const fs         = require('fs')

const composeRoute   = require('./routes/compose')
const ingestRoute    = require('./routes/ingest')
const historyRoute   = require('./routes/history')
const knowledgeRoute = require('./routes/knowledge')
const alterRoute     = require('./routes/alter')
const errorHandler   = require('./middleware/errorHandler')

// ── Ensure required directories exist ────────────────────────────────────────
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'
const OUTPUTS_DIR = process.env.OUTPUTS_DIR || './outputs'
;[UPLOADS_DIR, OUTPUTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// ── Simple in-memory rate limiter (no external dep needed) ───────────────────
const _rateCounts = new Map()
function rateLimit(maxPerMinute) {
  return (req, res, next) => {
    const ip  = req.ip || req.connection.remoteAddress || 'unknown'
    const now = Date.now()
    const key = `${ip}`
    const rec = _rateCounts.get(key) || { count: 0, reset: now + 60000 }
    if (now > rec.reset) { rec.count = 0; rec.reset = now + 60000 }
    rec.count++
    _rateCounts.set(key, rec)
    if (rec.count > maxPerMinute) {
      return res.status(429).json({ error: 'Too many requests — please wait a minute' })
    }
    next()
  }
}


const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Serve generated MIDI files as static
app.use('/outputs', express.static(path.resolve(OUTPUTS_DIR)))


// ── Auto-cleanup: delete MIDI files older than 7 days ────────────────────────
function cleanOldOutputs() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  try {
    if (!fs.existsSync(OUTPUTS_DIR)) return
    fs.readdirSync(OUTPUTS_DIR).forEach(file => {
      const fp = path.join(OUTPUTS_DIR, file)
      try {
        if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp)
      } catch {}
    })
  } catch {}
}
setInterval(cleanOldOutputs, 60 * 60 * 1000) // run every hour

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/compose',   rateLimit(10), composeRoute)
app.use('/api/ingest',    ingestRoute)
app.use('/api/history',   historyRoute)
app.use('/api/knowledge', knowledgeRoute)
app.use('/api/alter',    alterRoute)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler)

// ── Start: init DB first, then listen ────────────────────────────────────────
const PORT = process.env.PORT || 3001

const { init: initDb } = require('./db/database')

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🎵  MidiGenerator backend running on http://localhost:${PORT}\n`)
    })
  })
  .catch(err => {
    console.error('Failed to initialise database:', err)
    process.exit(1)
  })

module.exports = app