import {
  current,
  updateCurrent,
  participants,
  loadParticipantsFromStorage,
  saveParticipants,
  quizTimer,
  updateQuizTimer,
  quizTimeLeft,
  updateQuizTimeLeft,
  quizTotalTime,
  updateQuizTotalTime,
  currentQIndex,
  updateCurrentQIndex,
  currentQuestionSet,
  updateCurrentQuestionSet,
  currentLevelKey,
  updateCurrentLevelKey,
  l34Timer,
  updateL34Timer,
  l34SecondsLeft,
  updateL34SecondsLeft,
  l4SelectedQuestions,
  updateL4SelectedQuestions,
  l4QIndex,
  updateL4QIndex,
  isRoundConcluded
} from './state.js';
import {
  getQuestions,
  l4MaxTotal
} from './questions.js';
import { getLevelTimerSeconds } from './config.js';
import { goTo, showLevelIntro, escapeHtml, showCustomConfirm } from './ui.js';
import { stopAntiCheat } from './cheating.js';

// ==========================================
// UTILITIES
// ==========================================
export function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function normalizeAnswer(str) {
  return String(str ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

// Normalizes any raw "score out of max" pair to a mark out of 10
export function toOutOf10(score, max) {
  const s = typeof score === 'number' ? score : 0;
  const m = typeof max === 'number' ? max : 0;
  if (!m) return "0";
  const v = (s / m) * 10;
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// ==========================================
// LEVEL 4 AUTO-GRADING
// ==========================================
const L4_STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "it", "this", "that",
  "with", "as", "for", "by", "or", "and", "of", "to", "in", "on", "at", "who", "what",
  "will", "did", "not", "only", "exactly", "each", "one", "two", "three", "four"
]);

function l4NormalizeText(str) {
  return String(str ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function l4KeyTokens(key) {
  const seen = new Set();
  l4NormalizeText(key).split(" ").forEach(tok => {
    if (tok && !L4_STOPWORDS.has(tok)) seen.add(tok);
  });
  return Array.from(seen);
}

export function scoreL4Answer(answer, answerKey, maxMarks) {
  const max = maxMarks || 10;
  const keyTokens = l4KeyTokens(answerKey);
  if (keyTokens.length === 0) return 0;
  const answerTokens = new Set(l4NormalizeText(answer).split(" "));
  let matched = 0;
  keyTokens.forEach(tok => {
    if (answerTokens.has(tok)) matched += 1;
  });
  const ratio = matched / keyTokens.length;
  return Math.round(ratio * max * 2) / 2; // nearest 0.5
}

// ==========================================
// MCQ / TEXT QUIZ FLOW (L1 & L2)
// ==========================================
export function startMCQLevel(levelKey, questionSet, secondsPerQ) {
  updateCurrentLevelKey(levelKey);
  updateCurrentQuestionSet(questionSet);
  updateCurrentQIndex(0);
  goTo('screen-quiz');
  renderMCQQuestion(secondsPerQ);
}

export function renderMCQQuestion(secondsPerQ) {
  const q = currentQuestionSet[currentQIndex];
  
  // Set up screen-specific Back button target: back to the level intro screen
  const backBtn = document.querySelector('#screen-quiz .back-btn');
  if (backBtn) {
    backBtn.onclick = async () => {
      const confirmed = await showCustomConfirm("Are you sure you want to go back? Your current progress on this level will be reset.", "Exit Level Quiz");
      if (confirmed) {
        clearInterval(quizTimer);
        showLevelIntro(currentLevelKey === 'l1' ? 1 : 2);
      }
    };
  }

  document.getElementById('quiz-progress').textContent =
    `QUESTION ${currentQIndex + 1} / ${currentQuestionSet.length}`;
  document.getElementById('quiz-emoji').textContent = q.emoji || "";
  document.getElementById('quiz-question').textContent = q.question || "";

  const imgContainer = document.getElementById('quiz-image-container');
  const imgEl = document.getElementById('quiz-image');
  if (imgContainer && imgEl) {
    if (q.image) {
      imgEl.src = q.image;
      imgContainer.style.display = 'block';
    } else {
      imgEl.src = "";
      imgContainer.style.display = 'none';
    }
  }

  const optsEl = document.getElementById('quiz-options');
  const typeWrap = document.getElementById('quiz-type-wrap');

  if (currentLevelKey === 'l2') {
    optsEl.style.display = 'none';
    optsEl.innerHTML = "";
    typeWrap.style.display = 'flex';
    const typeInput = document.getElementById('quiz-type-input');
    const typeFeedback = document.getElementById('quiz-type-feedback');
    typeInput.value = "";
    typeInput.className = 'type-input';
    typeInput.disabled = false;
    typeFeedback.textContent = "";
    typeFeedback.className = 'type-feedback';
    setTimeout(() => typeInput.focus(), 30);
    startCircleTimer(secondsPerQ, () => submitTypedAnswer(true));
  } else {
    typeWrap.style.display = 'none';
    optsEl.style.display = 'grid';
    optsEl.innerHTML = "";
    const shuffledOptions = shuffleArray(q.options);
    const correctIdx = shuffledOptions.indexOf(q.answer);
    shuffledOptions.forEach((opt, idx) => {
      const b = document.createElement('button');
      b.className = 'opt-btn';
      b.textContent = opt;
      b.onclick = () => selectMCQAnswer(idx, correctIdx);
      optsEl.appendChild(b);
    });
    startCircleTimer(secondsPerQ, () => selectMCQAnswer(-1, correctIdx));
  }
}

export function submitTypedAnswer(timedOut) {
  clearInterval(quizTimer);
  const q = currentQuestionSet[currentQIndex];
  const typeInput = document.getElementById('quiz-type-input');
  const typeFeedback = document.getElementById('quiz-type-feedback');
  if (typeInput.disabled) return;
  const typed = typeInput.value;
  typeInput.disabled = true;

  const isCorrect = !timedOut && normalizeAnswer(typed) === normalizeAnswer(q.answer);
  typeInput.classList.add('selected-choice');
  if (isCorrect) {
    if (currentLevelKey === 'l1') current.l1Score += 1;
    if (currentLevelKey === 'l2') current.l2Score += 1;
  }

  // Record student answer
  const ansKey = currentLevelKey === 'l1' ? 'l1Answers' : 'l2Answers';
  if (!current[ansKey]) current[ansKey] = [];
  current[ansKey][currentQIndex] = {
    question: q.question,
    emoji: q.emoji || "",
    userAnswer: timedOut ? "(Timed Out)" : (typed.trim() || "(No Answer)"),
    correctAnswer: q.answer,
    isCorrect: isCorrect,
    explanation: q.explanation || ""
  };

  saveParticipants();
  setTimeout(advanceMCQ, 600);
}

export function selectMCQAnswer(chosenIdx, correctIdx) {
  clearInterval(quizTimer);
  const q = currentQuestionSet[currentQIndex];
  const buttons = document.querySelectorAll('#quiz-options .opt-btn');
  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === chosenIdx) b.classList.add('selected-choice');
  });
  const isCorrect = chosenIdx === correctIdx;
  if (isCorrect) {
    if (currentLevelKey === 'l1') current.l1Score += 1;
    if (currentLevelKey === 'l2') current.l2Score += 1;
  }

  // Record student answer
  const ansKey = currentLevelKey === 'l1' ? 'l1Answers' : 'l2Answers';
  if (!current[ansKey]) current[ansKey] = [];
  const chosenText = chosenIdx >= 0 && buttons[chosenIdx] ? buttons[chosenIdx].textContent : "(Timed Out)";
  current[ansKey][currentQIndex] = {
    question: q.question,
    emoji: q.emoji || "",
    userAnswer: chosenText,
    correctAnswer: q.answer,
    isCorrect: isCorrect,
    explanation: q.explanation || ""
  };

  saveParticipants();
  setTimeout(advanceMCQ, chosenIdx === -1 ? 500 : 550);
}

