import { getAdminPassword, setAdminPassword, getLevelPassword, setLevelPassword, getLevelTimer, setLevelTimer } from './config.js';
import { participants, saveParticipants, loadParticipantsFromStorage, isRoundConcluded, setRoundConcluded } from './state.js';
import { getQuestions, saveQuestions, resetQuestionsToDefault, l4MaxTotal } from './questions.js';
import { computeLevelRanking, toOutOf10, computeTotal, computeGrade } from './quiz.js';
import { goTo, escapeHtml, showCustomAlert, showCustomConfirm } from './ui.js';

let adminLiveInterval = null;
let adminView = 'all';
let activeLevelSelect = 'l1';
let currentEditingIndex = null; // null for add, number for edit
let currentQuestionImageBase64 = null;

export function openAdmin() {
  if (sessionStorage.getItem('thinktech_admin_session') === 'true') {
    renderAdminTable();
    goTo('screen-admin-panel');
  } else {
    goTo('screen-admin-login');
  }
}

export function adminLogin() {
  const val = document.getElementById('admin-pass').value.trim();
  if (val === getAdminPassword()) {
    document.getElementById('admin-error').textContent = "";
    document.getElementById('admin-pass').value = "";
    sessionStorage.setItem('thinktech_admin_session', 'true');
    renderAdminTable();
    goTo('screen-admin-panel');
  } else {
    document.getElementById('admin-error').textContent = "Incorrect passcode.";
  }
}

export function renderAdminTable() {
  const currentList = loadParticipantsFromStorage();
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) return;
  
  const dqCount = currentList.filter(p => p.status === 'disqualified').length;
  document.getElementById('admin-summary').textContent =
    `${currentList.length} participant${currentList.length === 1 ? "" : "s"} · ${dqCount} disqualified`;

  tbody.innerHTML = currentList.map((p, i) => {
    return `
      <tr class="${p.status === 'disqualified' ? 'disqualified' : ''}">
        <td>${escapeHtml(p.fullName)}</td>
        <td>${escapeHtml(p.year)}</td>
        <td>${escapeHtml(p.regNumber)}</td>
        <td>${escapeHtml(p.email)}</td>
        <td>${toOutOf10(p.l1Score, p.l1Max)}/10</td>
        <td>${toOutOf10(p.l2Score, p.l2Max)}/10</td>
        <td>${toOutOf10(typeof p.l3Score === 'number' ? p.l3Score : 0, p.l3Max || 0)}/10</td>
        <td><div class="answer-peek">${l4AnswersBlock(p)}</div></td>
        <td style="font-family:var(--font-mono)">${toOutOf10(typeof p.l4Marks === 'number' ? p.l4Marks : 0, l4MaxTotal())}/10</td>
        <td style="font-family:var(--font-mono)">${computeTotal(p)}</td>
        <td>${computeGrade(p)}</td>
        <td style="font-family:var(--font-mono);text-align:center;">${p.tabSwitchCount}</td>
      </tr>
    `;
  }).join('');
  
  renderAdminAverages();
  renderAdminViews();
}

function renderAdminAverages(currentList = loadParticipantsFromStorage()) {
  const el = document.getElementById('admin-averages');
  if (!el) return;
  const live = currentList.filter(p => p.status !== 'disqualified');
  
  function avgFor(filterFn, scoreKey, maxKey) {
    const rows = live.filter(filterFn);
    if (!rows.length) return { label: "—", n: 0 };
    const total = rows.reduce((sum, p) => sum + (toOutOf10(p[scoreKey], typeof maxKey === 'string' ? p[maxKey] : maxKey(p)) * 1), 0);
    return { label: (total / rows.length).toFixed(1), n: rows.length };
  }

  const a1 = avgFor(p => p.l1Score !== undefined, 'l1Score', 'l1Max');
  const a2 = avgFor(p => p.l2Score !== undefined, 'l2Score', 'l2Max');
  const a3 = avgFor(p => p.l3Score !== undefined, 'l3Score', 'l3Max');
  const a4 = avgFor(p => p.l4Marks !== undefined || (Array.isArray(p.l4Answers) && p.l4Answers.length > 0), 'l4Marks', () => l4MaxTotal());
  
  const overallRows = live.filter(p => p.l1Score !== undefined || p.registered);
  const overallAvg = overallRows.length
    ? (overallRows.reduce((sum, p) => sum + computeTotal(p), 0) / overallRows.length).toFixed(1)
    : "—";

  el.innerHTML = `
    <div class="avg-chip"><div class="num">${a1.label}${a1.n ? '/10' : ''}</div><div class="lbl">Avg L1 (n=${a1.n})</div></div>
    <div class="avg-chip"><div class="num">${a2.label}${a2.n ? '/10' : ''}</div><div class="lbl">Avg L2 (n=${a2.n})</div></div>
    <div class="avg-chip"><div class="num">${a3.label}${a3.n ? '/10' : ''}</div><div class="lbl">Avg L3 (n=${a3.n})</div></div>
    <div class="avg-chip"><div class="num">${a4.label}${a4.n ? '/10' : ''}</div><div class="lbl">Avg L4 (n=${a4.n})</div></div>
    <div class="avg-chip"><div class="num">${overallAvg}</div><div class="lbl">Avg Total (n=${overallRows.length})</div></div>
  `;
}

export function setAdminView(v) {
  adminView = v;
  document.querySelectorAll('.admin-tabs .btn').forEach(b => {
    b.classList.toggle('active-tab', b.dataset.view === v);
  });
  renderAdminViews();
}

