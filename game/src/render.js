// Ember Court — the table's face: turns game state into DOM, animates the
// deal and the snap of a played card, and shows the title, win and loss
// screens. All card art is drawn here from the card data (CSS + SVG glyphs).

import { CARD_BY_ID, ELEMENTS, LANES } from './cards.js';
import { allLaneTotals, effectiveCost, effectivePower, laneWinner } from './powers.js';
import { sfx } from './audio.js';

const GLYPH_SVG = {
  ember: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23ff7a3c\' d=\'M12 2c1 4-4 6-4 11a4.5 4.5 0 0 0 9 0c0-2-1-3.5-2-5-.5 1.5-1.5 2-2.5 2C13 8 12.5 5 12 2z\'/%3E%3C/svg%3E',
  tide: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%235aa9ff\' d=\'M12 2c4 5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 3-7 7-12z\'/%3E%3C/svg%3E',
  gale: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%236fe39a\' d=\'M4 10a6 6 0 0 1 11-3 4 4 0 0 1 5 4 4 4 0 0 1-4 4H6a4 4 0 0 1-2-7z\'/%3E%3Cpath fill=\'%23237a44\' d=\'M3 18h13M6 21h9\' stroke=\'%23237a44\' stroke-width=\'2\' stroke-linecap=\'round\'/%3E%3C/svg%3E',
};

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Build one card face. `power` is the live table power when the card sits
// in a lane, otherwise the card's printed power.
export function cardElement(state, inst, opts = {}) {
  const def = CARD_BY_ID[inst.cardId];
  const card = el('div', `card el-${def.element}`);
  card.dataset.uid = String(inst.uid);
  card.dataset.cardId = def.id;

  const cost = el('div', 'cost', String(opts.cost ?? def.cost));
  const power = el('div', 'power', String(opts.power ?? def.power));
  const glyph = el('span', 'card-glyph lane-glyph');
  glyph.dataset.glyph = def.element;
  glyph.style.backgroundImage = `url("${GLYPH_SVG[def.element]}")`;
  const name = el('div', 'card-name', def.name);
  const effect = el('div', 'card-effect', def.effectText);
  const element = el('div', 'card-element', ELEMENTS[def.element].name);

  card.append(cost, glyph, name, effect, element, power);
  return card;
}

export function renderAll(state, ui) {
  renderStats(state);
  renderRivalHand(state);
  renderLanes(state);
  renderPlayerHand(state, ui);
  renderLog(state);
  renderIntent(state, ui);
}

function renderStats(state) {
  document.getElementById('you-hp').textContent = String(state.you.hp);
  document.getElementById('you-mana').textContent = String(state.you.mana);
  document.getElementById('you-deck').textContent = String(state.you.deck.length);
  document.getElementById('rival-hp').textContent = String(state.foe.hp);
  document.getElementById('rival-mana').textContent = String(state.foe.mana);
  document.getElementById('rival-deck').textContent = String(state.foe.deck.length);
  const endBtn = document.getElementById('end-turn');
  endBtn.disabled = state.phase !== 'playing';
}

function renderRivalHand(state) {
  const box = document.getElementById('rival-hand');
  box.replaceChildren();
  for (const inst of state.foe.hand) {
    const back = el('div', 'mini-card');
    back.title = 'A rival card, face down';
    box.append(back);
  }
}

function renderLanes(state) {
  const totals = allLaneTotals(state);
  for (const lane of LANES) {
    document.getElementById(`lane-you-${lane}`).textContent = String(totals[lane].you);
    document.getElementById(`lane-foe-${lane}`).textContent = String(totals[lane].foe);

    const laneBox = document.querySelector(`.lane[data-lane="${lane}"]`);
    const winner = state.lastResults[lane];
    laneBox.classList.toggle('won-you', winner === 'you');
    laneBox.classList.toggle('won-foe', winner === 'foe');

    const youBox = document.getElementById(`lane-you-cards-${lane}`);
    const foeBox = document.getElementById(`lane-foe-cards-${lane}`);
    youBox.replaceChildren();
    foeBox.replaceChildren();
    for (const inst of state.lanes[lane].you) {
      youBox.append(cardElement(state, inst, {
        power: effectivePower(state, 'you', lane, inst),
      }));
    }
    for (const inst of state.lanes[lane].foe) {
      const face = cardElement(state, inst, {
        power: effectivePower(state, 'foe', lane, inst),
      });
      face.classList.add('foe-card');
      foeBox.append(face);
    }
  }
}

function renderPlayerHand(state, ui) {
  const box = document.getElementById('player-hand');
  box.replaceChildren();
  state.you.hand.forEach((inst, index) => {
    const def = CARD_BY_ID[inst.cardId];
    const face = cardElement(state, inst, { cost: effectiveCost(state, 'you', inst) });
    face.classList.add('dealt');
    face.style.animationDelay = `${index * 0.06}s`;
    if (ui.selectedUid === inst.uid) face.classList.add('selected');
    if (effectiveCost(state, 'you', inst) > state.you.mana) face.classList.add('unaffordable');
    face.title = `${def.name} — ${index + 1} to select`;
    face.addEventListener('click', () => ui.onCardClick(inst.uid));
    box.append(face);
  });
}

function renderLog(state) {
  const log = document.getElementById('duel-log');
  const last = state.log[state.log.length - 1] || '';
  log.textContent = last;
}

function renderIntent(state, ui) {
  const intent = document.getElementById('rival-intent');
  intent.textContent = ui.intentText || '';
}

// ---- overlays ----

export function showTitle() {
  document.getElementById('title-screen').classList.remove('hidden');
  document.getElementById('end-screen').classList.add('hidden');
}

export function hideTitle() {
  document.getElementById('title-screen').classList.add('hidden');
}

export function showEnd(state) {
  const screen = document.getElementById('end-screen');
  const title = document.getElementById('end-title');
  const text = document.getElementById('end-text');
  const score = document.getElementById('end-score');
  const won = state.winner === 'you';
  screen.classList.remove('hidden');
  screen.classList.toggle('win', won);
  screen.classList.toggle('loss', !won);
  if (won) {
    title.textContent = 'VICTORY';
    text.textContent = 'The Ember Court prevails — Duchess Vex bows to your wits.';
    sfx.victory();
    burstConfetti();
  } else {
    title.textContent = 'DEFEAT';
    text.textContent = 'Duchess Vex takes the court this time. Demand a rematch.';
    sfx.defeat();
  }
  score.textContent = `Final influence — You ${state.you.hp} · Duchess Vex ${state.foe.hp} · ${state.turnsPlayed} rounds played`;
}

export function hideEnd() {
  document.getElementById('end-screen').classList.add('hidden');
}

// Win flourish: a burst of ember confetti across the table.
export function burstConfetti() {
  const box = document.getElementById('confetti');
  box.replaceChildren();
  const colours = ['#d9a441', '#e4572e', '#3fae6a', '#2e86e4', '#f0c96a'];
  for (let i = 0; i < 90; i += 1) {
    const piece = el('div', 'confetto');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colours[i % colours.length];
    piece.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    box.append(piece);
  }
  window.setTimeout(() => box.replaceChildren(), 4200);
}

export function shakeTable() {
  const table = document.getElementById('table');
  table.classList.remove('shake');
  void table.offsetWidth;
  table.classList.add('shake');
}
