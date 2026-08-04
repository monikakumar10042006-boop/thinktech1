import {
  current,
  updateCurrent,
  participants,
  saveParticipants,
  saveParticipantRecord
} from './state.js';
import {
  getLevelPassword,
  getLevelTimer,
  getLevelTimerUnit,
  getLevelTimerSeconds
} from './config.js';
import {
  getQuestions
} from './questions.js';
import {
  startMCQLevel,
  startLevel3,
  startL34Level,
  shuffleArray
} from './quiz.js';
import {
  startAntiCheat
} from './cheating.js';
import {
  updateBuddyVisibility
} from './buddy.js';
import {
  startAdminLiveRefresh,
  stopAdminLiveRefresh
} from './admin.js';

export function goTo(id) {
  try {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
      s.classList.remove('active');
      s.style.display = 'none';
    });
    
    const target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
      target.style.display = 'flex';
    }

    if (id === 'screen-admin-panel') {
      startAdminLiveRefresh();
    } else {
      stopAdminLiveRefresh();
    }
    
    updateBuddyVisibility(id);
  } catch (err) {
    console.error("goTo navigation error:", err);
  }
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

// Submits participant registration form
export function submitRegistration() {
  const name = document.getElementById('reg-name').value.trim();
  const year = document.getElementById('reg-year').value;
  const regNo = document.getElementById('reg-number').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const errEl = document.getElementById('reg-error');

  if (!name || !year || !regNo || !email) {
    errEl.textContent = "Please fill in every field before continuing.";
    return;
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    errEl.textContent = "Please enter a valid email address.";
    return;
  }
  errEl.textContent = "";

  const newParticipant = {
    id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    fullName: name,
    year: year,
    regNumber: regNo,
    email: email,
    registeredAt: new Date().toISOString(),
    l1Score: 0,
    l1Max: getQuestions('l1').length,
    l2Score: 0,
    l2Max: getQuestions('l2').length,
    l3Score: 0,
    l3Max: 0,
    l4Answers: [],
    l4Marks: 0,
    stage: 0, // highest level completed
    status: "in-progress",
    tabSwitchCount: 0,
    violationCount: 0,
    disqualifiedAt: null,
    disqualifiedReason: null,
    eliminatedAtLevel: null,
    eliminatedReason: null
  };
  
  updateCurrent(newParticipant);
  saveParticipantRecord(newParticipant);

  startAntiCheat();
  showLevelIntro(1);
}