export function renderAdminViews() {
  const mainWrap = document.getElementById('admin-main-table-wrap');
  const cutoffWrap = document.getElementById('admin-cutoff-view');
  const questionsWrap = document.getElementById('admin-questions-view');
  const passwordsWrap = document.getElementById('admin-passwords-view');
  const averagesWrap = document.getElementById('admin-averages');
  const winnersWrap = document.getElementById('admin-winners-view');
  if (!mainWrap || !cutoffWrap || !questionsWrap || !passwordsWrap || !averagesWrap || !winnersWrap) return;

  const currentList = loadParticipantsFromStorage();

  mainWrap.style.display = 'none';
  cutoffWrap.style.display = 'none';
  questionsWrap.style.display = 'none';
  passwordsWrap.style.display = 'none';
  winnersWrap.style.display = 'none';
  averagesWrap.style.display = '';

  if (adminView === 'all') {
    mainWrap.style.display = '';
  } else if (adminView === 'questions') {
    averagesWrap.style.display = 'none';
    questionsWrap.style.display = '';
    renderQuestionsList();
  } else if (adminView === 'passwords') {
    averagesWrap.style.display = 'none';
    passwordsWrap.style.display = '';
    renderPasswordsView();
  } else if (adminView === 'winners') {
    averagesWrap.style.display = 'none';
    winnersWrap.style.display = '';
    renderWinnersView();
  } else {
    cutoffWrap.style.display = '';
    const levelNum = Number(adminView);
    const maxKey = { 1: 'l1Max', 2: 'l2Max', 3: 'l3Max' }[levelNum];
    const { rows, numQualify, cutoffScore } = computeLevelRanking(levelNum, currentList);
    
    cutoffWrap.innerHTML = `
      <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-dim);margin-bottom:10px;">
        ${rows.length} participant${rows.length === 1 ? '' : 's'} finished Level ${levelNum} so far · top 50% (${numQualify}) qualify for the next round
      </div>
      <div style="overflow-x:auto;">
      <table class="admin-table">
        <thead><tr><th>Rank</th><th>Name</th><th>Reg No.</th><th>Score /10</th><th>Result</th></tr></thead>
        <tbody>
          ${rows.length ? rows.map((r, i) => {
            const qualifies = r.score >= cutoffScore;
            return `<tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(r.p.fullName)}</td>
              <td>${escapeHtml(r.p.regNumber)}</td>
              <td style="font-family:var(--font-mono)">${toOutOf10(r.score, r.p[maxKey])}/10</td>
              <td>${qualifies ? '<span class="badge ok">Qualifies</span>' : '<span class="badge elim">Eliminated</span>'}</td>
            </tr>`;
          }).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:20px;">No one has finished this level yet.</td></tr>`}
        </tbody>
      </table>
      </div>
    `;
  }
}

// ==========================================
// PASSCODES EDITOR VIEW
// ==========================================
export function renderPasswordsView() {
  document.getElementById('admin-pass-admin').value = getAdminPassword();
  document.getElementById('admin-pass-l1').value = getLevelPassword(1);
  document.getElementById('admin-pass-l2').value = getLevelPassword(2);
  document.getElementById('admin-pass-l3').value = getLevelPassword(3);
  document.getElementById('admin-pass-l4').value = getLevelPassword(4);

  document.getElementById('admin-timer-l1').value = getLevelTimer(1);
  document.getElementById('admin-timer-l2').value = getLevelTimer(2);
  document.getElementById('admin-timer-l3').value = getLevelTimer(3);
  document.getElementById('admin-timer-l4').value = getLevelTimer(4);

  const u1 = document.getElementById('admin-timer-unit-l1');
  const u2 = document.getElementById('admin-timer-unit-l2');
  if (u1) u1.value = getLevelTimerUnit(1);
  if (u2) u2.value = getLevelTimerUnit(2);

  document.getElementById('admin-pass-success').textContent = "";
}

export function savePasswordsFromView() {
  const adminVal = document.getElementById('admin-pass-admin').value.trim();
  const l1Val = document.getElementById('admin-pass-l1').value.trim();
  const l2Val = document.getElementById('admin-pass-l2').value.trim();
  const l3Val = document.getElementById('admin-pass-l3').value.trim();
  const l4Val = document.getElementById('admin-pass-l4').value.trim();

  const t1Val = document.getElementById('admin-timer-l1').value;
  const t2Val = document.getElementById('admin-timer-l2').value;
  const t3Val = document.getElementById('admin-timer-l3').value;
  const t4Val = document.getElementById('admin-timer-l4').value;

  const u1 = document.getElementById('admin-timer-unit-l1');
  const u2 = document.getElementById('admin-timer-unit-l2');

  if (!adminVal || !l1Val || !l2Val || !l3Val || !l4Val || !t1Val || !t2Val || !t3Val || !t4Val) {
    showCustomAlert("Passcodes and timers cannot be empty!", "Settings Error", "⚠️");
    return;
  }

  setAdminPassword(adminVal);
  setLevelPassword(1, l1Val);
  setLevelPassword(2, l2Val);
  setLevelPassword(3, l3Val);
  setLevelPassword(4, l4Val);

  setLevelTimer(1, t1Val);
  setLevelTimer(2, t2Val);
  setLevelTimer(3, t3Val);
  setLevelTimer(4, t4Val);

  if (u1) setLevelTimerUnit(1, u1.value);
  if (u2) setLevelTimerUnit(2, u2.value);

  const successEl = document.getElementById('admin-pass-success');
  successEl.textContent = "Settings saved successfully!";
  showCustomAlert("Settings saved successfully!", "Settings Updated", "✅");
  setTimeout(() => {
    successEl.textContent = "";
  }, 2500);
}

// ==========================================
// QUESTIONS MANAGER VIEW
// ==========================================
export function renderQuestionsList() {
  const levelSelect = document.getElementById('admin-level-select');
  if (levelSelect) activeLevelSelect = levelSelect.value;

  const listEl = document.getElementById('admin-q-list');
  if (!listEl) return;

  const questions = getQuestions(activeLevelSelect);
  listEl.innerHTML = "";

  if (!questions || !questions.length) {
    listEl.innerHTML = `<div style="text-align:center;color:var(--text-dim);padding:20px;background:rgba(22, 29, 51, 0.4);border:var(--glass-border);border-radius:10px;">No questions defined for this level.</div>`;
    return;
  }

  questions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'form-card';
    card.style.width = '100%';
    card.style.marginBottom = '0';
    card.style.padding = '20px';

    let summaryText = "";
    if (activeLevelSelect === 'l1') {
      summaryText = `<b>Emoji Clue:</b> ${escapeHtml(q.emoji)} <br> <b>Hint:</b> ${escapeHtml(q.question)} <br> <b>Correct Answer:</b> ${escapeHtml(q.answer)}`;
    } else if (activeLevelSelect === 'l2') {
      summaryText = `<b>Riddle:</b> ${escapeHtml(q.question)} <br> <b>Correct Answer:</b> ${escapeHtml(q.answer)}`;
    } else if (activeLevelSelect === 'l3') {
      summaryText = `<b>Tasks bundle:</b> <br>
                     1. ${escapeHtml(q.tasks[0].label)} (${escapeHtml(q.tasks[0].answer)}) <br>
                     2. ${escapeHtml(q.tasks[1].label)} (${escapeHtml(q.tasks[1].answer)}) <br>
                     3. ${escapeHtml(q.tasks[2].label)} (${escapeHtml(q.tasks[2].answer)})`;
    } else if (activeLevelSelect === 'l4') {
      summaryText = `<b>Puzzle Title:</b> ${escapeHtml(q.title)} <br> <b>Keywords target:</b> ${escapeHtml(q.answerKey)} <br> <b>Max Marks:</b> ${q.maxMarks || 10}`;
    }

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
        <div style="font-size:0.9rem; line-height:1.5; flex:1;">
          ${summaryText}
          ${q.explanation ? `<div style="margin-top:10px; padding:8px 12px; background:rgba(6, 182, 212, 0.08); border-left:3px solid var(--cyan); border-radius:4px; font-size:0.8rem; color:var(--text-dim);"><b style="color:var(--cyan);">💡 Explanation:</b> ${escapeHtml(q.explanation)}</div>` : ''}
        </div>
        <div style="display:flex; gap:8px; flex-shrink:0;">
          <button class="btn outline" style="padding: 6px 12px; font-size: 0.75rem;">Edit</button>
          <button class="btn solid" style="padding: 6px 12px; font-size: 0.75rem; background:linear-gradient(135deg, var(--danger) 0%, #dc2626 100%);">Delete</button>
        </div>
      </div>
    `;

    // Bind event listeners using modular Javascript selectors to avoid global leaks
    const [editBtn, deleteBtn] = card.querySelectorAll('.btn');
    editBtn.onclick = () => editQuestion(idx);
    deleteBtn.onclick = () => deleteQuestion(idx);

    listEl.appendChild(card);
  });
}

