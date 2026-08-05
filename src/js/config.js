export const COLLEGE_NAME = "Ganadhipathy Tulsis Jain Engineering College";
export const EVENT_NAME = "ThinkTech";
export const STORAGE_KEY = "thinktech_participants_v1";
export const PASSWORDS_STORAGE_KEY = "thinktech_passwords_v1";
export const MAX_WARNINGS = 1; // 1 warning allowed; 2nd violation triggers auto-disqualification

// Default passcodes
const defaultPasscodes = {
  admin: "admin123",
  1: "12345",
  2: "abcde",
  3: "67890",
  4: "fghij",
  exp1: "rev101",
  exp2: "rev202",
  exp3: "rev303",
  exp4: "rev404"
};

let loadedPasscodes = { ...defaultPasscodes };

function loadPasscodes() {
  try {
    const stored = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only fill in keys that are completely missing — never override saved values with defaults
      loadedPasscodes = { ...defaultPasscodes };
      for (const key of Object.keys(parsed)) {
        if (parsed[key] !== undefined && parsed[key] !== null && String(parsed[key]).trim() !== '') {
          loadedPasscodes[key] = parsed[key];
        }
      }
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
  const v = String(newVal).trim();
  if (v) {
    loadedPasscodes.admin = v;
    savePasscodes();
  }
}

export function getLevelPassword(levelNum) {
  loadPasscodes(); // ensure fresh reads
  return loadedPasscodes[levelNum];
}

export function setLevelPassword(levelNum, newVal) {
  const v = String(newVal).trim();
  if (v) {
    loadedPasscodes[levelNum] = v;
    savePasscodes();
  }
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
  1: 7,
  2: 10,
  3: 20,
  4: 30
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
  1: "min",
  2: "min"
};

let loadedTimerUnits = { ...defaultTimerUnits };

function loadTimerUnits() {
  try {
    const stored = localStorage.getItem(TIMER_UNITS_STORAGE_KEY);
    if (stored) {
      loadedTimerUnits = { ...defaultTimerUnits, ...JSON.parse(stored) };
      
      // One-time auto-upgrade old defaults from sec to min
      if (!localStorage.getItem('thinktech_migrated_units')) {
        if (loadedTimerUnits[1] === "sec") loadedTimerUnits[1] = "min";
        if (loadedTimerUnits[2] === "sec") loadedTimerUnits[2] = "min";
        localStorage.setItem('thinktech_migrated_units', 'true');
      }
      
      saveTimerUnits();
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

export function getExplanationPassword(levelNum = 1) {
  loadPasscodes(); // ensure fresh reads
  const key = `exp${levelNum}`;
  const defaultMap = { 1: "rev101", 2: "rev202", 3: "rev303", 4: "rev404" };
  return loadedPasscodes[key] || loadedPasscodes.explanation || defaultMap[levelNum] || "rev101";
}

export function setExplanationPassword(levelNum, newVal) {
  const v = String(newVal).trim();
  if (v) {
    const key = `exp${levelNum}`;
    loadedPasscodes[key] = v;
    savePasscodes();
  }
}