function advanceMCQ() {
  updateCurrentQIndex(currentQIndex + 1);
  if (currentQIndex >= currentQuestionSet.length) {
    if (currentLevelKey === 'l1') {
      current.stage = Math.max(current.stage || 0, 1);
      current.status = "pending-cutoff";
      saveParticipants();
      showWaitingScreen(1);
    } else if (currentLevelKey === 'l2') {
      current.stage = Math.max(current.stage || 0, 2);
      current.status = "pending-cutoff";
      saveParticipants();
      showWaitingScreen(2);
    }
    return;
  }
  const secondsPerQ = currentLevelKey === 'l1' ? 25 : 30;
  renderMCQQuestion(secondsPerQ);
}

// ==========================================
// LEVEL CUTOFFS
// ==========================================
export function computeLevelRanking(levelNum, list, mode = 'percent', cutoffVal = 50) {
  const scoreKey = { 1: 'l1Score', 2: 'l2Score', 3: 'l3Score' }[levelNum];
  const pool = (list || participants).filter(p => p.status !== 'disqualified' && (p.stage || 0) >= levelNum);
  const rows = pool.map(p => ({ p, score: typeof p[scoreKey] === 'number' ? p[scoreKey] : 0 }))
    .sort((a, b) => b.score - a.score);
  
  let numQualify = 0;
  if (rows.length) {
    if (mode === 'count') {
      numQualify = Math.max(1, Math.min(rows.length, Number(cutoffVal) || 1));
    } else {
      const pct = Math.max(1, Math.min(100, Number(cutoffVal) || 50));
      numQualify = Math.max(1, Math.ceil(rows.length * (pct / 100)));
    }
  }

  const cutoffScore = rows.length ? rows[numQualify - 1].score : null;
  const qualifiedIds = new Set(rows.slice(0, numQualify).map(r => r.p.id));
  return { rows, numQualify, cutoffScore, qualifiedIds };
}

