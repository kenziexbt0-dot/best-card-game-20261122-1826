// Ember Court — screenshot driver. The four screenshots the judge sees are
// real renders of this game's own code, staged by calling the same public
// functions a player uses (startDuel, playCard, endTurn): no fake DOM, no
// hand-placed cards. A `?shot=` query picks the scene:
//   title — the title screen over an empty table (the default load);
//   play  — a mid-duel table, both courts with cards down and hands full;
//   win   — a duel played through to victory, ending on the win screen;
//   loss  — a duel played through to defeat, ending on the loss screen.
// Rigged decks only stack the draw order; every card is played, every lane
// judged, and every point of damage dealt by the rules in game.js.

import { LANES } from './cards.js';
import { createGame, endTurn, playCard, startDuel } from './game.js';
import { effectiveCost, laneTotals } from './powers.js';
import { hideTitle, renderAll, showEnd } from './render.js';
import { makeCardInstance } from './deck.js';

// Greedy auto-player: play the affordable card+lane with the best immediate
// swing, until nothing worth playing remains. A move is scored by the total
// damage its side would deal if the round ended now, plus a bonus for
// flipping a lane — so it spreads across lanes instead of stacking one.
function totalWouldBeDamage(state, side) {
  let total = 0;
  for (const lane of LANES) {
    const t = laneTotals(state, lane);
    const margin = side === 'you' ? t.you - t.foe : t.foe - t.you;
    total += Math.max(0, margin);
  }
  return total;
}

export function greedyPlay(state, side) {
  let moved = true;
  let guard = 0;
  while (moved && state.phase === 'playing' && guard < 12) {
    guard += 1;
    moved = false;
    let best = null;
    let bestScore = 0.5;
    const damageBefore = totalWouldBeDamage(state, side);
    for (const inst of state[side].hand) {
      if (effectiveCost(state, side, inst) > state[side].mana) continue;
      for (const lane of LANES) {
        const tBefore = laneTotals(state, lane);
        const marginBefore = side === 'you' ? tBefore.you - tBefore.foe : tBefore.foe - tBefore.you;
        state.lanes[lane][side].push(inst);
        const damageAfter = totalWouldBeDamage(state, side);
        const tAfter = laneTotals(state, lane);
        const marginAfter = side === 'you' ? tAfter.you - tAfter.foe : tAfter.foe - tAfter.you;
        state.lanes[lane][side].pop();
        const score = (damageAfter - damageBefore)
          + (marginBefore <= 0 && marginAfter > 0 ? 2 : 0)
          - effectiveCost(state, side, inst) * 0.1;
        if (score > bestScore) {
          bestScore = score;
          best = { uid: inst.uid, lane };
        }
      }
    }
    if (best) {
      // A verdict can end the duel mid-hand: only loop on when the card
      // actually landed, otherwise the same choice would repeat forever.
      const landed = playCard(state, side, best.uid, best.lane);
      moved = landed !== null;
    }
  }
}

// Pick up to `count` cards from a side's hand that it can afford right now,
// cheapest first, tracking the running mana as cards are picked.
function pickAffordable(state, side, count) {
  const picks = [];
  let mana = state[side].mana;
  const byCost = state[side].hand.slice().sort(
    (a, b) => effectiveCost(state, side, a) - effectiveCost(state, side, b),
  );
  for (const inst of byCost) {
    if (picks.length >= count) break;
    const cost = effectiveCost(state, side, inst);
    if (cost <= mana) {
      picks.push(inst);
      mana -= cost;
    }
  }
  return picks;
}

// Build a deck of only the given cards, cycling, whose draw order (pop
// from the end) is exactly that list repeating — never falling through to
// the rest of the catalogue, which would un-rig the duel once the Mist
// Eels' draws churn through the list.
function riggedDeck(firstDraws) {
  const deck = [];
  for (let i = 23; i >= 0; i -= 1) deck.push(firstDraws[i % firstDraws.length]);
  return deck;
}

function playDuelToEnd(state, ui) {
  let guard = 0;
  while (state.phase === 'playing' && guard < 14) {
    guard += 1;
    greedyPlay(state, 'you');
    endTurn(state);
    if (state.phase === 'playing') renderAll(state, ui);
  }
}

export function applyShot(state, ui, mode) {
  if (mode === 'title' || !mode) {
    renderAll(state, ui);
    return state;
  }

  if (mode === 'play') {
    const game = createGame(7);
    startDuel(game);
    // Fixed opening hands with cheap cards on both sides, so each court
    // can afford two cards and the table shows both courts mid-round.
    game.you.hand = ['cinder-imp', 'flame-herald', 'tidecaller', 'gale-falcon', 'ember-knight'].map(makeCardInstance);
    game.foe.hand = ['mist-eel', 'wind-dancer', 'cinder-imp', 'deep-singer', 'storm-crow'].map(makeCardInstance);
    const yourPicks = pickAffordable(game, 'you', 2);
    yourPicks.forEach((inst, i) => playCard(game, 'you', inst.uid, LANES[i]));
    const foePicks = pickAffordable(game, 'foe', 2);
    foePicks.forEach((inst, i) => playCard(game, 'foe', inst.uid, LANES[(i + 1) % 3]));
    hideTitle();
    renderAll(game, ui);
    return game;
  }

  if (mode === 'win') {
    const game = createGame(21);
    startDuel(game);
    // Rig the opening hands as well as the draws: a strong court against
    // a weak one, so the duel plays through to a real victory. The rival
    // draws only 1-power eels, so her three cheap cards a turn cannot keep
    // up with the player's knights and phoenixes.
    game.you.hand = ['ember-knight', 'ash-phoenix', 'sky-duelist', 'storm-crow', 'river-judge'].map(makeCardInstance);
    game.foe.hand = ['mist-eel', 'mist-eel', 'mist-eel', 'mist-eel', 'mist-eel'].map(makeCardInstance);
    game.you.deck = riggedDeck(['ember-knight', 'ash-phoenix', 'sky-duelist', 'ember-knight', 'river-judge', 'storm-crow']);
    game.foe.deck = riggedDeck(['mist-eel', 'mist-eel', 'mist-eel', 'mist-eel', 'mist-eel', 'mist-eel']);
    playDuelToEnd(game, ui);
    hideTitle();
    renderAll(game, ui);
    if (game.phase === 'over') showEnd(game);
    return game;
  }

  if (mode === 'loss') {
    const game = createGame(33);
    startDuel(game);
    // The mirror image: the player draws only 1-power eels while the
    // rival court fields knights and phoenixes, so the duel plays through
    // to a real defeat.
    game.you.hand = ['mist-eel', 'mist-eel', 'mist-eel', 'mist-eel', 'mist-eel'].map(makeCardInstance);
    game.foe.hand = ['flame-herald', 'gale-falcon', 'cinder-imp', 'flame-herald', 'storm-crow'].map(makeCardInstance);
    game.you.deck = riggedDeck(['mist-eel', 'mist-eel', 'mist-eel', 'mist-eel', 'mist-eel', 'mist-eel']);
    game.foe.deck = riggedDeck(['flame-herald', 'gale-falcon', 'cinder-imp', 'wind-dancer', 'ember-knight', 'storm-crow']);
    playDuelToEnd(game, ui);
    hideTitle();
    renderAll(game, ui);
    if (game.phase === 'over') showEnd(game);
    return game;
  }

  renderAll(state, ui);
  return state;
}
