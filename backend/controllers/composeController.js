// // // //E:\pro\midigenerator_v2\backend\controllers\composeController.js

// // // 'use strict'

// // // const path = require('path')
// // // const fs   = require('fs')

// // // // Inline uuid — no npm dependency needed
// // // function uuid() {
// // //   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
// // //     const r = Math.random() * 16 | 0
// // //     return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
// // //   })
// // // }

// // // const ragService        = require('../services/ragService')
// // // const geminiService     = require('../services/geminiService')
// // // const validationService = require('../services/validationService')
// // // const stitchService     = require('../services/stitchService')
// // // const jsonToMidi        = require('../services/converters/jsonToMidi')
// // // const { getDb }         = require('../db/database')
// // // const OUTPUTS_DIR = process.env.OUTPUTS_DIR || './outputs'

// // // async function compose(req, res, next) {
// // //   try {
// // //     const { prompt, section } = req.body

// // //     if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
// // //       return res.status(400).json({ error: 'prompt is required' })
// // //     }

// // //     let ragChunks = []
// // //     try {
// // //       ragChunks = await ragService.query(prompt.trim(), 5)
// // //     } catch (ragErr) {
// // //       console.warn('[compose] RAG query failed, continuing without context:', ragErr.message)
// // //     }

// // //     let generationJson

// // //     if (section && Number.isInteger(section) && section > 1) {
// // //       const sections = []
// // //       for (let i = 1; i <= section; i++) {
// // //         const sectionJson = await geminiService.compose(prompt, ragChunks, {
// // //           sectionIndex: i,
// // //           totalSections: section,
// // //           previousSection: sections[i - 2] || null,
// // //         })
// // //         const validated = validationService.validate(sectionJson)
// // //         if (!validated.ok) {
// // //           const retried = await geminiService.retry(prompt, ragChunks, sectionJson, validated.errors)
// // //           const revalidated = validationService.validate(retried)
// // //           if (!revalidated.ok) throw new Error(`Validation failed after retry: ${revalidated.errors.join(', ')}`)
// // //           sections.push(retried)
// // //         } else {
// // //           sections.push(sectionJson)
// // //         }
// // //       }
// // //       generationJson = stitchService.merge(sections)
// // //     } else {
// // //       const raw = await geminiService.compose(prompt, ragChunks)
// // //       const validated = validationService.validate(raw)
// // //       if (!validated.ok) {
// // //         const retried = await geminiService.retry(prompt, ragChunks, raw, validated.errors)
// // //         const revalidated = validationService.validate(retried)
// // //         if (!revalidated.ok) throw new Error(`Validation failed after retry: ${revalidated.errors.join(', ')}`)
// // //         generationJson = retried
// // //       } else {
// // //         generationJson = raw
// // //       }
// // //     }

// // //     const midiBytes = jsonToMidi.convert(generationJson)

// // //     const filename = `composition_${uuid()}.mid`
// // //     const filePath = path.join(OUTPUTS_DIR, filename)
// // //     fs.writeFileSync(filePath, Buffer.from(midiBytes))

// // //     const db = getDb()
// // //     const totalBars = generationJson.bars?.length || 0
// // //     const result = db.prepare(`
// // //       INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
// // //       VALUES (?, ?, ?, ?, ?, ?)
// // //     `).run(
// // //       prompt.trim(),
// // //       filePath,
// // //       JSON.stringify(generationJson),
// // //       generationJson.tempo || 120,
// // //       generationJson.key   || 'C',
// // //       totalBars,
// // //     )

// // //     res.json({
// // //       id:       result.lastInsertRowid,
// // //       midiUrl:  `/outputs/${filename}`,
// // //       filename,
// // //       key:      generationJson.key   || 'C',
// // //       tempo:    generationJson.tempo || 120,
// // //       bars:     totalBars,
// // //       metadata: {
// // //         time_signature:       generationJson.time_signature,
// // //         subdivisions_per_bar: generationJson.subdivisions_per_bar,
// // //       },
// // //     })
// // //   } catch (err) {
// // //     next(err)
// // //   }
// // // }