export function checkLevelQualification(levelNum) {
  if (!isRoundConcluded(levelNum)) {
    return false;
  }
  
  const list = loadParticipantsFromStorage();
  const freshSelf = list.find(p => p && current && p.id === current.id);
  if (freshSelf) {
    current.status = freshSelf.status;
    current.eliminatedReason = freshSelf.eliminatedReason;
    current.eliminatedAtLevel = freshSelf.eliminatedAtLevel;
  }

  if (current && current.status !== 'not-selected' && current.status !== 'disqualified') {
    current.status = 'in-progress';
    saveParticipants();
    return true;
  }

  if (current) {
    const scoreKey = { 1: 'l1Score', 2: 'l2Score', 3: 'l3Score' }[levelNum];
    const maxKey = { 1: 'l1Max', 2: 'l2Max', 3: 'l3Max' }[levelNum];
    document.getElementById('ns-reason').textContent =
      current.eliminatedReason || `You scored ${toOutOf10(current[scoreKey], current[maxKey])}/10 in Level ${levelNum} — that wasn't in the top half of the field this round, so your run ends here. Thanks for competing!`;

    const nsWrap = document.getElementById('ns-explanations-wrap');
    const nsList = document.getElementById('ns-explanations-list');
    if (nsWrap && nsList) {
      const levelKey = `l${levelNum}`;
      const levelQuestions = getQuestions(levelKey) || [];
      const studentAnswers = (current && current[`${levelKey}Answers`]) || [];
      if (levelQuestions.length > 0) {
        nsWrap.style.display = 'block';
        nsList.innerHTML = levelQuestions.map((q, idx) => {
          const studentRec = studentAnswers[idx] || {};
          let qTitle = `${q.emoji || ''} ${escapeHtml(q.question || q.title || '')}`;
          let qAnswer = escapeHtml(q.answer || q.answerKey || '');
          let userAnswerHtml = escapeHtml(studentRec.userAnswer || "Submitted");
          const explanationText = q.explanation ? escapeHtml(q.explanation) : "No explanation provided.";
          return `
            <div style="background: rgba(22, 29, 51, 0.75); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 10px; padding: 12px 14px; font-size: 0.88rem; margin-bottom: 8px;">
              <div style="font-weight: 700; color: var(--text); margin-bottom: 4px; font-family: var(--font-display);">${qTitle}</div>
              <div style="margin-bottom: 4px; font-size: 0.82rem; background: rgba(255,255,255,0.04); padding: 5px 8px; border-radius: 6px;">
                <span style="color: var(--text-dim);">Your Answer:</span> ${userAnswerHtml}
              </div>
              <div style="color: var(--cyan); font-family: var(--font-mono); font-size: 0.8rem; margin-bottom: 4px;">
                <b>Official Correct Answer:</b> <br>${qAnswer}
              </div>
              <div style="color: var(--text-dim); font-size: 0.8rem; line-height: 1.45; border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 6px; margin-top: 4px;">
                <b style="color: var(--amber);">💡 Explanation / Rationale:</b> ${explanationText}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }
  
  goTo('screen-not-selected');
  return false;
}

export function showWaitingScreen(levelNum) {
  const scoreKey = { 1: 'l1Score', 2: 'l2Score', 3: 'l3Score' }[levelNum];
  const maxKey = { 1: 'l1Max', 2: 'l2Max', 3: 'l3Max' }[levelNum];
  
  const score = current[scoreKey];
  const max = current[maxKey] || 10;
  
  document.getElementById('wait-score-display').textContent = `${toOutOf10(score, max)} / 10`;
  document.getElementById('wait-level-tag').textContent = `Waiting for Level ${levelNum} results...`;
  
  const lNames = { 1: "Level 1 (Emoji Decode)", 2: "Level 2 (Riddles)", 3: "Level 3 (Code Challenge)" };
  document.getElementById('wait-title').textContent = `${lNames[levelNum]} Completed!`;
  document.getElementById('wait-message').textContent = `You have completed this round successfully. The event coordinator will evaluate submissions and lock the cutoff shortly. Press the check button below to verify your standing once announced.`;
  document.getElementById('wait-error-msg').textContent = "";

  const refreshBtn = document.getElementById('wait-refresh-btn');
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      document.getElementById('wait-error-msg').textContent = "";
      if (!isRoundConcluded(levelNum)) {
        document.getElementById('wait-error-msg').textContent = "This round has not been concluded yet. Please wait for the coordinator.";
        return;
      }
      if (checkLevelQualification(levelNum)) {
        showLevelIntro(levelNum + 1);
      }
    };
  }

  // Render Answer Explanations & Student Review
  const wrap = document.getElementById('waiting-explanations-wrap');
  const listEl = document.getElementById('waiting-explanations-list');
  if (wrap && listEl) {
    const levelKey = `l${levelNum}`;
    const levelQuestions = getQuestions(levelKey) || [];
    const studentAnswers = (current && current[`${levelKey}Answers`]) || [];

    if (levelQuestions.length > 0) {
      wrap.style.display = 'block';
      listEl.innerHTML = levelQuestions.map((q, idx) => {
        const studentRec = studentAnswers[idx] || {};
        let qTitle = "";
        let qAnswer = "";
        let userAnswerHtml = "";

        if (levelKey === 'l1') {
          qTitle = `${q.emoji || ''} ${escapeHtml(q.question)}`;
          qAnswer = escapeHtml(q.answer);
          const uAns = studentRec.userAnswer;
          if (uAns) {
            const isOk = studentRec.isCorrect;
            userAnswerHtml = `<span style="color: ${isOk ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${escapeHtml(uAns)}</span> ${isOk ? '<span class="badge ok" style="padding:2px 6px; font-size:10px; margin-left:6px;">✅ Correct</span>' : '<span class="badge elim" style="padding:2px 6px; font-size:10px; margin-left:6px;">❌ Incorrect</span>'}`;
          } else {
            userAnswerHtml = `<span style="color: var(--text-dim); font-style: italic;">Submitted</span>`;
          }
        } else if (levelKey === 'l2') {
          qTitle = `Riddle ${idx + 1}: ${escapeHtml(q.question)}`;
          qAnswer = escapeHtml(q.answer);
          const uAns = studentRec.userAnswer;
          if (uAns) {
            const isOk = studentRec.isCorrect;
            userAnswerHtml = `<span style="color: ${isOk ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${escapeHtml(uAns)}</span> ${isOk ? '<span class="badge ok" style="padding:2px 6px; font-size:10px; margin-left:6px;">✅ Correct</span>' : '<span class="badge elim" style="padding:2px 6px; font-size:10px; margin-left:6px;">❌ Incorrect</span>'}`;
          } else {
            userAnswerHtml = `<span style="color: var(--text-dim); font-style: italic;">Submitted</span>`;
          }
        } else if (levelKey === 'l3') {
          qTitle = `Code Challenge ${idx + 1}`;
          qAnswer = q.tasks ? q.tasks.map(t => `${escapeHtml(t.label)}: <b>${escapeHtml(t.answer)}</b>`).join('<br>') : "";
          if (studentRec.userAnswers) {
            userAnswerHtml = studentRec.userAnswers.map(t => `${escapeHtml(t.label)}: <b>${escapeHtml(t.userAnswer)}</b>`).join('<br>');
          } else {
            userAnswerHtml = `<span style="color: var(--text-dim); font-style: italic;">Submitted</span>`;
          }
        } else if (levelKey === 'l4') {
          qTitle = escapeHtml(q.title);
          qAnswer = escapeHtml(q.answerKey);
          userAnswerHtml = escapeHtml(studentRec.answer || "Submitted");
        }

        const explanationText = q.explanation ? escapeHtml(q.explanation) : "No explanation provided.";

        return `
          <div style="background: rgba(22, 29, 51, 0.75); border: 1px solid rgba(94, 234, 212, 0.25); border-radius: 10px; padding: 14px 16px; font-size: 0.88rem; margin-bottom: 8px;">
            <div style="font-weight: 700; color: var(--text); margin-bottom: 6px; font-family: var(--font-display);">${qTitle}</div>
            <div style="margin-bottom: 6px; font-size: 0.82rem; background: rgba(255,255,255,0.04); padding: 6px 10px; border-radius: 6px;">
              <span style="color: var(--text-dim);">Your Answer:</span> ${userAnswerHtml}
            </div>
            <div style="color: var(--cyan); font-family: var(--font-mono); font-size: 0.8rem; margin-bottom: 6px;">
              <b>Official Correct Answer:</b> <br>${qAnswer}
            </div>
            <div style="color: var(--text-dim); font-size: 0.8rem; line-height: 1.45; border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 8px; margin-top: 6px;">
              <b style="color: var(--amber);">💡 Explanation / Rationale:</b> ${explanationText}
            </div>
          </div>
        `;
      }).join('');
    } else {
      wrap.style.display = 'none';
    }
  }

  goTo('screen-waiting');
}