export function showLevelIntro(levelNum) {
  const u1 = getLevelTimerUnit(1) === 'min' ? 'minutes' : 'seconds';
  const u2 = getLevelTimerUnit(2) === 'min' ? 'minutes' : 'seconds';

  const cfg = {
    1: {
      tag: "LEVEL 1",
      title: "Emoji Decode",
      desc: "Read the emoji clue and click the correct meaning.",
      rules: [getQuestions('l1').length + " questions", getLevelTimer(1) + " " + u1 + " each", "Answer early to move on instantly"],
      action: () => startMCQLevel('l1', shuffleArray(getQuestions('l1')), getLevelTimerSeconds(1))
    },
    2: {
      tag: "LEVEL 2",
      title: "Guess who am I?",
      desc: "Read the riddle and type who — or what — is being described.",
      rules: [getQuestions('l2').length + " questions", getLevelTimer(2) + " " + u2 + " each", "Answer early to move on instantly"],
      action: () => startMCQLevel('l2', shuffleArray(getQuestions('l2')), getLevelTimerSeconds(2))
    },
    3: {
      tag: "LEVEL 3",
      title: "Code Challenge",
      desc: "5 questions, 3 tasks each — type the import, fix the bug, predict the output.",
      rules: ["5 questions (order shuffled)", getLevelTimer(3) + " minutes per question", (getLevelTimer(3) * 5) + " minutes total"],
      action: () => startLevel3()
    },
    4: {
      tag: "LEVEL 4",
      title: "Final Round",
      desc: "Three logic puzzles. Give it everything.",
      rules: ["3 questions (order shuffled)", getLevelTimer(4) + " minutes per question", "Submit early to move to the next puzzle"],
      action: () => startL34Level()
    }
  }[levelNum];

  document.getElementById('intro-tag').textContent = cfg.tag;
  document.getElementById('intro-title').textContent = cfg.title;
  document.getElementById('intro-desc').textContent = cfg.desc;
  
  const rulesEl = document.getElementById('intro-rules');
  if (rulesEl) {
    rulesEl.innerHTML = cfg.rules.map(r => `<div class="pill">${r}</div>`).join('');
  }
  
  document.getElementById('intro-pass').value = "";
  document.getElementById('intro-pass-error').textContent = "";
  
  const btn = document.getElementById('intro-start-btn');
  if (btn) {
    btn.onclick = () => {
      const entered = document.getElementById('intro-pass').value.trim();
      if (entered === getLevelPassword(levelNum)) {
        document.getElementById('intro-pass-error').textContent = "";
        cfg.action();
      } else {
        document.getElementById('intro-pass-error').textContent = "Incorrect passcode.";
      }
    };
  }
  
  // Set up back button on the Level Intro screen:
  // If we are at Level 1, we can return to registration (or welcome if we want to reset).
  // If we are at Level 2, 3, or 4, going back should return to welcome or be warning protected.
  const backBtn = document.querySelector('#screen-level-intro .back-btn');
  if (backBtn) {
    backBtn.onclick = async () => {
      if (levelNum === 1) {
        goTo('screen-register');
      } else {
        const confirmed = await showCustomConfirm("Are you sure you want to exit? Your progress on previous levels is saved, but you will need the passcodes to re-enter.", "Exit Level Intro");
        if (confirmed) {
          goTo('screen-welcome');
        }
      }
    };
  }

  goTo('screen-level-intro');
}

// ==========================================
// CUSTOM UI MODALS SYSTEM
// ==========================================
export function showCustomAlert(message, title = "Notice", icon = "ℹ️") {
  return new Promise((resolve) => {
    const overlay = document.getElementById('custom-modal-overlay');
    const titleEl = document.getElementById('custom-modal-title');
    const msgEl = document.getElementById('custom-modal-message');
    const iconEl = document.getElementById('custom-modal-icon');
    const okBtn = document.getElementById('custom-modal-ok');
    const cancelBtn = document.getElementById('custom-modal-cancel');

    if (!overlay) {
      alert(message);
      resolve(true);
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    iconEl.textContent = icon;
    cancelBtn.style.display = 'none';
    okBtn.textContent = 'OK';

    const handleOk = () => {
      okBtn.removeEventListener('click', handleOk);
      overlay.style.display = 'none';
      resolve(true);
    };

    okBtn.addEventListener('click', handleOk);
    overlay.style.display = 'flex';
  });
}

export function showCustomConfirm(message, title = "Confirm Action", icon = "⚠️") {
  return new Promise((resolve) => {
    const overlay = document.getElementById('custom-modal-overlay');
    const titleEl = document.getElementById('custom-modal-title');
    const msgEl = document.getElementById('custom-modal-message');
    const iconEl = document.getElementById('custom-modal-icon');
    const okBtn = document.getElementById('custom-modal-ok');
    const cancelBtn = document.getElementById('custom-modal-cancel');

    if (!overlay) {
      resolve(confirm(message));
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    iconEl.textContent = icon;
    cancelBtn.style.display = 'inline-block';
    okBtn.textContent = 'Confirm';

    const handleOk = () => {
      cleanup();
      overlay.style.display = 'none';
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      overlay.style.display = 'none';
      resolve(false);
    };

    function cleanup() {
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
    }

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    overlay.style.display = 'flex';
  });
}
