// engine/audio/sfx.js
// WHAT: Make retro sound effects from code: jump, coin, hit, explosion, laser...
//       No sound files needed.
// WHY:  In a jam, sound is the first thing cut, and silent games feel broken.
//       A few oscillators with a pitch slide and a volume envelope sound like
//       classic 8-bit effects, and you can tweak them by ear.
// DOC:  docs/modules/audio.md
//
// Every sound is a "tone": a wave whose pitch slides from frequency to frequencyEnd,
// with a quick volume rise (attack) and fall (decay).

// audio: the object from createAudio() (we use its context and master volume).
// options:
//   type          "square" | "sawtooth" | "triangle" | "sine" | "noise"
//   frequency     start pitch in hertz (440 = the A above middle C)
//   frequencyEnd  end pitch (slides there over the duration)
//   duration      seconds
//   volume        0..1
//   attack        seconds to reach full volume (tiny = clicky, longer = soft)
export function playTone(audio, options) {
  const context = audio.context;
  const now = context.currentTime;
  const duration = options.duration || 0.15;
  const volume = options.volume === undefined ? 0.3 : options.volume;
  const attack = options.attack || 0.005;

  const gain = context.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  // Exponential fades sound natural, but can't reach exactly 0.
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  gain.connect(audio.master);

  let source;
  if (options.type === "noise") {
    source = context.createBufferSource();
    source.buffer = noiseBuffer(context, duration);
    // Pitch for noise = how fast we play it back, which changes its "color".
    source.playbackRate.setValueAtTime(Math.max(options.frequency / 440, 0.1), now);
    if (options.frequencyEnd) {
      source.playbackRate.linearRampToValueAtTime(Math.max(options.frequencyEnd / 440, 0.05), now + duration);
    }
  } else {
    source = context.createOscillator();
    source.type = options.type || "square";
    source.frequency.setValueAtTime(options.frequency || 440, now);
    if (options.frequencyEnd) {
      source.frequency.exponentialRampToValueAtTime(Math.max(options.frequencyEnd, 1), now + duration);
    }
  }
  source.connect(gain);
  source.start(now);
  source.stop(now + duration + 0.05);
}

// White noise: random samples. Cached per length so we only build it once.
const noiseCache = new Map();
function noiseBuffer(context, seconds) {
  const key = Math.ceil(seconds * 10);
  if (noiseCache.has(key)) return noiseCache.get(key);
  const length = Math.ceil(context.sampleRate * (key / 10));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
  noiseCache.set(key, buffer);
  return buffer;
}

// Ready-made sounds. Use: playSfx(audio, "coin"). Copy one and change numbers to taste.
export const sfxPresets = {
  jump: { type: "square", frequency: 220, frequencyEnd: 660, duration: 0.15, volume: 0.2 },
  coin: { type: "square", frequency: 988, frequencyEnd: 1319, duration: 0.12, volume: 0.2 },
  hit: { type: "noise", frequency: 600, frequencyEnd: 150, duration: 0.15, volume: 0.4 },
  explosion: { type: "noise", frequency: 300, frequencyEnd: 40, duration: 0.6, volume: 0.5 },
  laser: { type: "sawtooth", frequency: 1200, frequencyEnd: 200, duration: 0.18, volume: 0.15 },
  powerup: { type: "triangle", frequency: 300, frequencyEnd: 1200, duration: 0.4, volume: 0.3 },
  select: { type: "square", frequency: 660, duration: 0.06, volume: 0.15 },
  bounce: { type: "sine", frequency: 300, frequencyEnd: 500, duration: 0.08, volume: 0.3 },
  lose: { type: "triangle", frequency: 440, frequencyEnd: 110, duration: 0.7, volume: 0.3 },
};

// Play a preset by name, with a little random pitch so repeats don't sound robotic.
export function playSfx(audio, name, pitchVariation = 0.05) {
  const preset = sfxPresets[name];
  if (!preset) throw new Error("No sound effect called '" + name + "'");
  const wobble = 1 + (Math.random() * 2 - 1) * pitchVariation;
  playTone(audio, {
    ...preset,
    frequency: preset.frequency * wobble,
    frequencyEnd: preset.frequencyEnd ? preset.frequencyEnd * wobble : undefined,
  });
}
