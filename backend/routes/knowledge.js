// //E:\pro\midigenerator_v2\backend\routes\knowledge.js


// 'use strict'

// const { Router } = require('express')
// const ctrl = require('../controllers/knowledgeController')

// const router = Router()

// router.get('/',                  ctrl.list)
// router.delete('/all',            ctrl.removeAll)
// router.delete('/by-name/:name',  ctrl.removeByName)   // primary — delete by filename
// router.delete('/:id',            ctrl.remove)          // legacy — delete by row id

// module.exports = router












// backend/routes/knowledge.js  (or wherever your knowledge routes are registered)
// ADD THIS ONE ROUTE — the rest stays as-is

const express    = require('express')
const router     = express.Router()
const ctrl       = require('../controllers/knowledgeController')

router.get('/',                       ctrl.list)
router.post('/sync-pinecone',         ctrl.syncPinecone)   // ← NEW
router.delete('/all',                 ctrl.removeAll)
router.delete('/by-name/:name',       ctrl.removeByName)
router.delete('/:id',                 ctrl.remove)

module.exports = router


// ─────────────────────────────────────────────────────────────────────────────
// HOW TO USE sync-pinecone
//
// Problem:
//   Render's free tier has an ephemeral filesystem. localRag.json is written
//   at ingest time but gets wiped every time Render restarts the service.
//   Pinecone is a cloud database — it survives restarts.
//
// One-time setup (after first deploy):
//   1. Make sure PINECONE_API_KEY and PINECONE_INDEX are set in Render
//      dashboard → your service → Environment → Add variable
//   2. On your LOCAL machine (which still has localRag.json with all vectors):
//      curl -X POST http://localhost:3001/api/knowledge/sync-pinecone
//      or use the frontend (if you add a button) pointing to the Render URL
//   3. Done — Pinecone now has all your vectors and will survive Render restarts
//
// After that:
//   Every new ingest on Render automatically writes to both local + Pinecone.
//   localRag.json acts as a write buffer that gets wiped on restart — but
//   Pinecone has everything. The query() function tries Pinecone first.
//
// Optional: Add a "Sync to Cloud" button in the KnowledgeBase page that calls
//   POST /api/knowledge/sync-pinecone
// ─────────────────────────────────────────────────────────────────────────────