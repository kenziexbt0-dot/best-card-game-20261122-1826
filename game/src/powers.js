// Ember Court — power and cost arithmetic. Kept apart from game.js so the
// AI can score a move with exactly the same maths the table uses.

import { CARD_BY_ID, LANES } from './cards.js';

export function otherSide(side) {
  return side === 'you' ? 'foe' : 'you';
}

// What a card costs right now. Wind Dancer's First Gust makes it free when
// it is the first card its owner plays this turn.
export function effectiveCost(state, side, inst) {
  const def = CARD_BY_ID[inst.cardId];
  if (def.effect === 'firstGust' && state[side].playedThisTurn === 0) return 0;
  return def.cost;
}

// Power of one card on the table, after every live modifier:
//  resonance — +1 power when another card of the same element shares the lane;
//  loneFlame — +2 while alone in its lane;
//  chorus — +1 per other Tide card in its lane;
//  swift — +1 while its own side of the lane is empty before it lands;
//  riposte — +2 while the rival holds any card in the lane;
//  tempest — rival cards in the lane lose 1 power each (applied below);
//  siphon — a stolen-power mark left on the card by Sky Duelist.
export function effectivePower(state, side, lane, inst) {
  const def = CARD_BY_ID[inst.cardId];
  const cards = state.lanes[lane][side];
  const foes = state.lanes[lane][otherSide(side)];
  let power = def.power + (inst.powerMod || 0);

  const sameElement = cards.filter((c) => CARD_BY_ID[c.cardId].element === def.element).length;
  if (sameElement >= 2) power += 1;

  if (def.effect === 'loneFlame' && cards.length === 1) power += 2;
  if (def.effect === 'chorus') {
    power += cards.filter((c) => c !== inst && CARD_BY_ID[c.cardId].element === 'tide').length;
  }
  if (def.effect === 'swift' && cards.length === 1) power += 1;
  if (def.effect === 'riposte' && foes.length > 0) power += 2;

  const foeHasTempest = foes.some((c) => CARD_BY_ID[c.cardId].effect === 'tempest');
  if (foeHasTempest) power -= 1;

  return Math.max(0, power);
}

// Total strength of one side of one lane.
export function laneSideTotal(state, side, lane) {
  return state.lanes[lane][side].reduce(
    (sum, inst) => sum + effectivePower(state, side, lane, inst),
    0,
  );
}

export function laneTotals(state, lane) {
  return {
    you: laneSideTotal(state, 'you', lane),
    foe: laneSideTotal(state, 'foe', lane),
  };
}

// Who wins a lane right now: 'you', 'foe' or 'tie'.
export function laneWinner(state, lane) {
  const t = laneTotals(state, lane);
  if (t.you === t.foe) return 'tie';
  return t.you > t.foe ? 'you' : 'foe';
}

export function allLaneTotals(state) {
  const out = {};
  for (const lane of LANES) out[lane] = laneTotals(state, lane);
  return out;
}
