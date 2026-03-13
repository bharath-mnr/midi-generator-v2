'use strict'
// backend/services/claudeService.js
// Drop-in replacement for geminiService — same exported API: compose, retry, alterCompose

const fs      = require('fs')
const path    = require('path')
const Anthropic = require('@anthropic-ai/sdk')

// ── Terminal colours ──────────────────────────────────────────────────────────
const c = {
  reset:'\x1b[0m', dim:'\x1b[2m', green:'\x1b[32m', yellow:'\x1b[33m',
  cyan:'\x1b[36m', red:'\x1b[31m', bold:'\x1b[1m',  gray:'\x1b[90m', blue:'\x1b[34m',
}
const tag  = `${c.blue}[CLAUDE]${c.reset}`
const ok   = `${c.green}✔${c.reset}`
const warn = `${c.yellow}⚠${c.reset}`
const fail = `${c.red}✘${c.reset}`
const info = `${c.gray}•${c.reset}`

// ── Prompt cache — reuse the SAME prompt files as geminiService ───────────────
const COMPOSE_PROMPT_PATH  = path.join(__dirname, '../prompts/compose.prompt.txt')
const CONTINUE_PROMPT_PATH = path.join(__dirname, '../prompts/continue.prompt.txt')
let _composePrompt = null, _continuePrompt = null
const getComposePrompt  = () => _composePrompt  || (_composePrompt  = fs.readFileSync(COMPOSE_PROMPT_PATH,  'utf8'))
const getContinuePrompt = () => _continuePrompt || (_continuePrompt = fs.readFileSync(CONTINUE_PROMPT_PATH, 'utf8'))

// ── Core API call ─────────────────────────────────────────────────────────────
async function callClaude(promptText, label = 'compose') {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set in backend/.env')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const tokens = Math.round(promptText.length / 4)
  console.log(`${tag} ${info} ${label} — ~${c.bold}${tokens}${c.reset} tokens`)
  process.stdout.write(`${tag} ${info} Calling ${c.cyan}claude-sonnet-4-5${c.reset}… `)

  const msg = await client.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 8192,
    messages:   [{ role: 'user', content: promptText }],
  })

  const text = msg.content.find(b => b.type === 'text')?.text || ''
  console.log(`${ok} ${c.green}success${c.reset}`)
  return text
}

// ── Shared helpers (identical to geminiService) ───────────────────────────────
function formatRagContext(chunks) {
  if (!chunks || chunks.length === 0) return 'No reference material available.'
  return chunks.map((ch, i) => `[Reference ${i + 1}] (${ch.type}, source: ${ch.source})\n${ch.text}`).join('\n\n')
}

function parseJsonResponse(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) { try { return JSON.parse(fence[1].trim()) } catch (_) {} }
  const obj = text.match(/\{[\s\S]*\}/)
  if (obj)   { try { return JSON.parse(obj[0])          } catch (_) {} }
  return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim())
}

function buildComposePrompt(userPrompt, ragChunks, options = {}) {
  const { sectionIndex, totalSections, previousSection } = options
  const isMultiSection = totalSections && totalSections > 1
  const ragContext  = formatRagContext(ragChunks)
  const sectionNote = isMultiSection
    ? `\n\nSECTION INFO: Generating section ${sectionIndex} of ${totalSections}. Bar numbering starts at ${(sectionIndex - 1) * 16 + 1}.`
    : ''
  const prevNote = previousSection
    ? `\n\nPREVIOUS SECTION ENDED WITH:\n${JSON.stringify({ tempo: previousSection.tempo, key: previousSection.key, last_bar: previousSection.bars?.slice(-1)[0] }, null, 2)}\nContinue naturally from this.`
    : ''
  return getComposePrompt()
    .replace('{{USER_PROMPT}}',  userPrompt.trim())
    .replace('{{RAG_CONTEXT}}',  ragContext)
    .replace('{{SECTION_NOTE}}', sectionNote)
    .replace('{{PREV_NOTE}}',    prevNote)
}

function buildRetryPrompt(userPrompt, ragChunks, badJsonStr, errors) {
  console.log(`${tag} ${warn} Retrying with ${errors.length} validation error(s)`)
  return getContinuePrompt()
    .replace('{{USER_PROMPT}}', userPrompt.trim())
    .replace('{{RAG_CONTEXT}}', formatRagContext(ragChunks))
    .replace('{{BAD_JSON}}',    badJsonStr)
    .replace('{{ERRORS}}',      errors.join('\n'))
}

// ── PUBLIC API (exact same shape as geminiService) ────────────────────────────

async function compose(userPrompt, ragChunks, options = {}) {
  const text = await callClaude(buildComposePrompt(userPrompt, ragChunks, options), 'compose')
  try {
    const parsed    = parseJsonResponse(text)
    const noteCount = parsed.bars?.reduce((s, b) => s + (b.notes?.length || 0), 0) || 0
    console.log(`${tag} ${ok} Composed — ${c.bold}${parsed.bars?.length} bars${c.reset}  key:${c.cyan}${parsed.key}${c.reset}  tempo:${c.cyan}${parsed.tempo}${c.reset}  notes:${c.bold}${noteCount}${c.reset}`)
    return parsed
  } catch (e) {
    console.error(`${tag} ${fail} JSON parse failed\n${text.slice(0, 400)}`)
    throw new Error(`Claude returned invalid JSON: ${e.message}`)
  }
}

async function retry(userPrompt, ragChunks, badJson, errors) {
  const text = await callClaude(buildRetryPrompt(userPrompt, ragChunks, JSON.stringify(badJson, null, 2), errors), 'retry')
  try {
    const parsed = parseJsonResponse(text)
    console.log(`${tag} ${ok} Retry succeeded — ${parsed.bars?.length} bars`)
    return parsed
  } catch (e) {
    throw new Error(`Claude retry returned invalid JSON: ${e.message}`)
  }
}

async function alterCompose(fullPromptText) {
  const text = await callClaude(fullPromptText, 'alter')
  try {
    const parsed    = parseJsonResponse(text)
    const noteCount = parsed.bars?.reduce((s, b) => s + (b.notes?.length || 0), 0) || 0
    console.log(`${tag} ${ok} Alter parsed — ${c.bold}${parsed.bars?.length} bars${c.reset}  added:${c.cyan}${noteCount}${c.reset}`)
    return parsed
  } catch (e) {
    console.error(`${tag} ${fail} Alter JSON parse failed\n${text.slice(0, 400)}`)
    throw new Error(`Claude returned invalid JSON: ${e.message}`)
  }
}

module.exports = { compose, retry, alterCompose }