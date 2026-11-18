// samples/2d/03-breakout/main.js
// WHAT: Breakout. Bounce the ball off your paddle to clear every brick. Three lives.
// WHY:  A ball (circle) against many boxes is the classic collision exercise:
//       find the brick, push the ball out, flip the right part of its velocity.
// TEACHES: circle vs box push-out, reflecting velocity, levels from text,
//          mouse + keyboard + touch control, tweens for juice.
// README: samples/2d/03-breakout/README.md

import { createGame } from "kindling/game.js";
import { circleRectPushOut } from "kindling/2d/collision.js";
import { fillRect, fillCircle, text, dim } from "kindling/2d/draw.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createCamera } from "kindling/2d/camera.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { easeOutBack } from "kindling/math/easing.js";
import { clamp } from "kindling/math/scalar.js";

const WIDTH = 240;
const HEIGHT = 320;               // portrait: plays well on phones
const PADDLE_WIDTH = 40;
const PADDLE_SPEED = 260;
const BALL_RADIUS = 3;
const BALL_SPEED = 170;
const BRICK_WIDTH = 20;
const BRICK_HEIGHT = 8;

// Levels as text: each character is a brick column; the digit is its hit points.
const LEVELS = [
  [
    "...........",
    "11111111111",
    "11111111111",
    "11111111111",
    "11111111111",
  ],
  [
    "2.2.2.2.2.2",
    ".1.1.1.1.1.",
    "22222222222",
    "1.1.1.1.1.1",
    "33333333333",
  ],
];
const BRICK_COLORS = { 1: "#6cb6ff", 2: "#ffb347", 3: "#ff6b6b" };

const game = createGame({
  width: WIDTH,
  height: HEIGHT,
  background: "#121420",
  actions: {
    left: ["ArrowLeft", "KeyA", "pad:Left", "pad:LeftX-"],
    right: ["ArrowRight", "KeyD", "pad:Right", "pad:LeftX+"],
    launch: ["Space", "Enter", "mouse:0", "pad:A"],
  },
});
const audio = createAudio();
const particles = createParticles(400);
const camera = createCamera({ width: WIDTH, height: HEIGHT, smoothing: 0 });

const paddle = { x: WIDTH / 2 - PADDLE_WIDTH / 2, y: HEIGHT - 24, width: PADDLE_WIDTH, height: 6 };
const ball = { x: 0, y: 0, radius: BALL_RADIUS, velocityX: 0, velocityY: 0, stuck: true };
let bricks = [];
let lives = 3;
let score = 0;
let levelIndex = 0;
let lastMouseX = null;

function buildLevel(index) {
  bricks = [];
  const rows = LEVELS[index];
  const left = (WIDTH - rows[0].length * BRICK_WIDTH) / 2;
  for (let row = 0; row < rows.length; row++) {
    for (let column = 0; column < rows[row].length; column++) {
      const character = rows[row][column];
      if (character === ".") continue;
      // scale starts at 0 and pops to 1 with a tween, so the level "builds in".
      const brick = { x: left + column * BRICK_WIDTH, y: 40 + row * BRICK_HEIGHT, width: BRICK_WIDTH - 1, height: BRICK_HEIGHT - 1, hits: Number(character), scale: 0 };
      bricks.push(brick);
      game.timers.after((row * 11 + column) * 0.01, () => game.tweens.to(brick, { scale: 1 }, 0.4, easeOutBack));
    }
  }
  ball.stuck = true;
}

function launchBall() {
  ball.stuck = false;
  ball.velocityX = BALL_SPEED * 0.5;
  ball.velocityY = -BALL_SPEED;
}

