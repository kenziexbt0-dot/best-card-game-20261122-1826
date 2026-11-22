// Ember Court — decks: build, shuffle and draw. A deck is a plain array of
// card ids; a hand holds card instances (each with a unique uid so two copies
// of one card stay distinct on the table).
import { buildDeckList } from './cards.js';
import { shuffle } from './rng.js';

let uidCounter = 1;

export function newDeck(rand) {
  return shuffle(buildDeckList(), rand);
}

export function makeCardInstance(cardId) {
  const inst = { uid: uidCounter, cardId };
  uidCounter += 1;
  return inst;
}

export function freshUid() {
  uidCounter += 1;
  return uidCounter;
}

// Draw up to `count` cards from the top of `deck` into `hand`.
export function drawCards(deck, hand, count) {
  const drawn = [];
  for (let i = 0; i < count && deck.length > 0; i += 1) {
    const inst = makeCardInstance(deck.pop());
    hand.push(inst);
    drawn.push(inst);
  }
  return drawn;
}
