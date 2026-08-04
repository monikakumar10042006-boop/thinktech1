import { MAX_WARNINGS } from './config.js';
import { current, quizTimer, l34Timer, saveParticipants, updateAntiCheatActive } from './state.js';
import { goTo } from './ui.js';

function preventDefault(e) {
  e.preventDefault();
  flagViolation("copy/paste", "You tried to copy or paste. This is not allowed during the quiz.");
}

function onVisibilityChange() {
  if (document.hidden) {
    flagViolation("tab-switch", "You left the quiz tab or window. This is not allowed during the quiz.");
  }
}

function onWindowBlur() {
  flagViolation("tab-switch", "You left the quiz tab or window. This is not allowed during the quiz.");
}

function preventKeyboardShortcuts(e) {
  // Block Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+Shift+I, F12
  if (
    (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'C' || e.key === 'V' || e.key === 'U')) ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
    e.key === 'F12'
  ) {
    e.preventDefault();
    flagViolation("copy/paste", "Keyboard shortcuts and developer tools are disabled during the quiz.");
  }
}

function preventSelection(e) {
  if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
}

export function startAntiCheat() {
  updateAntiCheatActive(true);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onWindowBlur);
  document.addEventListener('contextmenu', preventDefault);
  document.addEventListener('copy', preventDefault);
  document.addEventListener('paste', preventDefault);
  document.addEventListener('keydown', preventKeyboardShortcuts);
  document.addEventListener('selectstart', preventSelection);
}

export function stopAntiCheat() {
  updateAntiCheatActive(false);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('blur', onWindowBlur);
  document.removeEventListener('contextmenu', preventDefault);
  document.removeEventListener('copy', preventDefault);
  document.removeEventListener('paste', preventDefault);
  document.removeEventListener('keydown', preventKeyboardShortcuts);
  document.removeEventListener('selectstart', preventSelection);
}

export function flagViolation(type, message) {
  if (!current || current.status !== "in-progress") return;
  if (type === "tab-switch") {
    current.tabSwitchCount += 1;
  }
  current.violationCount += 1;

  if (current.violationCount > MAX_WARNINGS) {
    disqualifyCurrent(
      `Exceeded tab switch warning limit (${current.violationCount} total tab switches / violations detected). Immediate auto-disqualification triggered.`
    );
    return;
  }

  showCheatWarning(current.violationCount, message);
}

export function showCheatWarning(count, message) {
  document.getElementById('cheat-warning-msg').textContent = message;
  document.getElementById('cheat-warning-count').textContent =
    `Warning ${count} of ${MAX_WARNINGS} — ONE MORE tab switch will cause immediate auto-disqualification`;
  document.getElementById('cheat-warning-overlay').classList.add('show');
}

export function dismissCheatWarning() {
  document.getElementById('cheat-warning-overlay').classList.remove('remove');
  document.getElementById('cheat-warning-overlay').classList.remove('show');
}

export function disqualifyCurrent(reason) {
  document.getElementById('cheat-warning-overlay').classList.remove('show');
  if (!current || current.status !== "in-progress") return;
  current.status = "disqualified";
  current.disqualifiedAt = new Date().toISOString();
  current.disqualifiedReason = reason;
  saveParticipants();
  stopAntiCheat();
  clearInterval(quizTimer);
  clearInterval(l34Timer);
  document.getElementById('dq-reason').textContent = reason;
  goTo('screen-disqualified');
}