// Circle Countdown Timer helper
function startCircleTimer(seconds, onExpire) {
  updateQuizTotalTime(seconds);
  updateQuizTimeLeft(seconds);
  const circle = document.getElementById('timer-circle');
  const numEl = document.getElementById('timer-num');
  if (!circle || !numEl) return;
  const R = 24, C = 2 * Math.PI * R;
  circle.style.strokeDasharray = C;
  
  function updateCircle() {
    const frac = Math.max(quizTimeLeft, 0) / quizTotalTime;
    circle.style.strokeDashoffset = C * (1 - frac);
    circle.style.stroke = quizTimeLeft <= 5 ? 'var(--danger)' : (quizTimeLeft <= quizTotalTime * 0.4 ? 'var(--amber)' : 'var(--cyan)');
    numEl.textContent = Math.max(quizTimeLeft, 0);
  }

  updateCircle();
  clearInterval(quizTimer);
  const timer = setInterval(() => {
    updateQuizTimeLeft(quizTimeLeft - 1);
    updateCircle();
    if (quizTimeLeft <= 0) {
      clearInterval(timer);
      onExpire();
    }
  }, 1000);
  updateQuizTimer(timer);
}

// ==========================================
// LEVEL 3 — CODE CHALLENGE (3 selected, 4 mins each)
// ==========================================
let l3Selections = {};
let l3Submitting = false;

