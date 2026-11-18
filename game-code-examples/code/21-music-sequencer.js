// Game Code Example 21: Background music from a step sequencer
// WHAT: A looping 16-step tune (bass, melody, hi-hat) made from code. Click a cell to
//       toggle a note. Space starts and stops the music.
// WHY:  Timing music with setTimeout drifts. The reliable way is a "lookahead
//       scheduler": every frame, book the notes of the next 0.1 seconds on the AUDIO
//       clock (audio.context.currentTime), which never stutters.
// TRY:  Change TEMPO, or the scale: [0, 3, 5, 7, 10] is a minor pentatonic.

import { createGame } from "kindling/game.js";
import { createAudio } from "kindling/audio/audio.js";
import { fillRect, text } from "kindling/2d/draw.js";

const TEMPO = 112;                                   // beats per minute
const STEP_SECONDS = 60 / TEMPO / 4;                 // 16th notes
const SCALE = [0, 2, 4, 7, 9];                       // major pentatonic: hard to sound bad
const ROWS = 6;                                      // 5 melody notes + hi-hat
const game = createGame({ width: 320, height: 180, background: "#141821", actions: { toggle: ["Space"] } });
const audio = createAudio();
const grid = Array.from({ length: ROWS }, () => new Array(16).fill(false));
[[0, 0], [2, 3], [4, 6], [3, 8], [1, 10], [2, 12], [0, 14]].forEach(([row, step]) => { grid[row][step] = true; });
for (let step = 2; step < 16; step += 4) grid[5][step] = true;
let playing = false, nextStepTime = 0, step = 0, shownStep = -1;

// Book one note at an exact time on the audio clock.
function note(frequency, time, length, type, volume) {
  const context = audio.context;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  oscillator.connect(gain).connect(audio.master);
  oscillator.start(time);
  oscillator.stop(time + length + 0.02);
}

function midiToFrequency(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

function scheduleStep(index, time) {
  if (index % 4 === 0) note(midiToFrequency(index % 8 === 0 ? 45 : 43), time, 0.25, "triangle", 0.25);  // bass
  for (let row = 0; row < 5; row++) {
    if (grid[row][index]) note(midiToFrequency(69 + SCALE[4 - row]), time, 0.18, "square", 0.08);
  }
  if (grid[5][index]) note(9000, time, 0.03, "square", 0.03);                                           // tick
}

game.scenes.add("music", {
  update(game) {
    if (game.actions.wasPressed("toggle")) { playing = !playing; nextStepTime = audio.context.currentTime + 0.05; }
    const click = game.input.mouse.wasPressed(0) ? game.input.mouse.position : game.input.touch.wasTapped();
    if (click) {
      const column = Math.floor((click.x - 16) / 18), row = Math.floor((click.y - 40) / 20);
      if (column >= 0 && column < 16 && row >= 0 && row < ROWS) grid[row][column] = !grid[row][column];
      else { playing = !playing; nextStepTime = audio.context.currentTime + 0.05; }
    }
    // The lookahead: schedule everything due in the next 0.1 s.
    while (playing && nextStepTime < audio.context.currentTime + 0.1) {
      scheduleStep(step, nextStepTime);
      shownStep = step;
      step = (step + 1) % 16;
      nextStepTime += STEP_SECONDS;
    }
  },
  render(game, context) {
    for (let row = 0; row < ROWS; row++) {
      for (let column = 0; column < 16; column++) {
        const on = grid[row][column];
        const color = on ? (row === 5 ? "#5ac8fa" : "#ff9f43") : column === shownStep && playing ? "#2f3a4f" : "#1d2430";
        fillRect(context, 16 + column * 18, 40 + row * 20, 16, 18, color);
      }
    }
    text(context, playing ? "playing · Space to stop" : "Space (or click outside the grid) to play", 16, 16, { color: "#9aa4b6" });
  },
});

game.start("music");
