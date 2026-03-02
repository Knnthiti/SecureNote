const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 3001;
const SECRET = process.env.SECRET_TOKEN;
// fetch helper (Node 18+ has global fetch; otherwise require node-fetch)
const fetch = global.fetch || require('node-fetch');

// pocket host credentials (optional)
let POCKET_HOST_URL = process.env.POCKET_HOST_URL || '';
let POCKET_HOST_TOKEN = process.env.POCKET_HOST_TOKEN;
let usePocket = !!POCKET_HOST_URL;  // Use PocketHost if URL is configured
let currentDataSource = POCKET_HOST_URL ? 'pocket' : 'local';

const app = express();
app.use(cors());
console.log('usePocket', usePocket, 'POCKET_HOST_URL', POCKET_HOST_URL);

// enable raw body capture for debugging
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// log raw payloads when they exist (including malformed JSON)
app.use((req, res, next) => {
  if (req.rawBody) {
    console.log('raw body (after parse attempt):', JSON.stringify(req.rawBody));
  }
  next();
});

// persistence helpers
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, 'notes.json');
console.log('DATA_FILE path is', DATA_FILE);

let notes = [];
let nextId = 1;

// PocketHost helpers (used when POCKET_HOST_TOKEN is set)
async function pocketGetNotes() {
  console.log('PocketHost GET:', POCKET_HOST_URL);
  const headers = { 'Content-Type': 'application/json' };
  if (POCKET_HOST_TOKEN) {
    headers.Authorization = POCKET_HOST_TOKEN;
  }
  
  const res = await fetch(POCKET_HOST_URL, {
    method: 'GET',
    headers,
  });
  if (!res.ok) throw new Error(`PocketHost GET failed: ${res.status}`);
  const data = await res.json();
  console.log('PocketHost response:', JSON.stringify(data).substring(0, 200));
  
  // Map PocketHost response to Note format
  const items = data.items || data;
  return Array.isArray(items) ? items.map(item => ({
    id: item.id || item.collectionId || Math.random(),
    title: item.title || 'Untitled',
    content: item.content || '',
  })) : [];
}

async function pocketCreateNote(title, content) {
  console.log('PocketHost POST:', POCKET_HOST_URL);
  const res = await fetch(POCKET_HOST_URL, {
    method: 'POST',
    headers: {
      Authorization: POCKET_HOST_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error(`PocketHost POST failed: ${res.status}`);
  return res.json();
}

async function pocketUpdateNote(id, title, content) {
  const url = `${POCKET_HOST_URL}/${id}`;
  console.log('PocketHost PATCH:', url);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: POCKET_HOST_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error(`PocketHost PATCH failed: ${res.status}`);
  return res.json();
}

async function pocketDeleteNote(id) {
  const url = `${POCKET_HOST_URL}/${id}`;
  console.log('PocketHost DELETE:', url);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 
      Authorization: POCKET_HOST_TOKEN,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`PocketHost DELETE failed: ${res.status}`);
  return res.ok;
}

// load existing notes from disk if available
function loadNotes() {
  if (usePocket) return; // skip local file when using PocketHost
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        notes = arr;
        // compute nextId
        nextId = notes.reduce((max, n) => Math.max(max, n.id), 0) + 1;
      }
    } catch (err) {
      console.error('Failed to load notes from disk:', err);
    }
  }
}

function saveNotes() {
  console.log('saving notes to', DATA_FILE);
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2));
    console.log('saved successfully');
  } catch (err) {
    console.error('Failed to save notes to disk:', err);
  }
}

loadNotes();

// Authentication middleware for POST/DELETE
function checkAuth(req, res, next) {
  const token = req.header('Authorization');
  if (token !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /api/config - update data source configuration
app.post('/api/config', express.json(), async (req, res) => {
  console.log('POST /api/config', req.body);
  const { dataSource, pocketToken } = req.body;
  
  if (dataSource === 'pocket') {
    // Switch to PocketHost (even without token, will use public API)
    usePocket = true;
    if (pocketToken) {
      POCKET_HOST_TOKEN = pocketToken;
    }
    currentDataSource = 'pocket';
    console.log('✅ Switched to PocketHost');
  } else {
    // Switch to Local Storage
    POCKET_HOST_TOKEN = null;
    usePocket = false;
    currentDataSource = 'local';
    console.log('✅ Switched to Local Storage');
  }
  
  res.json({ success: true, dataSource: currentDataSource });
});

// GET /api/config - get current configuration
app.get('/api/config', (req, res) => {
  res.json({ dataSource: currentDataSource });
});

// GET /api/notes
app.get('/api/notes', async (req, res) => {
  if (usePocket) {
    try {
      const list = await pocketGetNotes();
      return res.json(list);
    } catch (err) {
      console.error('PocketHost GET error', err);
      return res.status(500).json({ error: 'Failed to fetch from PocketHost' });
    }
  }
  res.json(notes);
});

// POST /api/notes
app.post('/api/notes', checkAuth, async (req, res) => {
  console.log('POST /api/notes body', req.body);
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'title and content required' });
  }
  if (usePocket) {
    try {
      const obj = await pocketCreateNote(title, content);
      return res.status(201).json(obj);
    } catch (err) {
      console.error('PocketHost POST error', err);
      return res.status(500).json({ error: 'PocketHost create failed' });
    }
  }
  const note = { id: nextId++, title, content };
  notes.push(note);
  console.log('about to save', notes);
  saveNotes();
  res.status(201).json(note);
});

// PATCH /api/notes/:id (update)
app.patch('/api/notes/:id', checkAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, content } = req.body;
  if (!title && !content) {
    return res.status(400).json({ error: 'title or content required' });
  }
  if (usePocket) {
    try {
      const obj = await pocketUpdateNote(id, title, content);
      return res.json(obj);
    } catch (err) {
      console.error('PocketHost PATCH error', err);
      return res.status(500).json({ error: 'PocketHost update failed' });
    }
  }
  const note = notes.find(n => n.id === id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }
  if (title) note.title = title;
  if (content) note.content = content;
  saveNotes();
  res.json(note);
});

// DELETE /api/notes/:id
app.delete('/api/notes/:id', checkAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (usePocket) {
    try {
      const ok = await pocketDeleteNote(id);
      if (!ok) return res.status(404).json({ error: 'Note not found' });
      return res.status(200).json({});
    } catch (err) {
      console.error('PocketHost DELETE error', err);
      return res.status(500).json({ error: 'PocketHost delete failed' });
    }
  }
  const index = notes.findIndex(n => n.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }
  notes.splice(index, 1);
  saveNotes();
  res.status(200).json({});
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