export function startLevel3() {
  updateL4SelectedQuestions(shuffleArray(getQuestions('l3')).slice(0, 3));
  updateL4QIndex(0);
  current.l3Score = 0;
  current.l3Max = l4SelectedQuestions.length * 10;
  saveParticipants();
  goTo('screen-level3');
  renderLevel3Question();
}

export function renderLevel3Question() {
  l3Submitting = false;
  l3Selections = {};
  const q = l4SelectedQuestions[l4QIndex];
  
  // Set up screen-specific Back button target: back to the level intro screen
  const backBtn = document.querySelector('#screen-level3 .back-btn');
  if (backBtn) {
    backBtn.onclick = async () => {
      const confirmed = await showCustomConfirm("Are you sure you want to go back? Your current progress on this level will be reset.", "Exit Level Quiz");
      if (confirmed) {
        clearInterval(l34Timer);
        showLevelIntro(3);
      }
    };
  }

  document.getElementById('l3-progress').textContent =
    `LEVEL 3 · QUESTION ${l4QIndex + 1} / ${l4SelectedQuestions.length}`;

  const imgContainer = document.getElementById('l3-image-container');
  const imgEl = document.getElementById('l3-image');
  if (imgContainer && imgEl) {
    if (q.image) {
      imgEl.src = q.image;
      imgContainer.style.display = 'block';
    } else {
      imgEl.src = "";
      imgContainer.style.display = 'none';
    }
  }

  const wrap = document.getElementById('l3-tasks');
  wrap.innerHTML = q.tasks.map((t, i) => `
    <div class="l3-task">
      <div class="task-label">${escapeHtml(t.label)}</div>
      <pre class="code-block">${escapeHtml(t.code)}</pre>
      ${t.options ? `
        <div class="l3-options" id="l3-options-${i}">
          ${t.options.map((opt, oi) => `<button type="button" class="opt-btn" id="l3-opt-${i}-${oi}">${escapeHtml(opt)}</button>`).join('')}
        </div>
      ` : `
        <textarea class="type-input" id="l3-answer-${i}" placeholder="Type your answer…"></textarea>
      `}
      <div class="type-feedback" id="l3-feedback-${i}"></div>
    </div>
  `).join('');

  // Setup click listeners for options if present
  q.tasks.forEach((t, i) => {
    if (t.options) {
      t.options.forEach((opt, oi) => {
        const btn = document.getElementById(`l3-opt-${i}-${oi}`);
        if (btn) {
          btn.onclick = () => selectL3Option(i, oi);
        }
      });
    }
  });

  startLevel3Timer(getLevelTimerSeconds(3));
}

export function selectL3Option(taskIndex, optionIndex) {
  if (l3Submitting) return;
  l3Selections[taskIndex] = optionIndex;
  const q = l4SelectedQuestions[l4QIndex];
  const t = q.tasks[taskIndex];
  t.options.forEach((opt, oi) => {
    const btn = document.getElementById(`l3-opt-${taskIndex}-${oi}`);
    if (btn) btn.classList.toggle('selected-choice', oi === optionIndex);
  });
}