// // // module.exports = { compose }






// // 'use strict'
// // // backend/controllers/composeController.js
// // // Added: reads `model` from req.body → routes to claudeService ('opus') or geminiService ('aria')

// // const path = require('path')
// // const fs   = require('fs')

// // function uuid() {
// //   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
// //     const r = Math.random() * 16 | 0
// //     return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
// //   })
// // }

// // const ragService        = require('../services/ragService')
// // const geminiService     = require('../services/geminiService')
// // const claudeService     = require('../services/claudeService')   // ← NEW
// // const validationService = require('../services/validationService')
// // const stitchService     = require('../services/stitchService')
// // const jsonToMidi        = require('../services/converters/jsonToMidi')
// // const { getDb }         = require('../db/database')
// // const OUTPUTS_DIR = process.env.OUTPUTS_DIR || './outputs'

// // async function compose(req, res, next) {
// //   try {
// //     const { prompt, section, model } = req.body   // model: 'aria' (default) | 'opus'

// //     if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
// //       return res.status(400).json({ error: 'prompt is required' })
// //     }

// //     // Pick service based on model param
// //     const isOpus = model === 'opus'
// //     const aiService = isOpus ? claudeService : geminiService
// //     const modelLabel = isOpus ? 'opus' : 'aria'

// //     let ragChunks = []
// //     try {
// //       ragChunks = await ragService.query(prompt.trim(), 5)
// //     } catch (ragErr) {
// //       console.warn('[compose] RAG query failed, continuing without context:', ragErr.message)
// //     }

// //     let generationJson

// //     if (section && Number.isInteger(section) && section > 1) {
// //       const sections = []
// //       for (let i = 1; i <= section; i++) {
// //         const sectionJson = await aiService.compose(prompt, ragChunks, {
// //           sectionIndex:    i,
// //           totalSections:   section,
// //           previousSection: sections[i - 2] || null,
// //         })
// //         const validated = validationService.validate(sectionJson)
// //         if (!validated.ok) {
// //           const retried     = await aiService.retry(prompt, ragChunks, sectionJson, validated.errors)
// //           const revalidated = validationService.validate(retried)
// //           if (!revalidated.ok) throw new Error(`Validation failed after retry: ${revalidated.errors.join(', ')}`)
// //           sections.push(retried)
// //         } else {
// //           sections.push(sectionJson)
// //         }
// //       }
// //       generationJson = stitchService.merge(sections)
// //     } else {
// //       const raw       = await aiService.compose(prompt, ragChunks)
// //       const validated = validationService.validate(raw)
// //       if (!validated.ok) {
// //         const retried     = await aiService.retry(prompt, ragChunks, raw, validated.errors)
// //         const revalidated = validationService.validate(retried)
// //         if (!revalidated.ok) throw new Error(`Validation failed after retry: ${revalidated.errors.join(', ')}`)
// //         generationJson = retried
// //       } else {
// //         generationJson = raw
// //       }
// //     }

// //     const midiBytes = jsonToMidi.convert(generationJson)
// //     const filename  = `composition_${uuid()}.mid`
// //     const filePath  = path.join(OUTPUTS_DIR, filename)
// //     fs.writeFileSync(filePath, Buffer.from(midiBytes))

// //     const db        = getDb()
// //     const totalBars = generationJson.bars?.length || 0
// //     const result    = db.prepare(`
// //       INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
// //       VALUES (?, ?, ?, ?, ?, ?)
// //     `).run(
// //       prompt.trim(),
// //       filePath,
// //       JSON.stringify(generationJson),
// //       generationJson.tempo || 120,
// //       generationJson.key   || 'C',
// //       totalBars,
// //     )

