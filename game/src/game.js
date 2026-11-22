// Ember Court — the duel itself: state, turns, playing cards, lane
// resolution and victory. The rules in short:
//  * both courts start at 20 influence, with 5 cards and 3 embers;
//  * each turn you gain +1 ember (up to 10) and draw a card;
//  * play any cards you can afford into the Ember, Tide or Gale lane;
//  * end the turn: the rival plays, then every lane is judged — the
//    stronger side wins its lane and deals the difference as damage;
//  * cards leave the table; the first court at 0 influence loses.

import { CARD_BY_ID, LANES } from './cards.js';
import { drawCards, newDeck } from './deck.js';
import { mulberry32 } from './rng.js';
import { effectiveCost, laneTotals, otherSide } from './powers.js';
import { chooseAiPlays } from './ai.js';

export const START_HP = 20;
export const START_HAND = 5;
export const START_MANA = 3;
export const MAX_MANA = 10;
export const MAX_HAND = 7;

export function createGame(seed) {
  const rand = mulberry32(seed);
  const state = {
    seed,
    rand,
    turn: 1,
    phase: 'title',
    winner: null,
    turnsPlayed: 0,
    you: { hp: START_HP, mana: START_MANA, maxMana: START_MANA, deck: [], hand: [], playedThisTurn: 0 },
    foe: { hp: START_HP, mana: START_MANA, maxMana: START_MANA, deck: [], hand: [], playedThisTurn: 0 },
    lanes: {
      ember: { you: [], foe: [] },
      tide: { you: [], foe: [] },
      gale: { you: [], foe: [] },
    },
    lastResults: { ember: null, tide: null, gale: null },
    log: [],
  };
  // Decks exist from the start, so the title screen already shows full decks.
  state.you.deck = newDeck(rand);
  state.foe.deck = newDeck(rand);
  return state;
}

export function startDuel(state) {
  drawCards(state.you.deck, state.you.hand, START_HAND);
  drawCards(state.foe.deck, state.foe.hand, START_HAND);
  state.phase = 'playing';
  state.turn = 1;
  addLog(state, 'The duel begins. Play your cards, then end the turn.');
  return state;
}

export function addLog(state, text) {
  state.log.push(text);
  if (state.log.length > 6) state.log.shift();
}

// Can this side afford and play this card into this lane right now?
export function canPlay(state, side, uid, lane) {
  if (state.phase !== 'playing' && side === 'you') return false;
  if (state.phase === 'over') return false;
  const hand = state[side].hand;
  const inst = hand.find((c) => c.uid === uid);
  if (!inst) return false;
  if (!LANES.includes(lane)) return false;
  return effectiveCost(state, side, inst) <= state[side].mana;
}

// Play a card from hand into a lane, paying its cost and firing its
// on-play effect. Returns the played instance, or null when illegal.
export function playCard(state, side, uid, lane) {
  if (!canPlay(state, side, uid, lane)) return null;
  const hand = state[side].hand;
  const index = hand.findIndex((c) => c.uid === uid);
  const inst = hand[index];
  const def = CARD_BY_ID[inst.cardId];
  const cost = effectiveCost(state, side, inst);
  hand.splice(index, 1);
  state[side].mana -= cost;
  state[side].playedThisTurn += 1;
  state.lanes[lane][side].push(inst);

  const who = side === 'you' ? 'You' : 'Duchess Vex';
  addLog(state, `${who} played ${def.name} into the ${lane} lane.`);

  // On-play effects.
  if (def.effect === 'draw') {
    drawCards(state[side].deck, state[side].hand, 1);
    addLog(state, `${who} draws a card.`);
  } else if (def.effect === 'heal') {
    state[side].hp = Math.min(START_HP, state[side].hp + 2);
    addLog(state, `${who} restores 2 influence.`);
  } else if (def.effect === 'verdict') {
    damageCourt(state, otherSide(side), 1);
    addLog(state, `Verdict! The ${otherSide(side) === 'you' ? 'Ember' : 'rival'} court loses 1 influence.`);
  } else if (def.effect === 'siphon') {
    const foes = state.lanes[lane][otherSide(side)];
    if (foes.length > 0) {
      let strongest = foes[0];
      for (const f of foes) {
        if ((CARD_BY_ID[f.cardId].power + (f.powerMod || 0)) > (CARD_BY_ID[strongest.cardId].power + (strongest.powerMod || 0))) strongest = f;
      }
      strongest.powerMod = (strongest.powerMod || 0) - 1;
      addLog(state, `${who}'s Sky Duelist steals 1 power from ${CARD_BY_ID[strongest.cardId].name}.`);
    }
  }
  return inst;
}

