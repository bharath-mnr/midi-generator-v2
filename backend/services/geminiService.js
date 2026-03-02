// //E:\pro\midigenerator_v2\backend\services\geminiService.js

'use strict'

const fs   = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')

// ── Terminal colours ───────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m',
  gray:   '\x1b[90m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
}
const tag  = `${c.magenta}[GEMINI]${c.reset}`
const ok   = `${c.green}✔${c.reset}`
const warn = `${c.yellow}⚠${c.reset}`
const fail = `${c.red}✘${c.reset}`
const info = `${c.gray}•${c.reset}`

// ── Prompt file cache ──────────────────────────────────────────────────────────
const COMPOSE_PROMPT_PATH  = path.join(__dirname, '../prompts/compose.prompt.txt')
const CONTINUE_PROMPT_PATH = path.join(__dirname, '../prompts/continue.prompt.txt')
let _composePrompt  = null
let _continuePrompt = null

function getComposePrompt() {
  if (!_composePrompt) _composePrompt = fs.readFileSync(COMPOSE_PROMPT_PATH, 'utf8')
  return _composePrompt
}
function getContinuePrompt() {
  if (!_continuePrompt) _continuePrompt = fs.readFileSync(CONTINUE_PROMPT_PATH, 'utf8')
  return _continuePrompt
}

// ── Model fallback chain ───────────────────────────────────────────────────────
const MODEL_CHAIN = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
]

function isRetryableError(err) {
  const msg = err?.message || ''
  return msg.includes('404')
    || msg.includes('429')
    || msg.includes('503')
    || msg.includes('not found')
    || msg.includes('quota')
    || msg.includes('fetch failed')
    || msg.includes('ECONNRESET')
    || msg.includes('ETIMEDOUT')
    || msg.includes('network')
    || msg.includes('Service Unavailable')
    || msg.includes('high demand')
    || msg.includes('overloaded')
}

