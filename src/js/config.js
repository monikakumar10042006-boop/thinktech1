export const COLLEGE_NAME = "Ganadhipathy Tulsis Jain Engineering College";
export const EVENT_NAME = "ThinkTech";
export const STORAGE_KEY = "thinktech_participants_v1";
export const PASSWORDS_STORAGE_KEY = "thinktech_passwords_v1";
export const MAX_WARNINGS = 1; // 1 warning allowed; 2nd violation triggers auto-disqualification

// Default passcodes
const defaultPasscodes = {
  admin: "admin123",
  1: "python",
  2: "java",
  3: "frontend",
  4: "backend",
  explanation: "reveal999"
};

let loadedPasscodes = { ...defaultPasscodes };

function loadPasscodes() {
  try {
    const stored = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    if (stored) {
      loadedPasscodes = { ...defaultPasscodes, ...JSON.parse(stored) };
      
      // Auto-upgrade from old default values to the new requested values
      if (loadedPasscodes.admin === "gtec1234567") loadedPasscodes.admin = "admin123";
      if (loadedPasscodes[1] === "12345") loadedPasscodes[1] = "python";
      if (loadedPasscodes[2] === "abcde") loadedPasscodes[2] = "java";
      if (loadedPasscodes[3] === "67890") loadedPasscodes[3] = "frontend";
      if (loadedPasscodes[4] === "fghij") loadedPasscodes[4] = "backend";
      savePasscodes();
    }
  } catch (e) {
    // fallback to defaults
  }
}

function savePasscodes() {
  try {
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(loadedPasscodes));
  } catch (e) {}
}

// Initial load
loadPasscodes();

export function getAdminPassword() {
  loadPasscodes(); // ensure fresh reads
  return loadedPasscodes.admin;
}

export function setAdminPassword(newVal) {
  loadedPasscodes.admin = newVal.trim();
  savePasscodes();
}

export function getLevelPassword(levelNum) {
  loadPasscodes(); // ensure fresh reads
  return loadedPasscodes[levelNum];
}

export function setLevelPassword(levelNum, newVal) {
  loadedPasscodes[levelNum] = newVal.trim();
  savePasscodes();
}

export function getAllPasswords() {
  loadPasscodes();
  return loadedPasscodes;
}

// ==========================================
// LEVEL TIMER SETTINGS
// ==========================================
export const TIMERS_STORAGE_KEY = "thinktech_timers_v1";

const defaultTimers = {
  1: 25,  // Level 1: 25 seconds per question
  2: 30,  // Level 2: 30 seconds per question
  3: 4,   // Level 3: 4 minutes per question
  4: 10   // Level 4: 10 minutes per question
};

let loadedTimers = { ...defaultTimers };

function loadTimers() {
  try {
    const stored = localStorage.getItem(TIMERS_STORAGE_KEY);
    if (stored) {
      loadedTimers = { ...defaultTimers, ...JSON.parse(stored) };
    }
  } catch (e) {
    // fallback
  }
}

function saveTimers() {
  try {
    localStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(loadedTimers));
  } catch (e) {}
}

// Initial load
loadTimers();

export function getLevelTimer(levelNum) {
  loadTimers();
  return loadedTimers[levelNum];
}

export function setLevelTimer(levelNum, val) {
  loadedTimers[levelNum] = Number(val);
  saveTimers();
}

export const TIMER_UNITS_STORAGE_KEY = "thinktech_timer_units_v1";

const defaultTimerUnits = {
  1: "sec",
  2: "sec"
};

let loadedTimerUnits = { ...defaultTimerUnits };

function loadTimerUnits() {
  try {
    const stored = localStorage.getItem(TIMER_UNITS_STORAGE_KEY);
    if (stored) {
      loadedTimerUnits = { ...defaultTimerUnits, ...JSON.parse(stored) };
    }
  } catch (e) {}
}

function saveTimerUnits() {
  try {
    localStorage.setItem(TIMER_UNITS_STORAGE_KEY, JSON.stringify(loadedTimerUnits));
  } catch (e) {}
}

loadTimerUnits();

export function getLevelTimerUnit(levelNum) {
  loadTimerUnits();
  return loadedTimerUnits[levelNum] || "sec";
}

export function setLevelTimerUnit(levelNum, unit) {
  loadedTimerUnits[levelNum] = unit;
  saveTimerUnits();
}

export function getLevelTimerSeconds(levelNum) {
  const val = getLevelTimer(levelNum);
  if (levelNum === 1 || levelNum === 2) {
    const unit = getLevelTimerUnit(levelNum);
    return unit === 'min' ? val * 60 : val;
  }
  return val * 60; // minutes to seconds
}

