// viz/13-sound/main.js
// WHAT: Design a retro sound effect with sliders and see it: the pitch slide on top,
//       the volume envelope below, and the real wave as it plays (an oscilloscope).

import { createAudio } from "kindling/audio/audio.js";
import { playTone, sfxPresets } from "kindling/audio/sfx.js";
import { themeColors, setupCanvas, createRunner, createControls, label } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 300;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;
const readout = document.getElementById("readout");
const codeOutput = document.getElementById("sound-code");

const audio = createAudio();
// An analyser listens to everything going through the master volume and reports the wave.
const analyser = audio.context.createAnalyser();
analyser.fftSize = 1024;
audio.master.connect(analyser);
const wave = new Float32Array(analyser.fftSize);

const sound = { ...sfxPresets.jump, attack: 0.005 };
const inputs = {};

function play() {
  playTone(audio, sound);
}

// Pitch slides exponentially (equal steps sound equal to our ears); volume rises, then fades.
function pitchAt(t) {
  const end = sound.frequencyEnd || sound.frequency;
  return sound.frequency * Math.pow(end / sound.frequency, t / sound.duration);
}
function volumeAt(t) {
  if (t < sound.attack) return (t / sound.attack) * sound.volume;
  const fade = (t - sound.attack) / Math.max(sound.duration - sound.attack, 0.001);
  return sound.volume * Math.pow(0.0001 / sound.volume, Math.min(fade, 1));
}

function drawGraph(top, height, title, valueAt, maxValue, color, colors, unit) {
  const left = 60;
  const right = 340;
  context.strokeStyle = colors.border;
  context.strokeRect(left, top, right - left, height);
  label(context, title, left, top - 10, colors.text, 13);
  label(context, Math.round(maxValue) + unit, left - 6, top + 6, colors.muted, 11, "right");
  label(context, "0", left - 6, top + height - 4, colors.muted, 11, "right");
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * sound.duration;
    const x = left + (i / 100) * (right - left);
    const y = top + height - (valueAt(t) / maxValue) * height;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
  context.lineWidth = 1;
}

function draw() {
  const colors = themeColors();
  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  drawGraph(30, 100, "Pitch over " + sound.duration + " s", pitchAt, 2000, colors.accent, colors, " Hz");
  drawGraph(170, 100, "Volume (envelope)", volumeAt, 1, colors.accent2, colors, "");
  // Oscilloscope: the actual samples going to your speakers right now.
  analyser.getFloatTimeDomainData(wave);
  const left = 380;
  const right = WIDTH - 12;
  context.strokeStyle = colors.border;
  context.strokeRect(left, 30, right - left, 240);
  label(context, "The wave as it plays", left, 20, colors.text, 13);
  context.strokeStyle = colors.good;
  context.beginPath();
  for (let i = 0; i < wave.length; i++) {
    const x = left + (i / (wave.length - 1)) * (right - left);
    const y = 150 - wave[i] * 110;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
  if (audio.context.state !== "running") label(context, "Press Play to start sound", (left + right) / 2, 120, colors.muted, 13, "center");
}

function showCode() {
  const parts = ['type: "' + sound.type + '"', "frequency: " + sound.frequency];
  if (sound.frequencyEnd) parts.push("frequencyEnd: " + sound.frequencyEnd);
  parts.push("duration: " + sound.duration, "volume: " + sound.volume, "attack: " + sound.attack);
  codeOutput.textContent = "playTone(audio, { " + parts.join(", ") + " });";
  readout.textContent = sound.type + " wave, " + sound.frequency + " Hz to " + (sound.frequencyEnd || sound.frequency) + " Hz, " + Math.round(sound.duration * 1000) + " ms";
}

createRunner(draw);
const controls = createControls(document.getElementById("controls"));
controls.addButtons([{ label: "Play", primary: true, onClick: play }]);
controls.addSelect("Start from preset ", Object.keys(sfxPresets), "jump", (name) => {
  Object.assign(sound, { frequencyEnd: undefined, attack: 0.005 }, sfxPresets[name]);
  for (const key of Object.keys(inputs)) {
    inputs[key].value = sound[key] === undefined ? sound.frequency : sound[key];
    inputs[key].dispatchEvent(new Event("input"));
  }
  if (inputs.type) inputs.type.value = sound.type;
  showCode();
});
inputs.type = controls.addSelect("Wave ", ["square", "sawtooth", "triangle", "sine", "noise"], sound.type, (type) => { sound.type = type; showCode(); });
inputs.frequency = controls.addSlider({ label: "Start pitch", min: 40, max: 2000, step: 10, value: sound.frequency, unit: " Hz", onChange(v) { sound.frequency = v; showCode(); } });
inputs.frequencyEnd = controls.addSlider({ label: "End pitch", min: 40, max: 2000, step: 10, value: sound.frequencyEnd, unit: " Hz", onChange(v) { sound.frequencyEnd = v; showCode(); } });
inputs.duration = controls.addSlider({ label: "Duration", min: 0.03, max: 1, step: 0.01, value: sound.duration, unit: " s", onChange(v) { sound.duration = v; showCode(); } });
inputs.volume = controls.addSlider({ label: "Volume", min: 0.05, max: 0.6, step: 0.05, value: sound.volume, onChange(v) { sound.volume = v; showCode(); } });
inputs.attack = controls.addSlider({ label: "Attack", min: 0.001, max: 0.2, step: 0.001, value: sound.attack, unit: " s", onChange(v) { sound.attack = v; showCode(); } });
showCode();