function update(game, stepSeconds) {
  // Paddle: keyboard/gamepad, or follow the mouse/finger if it moved.
  paddle.x += game.actions.axis("left", "right") * PADDLE_SPEED * stepSeconds;
  const pointerX = game.input.touch.isTouching() ? game.input.touch.touches()[0].x : game.input.mouse.position.x;
  if (game.input.touch.isTouching() || pointerX !== lastMouseX) {
    if (lastMouseX !== null || game.input.touch.isTouching()) paddle.x = pointerX - PADDLE_WIDTH / 2;
    lastMouseX = pointerX;
  }
  paddle.x = clamp(paddle.x, 0, WIDTH - PADDLE_WIDTH);

  particles.update(stepSeconds);
  camera.update(stepSeconds);

  if (ball.stuck) {
    ball.x = paddle.x + PADDLE_WIDTH / 2;
    ball.y = paddle.y - BALL_RADIUS - 1;
    if (game.actions.wasPressed("launch") || game.input.touch.wasTapped()) launchBall();
    return;
  }

  ball.x += ball.velocityX * stepSeconds;
  ball.y += ball.velocityY * stepSeconds;

  // Walls: flip the velocity that points into the wall.
  if (ball.x < BALL_RADIUS) { ball.x = BALL_RADIUS; ball.velocityX = Math.abs(ball.velocityX); }
  if (ball.x > WIDTH - BALL_RADIUS) { ball.x = WIDTH - BALL_RADIUS; ball.velocityX = -Math.abs(ball.velocityX); }
  if (ball.y < BALL_RADIUS) { ball.y = BALL_RADIUS; ball.velocityY = Math.abs(ball.velocityY); }

  // Paddle: angle depends on where it hit (like Pong).
  if (ball.velocityY > 0 && circleRectPushOut(ball, paddle)) {
    const hit = clamp((ball.x - (paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2), -1, 1);
    const angle = hit * 1.1;   // up to ~63 degrees
    ball.velocityX = Math.sin(angle) * BALL_SPEED;
    ball.velocityY = -Math.cos(angle) * BALL_SPEED;
    ball.y = paddle.y - BALL_RADIUS;
    playSfx(audio, "bounce");
  }

  // Bricks: push out, then flip x or y depending on which way we were pushed.
  for (const brick of bricks) {
    const push = circleRectPushOut(ball, brick);
    if (!push) continue;
    ball.x += push.x;
    ball.y += push.y;
    if (Math.abs(push.x) > Math.abs(push.y)) ball.velocityX = -ball.velocityX;
    else ball.velocityY = -ball.velocityY;
    brick.hits -= 1;
    score += 10;
    camera.shake(2, 0.1);
    if (brick.hits <= 0) {
      particles.emit({ ...presets.explosion, count: 12, x: brick.x + brick.width / 2, y: brick.y + brick.height / 2 });
      playSfx(audio, "hit");
    } else {
      playSfx(audio, "select");
    }
    break;   // one brick per step keeps the bounce predictable
  }
  bricks = bricks.filter((brick) => brick.hits > 0);

  // Lost the ball.
  if (ball.y > HEIGHT + 10) {
    lives -= 1;
    camera.shake(6, 0.4);
    playSfx(audio, "lose");
    if (lives <= 0) game.scenes.push("message", { title: "GAME OVER", next: "restart" });
    else ball.stuck = true;
  }

  // Cleared the level.
  if (bricks.length === 0) {
    playSfx(audio, "powerup");
    const last = levelIndex === LEVELS.length - 1;
    game.scenes.push("message", { title: last ? "YOU WIN!" : "LEVEL CLEAR", next: last ? "restart" : "nextLevel" });
  }
}

function render(game, context) {
  camera.begin(context);
  for (const brick of bricks) {
    const width = brick.width * brick.scale;
    const height = brick.height * brick.scale;
    fillRect(context, brick.x + (brick.width - width) / 2, brick.y + (brick.height - height) / 2, width, height, BRICK_COLORS[Math.min(brick.hits, 3)]);
  }
  fillRect(context, paddle.x, paddle.y, paddle.width, paddle.height, "#e8e8e8");
  fillCircle(context, ball.x, ball.y, BALL_RADIUS, "#ffffff");
  particles.render(context);
  camera.end(context);
  text(context, "SCORE " + score, 6, 6, { color: "#cccccc" });
  text(context, "LIVES " + lives, WIDTH - 6, 6, { align: "right", color: "#cccccc" });
  if (ball.stuck) text(context, "Space, click or tap to launch", WIDTH / 2, HEIGHT - 60, { align: "center", color: "#999999" });
}

game.scenes.add("play", {
  enter() {
    lives = 3;
    score = 0;
    levelIndex = 0;
    buildLevel(0);
  },
  update,
  render,
});

// A small overlay scene for "level clear", "game over" and "you win".
let message = { title: "", next: "restart" };
game.scenes.add("message", {
  enter(game, data) {
    message = data;
  },
  update(game) {
    if (game.actions.wasPressed("launch") || game.input.touch.wasTapped()) {
      game.scenes.pop();
      if (message.next === "nextLevel") {
        levelIndex += 1;
        buildLevel(levelIndex);
      } else {
        game.scenes.switchTo("play");
      }
    }
  },
  render(game, context) {
    dim(context, WIDTH, HEIGHT, 0.6);
    text(context, message.title, WIDTH / 2, 130, { size: 16, align: "center", bold: true, color: "#ffb347" });
    text(context, "Score " + score, WIDTH / 2, 155, { align: "center" });
    text(context, "Click, tap or Space", WIDTH / 2, 175, { align: "center", color: "#aaaaaa" });
  },
});

game.start("play");
