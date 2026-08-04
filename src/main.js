import { initBackground } from './js/background.js';
import { buddyPoke } from './js/buddy.js';
import { submitRegistration, goTo } from './js/ui.js';
import { dismissCheatWarning } from './js/cheating.js';
import {
  adminLogin,
  exportCSV,
  clearAllData,
  setAdminView,
  openAdmin,
  addQuestion,
  resetQuestions,
  handleJSONUpload,
  savePasswordsFromView,
  closeQuestionModal,
  saveQuestionFromModal,
  renderQuestionsList,
  handleConcludeOrReopenRound,
  exportWinnersCSV,
  renderWinnersView,
  triggerQuestionImageClick,
  handleQuestionImageSelect,
  handleRemoveQuestionImage
} from './js/admin.js';
import { current } from './js/state.js';

window.goTo = goTo;
window.openAdmin = openAdmin;
window.adminLogin = adminLogin;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize ambient canvas background
  initBackground();

  // 2. Bind floating buddy mascot events
  const buddy = document.getElementById('buddy-mascot');
  if (buddy) {
    buddy.addEventListener('click', buddyPoke);
  }

  // 3. Bind navigation & registration form buttons
  const regBtn = document.querySelector('#screen-register button.solid');
  if (regBtn) {
    regBtn.addEventListener('click', submitRegistration);
  }

  const welcomeRegBtn = document.getElementById('welcome-reg-btn') || document.querySelector('#screen-welcome button.solid');
  if (welcomeRegBtn) {
    welcomeRegBtn.addEventListener('click', () => goTo('screen-register'));
  }

  // Bind back buttons for pages that don't need runtime configuration
  const regBack = document.querySelector('#screen-register .back-btn');
  if (regBack) {
    regBack.onclick = () => goTo('screen-welcome');
  }

  const adminLoginBack = document.querySelector('#screen-admin-login .back-btn');
  if (adminLoginBack) {
    adminLoginBack.onclick = () => goTo('screen-welcome');
  }

  const adminPanelBack = document.querySelector('#screen-admin-panel .back-btn');
  if (adminPanelBack) {
    adminPanelBack.onclick = () => {
      sessionStorage.removeItem('thinktech_admin_session');
      goTo('screen-welcome');
    };
  }

  // Restore Admin Session if page refreshed while logged into Admin Panel
  if (sessionStorage.getItem('thinktech_admin_session') === 'true') {
    openAdmin();
  }

  const completeBack = document.querySelector('#screen-complete .back-btn');
  if (completeBack) {
    completeBack.onclick = () => goTo('screen-welcome');
  }

  const disqualifiedBack = document.querySelector('#screen-disqualified .back-btn');
  if (disqualifiedBack) {
    disqualifiedBack.onclick = () => goTo('screen-welcome');
  }

  const notSelectedBack = document.querySelector('#screen-not-selected .back-btn');
  if (notSelectedBack) {
    notSelectedBack.onclick = () => goTo('screen-welcome');
  }

  // 4. Bind admin panel buttons and features
  const adminLoginBtn = document.getElementById('admin-login-submit-btn') || document.querySelector('#screen-admin-login button.solid');
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', adminLogin);
  }

  const adminPassInput = document.getElementById('admin-pass');
  if (adminPassInput) {
    adminPassInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') adminLogin();
    });
  }

  const exportBtn = document.getElementById('admin-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportCSV);
  }

  const clearBtn = document.getElementById('admin-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllData);
  }

  // Admin filter tabs
  document.querySelectorAll('.admin-tabs .btn').forEach(b => {
    b.addEventListener('click', (e) => {
      const view = e.target.dataset.view;
      setAdminView(view);
    });
  });

  // Admin top-right & bottom-right buttons
  ['welcome-admin-btn', 'welcome-admin-btn-top'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', openAdmin);
    }
  });

  // 5. Cheat Warning Overlay continuation button
  const cheatBtn = document.querySelector('.cheat-warning-card button.solid');
  if (cheatBtn) {
    cheatBtn.addEventListener('click', dismissCheatWarning);
  }

  // 6. Admin brand hidden click trigger (5 clicks to open admin)
  let brandClicks = 0;
  document.querySelectorAll('.brand .college').forEach(el => {
    el.style.cursor = 'default';
    el.addEventListener('click', () => {
      brandClicks++;
      if (brandClicks >= 5) {
        brandClicks = 0;
        openAdmin();
      }
    });
  });

  // 8. Bind questions manager & passcode settings panel triggers
  const addQBtn = document.getElementById('admin-add-q-btn');
  if (addQBtn) {
    addQBtn.addEventListener('click', addQuestion);
  }

  const resetQBtn = document.getElementById('admin-reset-q-btn');
  if (resetQBtn) {
    resetQBtn.addEventListener('click', resetQuestions);
  }

  const uploadJsonInput = document.getElementById('admin-upload-json');
  if (uploadJsonInput) {
    uploadJsonInput.addEventListener('change', handleJSONUpload);
  }

  const savePassBtn = document.getElementById('admin-save-pass-btn');
  if (savePassBtn) {
    savePassBtn.addEventListener('click', savePasswordsFromView);
  }

  const cancelQModalBtn = document.getElementById('q-modal-cancel-btn');
  if (cancelQModalBtn) {
    cancelQModalBtn.addEventListener('click', closeQuestionModal);
  }

  const saveQModalBtn = document.getElementById('q-modal-save-btn');
  if (saveQModalBtn) {
    saveQModalBtn.addEventListener('click', saveQuestionFromModal);
  }

  const levelSelect = document.getElementById('admin-level-select');
  if (levelSelect) {
    levelSelect.addEventListener('change', renderQuestionsList);
  }

  // Bind conclude round winners triggers
  const concludeRoundBtn = document.getElementById('admin-conclude-round-btn');
  if (concludeRoundBtn) {
    concludeRoundBtn.addEventListener('click', handleConcludeOrReopenRound);
  }

  const exportWinnersBtn = document.getElementById('admin-export-winners-btn');
  if (exportWinnersBtn) {
    exportWinnersBtn.addEventListener('click', exportWinnersCSV);
  }

  const winnersRoundSelect = document.getElementById('admin-winners-round-select');
  if (winnersRoundSelect) {
    winnersRoundSelect.addEventListener('change', renderWinnersView);
  }

  const qualifyModeSelect = document.getElementById('admin-qualify-mode-select');
  if (qualifyModeSelect) {
    qualifyModeSelect.addEventListener('change', renderWinnersView);
  }

  const qualifyValInput = document.getElementById('admin-qualify-val-input');
  if (qualifyValInput) {
    qualifyValInput.addEventListener('input', renderWinnersView);
  }

  // Bind question image editor triggers
  const imgTrigger = document.getElementById('q-input-image-trigger');
  if (imgTrigger) {
    imgTrigger.addEventListener('click', triggerQuestionImageClick);
  }

  const imgInput = document.getElementById('q-input-image');
  if (imgInput) {
    imgInput.addEventListener('change', handleQuestionImageSelect);
  }

  const imgRemove = document.getElementById('q-input-image-remove');
  if (imgRemove) {
    imgRemove.addEventListener('click', handleRemoveQuestionImage);
  }

  // 9. Check admin hash in URL
  const checkAdminHash = () => {
    if (window.location.hash === '#admin') {
      openAdmin();
    }
  };
  window.addEventListener('hashchange', checkAdminHash);
  checkAdminHash();

  // 8. Prevent page close warn
  window.addEventListener('beforeunload', (e) => {
    if (current && current.status === 'in-progress') {
      e.preventDefault();
      e.returnValue = '';
    }
  });
});
