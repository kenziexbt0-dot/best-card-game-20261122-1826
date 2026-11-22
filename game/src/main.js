// Ember Court — entrypoint. Wires the table together: mouse and keyboard
// input, the rival's telegraphed turn, the title and end screens, and the
// `?shot=` scenes the screenshots are taken from. Exposes a small debug
// handle (window.__emberCourt) so a headless play-test can drive the game.

import { createGame, endTurn, playCard, startDuel } from './game.js';
import { describeIntent, favouredLane } from './ai.js';
import { effectiveCost } from './powers.js';
import { hideEnd, hideTitle, renderAll, showEnd, showTitle, shakeTable } from './render.js';
import { sfx, toggleMuted } from './audio.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 20261123);

let state = createGame(seed);
const ui = {
  selectedUid: null,
  intentText: '',
  onCardClick(uid) {
    if (state.phase !== 'playing') return;
    if (ui.selectedUid === uid) {
      ui.selectedUid = null;
    } else {
      ui.selectedUid = uid;
      sfx.select();
    }
    renderAll(state, ui);
  },
};

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// End the turn with the rival's telegraph first: she eyes a lane, then
// plays, so her choices can be read before they land.
async function handleEndTurn() {
  if (state.phase !== 'playing') return;
  ui.selectedUid = null;
  const lane = favouredLane(state);
  ui.intentText = describeIntent(state);
  if (lane) {
    document.querySelector(`.lane[data-lane="${lane}"]`).classList.add('ai-eyes');
  }
  renderAll(state, ui);
  await sleep(750);
  if (lane) {
    document.querySelector(`.lane[data-lane="${lane}"]`).classList.remove('ai-eyes');
  }
  ui.intentText = '';
  const beforeYou = state.you.hp;
  const beforeFoe = state.foe.hp;
  endTurn(state);
  if (state.you.hp < beforeYou) {
    sfx.loseLane();
    shakeTable();
  } else if (state.foe.hp < beforeFoe) {
    sfx.winLane();
  }
  renderAll(state, ui);
  if (state.phase === 'over') showEnd(state);
}

function playSelectedInto(lane) {
  if (state.phase !== 'playing' || ui.selectedUid === null) return;
  const inst = state.you.hand.find((c) => c.uid === ui.selectedUid);
  if (!inst) {
    ui.selectedUid = null;
    return;
  }
  if (effectiveCost(state, 'you', inst) > state.you.mana) {
    ui.intentText = 'Not enough embers for that card.';
    renderAll(state, ui);
    return;
  }
  const played = playCard(state, 'you', inst.uid, lane);
  ui.selectedUid = null;
  ui.intentText = '';
  if (played) sfx.play();
  renderAll(state, ui);
}

function bindInput() {
  document.getElementById('end-turn').addEventListener('click', handleEndTurn);
  document.getElementById('start-button').addEventListener('click', () => {
    sfx.deal();
    hideTitle();
    startDuel(state);
    renderAll(state, ui);
  });
  document.getElementById('again-button').addEventListener('click', () => {
    state = createGame(Date.now() % 2147483647);
    ui.selectedUid = null;
    ui.intentText = '';
    hideEnd();
    showTitle();
    renderAll(state, ui);
  });
  document.getElementById('sound-toggle').addEventListener('click', (event) => {
    const muted = toggleMuted();
    event.currentTarget.classList.toggle('off', muted);
  });

  for (const laneBox of document.querySelectorAll('.lane')) {
    laneBox.addEventListener('click', () => playSelectedInto(laneBox.dataset.lane));
  }

  document.addEventListener('keydown', (event) => {
    if (state.phase === 'over') return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (document.getElementById('title-screen').classList.contains('hidden')) {
        handleEndTurn();
      } else {
        document.getElementById('start-button').click();
      }
      return;
    }
    if (event.key === 'Escape') {
      ui.selectedUid = null;
      renderAll(state, ui);
      return;
    }
    const num = Number(event.key);
    if (Number.isInteger(num) && num >= 1 && num <= 9) {
      if (ui.selectedUid !== null && num >= 1 && num <= 3) {
        playSelectedInto(['ember', 'tide', 'gale'][num - 1]);
      } else if (num >= 1 && num <= state.you.hand.length) {
        ui.onCardClick(state.you.hand[num - 1].uid);
      }
    }
  });
}

function boot() {
  bindInput();
  showTitle();
  if (shot) {
    state = applyShot(state, ui, shot);
  } else {
    renderAll(state, ui);
  }
  // Debug / play-test handle: the state and the same functions the UI calls.
  window.__emberCourt = {
    get state() { return state; },
    ui,
    startDuel: () => { hideTitle(); startDuel(state); renderAll(state, ui); },
    playCard: (uid, lane) => { const r = playCard(state, 'you', uid, lane); renderAll(state, ui); return r; },
    endTurn: () => { endTurn(state); renderAll(state, ui); if (state.phase === 'over') showEnd(state); },
    render: () => renderAll(state, ui),
  };
}

boot();