export function damageCourt(state, side, amount) {
  state[side].hp = Math.max(0, state[side].hp - amount);
  // The first court to reach 0 decides the duel; later damage in the same
  // resolution must not overwrite the winner.
  if (state[side].hp === 0 && state.phase !== 'over') {
    state.phase = 'over';
    state.winner = otherSide(side);
  }
}

// The player ends the turn: the rival plays, then the lanes are judged.
export function endTurn(state) {
  if (state.phase !== 'playing') return false;
  state.phase = 'ai';
  const plays = chooseAiPlays(state);
  for (const move of plays) {
    playCard(state, 'foe', move.uid, move.lane);
  }
  addLog(state, plays.length === 0
    ? 'Duchess Vex holds her cards this round.'
    : `Duchess Vex plays ${plays.length} card${plays.length > 1 ? 's' : ''}.`);
  resolveLanes(state);
  if (state.phase === 'over') return true;
  beginTurn(state, 'you');
  beginTurn(state, 'foe');
  state.turn += 1;
  state.turnsPlayed += 1;
  state.phase = 'playing';
  return true;
}

function beginTurn(state, side) {
  const s = state[side];
  s.maxMana = Math.min(MAX_MANA, s.maxMana + 1);
  s.mana = s.maxMana;
  s.playedThisTurn = 0;
  if (s.hand.length < MAX_HAND) drawCards(s.deck, s.hand, 1);
}

// Judge every lane: the stronger side wins and deals the difference as
// damage; ties deal nothing. Cards leave the table (Ash Phoenix returns
// to its owner's hand when its lane is lost).
export function resolveLanes(state) {
  const results = {};
  for (const lane of LANES) {
    // The duel ends the moment a court falls; later lanes are not judged.
    if (state.phase === 'over') break;
    const totals = laneTotals(state, lane);
    const youCards = state.lanes[lane].you;
    const foeCards = state.lanes[lane].foe;
    let winner = 'tie';
    if (totals.you > totals.foe) winner = 'you';
    else if (totals.foe > totals.you) winner = 'foe';
    results[lane] = winner;

    if (winner === 'you') {
      damageCourt(state, 'foe', totals.you - totals.foe);
      addLog(state, `You win the ${lane} lane ${totals.you}–${totals.foe}, dealing ${totals.you - totals.foe} damage.`);
    } else if (winner === 'foe') {
      damageCourt(state, 'you', totals.foe - totals.you);
      addLog(state, `Duchess Vex wins ${lane} ${totals.foe}–${totals.you}, dealing ${totals.foe - totals.you} damage.`);
    } else {
      addLog(state, `The ${lane} lane stands even at ${totals.you}–${totals.you}.`);
    }

    clearLaneSide(state, 'you', lane, winner);
    clearLaneSide(state, 'foe', lane, winner);
  }
  state.lastResults = results;
}

function clearLaneSide(state, side, lane, winner) {
  const cards = state.lanes[lane][side];
  for (const inst of cards) {
    const def = CARD_BY_ID[inst.cardId];
    if (def.effect === 'rebirth' && winner !== side && winner !== 'tie') {
      if (state[side].hand.length < MAX_HAND) state[side].hand.push(inst);
    }
  }
  state.lanes[lane][side] = [];
}
