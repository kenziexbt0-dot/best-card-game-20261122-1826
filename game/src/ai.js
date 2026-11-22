// Ember Court — Duchess Vex, the rival. She scores every card she could
// play into every lane with the same power maths the table uses, then plays
// the best moves while they are worth it. Her thinking is readable: she
// eyes the lane she most wants before she commits, so her choices can be
// anticipated and countered.

import { CARD_BY_ID, LANES } from './cards.js';
import { effectiveCost, effectivePower, laneTotals } from './powers.js';

// Score one possible move (card instance, lane) for the rival.
// Positive means the move helps her; higher is better.
export function scoreMove(state, inst, lane) {
  const def = CARD_BY_ID[inst.cardId];
  const before = laneTotals(state, lane);
  const marginBefore = before.foe - before.you;

  // Simulate the card landing: pretend it is already on the table.
  state.lanes[lane].foe.push(inst);
  const after = laneTotals(state, lane);
  state.lanes[lane].foe.pop();
  const marginAfter = after.foe - after.you;

  // Damage she would deal if the round ended now, minus what she takes.
  const damageBefore = Math.max(0, marginBefore);
  const damageAfter = Math.max(0, marginAfter);
  const takenBefore = Math.max(0, -marginBefore);
  const takenAfter = Math.max(0, -marginAfter);
  let score = (damageAfter - damageBefore) * 2 + (takenBefore - takenAfter) * 2;

  // Flipping a lane she loses into one she wins is worth extra.
  if (marginBefore < 0 && marginAfter >= 0) score += 3;
  if (marginBefore <= 0 && marginAfter > 0) score += 2;

  // Winning by a landslide wastes power; prefer the cheapest win.
  if (marginAfter > 4) score -= (marginAfter - 4) * 0.5;

  // Card effects she values: drawing, healing when hurt, direct damage.
  if (def.effect === 'draw') score += 1.5;
  if (def.effect === 'heal' && state.foe.hp <= 12) score += 2.5;
  if (def.effect === 'verdict') score += 1.5;
  if (def.effect === 'rebirth') score += 1;
  if (def.effect === 'siphon' && before.you > 0) score += 1.5;
  if (def.effect === 'tempest' && before.you > 0) score += 1.5;

  // A cheap card spent on a lost cause is a waste.
  score -= effectiveCost(state, 'foe', inst) * 0.25;

  // Resonance: she likes doubling an element in a lane she holds.
  const sameElement = state.lanes[lane].foe.filter(
    (c) => CARD_BY_ID[c.cardId].element === def.element,
  ).length;
  if (sameElement >= 1) score += 0.75;

  return score;
}

// The lane she most wants, for the telegraph line. Purely informational.
export function favouredLane(state) {
  let best = null;
  let bestScore = 0;
  for (const inst of state.foe.hand) {
    for (const lane of LANES) {
      if (effectiveCost(state, 'foe', inst) > state.foe.mana) continue;
      const s = scoreMove(state, inst, lane);
      if (s > bestScore) {
        bestScore = s;
        best = lane;
      }
    }
  }
  return best;
}

// Choose her plays for the turn: repeat the best affordable move while it
// is clearly worth playing. She never spends her last ember on a dud.
export function chooseAiPlays(state) {
  const plays = [];
  const simulatedMana = { value: state.foe.mana };
  const simulatedHand = state.foe.hand.slice();

  while (plays.length < 3) {
    let best = null;
    let bestScore = 1.2;
    for (const inst of simulatedHand) {
      if (effectiveCost(state, 'foe', inst) > simulatedMana.value) continue;
      for (const lane of LANES) {
        const s = scoreMove(state, inst, lane);
        if (s > bestScore) {
          bestScore = s;
          best = { uid: inst.uid, lane, inst };
        }
      }
    }
    if (!best) break;
    // Apply the chosen move to the simulation so later scores see it,
    // including the played-this-turn count behind First Gust costs.
    const cost = effectiveCost(state, 'foe', best.inst);
    state.lanes[best.lane].foe.push(best.inst);
    state.foe.playedThisTurn += 1;
    simulatedMana.value -= cost;
    const idx = simulatedHand.indexOf(best.inst);
    simulatedHand.splice(idx, 1);
    plays.push({ uid: best.uid, lane: best.lane });
  }
  // Roll the simulation back: the real plays happen in game.js.
  state.foe.playedThisTurn -= plays.length;
  for (const move of plays) {
    const cards = state.lanes[move.lane].foe;
    const idx = cards.findIndex((c) => c.uid === move.uid);
    if (idx !== -1) cards.splice(idx, 1);
  }
  return plays;
}

// A power value the renderer shows on the rival's face-down hand is never
// needed; this helper only exists so tests can ask the AI what it thinks.
export function describeIntent(state) {
  const lane = favouredLane(state);
  if (!lane) return 'Duchess Vex studies the table, holding her cards close.';
  return `Duchess Vex eyes the ${lane} lane…`;
}

// Re-exported so other modules can ask for a card's table power.
export { effectivePower };
