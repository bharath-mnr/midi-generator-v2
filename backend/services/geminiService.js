//E:\pro\midigenerator_v2\backend\services\geminiService.js
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
// Expands a short user prompt into a detailed musical specification.
// This runs as a separate fast Gemini call before the main composition.
async function enhancePrompt(userPrompt, ragChunks) {
  // Skip enhancement for already-detailed prompts
  if (userPrompt.length > 300
    || userPrompt.includes('bars')
    || userPrompt.includes('BPM')
    || userPrompt.includes('Output ONLY raw JSON')
    || userPrompt.includes('GENERATION JSON RULES')) {
    return userPrompt
  }

  // Extract RAG hints to inform the enhancer
  const ragHints = ragChunks.length > 0
    ? ragChunks
        .filter(c => c.type === 'metadata' || c.type === 'harmony')
        .map(c => c.text?.slice(0, 150))
        .join('\n')
    : ''

  const enhancePrompt = `You are a music director briefing a composer.
A user wants: "${userPrompt}"
${ragHints ? `\nReference material available:\n${ragHints}\n` : ''}

Write a concise musical brief (max 120 words) specifying:
- Exact tempo (BPM)
- Key and mode
- Number of bars (8, 16, or 32)
- Time signature
- Mood and style description
- 3-4 chord progression to use (e.g. Am - F - C - G)
- Register layout (which voices: bass / chords / melody)
- Dynamic arc (how it should build and resolve)
- Any specific techniques from the reference material to incorporate

Write only the brief. No preamble. No headers. Plain paragraph form.`

  try {
    const { text } = await callWithFallback(enhancePrompt, 'enhance')
    const enhanced = `${text.trim()}\n\nOriginal request: ${userPrompt}`
    console.log(`${tag} ${ok} Prompt enhanced (${userPrompt.length} → ${enhanced.length} chars)`)
    return enhanced
  } catch (err) {
    console.log(`${tag} ${warn} Prompt enhancement failed, using original: ${err.message?.slice(0,60)}`)
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

module.exports = { compose, retry }