// ── Core LLM call with model fallback ────────────────────────────────────────
async function callWithFallback(promptText, label = 'compose') {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set in backend/.env')

  const key    = process.env.GEMINI_API_KEY
  const tokens = Math.round(promptText.length / 4)
  console.log(`${tag} ${info} ${label} — prompt ~${c.bold}${tokens} tokens${c.reset}  |  key: ${c.dim}${key.slice(0,8)}…${key.slice(-4)}${c.reset}`)

  const client  = new GoogleGenerativeAI(key)
  let lastErr   = null
  let attempts  = 0

  for (const modelName of MODEL_CHAIN) {
    attempts++
    process.stdout.write(`${tag} ${info} Trying ${c.cyan}${modelName}${c.reset}… `)
    try {
      const model  = client.getGenerativeModel(
        { model: modelName },
        { apiVersion: 'v1beta' }
      )
      const result = await model.generateContent(promptText)
      const text   = result.response.text()
      console.log(`${ok} ${c.green}success${c.reset}  (attempt ${attempts}/${MODEL_CHAIN.length})`)
      return { text, modelUsed: modelName }
    } catch (err) {
      const reason = _classifyError(err)
      console.log(`${fail} ${reason}`)
      lastErr = err
      if (!isRetryableError(err)) {
        console.log(`${tag} ${fail} Non-retryable error — stopping fallback chain`)
        throw err
      }
      if (attempts < MODEL_CHAIN.length) {
        process.stdout.write(`${tag} ${c.dim}  waiting 1s before next model…${c.reset}\n`)
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }

  console.log(`${tag} ${fail} All ${MODEL_CHAIN.length} models exhausted`)
  throw new Error(`All Gemini models failed. Last error: ${lastErr?.message}`)
}

function _classifyError(err) {
  const msg = err?.message || ''
  if (msg.includes('429'))                                    return `${c.yellow}quota exceeded${c.reset}`
  if (msg.includes('404'))                                    return `${c.yellow}model not available${c.reset}`
  if (msg.includes('503') || msg.includes('high demand'))     return `${c.yellow}service overloaded — trying next${c.reset}`
  if (msg.includes('fetch failed'))                           return `${c.yellow}network error${c.reset}`
  if (msg.includes('ECONNRESET'))                             return `${c.yellow}connection reset${c.reset}`
  if (msg.includes('401'))                                    return `${c.red}invalid API key${c.reset}`
  return `${c.red}${msg.slice(0, 60)}${c.reset}`
}

// ── Format RAG context ────────────────────────────────────────────────────────
function formatRagContext(chunks) {
  if (!chunks || chunks.length === 0) return 'No reference material available.'
  return chunks
    .map((ch, i) => `[Reference ${i + 1}] (${ch.type}, source: ${ch.source})\n${ch.text}`)
    .join('\n\n')
}

// ── Prompt enhancer ───────────────────────────────────────────────────────────
async function enhancePrompt(userPrompt, ragChunks) {
  if (userPrompt.length > 400
    || userPrompt.includes('bars')
    || userPrompt.includes('BPM')
    || userPrompt.includes('Output ONLY raw JSON')
    || userPrompt.includes('GENERATION JSON RULES')) {
    return userPrompt
  }

  const ragHints = ragChunks.length > 0
    ? ragChunks
        .filter(c => c.type === 'metadata' || c.type === 'harmony' || c.type === 'structure')
        .slice(0, 3)
        .map(c => c.text?.slice(0, 200))
        .join('\n')
    : ''

  const ep = `You are a professional music director giving a detailed brief to a MIDI composer.

User request: "${userPrompt}"
${ragHints ? `\nKnowledge base reference:\n${ragHints}\n` : ''}

Write a COMPLETE MUSICAL BLUEPRINT. Be specific — use real note names, real numbers, real chord names.
Cover every point below. No waffle. Just the spec.

KEY & MODE: (pick one that fits the emotion — give root note and mode)
TEMPO: (exact BPM number)
TIME SIGNATURE: (almost certainly 4/4)
LENGTH: (8, 16, or 32 bars — pick based on complexity requested)
CHORD PROGRESSION: (write the ACTUAL chords in order, e.g. "Am – F – C – G, repeating")
OPENING MOTIF: (write 4–6 ACTUAL NOTE NAMES with octave + rhythm, e.g. "E4(dur=6) F4(dur=2) A4(dur=4) G4(dur=4)")
MOTIF EMOTION: (what feeling does the motif convey and why)
BASS PATTERN: (describe exactly, e.g. "A2 on beat 1, E2 on beat 3, all half notes")
HARMONY VOICINGS: (list chord voicings, e.g. "Am = A3+C4+E4, F = F3+A3+C4")
MELODY REGISTER: (which octaves, e.g. "primarily E4–E6, peak at A5 in climax")
MELODIC SHAPE BAR BY BAR:
  Bars 1-4 (intro): describe the melodic idea — e.g. "motif at E4–A4 range, ends on E4 long note"
  Bars 5-8 (build): describe — e.g. "motif repeated a 3rd higher, adds inner passing tones"
  Bars 9-12 (climax): describe — e.g. "motif inverted and augmented, reaches A5, full texture"
  Bars 13-16 (resolve): describe — e.g. "motif fragments, descends to E4, final whole note E4 soft"
RHYTHMIC CHARACTER: (describe the feel — e.g. "dotted rhythms, syncopation on beat 2, melody breathes with half note phrase endings")
DYNAMIC ARC: (e.g. "mp bar 1, mf bar 5, ff bar 9-10, p bar 14, pp final note")
EMOTIONAL JOURNEY: (one sentence — e.g. "begins in quiet grief, builds to anguished cry, resolves to acceptance")
${ragHints ? 'FROM REFERENCE MATERIAL: (what specific musical elements to borrow)' : ''}

Be completely specific. Every number matters. Every note name matters.`

  try {
    const { text } = await callWithFallback(ep, 'enhance')
    const enhanced = `MUSICAL BLUEPRINT:\n${text.trim()}\n\n---\nOriginal request: "${userPrompt}"`
    console.log(`${tag} ${ok} Prompt enhanced: ${userPrompt.length} → ${enhanced.length} chars`)
    return enhanced
  } catch (err) {
    console.log(`${tag} ${warn} Enhancement failed, using original`)
    return userPrompt
  }
}

// ── Build prompt ──────────────────────────────────────────────────────────────
function buildComposePrompt(userPrompt, ragChunks, options = {}) {
  const hasRag = ragChunks && ragChunks.length > 0

  // Raw prompt passthrough — user provided their own detailed JSON instructions
  if (userPrompt.includes('Output ONLY raw JSON') || userPrompt.includes('GENERATION JSON RULES')) {
    console.log(`${tag} ${info} Mode: ${c.cyan}raw prompt passthrough${c.reset}${hasRag ? ` + ${ragChunks.length} RAG chunks` : ''}`)
    const ragContext = formatRagContext(ragChunks)
    return ragContext !== 'No reference material available.'
      ? `${userPrompt}\n\nADDITIONAL REFERENCE MATERIAL:\n${ragContext}`
      : userPrompt
  }

  const { sectionIndex, totalSections, previousSection } = options
  const isMultiSection = totalSections && totalSections > 1

  if (isMultiSection) {
    console.log(`${tag} ${info} Mode: ${c.cyan}multi-section${c.reset} — section ${sectionIndex}/${totalSections}${hasRag ? ` + ${ragChunks.length} RAG chunks` : ''}`)
  } else {
    console.log(`${tag} ${info} Mode: ${c.cyan}single composition${c.reset}${hasRag ? ` + ${ragChunks.length} RAG chunks injected` : ' (no RAG context)'}`)
  }

  const basePrompt  = getComposePrompt()
  const ragContext  = formatRagContext(ragChunks)
  const sectionNote = isMultiSection
    ? `\n\nSECTION INFO: Generating section ${sectionIndex} of ${totalSections}. Bar numbering starts at ${(sectionIndex - 1) * 16 + 1}.`
    : ''
  const prevNote = previousSection
    ? `\n\nPREVIOUS SECTION ENDED WITH:\n${JSON.stringify({
        tempo:    previousSection.tempo,
        key:      previousSection.key,
        last_bar: previousSection.bars?.slice(-1)[0],
      }, null, 2)}\nContinue naturally from this.`
    : ''

  return basePrompt
    .replace('{{USER_PROMPT}}',  userPrompt.trim())
    .replace('{{RAG_CONTEXT}}',  ragContext)
    .replace('{{SECTION_NOTE}}', sectionNote)
    .replace('{{PREV_NOTE}}',    prevNote)
}

function buildRetryPrompt(userPrompt, ragChunks, badJsonStr, errors) {
  console.log(`${tag} ${warn} Retrying with ${errors.length} validation error(s) fed back to model`)
  const ragContext = formatRagContext(ragChunks)
  return getContinuePrompt()
    .replace('{{USER_PROMPT}}',  userPrompt.trim())
    .replace('{{RAG_CONTEXT}}',  ragContext)
    .replace('{{BAD_JSON}}',     badJsonStr)
    .replace('{{ERRORS}}',       errors.join('\n'))
}

// ── JSON extraction ───────────────────────────────────────────────────────────
function parseJsonResponse(text) {
  // 1. JSON inside code fence
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch (_) {}
  }
  // 2. Bare JSON object (handles thinking model preamble)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]) } catch (_) {}
  }
  // 3. Full text stripped
  return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim())
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