export function submitLevel3Question() {
  if (l3Submitting) return;
  l3Submitting = true;
  clearInterval(l34Timer);
  const q = l4SelectedQuestions[l4QIndex];
  let correctCount = 0;
  q.tasks.forEach((t, i) => {
    const feedback = document.getElementById('l3-feedback-' + i);
    let correct;
    if (t.options) {
      const selectedIndex = l3Selections[i];
      const selectedValue = typeof selectedIndex === 'number' ? t.options[selectedIndex] : "";
      correct = normalizeAnswer(selectedValue) === normalizeAnswer(t.answer);
      t.options.forEach((opt, oi) => {
        const btn = document.getElementById(`l3-opt-${i}-${oi}`);
        if (btn) {
          btn.disabled = true;
          if (oi === selectedIndex) btn.classList.add('selected-choice');
        }
      });
    } else {
      const input = document.getElementById('l3-answer-' + i);
      const typed = input.value;
      input.disabled = true;
      correct = normalizeAnswer(typed) === normalizeAnswer(t.answer);
    }
    feedback.textContent = "Answer locked in";
    feedback.className = 'type-feedback';
    if (correct) correctCount += 1;
  });

  const questionMarks = Math.round((correctCount / q.tasks.length) * 10);
  current.l3Score += questionMarks;

  // Record student L3 answers
  if (!current.l3Answers) current.l3Answers = [];
  const taskAnswers = q.tasks.map((t, i) => {
    let userVal = "(No Answer)";
    if (t.options) {
      const selectedIndex = l3Selections[i];
      userVal = typeof selectedIndex === 'number' ? t.options[selectedIndex] : "(No Answer)";
    } else {
      const input = document.getElementById('l3-answer-' + i);
      userVal = input ? (input.value.trim() || "(No Answer)") : "(No Answer)";
    }
    return { label: t.label, userAnswer: userVal, correctAnswer: t.answer };
  });

  current.l3Answers[l4QIndex] = {
    title: `Code Challenge ${l4QIndex + 1}`,
    userAnswers: taskAnswers,
    marks: questionMarks,
    maxMarks: 10,
    explanation: q.explanation || ""
  };

  saveParticipants();
  setTimeout(advanceLevel3, 700);
}

function advanceLevel3() {
  updateL4QIndex(l4QIndex + 1);
  if (l4QIndex >= l4SelectedQuestions.length) {
    current.stage = Math.max(current.stage || 0, 3);
    current.status = "pending-cutoff";
    saveParticipants();
    showWaitingScreen(3);
    return;
  }
  renderLevel3Question();
}

