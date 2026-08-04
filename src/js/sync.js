import { STORAGE_KEY, PASSWORDS_STORAGE_KEY, TIMERS_STORAGE_KEY, TIMER_UNITS_STORAGE_KEY } from './config.js';
import { CONCLUDED_ROUNDS_KEY } from './state.js';
import { QUESTIONS_STORAGE_KEY } from './questions.js';

let syncInterval = null;
let isSyncing = false;

async function performSync() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const isAdmin = sessionStorage.getItem('thinktech_admin_session') === 'true';

    // 1. Gather local data
    const localParticipantsRaw = localStorage.getItem(STORAGE_KEY) || "[]";
    const participants = JSON.parse(localParticipantsRaw);

    const payload = {
      isAdmin,
      participants
    };

    if (isAdmin) {
      payload.concluded = JSON.parse(localStorage.getItem(CONCLUDED_ROUNDS_KEY) || "{}");
      payload.passwords = JSON.parse(localStorage.getItem(PASSWORDS_STORAGE_KEY) || "{}");
      payload.timers = JSON.parse(localStorage.getItem(TIMERS_STORAGE_KEY) || "{}");
      payload.timerUnits = JSON.parse(localStorage.getItem(TIMER_UNITS_STORAGE_KEY) || "{}");
      payload.questions = JSON.parse(localStorage.getItem(QUESTIONS_STORAGE_KEY) || "{}");
    }

    // 2. POST to sync API
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Sync server returned status ${res.status}`);
    }

    const data = await res.json();
    let hasChanges = false;

    // Helper to update localStorage if server data differs
    function updateLocalStorageIfChanged(key, serverDataObj) {
      const serverRaw = JSON.stringify(serverDataObj);
      const localRaw = localStorage.getItem(key) || "{}";
      
      // Compare normalized parsed objects to prevent key ordering differences
      const serverParsed = JSON.parse(serverRaw);
      const localParsed = JSON.parse(localRaw);

      if (JSON.stringify(serverParsed) !== JSON.stringify(localParsed)) {
        localStorage.setItem(key, serverRaw);
        return true;
      }
      return false;
    }

    // 3. Update participants list
    if (Array.isArray(data.participants)) {
      const serverParticipantsRaw = JSON.stringify(data.participants);
      const localParsed = JSON.parse(localParticipantsRaw);
      
      if (JSON.stringify(data.participants) !== JSON.stringify(localParsed)) {
        localStorage.setItem(STORAGE_KEY, serverParticipantsRaw);
        hasChanges = true;
      }
    }

    // 4. Update settings (only if not admin, to avoid overwriting admin's pending edits)
    if (!isAdmin) {
      if (data.concluded && updateLocalStorageIfChanged(CONCLUDED_ROUNDS_KEY, data.concluded)) hasChanges = true;
      if (data.passwords && updateLocalStorageIfChanged(PASSWORDS_STORAGE_KEY, data.passwords)) hasChanges = true;
      if (data.timers && updateLocalStorageIfChanged(TIMERS_STORAGE_KEY, data.timers)) hasChanges = true;
      if (data.timerUnits && updateLocalStorageIfChanged(TIMER_UNITS_STORAGE_KEY, data.timerUnits)) hasChanges = true;
      if (data.questions && updateLocalStorageIfChanged(QUESTIONS_STORAGE_KEY, data.questions)) hasChanges = true;
    } else {
      // If admin, we only pull updates for concluded rounds (in case it changes elsewhere, though admin is single source)
      if (data.concluded && updateLocalStorageIfChanged(CONCLUDED_ROUNDS_KEY, data.concluded)) hasChanges = true;
    }

    // 5. Trigger storage event to refresh UI live
    if (hasChanges) {
      window.dispatchEvent(new Event('storage'));
    }

  } catch (err) {
    console.error("ThinkTech Background Sync Error:", err);
  } finally {
    isSyncing = false;
  }
}

export function startLiveSync(intervalMs = 2000) {
  if (syncInterval) return;
  
  // Run immediately on start
  performSync();
  
  // Set up repeating timer
  syncInterval = setInterval(performSync, intervalMs);
  console.log("ThinkTech Live Sync loop started.");
}

export function stopLiveSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("ThinkTech Live Sync loop stopped.");
  }
}