export function editQuestion(idx) {
  currentEditingIndex = idx;
  const modal = document.getElementById('question-modal');
  document.getElementById('q-modal-title').textContent = "Edit Question";
  document.getElementById('q-modal-subtitle').textContent = `Modify Level ${activeLevelSelect.slice(1).toUpperCase()} question properties.`;
  document.getElementById('q-modal-error').textContent = "";
  
  // Hide form panels
  document.getElementById('q-form-l1').style.display = 'none';
  document.getElementById('q-form-l2').style.display = 'none';
  document.getElementById('q-form-l3').style.display = 'none';
  document.getElementById('q-form-l4').style.display = 'none';

  const q = getQuestions(activeLevelSelect)[idx];

  // Load image uploader fields
  currentQuestionImageBase64 = q.image || null;
  const previewWrap = document.getElementById('q-input-image-preview-wrap');
  const previewImg = document.getElementById('q-input-image-preview');
  const removeBtn = document.getElementById('q-input-image-remove');
  const filenameEl = document.getElementById('q-input-image-filename');
  const fileInput = document.getElementById('q-input-image');
  if (fileInput) fileInput.value = "";

  if (q.image) {
    if (previewImg) previewImg.src = q.image;
    if (previewWrap) previewWrap.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'block';
    if (filenameEl) filenameEl.textContent = "Image attached";
  } else {
    if (previewWrap) previewWrap.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'none';
    if (filenameEl) filenameEl.textContent = "No image attached";
  }

  if (activeLevelSelect === 'l1') {
    document.getElementById('q-form-l1').style.display = 'block';
    document.getElementById('q-input-l1-emoji').value = q.emoji || "";
    document.getElementById('q-input-l1-question').value = q.question || "";
    document.getElementById('q-input-l1-answer').value = q.answer || "";
    document.getElementById('q-input-l1-opt1').value = q.options[0] || "";
    document.getElementById('q-input-l1-opt2').value = q.options[1] || "";
    document.getElementById('q-input-l1-opt3').value = q.options[2] || "";
    document.getElementById('q-input-l1-opt4').value = q.options[3] || "";
  } else if (activeLevelSelect === 'l2') {
    document.getElementById('q-form-l2').style.display = 'block';
    document.getElementById('q-input-l2-question').value = q.question || "";
    document.getElementById('q-input-l2-answer').value = q.answer || "";
  } else if (activeLevelSelect === 'l3') {
    document.getElementById('q-form-l3').style.display = 'block';
    document.getElementById('q-input-l3-label1').value = q.tasks[0].label || "";
    document.getElementById('q-input-l3-code1').value = q.tasks[0].code || "";
    document.getElementById('q-input-l3-answer1').value = q.tasks[0].answer || "";
    document.getElementById('q-input-l3-label2').value = q.tasks[1].label || "";
    document.getElementById('q-input-l3-code2').value = q.tasks[1].code || "";
    document.getElementById('q-input-l3-answer2').value = q.tasks[1].answer || "";
    document.getElementById('q-input-l3-label3').value = q.tasks[2].label || "";
    document.getElementById('q-input-l3-code3').value = q.tasks[2].code || "";
    document.getElementById('q-input-l3-answer3').value = q.tasks[2].answer || "";
  } else if (activeLevelSelect === 'l4') {
    document.getElementById('q-form-l4').style.display = 'block';
    document.getElementById('q-input-l4-title').value = q.title || "";
    document.getElementById('q-input-l4-body').value = q.body || "";
    document.getElementById('q-input-l4-answerkey').value = q.answerKey || "";
    document.getElementById('q-input-l4-max').value = q.maxMarks || 10;
  }

  document.getElementById('q-input-explanation').value = q.explanation || "";

  modal.style.display = 'flex';
}