// //     res.json({
// //       id:       result.lastInsertRowid,
// //       midiUrl:  `/outputs/${filename}`,
// //       filename,
// //       key:      generationJson.key   || 'C',
// //       tempo:    generationJson.tempo || 120,
// //       bars:     totalBars,
// //       model:    modelLabel,          // ← returned so the frontend knows which was used
// //       metadata: {
// //         time_signature:       generationJson.time_signature,
// //         subdivisions_per_bar: generationJson.subdivisions_per_bar,
// //       },
// //     })
// //   } catch (err) {
// //     next(err)
// //   }
// // }

// // module.exports = { compose }












// 'use strict'
// // backend/controllers/composeController.js
// //
// // KEY CHANGES:
// //   1. EXACT MATCH DETECTION
// //      If prompt mentions a known track name → fetch exact JSON from SQLite tracks table
// //      → inject full JSON directly into the prompt as primary reference
// //      → "give exact gibran alcocer idea 10" now returns the ACTUAL stored JSON
// //
// //   2. topK INCREASED from 5 → 80
// //      Gives AI 10× more musical context from Pinecone
// //
// //   3. HYBRID CONTEXT
// //      Exact JSON (if matched) + top-80 style chunks = maximum accuracy

// const path = require('path')
// const fs   = require('fs')

// function uuid() {
//   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
//     const r = Math.random() * 16 | 0
//     return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
//   })
// }

// const ragService        = require('../services/ragService')
// const geminiService     = require('../services/geminiService')
// const claudeService     = require('../services/claudeService')
// const validationService = require('../services/validationService')
// const stitchService     = require('../services/stitchService')
// const jsonToMidi        = require('../services/converters/jsonToMidi')
// const { getDb }         = require('../db/database')

// const OUTPUTS_DIR = process.env.OUTPUTS_DIR || './outputs'

// // ── Detect if the user wants an exact known track reproduced ──────────────────
// // Keywords that signal "give me that exact file"
// const EXACT_KEYWORDS = ['exact', 'original', 'reproduce', 'copy', 'same as', 'identical to', 'verbatim']

// function wantsExact(prompt) {
//   const lower = prompt.toLowerCase()
//   return EXACT_KEYWORDS.some(kw => lower.includes(kw))
// }

// // ── Compose ───────────────────────────────────────────────────────────────────
// async function compose(req, res, next) {
//   try {
//     const { prompt, section, model } = req.body

//     if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
//       return res.status(400).json({ error: 'prompt is required' })
//     }

//     const isOpus     = model === 'opus'
//     const aiService  = isOpus ? claudeService : geminiService
//     const modelLabel = isOpus ? 'opus' : 'aria'

//     let ragChunks   = []
//     let exactJson   = null
//     let exactSource = null

//     // ── STEP 1: Try exact track match ──────────────────────────────────────
//     // Even if user doesn't say "exact", try to match — if they say
//     // "generate gibran alcocer idea 10 style" we still inject the exact JSON
//     // as primary reference for maximum accuracy
//     try {
//       exactSource = ragService.findMatchingTrack(prompt.trim())
//       if (exactSource) {
//         exactJson = ragService.getExactJson(exactSource)
//         if (exactJson) {
//           console.log(`[compose] Exact JSON found for "${exactSource}" — injecting as primary reference`)
//         }
//       }
//     } catch (e) {
//       console.warn('[compose] Exact match lookup failed:', e.message)
//     }

//     // ── STEP 2: Pinecone semantic search with topK=80 ──────────────────────
//     // Get style context regardless of exact match
//     try {
//       ragChunks = await ragService.query(prompt.trim(), 80)
//     } catch (ragErr) {
//       console.warn('[compose] RAG query failed, continuing without context:', ragErr.message)
//     }

//     // ── STEP 3: If exact match AND user explicitly wants exact → return it ──
//     // Parse the stored JSON and return it directly as the generation
//     if (exactJson && wantsExact(prompt)) {
//       try {
//         const parsedExact = JSON.parse(exactJson)
//         const midiBytes   = jsonToMidi.convert(parsedExact)
//         const filename    = `composition_${uuid()}.mid`
//         const filePath    = path.join(OUTPUTS_DIR, filename)
//         fs.writeFileSync(filePath, Buffer.from(midiBytes))

