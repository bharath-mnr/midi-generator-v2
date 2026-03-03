# MIDI Generator v2

An AI-powered MIDI music composition platform. Describe music in plain English — the system generates a downloadable `.mid` file using Gemini AI with music-theory-aware RAG context.

Live demo: **[midi-generator-v2.vercel.app](https://midi-generator-v2.vercel.app)**

---

## What it does

- **Compose** — type a prompt like *"melancholic piano in D minor, 16 bars, slow"* and receive a playable MIDI file
- **Alter** — upload an existing MIDI and describe additions (*"add a counter-melody in the right hand"*) — the AI merges new notes into your file
- **Knowledge Base** — upload your own MIDI files or documents; the system chunks and indexes them into Pinecone so every composition can draw from your personal style library
- **History** — every generation is saved with metadata (key, tempo, bar count) and is re-downloadable
- **Tools** — six standalone converters: MIDI↔JSON, MIDI↔Text, Text↔JSON

---

## Architecture

```
frontend/          React + Vite + Tailwind CSS  →  Vercel
backend/           Node.js + Express            →  Render
  services/
    geminiService       Gemini AI with 4-model fallback chain
    chunkingService     Music-theory RAG chunker (632 lines)
    ragService          Pinecone vector store (1536-dim + trigram embeddings)
    validationService   JSON schema validator with auto-clamp
    stitchService       Multi-section merge with bar renumbering
    jsonToMidi          Custom MIDI binary encoder
    midiToJson          Custom MIDI binary parser
  prompts/
    compose.prompt.txt  Deep music theory system prompt
    alter.prompt.txt    Additive layer generation prompt
    continue.prompt.txt Section continuation prompt
  db/
    database.js         sql.js SQLite (history + knowledge index)
```

---

## How generation works

```
User prompt
    │
    ▼
ragService.query()          ← cosine similarity search in Pinecone
    │  returns top-5 chunks
    ▼
geminiService.compose()     ← prompt + RAG context → structured JSON
    │  model chain: gemini-2.0-flash → 2.0-flash-lite → 2.5-flash-lite → 2.5-flash
    ▼
validationService.validate()  ← checks bar counts, subdivisions, note bounds
    │  if fail → geminiService.retry() with errors fed back
    ▼
jsonToMidi.convert()        ← JSON → MIDI binary (custom spec)
    │
    ▼
.mid file  →  served to browser + saved to history
```

---

## RAG chunking — chunkingService

Each uploaded MIDI is split into **6 semantic chunks** stored in Pinecone:

| Chunk | Content |
|---|---|
| `metadata` | Key (Krumhansl-Schmuckler), tempo, time signature, structure |
| `harmony` | Chord progression per bar, detected chord names |
| `structure` | Section analysis, dynamic arc, phrase boundaries |
| `left_hand` | Bass line, accompaniment patterns, rhythm character |
| `right_hand` | Melody, contour, interval analysis (stepwise vs leaps) |
| `style_guide` | Synthesis of all above — used as composition reference |

Music theory algorithms used:
- **Krumhansl-Schmuckler** key profiles for key detection
- **Chord detection** from simultaneous pitch classes (major, minor, dim, aug, 7th)
- **Melodic contour** classification (ascending, arch, descending, wave, static)
- **Interval analysis** — stepwise ratio, average interval size
- **Rhythm character** — sparse/flowing/driving/dense from note density
- **Dynamic arc** — velocity contour across sections

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Vite 7, Tailwind CSS |
| Backend | Node.js, Express 4, Multer |
| AI | Google Gemini API (gemini-2.0-flash primary) |
| Vector DB | Pinecone (1536-dim embeddings + trigram fallback) |
| Database | sql.js SQLite (history, knowledge index) |
| Hosting | Vercel (frontend), Render (backend) |

---

## Local setup

**Prerequisites:** Node.js 18+, npm

```bash
# Clone
git clone https://github.com/bharath-mnr/midi-generator-v2
cd midi-generator-v2

# Install all dependencies
npm run install:all
```

**Backend env** — create `backend/.env`:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=midigenerator-knowledge
UPLOADS_DIR=./uploads
OUTPUTS_DIR=./outputs
DB_PATH=./db/midigenerator.db
FRONTEND_URL=http://localhost:5173
```

**Frontend env** — create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
```

```bash
# Run both servers
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001

---

## Deployment

| Service | Config |
|---|---|
| **Render** (backend) | Root dir: `backend` · Build: `npm install` · Start: `node server.js` |
| **Vercel** (frontend) | Root dir: `frontend` · Framework: Vite · `vercel.json` handles SPA routing |

Render env vars to set: `GEMINI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`, `FRONTEND_URL`  
Vercel env vars to set: `VITE_API_URL`

---

## Project structure

```
midi-generator-v2/
├── backend/
│   ├── controllers/        compose, alter, ingest, history, knowledge
│   ├── db/                 database.js (sql.js wrapper)
│   ├── middleware/         upload.js (multer), errorHandler.js, rateLimit.js
│   ├── prompts/            compose.prompt.txt, alter.prompt.txt
│   ├── routes/             compose, alter, ingest, history, knowledge
│   └── services/
│       ├── converters/     jsonToMidi, midiToJson, jsonToText, midiToText, textToJson, textToMidi
│       ├── chunkingService.js
│       ├── geminiService.js
│       ├── ragService.js
│       ├── stitchService.js
│       └── validationService.js
└── frontend/
    ├── src/
    │   ├── components/     layout (Sidebar, TopBar), tools/*
    │   ├── hooks/          useCompose, useHistory, useKnowledge
    │   ├── pages/          Compose, History, KnowledgeBase, Tools
    │   └── services/       api.js
    └── vercel.json
```

---

## API endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/compose` | — | Generate MIDI from prompt |
| POST | `/api/alter` | — | Add AI layers to uploaded MIDI |
| POST | `/api/ingest/midi` | — | Index a MIDI file into knowledge base |
| POST | `/api/ingest/doc` | — | Index a text/PDF document |
| GET | `/api/history` | — | List all past generations |
| GET | `/api/history/:id` | — | Get one generation with full JSON |
| GET | `/api/knowledge` | — | List indexed files |
| DELETE | `/api/knowledge/:id` | — | Remove a file from the index |