export function addQuestion() {
  currentEditingIndex = null;
  const modal = document.getElementById('question-modal');
  document.getElementById('q-modal-title').textContent = "Add Question";
  document.getElementById('q-modal-subtitle').textContent = `Create a new Level ${activeLevelSelect.slice(1).toUpperCase()} question.`;
  document.getElementById('q-modal-error').textContent = "";
  
  // Hide form panels
  document.getElementById('q-form-l1').style.display = 'none';
  document.getElementById('q-form-l2').style.display = 'none';
  document.getElementById('q-form-l3').style.display = 'none';
  document.getElementById('q-form-l4').style.display = 'none';

  // Reset image uploader fields
  currentQuestionImageBase64 = null;
  const previewWrap = document.getElementById('q-input-image-preview-wrap');
  const removeBtn = document.getElementById('q-input-image-remove');
  const filenameEl = document.getElementById('q-input-image-filename');
  const fileInput = document.getElementById('q-input-image');
  if (fileInput) fileInput.value = "";

  if (previewWrap) previewWrap.style.display = 'none';
  if (removeBtn) removeBtn.style.display = 'none';
  if (filenameEl) filenameEl.textContent = "No image attached";

  if (activeLevelSelect === 'l1') {
    document.getElementById('q-form-l1').style.display = 'block';
    document.getElementById('q-input-l1-emoji').value = "";
    document.getElementById('q-input-l1-question').value = "";
    document.getElementById('q-input-l1-answer').value = "";
    document.getElementById('q-input-l1-opt1').value = "";
    document.getElementById('q-input-l1-opt2').value = "";
    document.getElementById('q-input-l1-opt3').value = "";
    document.getElementById('q-input-l1-opt4').value = "";
  } else if (activeLevelSelect === 'l2') {
    document.getElementById('q-form-l2').style.display = 'block';
    document.getElementById('q-input-l2-question').value = "";
    document.getElementById('q-input-l2-answer').value = "";
  } else if (activeLevelSelect === 'l3') {
    document.getElementById('q-form-l3').style.display = 'block';
    document.getElementById('q-input-l3-label1').value = "Task 1: Find the import statement";
    document.getElementById('q-input-l3-code1').value = "";
    document.getElementById('q-input-l3-answer1').value = "";
    document.getElementById('q-input-l3-label2').value = "Task 2: Debug the program";
    document.getElementById('q-input-l3-code2').value = "";
    document.getElementById('q-input-l3-answer2').value = "";
    document.getElementById('q-input-l3-label3').value = "Task 3: What is the output?";
    document.getElementById('q-input-l3-code3').value = "";
    document.getElementById('q-input-l3-answer3').value = "";
  } else if (activeLevelSelect === 'l4') {
    document.getElementById('q-form-l4').style.display = 'block';
    document.getElementById('q-input-l4-title').value = "";
    document.getElementById('q-input-l4-body').value = "";
    document.getElementById('q-input-l4-answerkey').value = "";
    document.getElementById('q-input-l4-max').value = 10;
  }

  document.getElementById('q-input-explanation').value = "";

  modal.style.display = 'flex';
}

export function closeQuestionModal() {
  document.getElementById('question-modal').style.display = 'none';
}

