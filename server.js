import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for local dev proxying
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support base64 image uploads in questions

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Memory cache
let serverParticipants = [];
let serverSettings = {
  concluded: {},
  passwords: {},
  timers: {},
  timerUnits: {},
  questions: {}
};

// Load data on startup
try {
  if (fs.existsSync(PARTICIPANTS_FILE)) {
    const raw = fs.readFileSync(PARTICIPANTS_FILE, 'utf-8');
    serverParticipants = JSON.parse(raw || '[]');
  }
} catch (e) {
  console.error("Failed to load participants.json", e);
}

try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    serverSettings = JSON.parse(raw || '{}');
    
    // Auto-upgrade stored defaults
    if (!serverSettings.passwords) serverSettings.passwords = {};
    if (serverSettings.passwords.admin === "gtec1234567" || !serverSettings.passwords.admin) {
      serverSettings.passwords.admin = "admin123";
    }
    if (serverSettings.passwords[1] === "12345") serverSettings.passwords[1] = "python";
    if (serverSettings.passwords[2] === "abcde") serverSettings.passwords[2] = "java";
    if (serverSettings.passwords[3] === "67890") serverSettings.passwords[3] = "frontend";
    if (serverSettings.passwords[4] === "fghij") serverSettings.passwords[4] = "backend";
    
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(serverSettings, null, 2), 'utf-8');
  } else {
    // Initialize default passwords
    serverSettings.passwords = {
      admin: "admin123",
      1: "python",
      2: "java",
      3: "frontend",
      4: "backend"
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(serverSettings, null, 2), 'utf-8');
  }
} catch (e) {
  console.error("Failed to load settings.json", e);
}

function persistData() {
  try {
    fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(serverParticipants, null, 2), 'utf-8');
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(serverSettings, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write data files", e);
  }
}

// Bidirectional Live Sync Endpoint
app.post('/api/sync', (req, res) => {
  const {
    isAdmin,
    participants,
    concluded,
    passwords,
    timers,
    timerUnits,
    questions
  } = req.body;

  console.log(`Sync request: isAdmin=${isAdmin}, participantsCount=${participants ? participants.length : 0}`);

  let hasChanges = false;

  // 1. Merge incoming participants
  if (Array.isArray(participants)) {
    participants.forEach(clientP => {
      if (!clientP || !clientP.id) return;
      
      const serverIdx = serverParticipants.findIndex(p => p.id === clientP.id);
      if (serverIdx === -1) {
        // New participant
        serverParticipants.push(clientP);
        hasChanges = true;
      } else {
        const serverP = serverParticipants[serverIdx];
        const clientTime = clientP.lastUpdatedAt ? new Date(clientP.lastUpdatedAt).getTime() : 0;
        const serverTime = serverP.lastUpdatedAt ? new Date(serverP.lastUpdatedAt).getTime() : 0;

        if (clientTime > serverTime) {
          // Client has newer data, update server cache
          serverParticipants[serverIdx] = clientP;
          hasChanges = true;
        }
      }
    });
  }

  // 2. If client is admin, update settings on server
  if (isAdmin === true) {
    if (concluded !== undefined && JSON.stringify(serverSettings.concluded) !== JSON.stringify(concluded)) {
      serverSettings.concluded = concluded;
      hasChanges = true;
    }
    if (passwords !== undefined && JSON.stringify(serverSettings.passwords) !== JSON.stringify(passwords)) {
      serverSettings.passwords = passwords;
      hasChanges = true;
    }
    if (timers !== undefined && JSON.stringify(serverSettings.timers) !== JSON.stringify(timers)) {
      serverSettings.timers = timers;
      hasChanges = true;
    }
    if (timerUnits !== undefined && JSON.stringify(serverSettings.timerUnits) !== JSON.stringify(timerUnits)) {
      serverSettings.timerUnits = timerUnits;
      hasChanges = true;
    }
    if (questions !== undefined && JSON.stringify(serverSettings.questions) !== JSON.stringify(questions)) {
      serverSettings.questions = questions;
      hasChanges = true;
    }
  }

  // Persist if any state changed
  if (hasChanges) {
    persistData();
  }

  // Return full merged state
  res.json({
    participants: serverParticipants,
    concluded: serverSettings.concluded || {},
    passwords: serverSettings.passwords || {},
    timers: serverSettings.timers || {},
    timerUnits: serverSettings.timerUnits || {},
    questions: serverSettings.questions || {}
  });
});

// Clear All Data Endpoint
app.post('/api/clear', (req, res) => {
  serverParticipants = [];
  persistData();
  console.log("Server participants database cleared by admin request.");
  res.json({ ok: true });
});

// Serve frontend assets in production
app.use(express.static(path.join(__dirname, 'dist')));

// SPA route fallback
app.get('*', (req, res) => {
  const indexFile = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send("Application dist folder not built yet.");
  }
});

app.listen(PORT, () => {
  console.log(`ThinkTech Live Sync Server running on port ${PORT}`);
});