function startLevel3Timer(totalSeconds) {
  updateL34SecondsLeft(totalSeconds);
  const circle = document.getElementById('l3-timer-circle');
  const numEl = document.getElementById('l3-timer-num');
  if (!circle || !numEl) return;
  const R = 24, C = 2 * Math.PI * R;
  circle.style.strokeDasharray = C;

  function updateL3Circle() {
    const frac = Math.max(l3SecondsLeft, 0) / totalSeconds;
    circle.style.strokeDashoffset = C * (1 - frac);
    circle.style.stroke = l3SecondsLeft <= 20 ? 'var(--danger)' : (frac < 0.4 ? 'var(--amber)' : 'var(--cyan)');
    const m = Math.floor(Math.max(l3SecondsLeft, 0) / 60);
    const s = Math.max(l3SecondsLeft, 0) % 60;
    numEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  updateL3Circle();
  clearInterval(l34Timer);
  const timer = setInterval(() => {
    updateL34SecondsLeft(l3SecondsLeft - 1);
    updateL3Circle();
    if (l3SecondsLeft <= 0) {
      clearInterval(timer);
      submitLevel3Question();
    }
  }, 1000);
  updateL3Timer(timer);
}

// ==========================================
// LEVEL 4 — FINAL PUZZLES (3 puzzles, 10 min each)
// ==========================================
export function startL34Level() {
  updateL4SelectedQuestions(shuffleArray(getQuestions('l4')));
  updateL4QIndex(0);
  goTo('screen-l34');
  renderL34Question();
}

export function renderL34Question() {
  const q = l4SelectedQuestions[l4QIndex] || { title: "Question", body: "No question configured." };
  
  // Set up screen-specific Back button target: back to the level intro screen
  const backBtn = document.querySelector('#screen-l34 .back-btn');
  if (backBtn) {
    backBtn.onclick = async () => {
      const confirmed = await showCustomConfirm("Are you sure you want to go back? Your current progress on this level will be reset.", "Exit Level Quiz");
      if (confirmed) {
        clearInterval(l34Timer);
        showLevelIntro(4);
      }
    };
  }

  document.getElementById('l34-progress').textContent =
    `LEVEL 4 · QUESTION ${l4QIndex + 1} / ${l4SelectedQuestions.length}`;
  document.getElementById('l34-qtitle').textContent = q.title;
  document.getElementById('l34-qbody').textContent = q.body;

  const imgContainer = document.getElementById('l34-image-container');
  const imgEl = document.getElementById('l34-image');
  if (imgContainer && imgEl) {
    if (q.image) {
      imgEl.src = q.image;
      imgContainer.style.display = 'block';
    } else {
      imgEl.src = "";
      imgContainer.style.display = 'none';
    }
  }

  document.getElementById('l34-answer').value = "";
  startL34Timer(getLevelTimerSeconds(4));
}

export function submitL34() {
  const answer = document.getElementById('l34-answer').value.trim();
  clearInterval(l34Timer);
  const q = l4SelectedQuestions[l4QIndex];
  const maxMarks = q.maxMarks || 10;
  const marks = scoreL4Answer(answer, q.answerKey, maxMarks);
  
  if (!current.l4Answers) current.l4Answers = [];
  current.l4Answers[l4QIndex] = {
    title: q.title,
    answer: answer,
    answerKey: q.answerKey,
    marks: marks,
    maxMarks: maxMarks,
    explanation: q.explanation || ""
  };
  current.l4Marks = current.l4Answers.reduce((sum, a) => sum + (typeof a.marks === 'number' ? a.marks : 0), 0);
  saveParticipants();
  
  updateL4QIndex(l4QIndex + 1);
  if (l4QIndex >= l4SelectedQuestions.length) {
    finishCompetition();
  } else {
    renderL34Question();
  }
}

function startL34Timer(totalSeconds) {
  updateL34SecondsLeft(totalSeconds);
  const circle = document.getElementById('l34-timer-circle');
  const numEl = document.getElementById('l34-timer-num');
  if (!circle || !numEl) return;
  const R = 24, C = 2 * Math.PI * R;
  circle.style.strokeDasharray = C;

  function updateL34Circle() {
    const frac = Math.max(l34SecondsLeft, 0) / totalSeconds;
    circle.style.strokeDashoffset = C * (1 - frac);
    circle.style.stroke = l34SecondsLeft <= 30 ? 'var(--danger)' : (frac < 0.4 ? 'var(--amber)' : 'var(--cyan)');
    const m = Math.floor(Math.max(l34SecondsLeft, 0) / 60);
    const s = Math.max(l34SecondsLeft, 0) % 60;
    numEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  updateL34Circle();
  clearInterval(l34Timer);
  const timer = setInterval(() => {
    updateL34SecondsLeft(l3SecondsLeft - 1);
    updateL34Circle();
    if (l3SecondsLeft <= 0) {
      clearInterval(timer);
      submitL34();
    }
  }, 1000);
  updateL3Timer(timer);
}

// ==========================================
// COMPLETION
// ==========================================
export function finishCompetition() {
  current.stage = 4;
  current.status = "completed";
  saveParticipants();
  stopAntiCheat();

  document.getElementById('complete-name').textContent = current.fullName;
  const grid = document.getElementById('complete-scores');
  grid.innerHTML = `
    <div class="score-chip"><div class="num">${toOutOf10(current.l1Score, current.l1Max)}/10</div><div class="lbl">Level 1</div></div>
    <div class="score-chip"><div class="num">${toOutOf10(current.l2Score, current.l2Max)}/10</div><div class="lbl">Level 2</div></div>
    <div class="score-chip"><div class="num">${toOutOf10(current.l3Score, current.l3Max)}/10</div><div class="lbl">Level 3</div></div>
    <div class="score-chip"><div class="num">${toOutOf10(current.l4Marks ?? 0, l4MaxTotal())}/10</div><div class="lbl">Level 4</div></div>
  `;

  // Render Full Explanations and Answers Review across all levels
  const compWrap = document.getElementById('complete-explanations-wrap');
  const compList = document.getElementById('complete-explanations-list');
  if (compWrap && compList) {
    compWrap.style.display = 'block';
    let html = "";

    [1, 2, 3, 4].forEach(lNum => {
      const lKey = `l${lNum}`;
      const questions = getQuestions(lKey) || [];
      const answers = current[`${lKey}Answers`] || [];
      if (!questions.length) return;

      html += `<div style="font-weight:700; color:var(--cyan); margin-top:8px; font-family:var(--font-display); font-size:0.9rem;">LEVEL ${lNum} REVIEW</div>`;

      questions.forEach((q, idx) => {
        const studentRec = answers[idx] || {};
        let qTitle = "";
        let qAnswer = "";
        let userAnswerHtml = "";

        if (lKey === 'l1') {
          qTitle = `${q.emoji} ${escapeHtml(q.question)}`;
          qAnswer = escapeHtml(q.answer);
          const uAns = studentRec.userAnswer || "(Not answered)";
          const isOk = studentRec.isCorrect;
          userAnswerHtml = `<span style="color: ${isOk ? 'var(--success)' : 'var(--danger)'}; font-weight:700;">${escapeHtml(uAns)}</span> ${isOk ? '<span class="badge ok" style="padding:2px 6px; font-size:10px; margin-left:6px;">✅ Correct</span>' : '<span class="badge elim" style="padding:2px 6px; font-size:10px; margin-left:6px;">❌ Incorrect</span>'}`;
        } else if (lKey === 'l2') {
          qTitle = `Riddle ${idx + 1}: ${escapeHtml(q.question)}`;
          qAnswer = escapeHtml(q.answer);
          const uAns = studentRec.userAnswer || "(Not answered)";
          const isOk = studentRec.isCorrect;
          userAnswerHtml = `<span style="color: ${isOk ? 'var(--success)' : 'var(--danger)'}; font-weight:700;">${escapeHtml(uAns)}</span> ${isOk ? '<span class="badge ok" style="padding:2px 6px; font-size:10px; margin-left:6px;">✅ Correct</span>' : '<span class="badge elim" style="padding:2px 6px; font-size:10px; margin-left:6px;">❌ Incorrect</span>'}`;
        } else if (lKey === 'l3') {
          qTitle = `Code Challenge ${idx + 1}`;
          qAnswer = q.tasks ? q.tasks.map(t => `${escapeHtml(t.label)}: <b>${escapeHtml(t.answer)}</b>`).join('<br>') : "";
          if (studentRec.userAnswers) {
            userAnswerHtml = studentRec.userAnswers.map(t => `${escapeHtml(t.label)}: <b>${escapeHtml(t.userAnswer)}</b>`).join('<br>');
          } else {
            userAnswerHtml = "(Submitted)";
          }
        } else if (lKey === 'l4') {
          qTitle = escapeHtml(q.title);
          qAnswer = escapeHtml(q.answerKey);
          userAnswerHtml = escapeHtml(studentRec.answer || "(Submitted)");
        }

        const explanationText = q.explanation ? escapeHtml(q.explanation) : "No explanation provided.";

        html += `
          <div style="background: rgba(22, 29, 51, 0.6); border: var(--glass-border); border-radius: 8px; padding: 12px 14px; font-size: 0.85rem; margin-bottom:6px;">
            <div style="font-weight: 700; color: var(--text); margin-bottom: 4px; font-family: var(--font-display);">${qTitle}</div>
            <div style="margin-bottom: 4px; font-size: 0.82rem; background: rgba(255,255,255,0.03); padding: 5px 8px; border-radius: 6px;">
              <span style="color: var(--text-dim);">Your Answer:</span> ${userAnswerHtml}
            </div>
            <div style="color: var(--cyan); font-family: var(--font-mono); font-size: 0.8rem; margin-bottom: 4px;">
              <b>Official Correct Answer:</b> <br>${qAnswer}
            </div>
            <div style="color: var(--text-dim); font-size: 0.8rem; line-height: 1.4; border-top: 1px dashed rgba(255,255,255,0.12); padding-top: 6px; margin-top: 4px;">
              <b style="color: var(--amber);">💡 Explanation / Rationale:</b> ${explanationText}
            </div>
          </div>
        `;
      });
    });

    compList.innerHTML = html;
  }

  goTo('screen-complete');
}

// ==========================================
// GRADING HELPERS
// ==========================================
export function computeGrade(p) {
  const autoMax = p.l1Max + p.l2Max + (p.l3Max || 0) + l4MaxTotal();
  const autoScore = p.l1Score + p.l2Score + (typeof p.l3Score === 'number' ? p.l3Score : 0) + (typeof p.l4Marks === 'number' ? p.l4Marks : 0);
  if (autoMax === 0) return "—";
  const pct = (autoScore / autoMax) * 100;
  if (pct >= 70) return "Expert";
  if (pct >= 40) return "Intermediate";
  return "Beginner";
}

export function computeTotal(p) {
  const l3 = typeof p.l3Score === 'number' ? p.l3Score : 0;
  const l4 = typeof p.l4Marks === 'number' ? p.l4Marks : 0;
  return p.l1Score + p.l2Score + l3 + l4;
}
