import { STORAGE_KEY } from './config.js';

export let storageAvailable = true;
try {
  const t = "__thinktech_test__";
  localStorage.setItem(t, "1");
  localStorage.removeItem(t);
} catch (e) {
  storageAvailable = false;
}

export const participants = [];

export let current = null; // Active participant record

export let quizTimer = null;
export let quizTimeLeft = 0;
export let quizTotalTime = 0;
export let currentQIndex = 0;
export let currentQuestionSet = [];
export let currentLevelKey = ""; // 'l1' | 'l2'

export let l34Timer = null;
export let l34SecondsLeft = 0;
export let l4SelectedQuestions = []; // Active Level 4 puzzles
export let l4QIndex = 0; // Which puzzle is showing (0..2)
export let antiCheatActive = false;

export function updateCurrent(val) {
  current = val;
}

export function updateParticipants(val) {
  participants.length = 0;
  if (Array.isArray(val)) {
    participants.push(...val);
  }
}

export function updateQuizTimer(val) {
  quizTimer = val;
}

export function updateQuizTimeLeft(val) {
  quizTimeLeft = val;
}

export function updateQuizTotalTime(val) {
  quizTotalTime = val;
}

export function updateCurrentQIndex(val) {
  currentQIndex = val;
}

export function updateCurrentQuestionSet(val) {
  currentQuestionSet = val;
}

export function updateCurrentLevelKey(val) {
  currentLevelKey = val;
}

export function updateL34Timer(val) {
  l34Timer = val;
}

export function updateL34SecondsLeft(val) {
  l34SecondsLeft = val;
}

export function updateL4SelectedQuestions(val) {
  l4SelectedQuestions = val;
}

export function updateL4QIndex(val) {
  l4QIndex = val;
}

export function updateAntiCheatActive(val) {
  antiCheatActive = val;
}

export function saveParticipants(newVal) {
  const nowStr = new Date().toISOString();
  if (newVal !== undefined && Array.isArray(newVal)) {
    newVal.forEach(newP => {
      const oldP = participants.find(p => p.id === newP.id);
      if (!oldP) {
        newP.lastUpdatedAt = nowStr;
      } else {
        const oldCompare = { ...oldP, lastUpdatedAt: null };
        const newCompare = { ...newP, lastUpdatedAt: null };
        if (JSON.stringify(oldCompare) !== JSON.stringify(newCompare)) {
          newP.lastUpdatedAt = nowStr;
        }
      }
    });
    participants.length = 0;
    participants.push(...newVal);
  }
  if (current) {
    current.lastUpdatedAt = nowStr;
    const idx = participants.findIndex(p => p.id === current.id);
    if (idx >= 0) {
      participants[idx] = { ...current };
    }
  }
  if (!storageAvailable) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
  } catch (e) {
    storageAvailable = false;
  }
}

export function saveParticipantRecord(p) {
  if (!p || !p.id) return;
  p.lastUpdatedAt = new Date().toISOString();
  const list = loadParticipantsFromStorage();
  const idx = list.findIndex(item => item.id === p.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...p };
  } else {
    list.push(p);
  }
  saveParticipants(list);
  try {
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}
}

export function loadParticipantsFromStorage() {
  if (storageAvailable) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      participants.length = 0;
      participants.push(...data);
    } catch (e) {
      participants.length = 0;
    }
  }
  return participants;
}

// Concluded rounds trackers
export const CONCLUDED_ROUNDS_KEY = "thinktech_concluded_v1";
let concludedRounds = { 1: false, 2: false, 3: false, 4: false };

function loadConcludedRounds() {
  try {
    const stored = localStorage.getItem(CONCLUDED_ROUNDS_KEY);
    if (stored) {
      concludedRounds = JSON.parse(stored);
    }
  } catch (e) {}
}

export function isRoundConcluded(level) {
  loadConcludedRounds();
  return concludedRounds[level] === true;
}

export function setRoundConcluded(level, status) {
  concludedRounds[level] = !!status;
  try {
    localStorage.setItem(CONCLUDED_ROUNDS_KEY, JSON.stringify(concludedRounds));
  } catch (e) {}
}

// Initial load
loadConcludedRounds();
loadParticipantsFromStorage();
