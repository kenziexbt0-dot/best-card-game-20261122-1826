// Ember Court — card catalogue. Every card is an original invention for this
// game: three courts (elements), each told apart by colour AND shape.
// A card's `effect` is an id that game.js interprets; `effectText` is shown
// on the card face. Costs are paid in embers; power is lane strength.

export const ELEMENTS = {
  ember: { name: 'Ember', colour: '#e4572e', glyph: 'ember' },
  tide: { name: 'Tide', colour: '#2e86e4', glyph: 'tide' },
  gale: { name: 'Gale', colour: '#3fae6a', glyph: 'gale' },
};

export const LANES = ['ember', 'tide', 'gale'];

// effect ids:
//  none       — plain power.
//  loneFlame  — +2 power while alone in its lane.
//  chorus     — +1 power for each other Tide card in its lane.
//  tempest    — rival cards in this lane lose 1 power each.
//  riposte    — +2 power while the rival has any card in this lane.
//  swift      — +1 power while its lane is empty on your side.
//  draw       — draw a card when played.
//  heal       — restore 2 influence when played.
//  verdict    — deal 1 damage to the rival court when played.
//  firstGust  — costs 0 when it is the first card you play this turn.
//  rebirth    — returns to your hand when its lane is lost.
//  siphon     — steal 1 power from the strongest rival card in its lane.
export const CARD_DEFS = [
  { id: 'cinder-imp', name: 'Cinder Imp', element: 'ember', cost: 1, power: 2, effect: 'none', effectText: 'A spark with ambition.' },
  { id: 'flame-herald', name: 'Flame Herald', element: 'ember', cost: 2, power: 3, effect: 'loneFlame', effectText: 'Lone Flame: +2 power if alone in its lane.' },
  { id: 'ember-knight', name: 'Ember Knight', element: 'ember', cost: 3, power: 5, effect: 'none', effectText: 'Oathbound to the first flame.' },
  { id: 'ash-phoenix', name: 'Ash Phoenix', element: 'ember', cost: 4, power: 6, effect: 'rebirth', effectText: 'Rebirth: returns to hand if its lane is lost.' },
  { id: 'mist-eel', name: 'Mist Eel', element: 'tide', cost: 2, power: 1, effect: 'draw', effectText: 'Slip: draw a card when played.' },
  { id: 'tidecaller', name: 'Tidecaller', element: 'tide', cost: 2, power: 2, effect: 'heal', effectText: 'Soothing Current: restore 2 influence.' },
  { id: 'deep-singer', name: 'Deep Singer', element: 'tide', cost: 3, power: 4, effect: 'chorus', effectText: 'Chorus: +1 power per other Tide card in its lane.' },
  { id: 'river-judge', name: 'River Judge', element: 'tide', cost: 4, power: 5, effect: 'verdict', effectText: 'Verdict: deal 1 damage to the rival.' },
  { id: 'wind-dancer', name: 'Wind Dancer', element: 'gale', cost: 1, power: 2, effect: 'firstGust', effectText: 'First Gust: free if played first this turn.' },
  { id: 'gale-falcon', name: 'Gale Falcon', element: 'gale', cost: 2, power: 3, effect: 'swift', effectText: 'Swift: +1 power if its lane is empty.' },
  { id: 'storm-crow', name: 'Storm Crow', element: 'gale', cost: 3, power: 4, effect: 'tempest', effectText: 'Tempest: rival cards here lose 1 power.' },
  { id: 'sky-duelist', name: 'Sky Duelist', element: 'gale', cost: 4, power: 5, effect: 'siphon', effectText: 'Riposte: steal 1 power from the strongest rival card here.' },
];

export const CARD_BY_ID = Object.fromEntries(CARD_DEFS.map((c) => [c.id, c]));

// A full deck: two copies of each of the twelve cards, 24 in all.
export function buildDeckList() {
  const list = [];
  for (const def of CARD_DEFS) list.push(def.id, def.id);
  return list;
}