export function saveQuestionFromModal() {
  const errEl = document.getElementById('q-modal-error');
  errEl.textContent = "";

  const list = [...getQuestions(activeLevelSelect)];
  let newQ = {};

  if (activeLevelSelect === 'l1') {
    const emoji = document.getElementById('q-input-l1-emoji').value.trim();
    const question = document.getElementById('q-input-l1-question').value.trim();
    const answer = document.getElementById('q-input-l1-answer').value.trim();
    const opt1 = document.getElementById('q-input-l1-opt1').value.trim();
    const opt2 = document.getElementById('q-input-l1-opt2').value.trim();
    const opt3 = document.getElementById('q-input-l1-opt3').value.trim();
    const opt4 = document.getElementById('q-input-l1-opt4').value.trim();

    if (!emoji || !question || !answer || !opt1 || !opt2 || !opt3 || !opt4) {
      errEl.textContent = "Please fill in all inputs.";
      return;
    }
    const options = [opt1, opt2, opt3, opt4];
    if (!options.includes(answer)) {
      errEl.textContent = "Correct answer must match one of the four options.";
      return;
    }
    newQ = { emoji, question, answer, options };
  } else if (activeLevelSelect === 'l2') {
    const question = document.getElementById('q-input-l2-question').value.trim();
    const answer = document.getElementById('q-input-l2-answer').value.trim();
    if (!question || !answer) {
      errEl.textContent = "Please fill in all inputs.";
      return;
    }
    newQ = { question, answer };
  } else if (activeLevelSelect === 'l3') {
    const label1 = document.getElementById('q-input-l3-label1').value.trim();
    const code1 = document.getElementById('q-input-l3-code1').value.trim();
    const answer1 = document.getElementById('q-input-l3-answer1').value.trim();
    const label2 = document.getElementById('q-input-l3-label2').value.trim();
    const code2 = document.getElementById('q-input-l3-code2').value.trim();
    const answer2 = document.getElementById('q-input-l3-answer2').value.trim();
    const label3 = document.getElementById('q-input-l3-label3').value.trim();
    const code3 = document.getElementById('q-input-l3-code3').value.trim();
    const answer3 = document.getElementById('q-input-l3-answer3').value.trim();

    if (!label1 || !code1 || !answer1 || !label2 || !code2 || !answer2 || !label3 || !code3 || !answer3) {
      errEl.textContent = "Please fill in all inputs for the 3 tasks.";
      return;
    }
    newQ = {
      tasks: [
        { label: label1, code: code1, answer: answer1 },
        { label: label2, code: code2, answer: answer2 },
        { label: label3, code: code3, answer: answer3 }
      ]
    };
  } else if (activeLevelSelect === 'l4') {
    const title = document.getElementById('q-input-l4-title').value.trim();
    const body = document.getElementById('q-input-l4-body').value.trim();
    const answerKey = document.getElementById('q-input-l4-answerkey').value.trim();
    const maxMarks = Number(document.getElementById('q-input-l4-max').value);

    if (!title || !body || !answerKey || !maxMarks) {
      errEl.textContent = "Please fill in all inputs.";
      return;
    }
    newQ = { title, body, answerKey, maxMarks };
  }

  const explanationInput = document.getElementById('q-input-explanation');
  if (explanationInput) {
    const expText = explanationInput.value.trim();
    if (expText) newQ.explanation = expText;
  }

  newQ.image = currentQuestionImageBase64 || null;

  if (currentEditingIndex === null) {
    list.push(newQ);
  } else {
    list[currentEditingIndex] = newQ;
  }

  saveQuestions(activeLevelSelect, list);
  closeQuestionModal();
  renderQuestionsList();
}

export async function deleteQuestion(idx) {
  const confirmed = await showCustomConfirm("Are you sure you want to delete this question?", "Delete Question", "🗑️");
  if (!confirmed) return;
  const list = [...getQuestions(activeLevelSelect)];
  list.splice(idx, 1);
  saveQuestions(activeLevelSelect, list);
  renderQuestionsList();
}

export async function resetQuestions() {
  const confirmed = await showCustomConfirm("This will reset questions for ALL levels back to their original factory defaults. Continue?", "Reset Defaults", "⚠️");
  if (!confirmed) return;
  resetQuestionsToDefault();
  renderQuestionsList();
}

export function handleJSONUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (!data.l1 || !data.l2 || !data.l3 || !data.l4) {
        showCustomAlert("Invalid JSON format. It must contain l1, l2, l3, and l4 question arrays.", "Import Error", "⚠️");
        return;
      }
      saveQuestions('l1', data.l1);
      saveQuestions('l2', data.l2);
      saveQuestions('l3', data.l3);
      saveQuestions('l4', data.l4);
      await showCustomAlert("Questions imported successfully!", "Import Success", "✅");
      renderQuestionsList();
    } catch (err) {
      showCustomAlert("Failed to parse JSON file. Make sure it's valid JSON.", "Import Error", "⚠️");
    }
  };
  reader.readAsText(file);
}

// ==========================================
// CSV & ADMIN VIEW RENDERS
// ==========================================
function l4AnswersBlock(p) {
  const answers = Array.isArray(p.l4Answers) ? p.l4Answers : [];
  if (!answers.length) return "—";
  return answers.map(a => {
    const pool = getQuestions('l4').find(q => q.title === a.title);
    const key = pool ? pool.answerKey : "";
    const max = a.maxMarks ?? (pool ? pool.maxMarks : 10) ?? 10;
    const marks = typeof a.marks === 'number' ? a.marks : 0;
    
    return `<div style="margin-bottom:8px;"><b>${escapeHtml(a.title)}</b> ` +
      `<span style="color:var(--cyan);font-family:var(--font-mono);font-size:11px;">(${marks}/${max})</span><br>` +
      `${escapeHtml(a.answer || "—")}` +
      (key ? `<br><span style="color:var(--text-dim);font-size:11px;">Answer key: ${escapeHtml(key)}</span>` : '') +
      `</div>`;
  }).join('');
}

function l4AnswersCsvText(p) {
  const answers = Array.isArray(p.l4Answers) ? p.l4Answers : [];
  return answers.map(a => `${a.title}: ${a.answer}`).join(' | ');
}

