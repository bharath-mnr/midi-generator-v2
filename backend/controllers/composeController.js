// //E:\pro\midigenerator_v2\backend\controllers\composeController.js

// 'use strict'

// const path = require('path')
// const fs   = require('fs')

// // Inline uuid — no npm dependency needed
// function uuid() {
//   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
//     const r = Math.random() * 16 | 0
//     return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
//   })
// }

// const ragService        = require('../services/ragService')
// const geminiService     = require('../services/geminiService')
// const validationService = require('../services/validationService')
// const stitchService     = require('../services/stitchService')
// const jsonToMidi        = require('../services/converters/jsonToMidi')
// const { getDb }         = require('../db/database')
// const OUTPUTS_DIR = process.env.OUTPUTS_DIR || './outputs'

// async function compose(req, res, next) {
//   try {
//     const { prompt, section } = req.body

//     if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
//       return res.status(400).json({ error: 'prompt is required' })
//     }

//     let ragChunks = []
//     try {
//       ragChunks = await ragService.query(prompt.trim(), 5)
//     } catch (ragErr) {
//       console.warn('[compose] RAG query failed, continuing without context:', ragErr.message)
//     }

//     let generationJson

//     if (section && Number.isInteger(section) && section > 1) {
//       const sections = []
//       for (let i = 1; i <= section; i++) {
//         const sectionJson = await geminiService.compose(prompt, ragChunks, {
//           sectionIndex: i,
//           totalSections: section,
//           previousSection: sections[i - 2] || null,
//         })
//         const validated = validationService.validate(sectionJson)
//         if (!validated.ok) {
//           const retried = await geminiService.retry(prompt, ragChunks, sectionJson, validated.errors)
//           const revalidated = validationService.validate(retried)
//           if (!revalidated.ok) throw new Error(`Validation failed after retry: ${revalidated.errors.join(', ')}`)
//           sections.push(retried)
//         } else {
//           sections.push(sectionJson)
//         }
//       }
//       generationJson = stitchService.merge(sections)
//     } else {
//       const raw = await geminiService.compose(prompt, ragChunks)
//       const validated = validationService.validate(raw)
//       if (!validated.ok) {
//         const retried = await geminiService.retry(prompt, ragChunks, raw, validated.errors)
//         const revalidated = validationService.validate(retried)
//         if (!revalidated.ok) throw new Error(`Validation failed after retry: ${revalidated.errors.join(', ')}`)
//         generationJson = retried
//       } else {
//         generationJson = raw
//       }
//     }

//     const midiBytes = jsonToMidi.convert(generationJson)

//     const filename = `composition_${uuid()}.mid`
//     const filePath = path.join(OUTPUTS_DIR, filename)
//     fs.writeFileSync(filePath, Buffer.from(midiBytes))

//     const db = getDb()
//     const totalBars = generationJson.bars?.length || 0
//     const result = db.prepare(`
//       INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
//       VALUES (?, ?, ?, ?, ?, ?)
//     `).run(
//       prompt.trim(),
//       filePath,
//       JSON.stringify(generationJson),
//       generationJson.tempo || 120,
//       generationJson.key   || 'C',
//       totalBars,
//     )

//     res.json({
//       id:       result.lastInsertRowid,
//       midiUrl:  `/outputs/${filename}`,
//       filename,
//       key:      generationJson.key   || 'C',
//       tempo:    generationJson.tempo || 120,
//       bars:     totalBars,
//       metadata: {
//         time_signature:       generationJson.time_signature,
//         subdivisions_per_bar: generationJson.subdivisions_per_bar,
//       },
//     })
//   } catch (err) {
//     next(err)
//   }
// }

// module.exports = { compose }






'use strict'
// backend/controllers/composeController.js
// Added: reads `model` from req.body → routes to claudeService ('opus') or geminiService ('aria')

const path = require('path')
const fs   = require('fs')

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const ragService        = require('../services/ragService')
const geminiService     = require('../services/geminiService')
const claudeService     = require('../services/claudeService')   // ← NEW
const validationService = require('../services/validationService')
const stitchService     = require('../services/stitchService')
const jsonToMidi        = require('../services/converters/jsonToMidi')
const { getDb }         = require('../db/database')
const OUTPUTS_DIR = process.env.OUTPUTS_DIR || './outputs'

async function compose(req, res, next) {
  try {
    const { prompt, section, model } = req.body   // model: 'aria' (default) | 'opus'

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt is required' })
    }

    // Pick service based on model param
    const isOpus = model === 'opus'
    const aiService = isOpus ? claudeService : geminiService
    const modelLabel = isOpus ? 'opus' : 'aria'

    let ragChunks = []
    try {
      ragChunks = await ragService.query(prompt.trim(), 5)
    } catch (ragErr) {
      console.warn('[compose] RAG query failed, continuing without context:', ragErr.message)
    }

    let generationJson

    if (section && Number.isInteger(section) && section > 1) {
      const sections = []
      for (let i = 1; i <= section; i++) {
        const sectionJson = await aiService.compose(prompt, ragChunks, {
          sectionIndex:    i,
          totalSections:   section,
          previousSection: sections[i - 2] || null,
        })
        const validated = validationService.validate(sectionJson)
        if (!validated.ok) {
          const retried     = await aiService.retry(prompt, ragChunks, sectionJson, validated.errors)
          const revalidated = validationService.validate(retried)
          if (!revalidated.ok) throw new Error(`Validation failed after retry: ${revalidated.errors.join(', ')}`)
          sections.push(retried)
        } else {
          sections.push(sectionJson)
        }
      }
      generationJson = stitchService.merge(sections)
    } else {
      const raw       = await aiService.compose(prompt, ragChunks)
      const validated = validationService.validate(raw)
      if (!validated.ok) {
        const retried     = await aiService.retry(prompt, ragChunks, raw, validated.errors)
        const revalidated = validationService.validate(retried)
        if (!revalidated.ok) throw new Error(`Validation failed after retry: ${revalidated.errors.join(', ')}`)
        generationJson = retried
      } else {
        generationJson = raw
      }
    }

    const midiBytes = jsonToMidi.convert(generationJson)
    const filename  = `composition_${uuid()}.mid`
    const filePath  = path.join(OUTPUTS_DIR, filename)
    fs.writeFileSync(filePath, Buffer.from(midiBytes))

    const db        = getDb()
    const totalBars = generationJson.bars?.length || 0
    const result    = db.prepare(`
      INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      prompt.trim(),
      filePath,
      JSON.stringify(generationJson),
      generationJson.tempo || 120,
      generationJson.key   || 'C',
      totalBars,
    )

    res.json({
      id:       result.lastInsertRowid,
      midiUrl:  `/outputs/${filename}`,
      filename,
      key:      generationJson.key   || 'C',
      tempo:    generationJson.tempo || 120,
      bars:     totalBars,
      model:    modelLabel,          // ← returned so the frontend knows which was used
      metadata: {
        time_signature:       generationJson.time_signature,
        subdivisions_per_bar: generationJson.subdivisions_per_bar,
      },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { compose }