//         const db        = getDb()
//         const totalBars = parsedExact.bars?.length || 0
//         const result    = db.prepare(`
//           INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
//           VALUES (?, ?, ?, ?, ?, ?)
//         `).run(
//           prompt.trim(), filePath, exactJson,
//           parsedExact.tempo || 120, parsedExact.key || 'C', totalBars,
//         )

//         console.log(`[compose] Exact mode — returned stored JSON for "${exactSource}"`)
//         return res.json({
//           id:       result.lastInsertRowid,
//           midiUrl:  `/outputs/${filename}`,
//           filename,
//           key:      parsedExact.key   || 'C',
//           tempo:    parsedExact.tempo || 120,
//           bars:     totalBars,
//           model:    'exact',
//           exactSource,
//           metadata: {
//             time_signature:       parsedExact.time_signature,
//             subdivisions_per_bar: parsedExact.subdivisions_per_bar,
//           },
//         })
//       } catch (e) {
//         console.warn('[compose] Exact JSON parse failed, falling through to generation:', e.message)
//       }
//     }

//     // ── STEP 4: Build augmented prompt ─────────────────────────────────────
//     // If we have an exact JSON match, prepend it to the RAG context
//     // so the AI uses it as the primary reference
//     let effectivePrompt = prompt
//     if (exactJson && exactSource) {
//       // Inject exact JSON as a style reference (not verbatim reproduction)
//       // This is much better than just having the chunked version
//       const exactParsed = (() => { try { return JSON.parse(exactJson) } catch { return null } })()
//       if (exactParsed) {
//         const exactContext = [
//           `PRIMARY REFERENCE — EXACT JSON for "${exactSource}":`,
//           `Key: ${exactParsed.key}, Tempo: ${exactParsed.tempo} BPM, Bars: ${exactParsed.bars?.length}.`,
//           `Full JSON: ${exactJson.slice(0, 4000)}${exactJson.length > 4000 ? '…[truncated]' : ''}`,
//         ].join('\n')

//         // Prepend to prompt so AI sees it
//         effectivePrompt = `${prompt}\n\n[EXACT REFERENCE MATERIAL]\n${exactContext}`
//       }
//     }

//     // ── STEP 5: Generate ───────────────────────────────────────────────────
//     let generationJson

//     if (section && Number.isInteger(section) && section > 1) {
//       const sections = []
//       for (let i = 1; i <= section; i++) {
//         const sectionJson = await aiService.compose(effectivePrompt, ragChunks, {
//           sectionIndex:    i,
//           totalSections:   section,
//           previousSection: sections[i - 2] || null,
//         })
//         const validated = validationService.validate(sectionJson)
//         if (!validated.ok) {
//           const retried     = await aiService.retry(effectivePrompt, ragChunks, sectionJson, validated.errors)
//           const revalidated = validationService.validate(retried)
//           if (!revalidated.ok) throw new Error(`Validation failed: ${revalidated.errors.join(', ')}`)
//           sections.push(retried)
//         } else {
//           sections.push(sectionJson)
//         }
//       }
//       generationJson = stitchService.merge(sections)
//     } else {
//       const raw       = await aiService.compose(effectivePrompt, ragChunks)
//       const validated = validationService.validate(raw)
//       if (!validated.ok) {
//         const retried     = await aiService.retry(effectivePrompt, ragChunks, raw, validated.errors)
//         const revalidated = validationService.validate(retried)
//         if (!revalidated.ok) throw new Error(`Validation failed: ${revalidated.errors.join(', ')}`)
//         generationJson = retried
//       } else {
//         generationJson = raw
//       }
//     }

//     // ── STEP 6: Save and respond ───────────────────────────────────────────
//     const midiBytes = jsonToMidi.convert(generationJson)
//     const filename  = `composition_${uuid()}.mid`
//     const filePath  = path.join(OUTPUTS_DIR, filename)
//     fs.writeFileSync(filePath, Buffer.from(midiBytes))

