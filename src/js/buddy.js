const BUDDY_HIDDEN_ON = new Set([
  'screen-welcome', 'screen-level-intro', 'screen-admin-login',
  'screen-complete', 'screen-disqualified', 'screen-not-selected'
]);

const BUDDY_QUIPS = [
  "Compiling your confidence…",
  "01001000 01101001 (that's 'hi')",
  "Running on caffeine.exe",
  "No bugs here, promise 🐞",
  "Beep boop, good luck!",
  "Neural nets say you got this.",
  "Loading motivation… 100%",
  "I'm just here for the vibes.",
  "Ctrl+Z won't save you now.",
  "Segmentation fault: none found."
];

export function updateBuddyVisibility(screenId) {
  const buddy = document.getElementById('buddy-mascot');
  if (!buddy) return;
  if (BUDDY_HIDDEN_ON.has(screenId)) {
    buddy.classList.remove('buddy-show');
  } else {
    buddy.classList.add('buddy-show');
  }
}

export function buddyPoke() {
  const buddy = document.getElementById('buddy-mascot');
  const bubble = document.getElementById('buddy-bubble');
  if (!buddy || !bubble) return;
  
  const quip = BUDDY_QUIPS[Math.floor(Math.random() * BUDDY_QUIPS.length)];
  bubble.textContent = quip;
  bubble.classList.add('show');
  buddy.classList.add('buddy-active');
  
  clearTimeout(buddy._hideTimer);
  buddy._hideTimer = setTimeout(() => {
    bubble.classList.remove('show');
    buddy.classList.remove('buddy-active');
  }, 2200);
}
