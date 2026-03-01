# MidiGenerator

AI-powered MIDI composition system using RAG (Retrieval-Augmented Generation) with Gemini.

## How It Works

```
User prompt → Pinecone RAG (top-5 chunks) → Gemini LLM → Generation JSON
→ Validation + retry → JSON → MIDI binary → Download
```

Knowledge is built by uploading MIDI files and documents. Each MIDI is analyzed into 4 chunk types (metadata, harmony, voice, structure) stored in Pinecone as plain-English descriptions. When composing, the most relevant chunks are retrieved and injected into the Gemini prompt as reference material.

---

## Project Structure

```
midigenerator/
├── frontend/     React + Vite + Tailwind
└── backend/      Node.js + Express + SQLite
```

---

## Setup

### 1. Clone and install

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Configure environment

Copy `.env` and fill in your keys:

```bash
cd backend
cp .env .env.local
```

```env
PORT=3001
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_INDEX=midigenerator-knowledge
GEMINI_API_KEY=your_gemini_key_here
UPLOADS_DIR=./uploads
OUTPUTS_DIR=./outputs
DB_PATH=./db/midigenerator.db
```

### 3. Create Pinecone index

In the Pinecone console, create an index named `midigenerator-knowledge` with:
- **Dimensions:** 1536
- **Metric:** cosine

> The default embedding is a hash-based fallback (no API key needed). For real semantic retrieval, replace `embedText()` in `services/ragService.js` with an OpenAI or Gemini embeddings call.

### 4. Run

```bash
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
cd frontend
npm run dev
```

Frontend: http://localhost:5173
Backend:  http://localhost:3001

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/compose` | Generate MIDI from prompt |
| `POST` | `/api/ingest/midi` | Upload + index a MIDI file |
| `POST` | `/api/ingest/doc` | Upload + index a PDF/txt/md |
| `GET`  | `/api/history` | List past generations |
| `GET`  | `/api/history/:id` | Get a specific generation |
| `GET`  | `/api/knowledge` | List indexed knowledge items |
| `DELETE` | `/api/knowledge/:id` | Remove a knowledge item |
| `GET`  | `/api/health` | Health check |

### POST /api/compose

```json
{
  "prompt": "Dark cinematic loop in Dm, 85 BPM, 8 bars",
  "section": 1
}
```

Response:
```json
{
  "id": 1,
  "midiUrl": "/outputs/composition_abc123.mid",
  "filename": "composition_abc123.mid",
  "key": "Dm",
  "tempo": 85,
  "bars": 8
}
```

---

## Services

| Service | File | Status |
|---------|------|--------|
| RAG (Pinecone) | `services/ragService.js` | ✅ Hash embedding (swap for real model) |
| Gemini LLM | `services/geminiService.js` | ✅ gemini-1.5-pro with retry |
| Validation | `services/validationService.js` | ✅ Full note + subdivision validation |
| Chunking | `services/chunkingService.js` | ✅ 4 chunk types + doc splitting |
| Stitch | `services/stitchService.js` | ✅ Multi-section merge + split |

## Converters (Node.js)

All 6 converter engines are ported from the React frontend tools and live in `services/converters/`:

| File | Function |
|------|----------|
| `midiToJson.js` | MIDI binary → generation JSON |
| `jsonToMidi.js` | Generation JSON → MIDI binary |
| `midiToText.js` | MIDI binary → text notation |
| `textToMidi.js` | Text notation → MIDI binary |
| `textToJson.js` | Text notation → generation JSON |
| `jsonToText.js` | Generation JSON → text notation |

---

## JSON Format

The generation JSON format used throughout:

```json
{
  "tempo": 85,
  "time_signature": "4/4",
  "key": "Dm",
  "subdivisions_per_bar": 16,
  "bars": [
    {
      "bar_number": 1,
      "notes": [
        {
          "pitch": "D2",
          "start_subdivision": 0,
          "offset_percent": 0,
          "duration_subdivisions": 16,
          "end_cutoff_percent": null,
          "velocity": 40
        }
      ]
    }
  ]
}
```

**Subdivision reference (4/4):**
- Beat 1 → `start_subdivision: 0`
- Beat 2 → `start_subdivision: 4`
- Beat 3 → `start_subdivision: 8`
- Beat 4 → `start_subdivision: 12`
- Quarter note → `duration_subdivisions: 4`
- Half note → `duration_subdivisions: 8`
- Whole note → `duration_subdivisions: 16`

---

## Improving RAG Quality

The default `embedText()` function in `ragService.js` uses a deterministic hash — it works but has no semantic understanding. To improve retrieval quality:

**Option A — OpenAI embeddings:**
```js
// npm install openai
const { OpenAI } = require('openai')
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function embedText(text) {
  const res = await client.embeddings.create({ model: 'text-embedding-3-small', input: text })
  return res.data[0].embedding
}
```
Update Pinecone index dimensions to **1536**.

**Option B — Gemini embeddings:**
```js
async function embedText(text) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'embedding-001' })
  const result = await model.embedContent(text)
  return result.embedding.values
}
```
Update Pinecone index dimensions to **768**.