export function exportCSV() {
  const headers = ["Full Name", "Year", "Register Number", "Email", "L1 Score (/10)", "L2 Score (/10)", "L3 Score (/10)", "L4 Answer", "L4 Marks (/10)", "Total", "Grade", "Status", "Tab Switches", "Disqualified Reason", "Registered At"];
  const rows = participants.map(p => [
    p.fullName, p.year, p.regNumber, p.email, `${toOutOf10(p.l1Score, p.l1Max)}/10`, `${toOutOf10(p.l2Score, p.l2Max)}/10`,
    `${toOutOf10(typeof p.l3Score === 'number' ? p.l3Score : 0, p.l3Max || 0)}/10`, l4AnswersCsvText(p), `${toOutOf10(typeof p.l4Marks === 'number' ? p.l4Marks : 0, l4MaxTotal())}/10`, computeTotal(p), computeGrade(p),
    p.status, p.tabSwitchCount, p.disqualifiedReason || "", p.registeredAt
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'thinktech_results.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export async function clearAllData() {
  const confirmed = await showCustomConfirm("This will permanently delete all participant data on this device. Continue?", "Clear All Data", "🚨");
  if (!confirmed) return;
  saveParticipants([]);
  renderAdminTable();
  try {
    await fetch('/api/clear', { method: 'POST' });
  } catch (e) {
    console.error("Failed to clear server data:", e);
  }
}

// ==========================================
// CONCLUDE WINNERS MODULES
// ==========================================
let activeWinnersRound = 1;

export function renderWinnersView() {
  const roundSelect = document.getElementById('admin-winners-round-select');
  if (roundSelect) activeWinnersRound = Number(roundSelect.value);

  const statusEl = document.getElementById('winners-round-status');
  const statsEl = document.getElementById('winners-round-stats');
  const btnConclude = document.getElementById('admin-conclude-round-btn');
  const podiumContainer = document.getElementById('winners-podium-container');
  const tbody = document.getElementById('admin-winners-tbody');
  
  if (!statusEl || !statsEl || !btnConclude || !podiumContainer || !tbody) return;

  const concluded = isRoundConcluded(activeWinnersRound);
  
  // Status strip updates
  if (concluded) {
    statusEl.textContent = "CONCLUDED / LOCKED";
    statusEl.style.color = "var(--success)";
    btnConclude.textContent = `Reopen Round ${activeWinnersRound}`;
    btnConclude.style.background = "linear-gradient(135deg, var(--danger) 0%, #dc2626 100%)";
  } else {
    statusEl.textContent = "ACTIVE / LIVE";
    statusEl.style.color = "var(--cyan)";
    btnConclude.textContent = `Conclude & Lock Round ${activeWinnersRound}`;
    btnConclude.style.background = "linear-gradient(135deg, var(--cyan) 0%, var(--violet) 100%)";
  }

  const list = loadParticipantsFromStorage();
  const activeParticipants = list.filter(p => p.status !== 'disqualified' && (p.stage || 0) >= activeWinnersRound - 1);
  const finishedParticipants = list.filter(p => p.status !== 'disqualified' && (p.stage || 0) >= activeWinnersRound);

  statsEl.textContent = `${finishedParticipants.length} of ${activeParticipants.length} finished round`;

  const modeSelect = document.getElementById('admin-qualify-mode-select');
  const valInput = document.getElementById('admin-qualify-val-input');
  const valLabel = document.getElementById('admin-qualify-val-label');
  const valWrap = document.getElementById('admin-qualify-val-wrap');

  const mode = modeSelect ? modeSelect.value : 'percent';
  const cutoffVal = valInput ? valInput.value : 50;

  if (valWrap && valLabel) {
    if (mode === 'percent') {
      valWrap.style.display = 'flex';
      valLabel.textContent = "Cutoff (%):";
    } else if (mode === 'count') {
      valWrap.style.display = 'flex';
      valLabel.textContent = "Top N Count:";
    } else {
      valWrap.style.display = 'none';
    }
  }

  let rankedRows = [];
  let qualifiedIds = new Set();

  if (activeWinnersRound === 4) {
    rankedRows = finishedParticipants.map(p => ({
      p,
      score: computeTotal(p),
      max: 40
    })).sort((a, b) => b.score - a.score);
  } else {
    const scoreKey = { 1: 'l1Score', 2: 'l2Score', 3: 'l3Score' }[activeWinnersRound];
    const maxKey = { 1: 'l1Max', 2: 'l2Max', 3: 'l3Max' }[activeWinnersRound];
    const res = computeLevelRanking(activeWinnersRound, list, mode, cutoffVal);
    qualifiedIds = res.qualifiedIds;
    rankedRows = res.rows.map(r => ({
      p: r.p,
      score: r.score,
      max: r.p[maxKey]
    }));
  }

  // Render Podium for the top 3
  if (rankedRows.length > 0) {
    podiumContainer.style.display = 'flex';
    
    const top3 = rankedRows.slice(0, 3);
    const p1 = top3[0];
    const p2 = top3[1];
    const p3 = top3[2];

    const getPodiumHtml = (rank, item) => {
      if (!item) {
        return `
          <div style="display:flex; flex-direction:column; align-items:center; width: 140px; opacity: 0.3;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--bg-panel); border: 2px dashed var(--line); display:flex; align-items:center; justify-content:center; font-family:var(--font-mono); font-weight:700;">${rank}</div>
            <div style="font-family:var(--font-display); font-size:12px; margin-top:8px;">Empty</div>
            <div style="width:100%; height:${rank===1?110:rank===2?80:60}px; background:rgba(255,255,255,0.02); border:1px dashed var(--line); border-radius:6px 6px 0 0; margin-top:10px;"></div>
          </div>
        `;
      }
      const scoreStr = activeWinnersRound === 4
        ? `${item.score} pts`
        : `${toOutOf10(item.score, item.max)}/10`;

      let badgeBg = "var(--bg-panel-2)";
      let borderGlow = "1px solid var(--line)";
      let labelColor = "var(--text)";
      if (rank === 1) {
        badgeBg = "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)";
        borderGlow = "2px solid #fbbf24; box-shadow: 0 0 15px rgba(251, 191, 36, 0.4)";
        labelColor = "#fbbf24";
      } else if (rank === 2) {
        badgeBg = "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)";
        borderGlow = "2px solid #cbd5e1; box-shadow: 0 0 12px rgba(203, 213, 225, 0.3)";
        labelColor = "#cbd5e1";
      } else if (rank === 3) {
        badgeBg = "linear-gradient(135deg, #b45309 0%, #78350f 100%)";
        borderGlow = "2px solid #b45309; box-shadow: 0 0 8px rgba(180, 83, 9, 0.2)";
        labelColor = "#b45309";
      }

      return `
        <div style="display:flex; flex-direction:column; align-items:center; width: 140px; text-align:center;">
          <div style="width: 50px; height: 50px; border-radius: 50%; background: ${badgeBg}; border: 2px solid var(--bg-panel); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:800; font-size:1.15rem; color:#0c0a09; box-shadow: 0 4px 10px rgba(0,0,0,0.3)">
            ${rank}
          </div>
          <div style="font-family:var(--font-display); font-weight:700; font-size:0.8rem; margin-top:8px; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text);">${escapeHtml(item.p.fullName)}</div>
          <div style="font-family:var(--font-mono); font-size:10.5px; color:${labelColor}; font-weight:700; margin-top:2px;">${scoreStr}</div>
          <div style="width:100%; height:${rank===1?110:rank===2?80:60}px; background:rgba(139, 124, 246, 0.08); border-top: ${borderGlow}; border-left: 1px solid rgba(139,124,246,0.1); border-right: 1px solid rgba(139,124,246,0.1); border-radius:10px 10px 0 0; margin-top:10px; display:flex; align-items:center; justify-content:center;">
            <span style="font-family:var(--font-mono); font-size:9.5px; color:var(--text-dim); opacity:0.6;">${item.p.regNumber}</span>
          </div>
        </div>
      `;
    };

    podiumContainer.innerHTML = `
      ${getPodiumHtml(2, p2)}
      ${getPodiumHtml(1, p1)}
      ${getPodiumHtml(3, p3)}
    `;
  } else {
    podiumContainer.innerHTML = `<div style="padding:20px; color:var(--text-dim); text-align:center;">No finished participants for the podium yet.</div>`;
  }

  tbody.innerHTML = rankedRows.map((r, idx) => {
    let qualifies = true;
    let roundStatusHtml = "";

    if (activeWinnersRound === 4) {
      const isTop3 = idx < 3;
      roundStatusHtml = isTop3
        ? `<span class="badge ok" style="background:rgba(251,191,36,0.15); color:#fbbf24; border:1px solid #fbbf24;">Champ 🏆</span>`
        : `<span class="badge ok">Finisher</span>`;
    } else {
      qualifies = qualifiedIds.has(r.p.id);
      if (concluded) {
        roundStatusHtml = r.p.status !== 'not-selected' && r.p.status !== 'disqualified'
          ? `<span class="badge ok">Qualified</span>`
          : `<span class="badge elim">Eliminated</span>`;
      } else {
        roundStatusHtml = qualifies
          ? `<span class="badge progress">Will Qualify</span>`
          : `<span class="badge progress" style="background:rgba(239, 68, 68, 0.1); color:rgba(239,68,68,0.8); border:none;">Below Cutoff</span>`;
      }
    }

    const finalScore = activeWinnersRound === 4
      ? `${r.score} total`
      : `${toOutOf10(r.score, r.max)}/10`;

    const isChecked = activeWinnersRound === 4 || (concluded ? (r.p.status !== 'not-selected' && r.p.status !== 'disqualified') : qualifies);

    return `
      <tr>
        <td style="text-align:center;">
          <input type="checkbox" class="winner-qualify-cb" data-id="${r.p.id}" ${isChecked ? 'checked' : ''} ${concluded || activeWinnersRound === 4 ? 'disabled' : ''}>
        </td>
        <td style="font-family:var(--font-mono); font-weight:700;">${idx + 1}</td>
        <td>${escapeHtml(r.p.fullName)}</td>
        <td>${escapeHtml(r.p.regNumber)}</td>
        <td>${escapeHtml(r.p.email)}</td>
        <td style="font-family:var(--font-mono); font-weight:700;">${finalScore}</td>
        <td>${escapeHtml(r.p.status === 'disqualified' ? '—' : computeGrade(r.p))}</td>
        <td>${roundStatusHtml}</td>
      </tr>
    `;
  }).join('');
}

export async function handleConcludeOrReopenRound() {
  const concluded = isRoundConcluded(activeWinnersRound);
  if (concluded) {
    const confirmed = await showCustomConfirm(`Are you sure you want to reopen Round ${activeWinnersRound}? This will allow participants to continue progression checks.`, `Reopen Round ${activeWinnersRound}`, "🔓");
    if (!confirmed) return;
    
    setRoundConcluded(activeWinnersRound, false);
    
    const list = loadParticipantsFromStorage();
    list.forEach(p => {
      if (p.status === 'not-selected' && p.eliminatedAtLevel === activeWinnersRound) {
        p.status = 'pending-cutoff';
        p.eliminatedAtLevel = null;
        p.eliminatedReason = null;
      }
    });
    saveParticipants(list);
    renderAdminTable();
    window.dispatchEvent(new Event('storage'));
    await showCustomAlert(`Round ${activeWinnersRound} has been reopened successfully!`, "Round Reopened", "🔓");
  } else {
    const confirmed = await showCustomConfirm(`Are you sure you want to conclude Round ${activeWinnersRound}? This will lock results and finalize the qualifiers/eliminations based on your selected criteria.`, `Conclude Round ${activeWinnersRound}`, "🔒");
    if (!confirmed) return;
    
    const list = loadParticipantsFromStorage();
    const finishedParticipants = list.filter(p => p.status !== 'disqualified' && (p.stage || 0) >= activeWinnersRound);
    
    if (!finishedParticipants.length) {
      await showCustomAlert("No participants have finished this round yet. You cannot conclude an empty round!", "Empty Round", "⚠️");
      return;
    }

    setRoundConcluded(activeWinnersRound, true);

    if (activeWinnersRound < 4) {
      const scoreKey = { 1: 'l1Score', 2: 'l2Score', 3: 'l3Score' }[activeWinnersRound];
      const maxKey = { 1: 'l1Max', 2: 'l2Max', 3: 'l3Max' }[activeWinnersRound];
      
      const modeSelect = document.getElementById('admin-qualify-mode-select');
      const valInput = document.getElementById('admin-qualify-val-input');
      const mode = modeSelect ? modeSelect.value : 'percent';
      const cutoffVal = valInput ? valInput.value : 50;

      let finalQualifiedIds;
      if (mode === 'manual') {
        const checkedCbs = document.querySelectorAll('.winner-qualify-cb:checked');
        finalQualifiedIds = new Set(Array.from(checkedCbs).map(cb => cb.dataset.id));
      } else {
        const { qualifiedIds } = computeLevelRanking(activeWinnersRound, list, mode, cutoffVal);
        finalQualifiedIds = qualifiedIds;
      }

      list.forEach(p => {
        if (p.status === 'pending-cutoff' && (p.stage || 0) === activeWinnersRound) {
          if (!finalQualifiedIds.has(p.id)) {
            p.status = 'not-selected';
            p.eliminatedAtLevel = activeWinnersRound;
            p.eliminatedReason = `Did not qualify after Level ${activeWinnersRound} (scored ${toOutOf10(p[scoreKey], p[maxKey])}/10).`;
          } else {
            p.status = 'in-progress';
          }
        }
      });
      saveParticipants(list);
    }
    
    renderAdminTable();
    window.dispatchEvent(new Event('storage'));
    await showCustomAlert(`Round ${activeWinnersRound} concluded successfully! Results are locked.`, "Round Concluded", "🔒");
  }
}

export async function exportWinnersCSV() {
  const list = loadParticipantsFromStorage();
  let filtered = [];

  if (activeWinnersRound === 4) {
    filtered = list.filter(p => p.status !== 'disqualified' && (p.stage || 0) >= 4)
                   .sort((a,b) => computeTotal(b) - computeTotal(a));
  } else {
    const modeSelect = document.getElementById('admin-qualify-mode-select');
    const valInput = document.getElementById('admin-qualify-val-input');
    const mode = modeSelect ? modeSelect.value : 'percent';
    const cutoffVal = valInput ? valInput.value : 50;
    const { qualifiedIds } = computeLevelRanking(activeWinnersRound, list, mode, cutoffVal);
    filtered = list.filter(p => qualifiedIds.has(p.id) && p.status !== 'not-selected');
  }

  if (!filtered.length) {
    await showCustomAlert("No winners / qualifiers found to export.", "Export Notice", "ℹ️");
    return;
  }

  const headers = ["Rank", "Full Name", "Register Number", "Email", "Round Score", "Total Score", "Grade"];
  const rows = filtered.map((p, idx) => {
    const scoreKey = { 1: 'l1Score', 2: 'l2Score', 3: 'l3Score' }[activeWinnersRound];
    const maxKey = { 1: 'l1Max', 2: 'l2Max', 3: 'l3Max' }[activeWinnersRound];
    const rScore = activeWinnersRound === 4 ? p.l4Marks : p[scoreKey];
    const rMax = activeWinnersRound === 4 ? l4MaxTotal() : p[maxKey];
    
    return [
      idx + 1,
      p.fullName,
      p.regNumber,
      p.email,
      `${toOutOf10(rScore, rMax)}/10`,
      computeTotal(p),
      computeGrade(p)
    ];
  });

  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `thinktech_round_${activeWinnersRound}_winners.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function startAdminLiveRefresh() {
  stopAdminLiveRefresh();
  renderAdminTable();
  adminLiveInterval = setInterval(renderAdminTable, 3000);
}

export function stopAdminLiveRefresh() {
  if (adminLiveInterval) {
    clearInterval(adminLiveInterval);
    adminLiveInterval = null;
  }
}

// Window Storage Listener
window.addEventListener('storage', function (e) {
  if (document.getElementById('screen-admin-panel').classList.contains('active')) {
    renderAdminTable();
  }
});

// ==========================================
// QUESTION IMAGES UPLOADERS
// ==========================================
export function handleQuestionImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    currentQuestionImageBase64 = evt.target.result;
    
    const previewWrap = document.getElementById('q-input-image-preview-wrap');
    const previewImg = document.getElementById('q-input-image-preview');
    const removeBtn = document.getElementById('q-input-image-remove');
    const filenameEl = document.getElementById('q-input-image-filename');

    if (previewImg) previewImg.src = evt.target.result;
    if (previewWrap) previewWrap.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'block';
    if (filenameEl) filenameEl.textContent = file.name;
  };
  reader.readAsDataURL(file);
}

export function handleRemoveQuestionImage() {
  currentQuestionImageBase64 = null;
  const previewWrap = document.getElementById('q-input-image-preview-wrap');
  const removeBtn = document.getElementById('q-input-image-remove');
  const filenameEl = document.getElementById('q-input-image-filename');
  const fileInput = document.getElementById('q-input-image');

  if (fileInput) fileInput.value = "";
  if (previewWrap) previewWrap.style.display = 'none';
  if (removeBtn) removeBtn.style.display = 'none';
  if (filenameEl) filenameEl.textContent = "No image attached";
}

export function triggerQuestionImageClick() {
  const fileInput = document.getElementById('q-input-image');
  if (fileInput) fileInput.click();
}