async function compose(userPrompt, ragChunks, options = {}) {
  // Enhance short/vague prompts into detailed musical specs
  const effectivePrompt = await enhancePrompt(userPrompt, ragChunks)
  const promptText      = buildComposePrompt(effectivePrompt, ragChunks, options)
  const { text, modelUsed } = await callWithFallback(promptText, 'compose')

  try {
    const parsed = parseJsonResponse(text)
    console.log(`${tag} ${ok} Composition parsed — ${c.bold}${parsed.bars?.length} bars${c.reset}  key: ${c.cyan}${parsed.key}${c.reset}  tempo: ${c.cyan}${parsed.tempo} BPM${c.reset}  time: ${parsed.time_signature}`)
    const noteCount = parsed.bars?.reduce((s, b) => s + (b.notes?.length || 0), 0) || 0
    console.log(`${tag} ${info} Total notes: ${c.bold}${noteCount}${c.reset}  model: ${c.dim}${modelUsed}${c.reset}`)
    return parsed
  } catch (parseErr) {
    console.error(`${tag} ${fail} JSON parse failed — raw response:`)
    console.error(text.slice(0, 600))
    throw new Error(`Gemini returned invalid JSON: ${parseErr.message}`)
  }
}

async function retry(userPrompt, ragChunks, badJson, errors) {
  const promptText       = buildRetryPrompt(userPrompt, ragChunks, JSON.stringify(badJson, null, 2), errors)
  const { text }         = await callWithFallback(promptText, 'retry')

  try {
    const parsed = parseJsonResponse(text)
    console.log(`${tag} ${ok} Retry succeeded — ${parsed.bars?.length} bars`)
    return parsed
  } catch (parseErr) {
    throw new Error(`Gemini retry returned invalid JSON: ${parseErr.message}`)
  }
}


async function alterCompose(fullPromptText) {
  const { text, modelUsed } = await callWithFallback(fullPromptText, 'alter')
  try {
    const parsed = parseJsonResponse(text)
    const noteCount = parsed.bars?.reduce((s, b) => s + (b.notes?.length || 0), 0) || 0
    console.log(`${tag} ${ok} Alter parsed — ${c.bold}${parsed.bars?.length} bars${c.reset}  added notes: ${c.cyan}${noteCount}${c.reset}  model: ${c.dim}${modelUsed}${c.reset}`)
    return parsed
  } catch (parseErr) {
    console.error(`${tag} ${fail} Alter JSON parse failed`)
    console.error(text.slice(0, 600))
    throw new Error(`Gemini returned invalid JSON: ${parseErr.message}`)
  }
}

module.exports = { compose, retry, alterCompose }