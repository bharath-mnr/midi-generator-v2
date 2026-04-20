// //E:\pro\midigenerator_v2\backend\middleware\upload.js

// 'use strict'

// const multer = require('multer')
// const path   = require('path')
// const fs     = require('fs')

// const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'

// if (!fs.existsSync(UPLOADS_DIR)) {
//   fs.mkdirSync(UPLOADS_DIR, { recursive: true })
// }

// // ── Multer storage ─────────────────────────────────────────────────────────────
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
//   filename:    (_req, file, cb) => {
//     const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
//     cb(null, `${unique}${path.extname(file.originalname)}`)
//   },
// })

// // ── File filters ───────────────────────────────────────────────────────────────
// const midiFilter = (_req, file, cb) => {
//   const ext = path.extname(file.originalname).toLowerCase()
//   if (['.mid', '.midi'].includes(ext)) {
//     cb(null, true)
//   } else {
//     cb(new Error('Only .mid and .midi files are accepted'), false)
//   }
// }

// const docFilter = (_req, file, cb) => {
//   const ext = path.extname(file.originalname).toLowerCase()
//   if (['.pdf', '.txt', '.md'].includes(ext)) {
//     cb(null, true)
//   } else {
//     cb(new Error('Only .pdf, .txt and .md files are accepted'), false)
//   }
// }

// // ── Exported uploaders ─────────────────────────────────────────────────────────
// const uploadMidi = multer({
//   storage,
//   fileFilter: midiFilter,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
// }).single('file')

// const uploadDoc = multer({
//   storage,
//   fileFilter: docFilter,
//   limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
// }).single('file')

// // Wrap in promise so controllers can await
// function multerPromise(uploader) {
//   return (req, res) =>
//     new Promise((resolve, reject) => {
//       uploader(req, res, (err) => {
//         if (err) reject(err)
//         else resolve()
//       })
//     })
// }

// module.exports = { uploadMidi, uploadDoc, multerPromise }










'use strict'
// backend/middleware/upload.js
// CHANGE: docFilter now accepts .json files
// ingestController auto-detects if .json contains MIDI JSON → routes to chunkMidi()

const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

const midiFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (['.mid', '.midi'].includes(ext)) cb(null, true)
  else cb(new Error('Only .mid and .midi files are accepted'), false)
}

const docFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  // .json added — ingestController detects MIDI JSON and routes to chunkMidi()
  if (['.pdf', '.txt', '.md', '.json'].includes(ext)) cb(null, true)
  else cb(new Error('Only .pdf, .txt, .md and .json files are accepted'), false)
}

const uploadMidi = multer({ storage, fileFilter: midiFilter, limits: { fileSize: 10 * 1024 * 1024 } }).single('file')
const uploadDoc  = multer({ storage, fileFilter: docFilter,  limits: { fileSize: 20 * 1024 * 1024 } }).single('file')

function multerPromise(uploader) {
  return (req, res) => new Promise((resolve, reject) => {
    uploader(req, res, (err) => { if (err) reject(err); else resolve() })
  })
}

module.exports = { uploadMidi, uploadDoc, multerPromise }