//     const db        = getDb()
//     const totalBars = generationJson.bars?.length || 0
//     const result    = db.prepare(`
//       INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
//       VALUES (?, ?, ?, ?, ?, ?)
//     `).run(
//       prompt.trim(), filePath, JSON.stringify(generationJson),
//       generationJson.tempo || 120, generationJson.key || 'C', totalBars,
//     )

//     res.json({
//       id:       result.lastInsertRowid,
//       midiUrl:  `/outputs/${filename}`,
//       filename,
//       key:      generationJson.key   || 'C',
//       tempo:    generationJson.tempo || 120,
//       bars:     totalBars,
//       model:    modelLabel,
//       exactSource: exactSource || null,
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
//
// THE KEY CHANGE THAT BEATS NOTEBOOKLM:
//   OLD: ragService.query(topK=80) → AI sees 7% of knowledge
//   NEW: knowledgeService.getAllContext() → AI sees 100% of knowledge
//
// Full flow:
//   1. Check if prompt matches a known track exactly → if yes + wants exact → return stored JSON
//   2. Load ALL analytical chunks from Turso (100% context)
//   3. If track matched → also inject exact JSON as primary reference
//   4. Generate with full context

const path = require('path')
const fs   = require('fs')

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const knowledgeService  = require('../services/knowledgeService')
const geminiService     = require('../services/geminiService')
const claudeService     = require('../services/claudeService')
const validationService = require('../services/validationService')
const stitchService     = require('../services/stitchService')
const jsonToMidi        = require('../services/converters/jsonToMidi')
const { getDb }         = require('../db/database')

const OUTPUTS_DIR = process.env.OUTPUTS_DIR || './outputs'

// Keywords that signal "give me the exact original file"
const EXACT_KEYWORDS = ['exact', 'original', 'reproduce', 'verbatim', 'copy of']

function wantsExact(prompt) {
  const lower = prompt.toLowerCase()
  return EXACT_KEYWORDS.some(kw => lower.includes(kw))
}

