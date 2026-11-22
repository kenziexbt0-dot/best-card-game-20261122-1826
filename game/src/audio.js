// Ember Court — tiny synthesized sound effects. No audio files: every note
// is an oscillator through the Web Audio API, created on first use.

let audioCtx = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  muted = !muted;
  return muted;
}

function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, startAt, length, type, volume) {
  if (muted) return;
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ac.currentTime + startAt);
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + startAt + length);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + startAt);
  osc.stop(ac.currentTime + startAt + length + 0.05);
}

export const sfx = {
  deal() {
    tone(520, 0, 0.09, 'triangle', 0.12);
    tone(660, 0.07, 0.09, 'triangle', 0.1);
  },
  play() {
    tone(330, 0, 0.12, 'triangle', 0.16);
    tone(495, 0.06, 0.14, 'triangle', 0.14);
  },
  select() {
    tone(740, 0, 0.06, 'sine', 0.08);
  },
  winLane() {
    tone(523, 0, 0.12, 'triangle', 0.14);
    tone(784, 0.1, 0.18, 'triangle', 0.14);
  },
  loseLane() {
    tone(392, 0, 0.14, 'sine', 0.12);
    tone(262, 0.1, 0.2, 'sine', 0.12);
  },
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3, 'triangle', 0.16));
  },
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.15, 0.32, 'sine', 0.13));
  },
};
