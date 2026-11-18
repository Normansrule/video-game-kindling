# Module: audio

**Files:** [`engine/audio/audio.js`](../../engine/audio/audio.js), [`engine/audio/sfx.js`](../../engine/audio/sfx.js) · **Visualization:** [13 sound effects](https://normansrule.github.io/video-game-kindling/viz/13-sound/) · **Lesson:** [2D-6 Juice](../../lessons/2d-6-juice.html)

Sound through the **Web Audio API**: play sound files, loop music, and make retro sound effects from code with no files at all.

## The autoplay rule

Browsers refuse to play sound until the player has clicked, tapped or pressed a key on the page. `createAudio()` waits for that first input and then "unlocks" the sound automatically. Show a title screen that says "press Space to start" and you will never notice the rule.

## Sound effects from code

```js
import { createAudio } from "kindling/audio/audio.js";
import { playSfx, playTone } from "kindling/audio/sfx.js";

const audio = createAudio();
playSfx(audio, "coin");                 // a preset, with a little random pitch each time
playTone(audio, { type: "square", frequency: 220, frequencyEnd: 660, duration: 0.15, volume: 0.2 });
```

A **tone** is a wave (`square`, `sawtooth`, `triangle`, `sine`, or `noise`) whose pitch slides from `frequency` to `frequencyEnd` in hertz, with a quick volume rise (`attack`) and a fade over `duration` seconds. Presets: `jump`, `coin`, `hit`, `explosion`, `laser`, `powerup`, `select`, `bounce`, `lose`. Design your own in the [sound visualization](https://normansrule.github.io/video-game-kindling/viz/13-sound/), which prints the line of code for you.

`playSfx(audio, name, pitchVariation)` varies the pitch by ±5% by default so repeated sounds do not feel robotic.

## Sound files and music

```js
await audio.load("theme", "./music/theme.ogg");
await audio.load("door", "./sounds/door.wav");
audio.play("door", { volume: 0.8, pitch: 1.1 });
audio.playMusic("theme", 0.5, 1);      // volume 0.5, fade in over 1 second; one track at a time
audio.stopMusic(1);
audio.setVolume(0.7);  audio.toggleMute();  audio.isMuted();
```

| Member | Notes |
|---|---|
| `context`, `master` | The Web Audio context and the master volume node, if you want to build your own effects. |
| `load(name, url)` | Fetch and decode a file. Returns a promise. |
| `play(name, { volume, pitch, loop })` | Returns `{ stop() }`. Does nothing (and does not crash) if the sound is not loaded. |
| `playMusic(name, volume, fadeSeconds)`, `stopMusic(fadeSeconds)` | One looping track at a time. |
| `setVolume`, `toggleMute`, `isMuted`, `isLoaded(name)` | Give players a mute key (M is traditional). |

## Gotchas

- **Prefer `.ogg` or `.mp3`** for music (small) and `.wav` for very short effects.
- **Free sounds:** [jsfxr](https://sfxr.me/) makes retro effects in the browser; check each asset's license before a jam (see [RESOURCES.md](../RESOURCES.md)).

## Go further

- MDN (Mozilla Developer Network), [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) and [Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