async function compose(req, res, next) {
  try {
    const { prompt, section, model } = req.body

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt is required' })
    }

    const isOpus     = model === 'opus'
    const aiService  = isOpus ? claudeService : geminiService
    const modelLabel = isOpus ? 'opus' : 'aria'

    // ── STEP 1: Try to find an exact matching track ────────────────────────
    let exactSource = null
    let exactJsonStr = null
    try {
      exactSource = await knowledgeService.findExactTrack(prompt.trim())
      if (exactSource) {
        exactJsonStr = await knowledgeService.getExactJson(exactSource)
      }
    } catch (e) {
      console.warn('[compose] Exact lookup failed:', e.message)
    }

    // ── STEP 2: If exact match + user says "exact/original" → return directly ──
    if (exactJsonStr && wantsExact(prompt)) {
      try {
        const parsedExact = JSON.parse(exactJsonStr)
        const midiBytes   = jsonToMidi.convert(parsedExact)
        const filename    = `composition_${uuid()}.mid`
        const filePath    = path.join(OUTPUTS_DIR, filename)
        fs.writeFileSync(filePath, Buffer.from(midiBytes))

        const db     = getDb()
        const totalBars = parsedExact.bars?.length || 0
        const result = await db.prepare(`
          INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(prompt.trim(), filePath, exactJsonStr, parsedExact.tempo || 120, parsedExact.key || 'C', totalBars)

        console.log(`[compose] EXACT MODE — returning stored JSON for "${exactSource}"`)
        return res.json({
          id:          result.lastInsertRowid,
          midiUrl:     `/outputs/${filename}`,
          filename,
          key:         parsedExact.key   || 'C',
          tempo:       parsedExact.tempo || 120,
          bars:        totalBars,
          model:       'exact',
          exactSource,
          metadata: {
            time_signature:       parsedExact.time_signature,
            subdivisions_per_bar: parsedExact.subdivisions_per_bar,
          },
        })
      } catch (e) {
        console.warn('[compose] Exact JSON convert failed, falling through:', e.message)
      }
    }

    // ── STEP 3: Load ALL knowledge context (100% — beats NotebookLM) ──────
    let allContext = ''
    try {
      allContext = await knowledgeService.getAllContext()
    } catch (e) {
      console.warn('[compose] getAllContext failed:', e.message)
    }

    // ── STEP 4: Build augmented RAG chunks array ───────────────────────────
    // The existing geminiService/claudeService expect ragChunks array.
    // We package the full context as a single large chunk.
    const ragChunks = allContext
      ? [{ text: allContext, type: 'full_context', source: 'all_tracks', score: 1.0 }]
      : []

    // If we matched a specific track, also inject its exact JSON
    // as the PRIMARY reference at the front
    let effectivePrompt = prompt
    if (exactJsonStr && exactSource) {
      try {
        const p = JSON.parse(exactJsonStr)
        const exactContext = [
          `\nPRIMARY EXACT REFERENCE — "${exactSource}":`,
          `Key: ${p.key}, Tempo: ${p.tempo} BPM, Bars: ${p.bars?.length}, Time: ${p.time_signature}.`,
          `Full JSON: ${exactJsonStr.slice(0, 6000)}${exactJsonStr.length > 6000 ? '\n…[truncated — use style guide above for full pattern reference]' : ''}`,
        ].join('\n')
        effectivePrompt = `${prompt}\n\n${exactContext}`
        console.log(`[compose] Injected exact JSON for "${exactSource}" into prompt`)
      } catch (_) {}
    }

    // ── STEP 5: Generate ───────────────────────────────────────────────────
    let generationJson

    if (section && Number.isInteger(section) && section > 1) {
      const sections = []
      for (let i = 1; i <= section; i++) {
        const sectionJson = await aiService.compose(effectivePrompt, ragChunks, {
          sectionIndex:    i,
          totalSections:   section,
          previousSection: sections[i - 2] || null,
        })
        const validated = validationService.validate(sectionJson)
        if (!validated.ok) {
          const retried     = await aiService.retry(effectivePrompt, ragChunks, sectionJson, validated.errors)
          const revalidated = validationService.validate(retried)
          if (!revalidated.ok) throw new Error(`Validation failed: ${revalidated.errors.join(', ')}`)
          sections.push(retried)
        } else {
          sections.push(sectionJson)
        }
      }
      generationJson = stitchService.merge(sections)
    } else {
      const raw       = await aiService.compose(effectivePrompt, ragChunks)
      const validated = validationService.validate(raw)
      if (!validated.ok) {
        const retried     = await aiService.retry(effectivePrompt, ragChunks, raw, validated.errors)
        const revalidated = validationService.validate(retried)
        if (!revalidated.ok) throw new Error(`Validation failed: ${revalidated.errors.join(', ')}`)
        generationJson = retried
      } else {
        generationJson = raw
      }
    }

    // ── STEP 6: Save and respond ───────────────────────────────────────────
    const midiBytes = jsonToMidi.convert(generationJson)
    const filename  = `composition_${uuid()}.mid`
    const filePath  = path.join(OUTPUTS_DIR, filename)
    fs.writeFileSync(filePath, Buffer.from(midiBytes))

    const db        = getDb()
    const totalBars = generationJson.bars?.length || 0
    const result    = await db.prepare(`
      INSERT INTO history (prompt, midi_path, json_data, tempo, key, bars)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      prompt.trim(), filePath, JSON.stringify(generationJson),
      generationJson.tempo || 120, generationJson.key || 'C', totalBars,
    )

    res.json({
      id:          result.lastInsertRowid,
      midiUrl:     `/outputs/${filename}`,
      filename,
      key:         generationJson.key   || 'C',
      tempo:       generationJson.tempo || 120,
      bars:        totalBars,
      model:       modelLabel,
      exactSource: exactSource || null,
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