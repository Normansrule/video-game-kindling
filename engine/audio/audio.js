// engine/audio/audio.js
// WHAT: Play sound files and music with the Web Audio API: volume, pitch, looping,
//       a master volume and mute.
// WHY:  Browsers refuse to play sound until the player clicks or presses a key
//       ("autoplay policy"). This module waits for that first input, then unlocks.
//       Web Audio (not <audio> tags) lets many sounds overlap with no delay.
// DOC:  docs/modules/audio.md   API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

export function createAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  const master = context.createGain();     // every sound goes through this
  master.connect(context.destination);
  const buffers = new Map();               // name -> decoded sound
  let music = null;                        // { source, gain }
  let muted = false;
  let volume = 0.8;
  master.gain.value = volume;

  // Unlock on the first key, click or touch.
  function unlock() {
    if (context.state === "suspended") context.resume();
  }
  for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(eventName, unlock, { passive: true });
  }

  // Load a sound file (.wav, .ogg, .mp3) and remember it by name.
  async function load(name, url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not load sound " + url);
    const data = await response.arrayBuffer();
    buffers.set(name, await context.decodeAudioData(data));
  }

  // Play a loaded sound. options: volume (0..1), pitch (1 = normal, 2 = octave up), loop.
  // Returns { stop() } so you can cut it off.
  function play(name, options = {}) {
    const buffer = buffers.get(name);
    if (!buffer) {
      console.warn("Sound '" + name + "' is not loaded yet.");
      return { stop() {} };
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options.pitch || 1;
    source.loop = options.loop === true;
    const gain = context.createGain();
    gain.gain.value = options.volume === undefined ? 1 : options.volume;
    source.connect(gain);
    gain.connect(master);
    source.start();
    return {
      stop() {
        try {
          source.stop();
        } catch (error) {
          // Already stopped.
        }
      },
    };
  }

  // Play one looping music track at a time, fading in over `fadeSeconds`.
  function playMusic(name, musicVolume = 0.5, fadeSeconds = 1) {
    stopMusic(fadeSeconds);
    const buffer = buffers.get(name);
    if (!buffer) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(musicVolume, context.currentTime + fadeSeconds);
    source.connect(gain);
    gain.connect(master);
    source.start();
    music = { source, gain };
  }

  function stopMusic(fadeSeconds = 0.5) {
    if (!music) return;
    const ending = music;
    music = null;
    ending.gain.gain.setValueAtTime(ending.gain.gain.value, context.currentTime);
    ending.gain.gain.linearRampToValueAtTime(0, context.currentTime + fadeSeconds);
    ending.source.stop(context.currentTime + fadeSeconds);
  }

  function setVolume(value) {
    volume = value;
    if (!muted) master.gain.value = volume;
  }

  function toggleMute() {
    muted = !muted;
    master.gain.value = muted ? 0 : volume;
    return muted;
  }

  return {
    context,          // the raw AudioContext, for sfx.js and your own experiments
    master,           // the master gain node
    load,
    play,
    playMusic,
    stopMusic,
    setVolume,
    toggleMute,
    isMuted: () => muted,
    isLoaded: (name) => buffers.has(name),
  };
}
