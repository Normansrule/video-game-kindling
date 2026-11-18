// samples/2d/01-pong/main.js
// WHAT: Pong. Two paddles, one ball, first to 7 wins. You are the left paddle.
// WHY:  The smallest real game: a loop, input, movement, collision, score and
//       three scenes (title, play, game over). Everything else builds on this.
// TEACHES: createGame, scenes, actions, AABB collision, angles off a paddle,
//          screen shake, particles, sound effects made from code.
// README: samples/2d/01-pong/README.md

import { createGame } from "kindling/game.js";
import { rectsOverlap } from "kindling/2d/collision.js";
import { fillRect, fillCircle, text, dim } from "kindling/2d/draw.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createCamera } from "kindling/2d/camera.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { clamp } from "kindling/math/scalar.js";
import { createRandom } from "kindling/math/random.js";

// ---- Tuning: change these numbers first --------------------------------------
const WIDTH = 320;
const HEIGHT = 180;
const PADDLE_WIDTH = 4;
const PADDLE_HEIGHT = 28;
const PADDLE_SPEED = 160;        // pixels per second
const COMPUTER_SPEED = 110;      // slower than you, so you can win
const BALL_SIZE = 4;
const BALL_START_SPEED = 120;
const BALL_SPEED_UP = 1.06;      // multiply speed on every paddle hit
const MAX_BOUNCE_ANGLE = 1.0;    // radians (about 57 degrees) at the paddle's edge
const WINNING_SCORE = 7;

const game = createGame({
  width: WIDTH,
  height: HEIGHT,
  background: "#101218",
  actions: {
    up: ["ArrowUp", "KeyW", "pad:Up", "pad:LeftY-", "touch:up"],
    down: ["ArrowDown", "KeyS", "pad:Down", "pad:LeftY+", "touch:down"],
    start: ["Space", "Enter", "pad:A", "pad:Start", "mouse:0"],
  },
});
game.input.touch.addButton("up", 0, 0, 60, HEIGHT / 2, "▲");
game.input.touch.addButton("down", 0, HEIGHT / 2, 60, HEIGHT / 2, "▼");

const random = createRandom();
const particles = createParticles(300);
const camera = createCamera({ width: WIDTH, height: HEIGHT, smoothing: 0 });
// Sound starts "locked"; createAudio unlocks it on the first key press, click or tap.
const audio = createAudio();

function sound(name) {
  playSfx(audio, name);
}

// ---- The objects in the game --------------------------------------------------
const player = { x: 12, y: HEIGHT / 2 - PADDLE_HEIGHT / 2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, score: 0 };
const computer = { x: WIDTH - 12 - PADDLE_WIDTH, y: HEIGHT / 2 - PADDLE_HEIGHT / 2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, score: 0 };
const ball = { x: 0, y: 0, width: BALL_SIZE, height: BALL_SIZE, velocityX: 0, velocityY: 0 };
let serveDelay = 0;

// Put the ball in the middle and send it toward `direction` (-1 left, +1 right).
function serve(direction) {
  ball.x = WIDTH / 2 - BALL_SIZE / 2;
  ball.y = HEIGHT / 2 - BALL_SIZE / 2;
  const angle = random.range(-0.5, 0.5);
  ball.velocityX = Math.cos(angle) * BALL_START_SPEED * direction;
  ball.velocityY = Math.sin(angle) * BALL_START_SPEED;
  serveDelay = 0.8;   // a short pause so the player can get ready
}

// The ball leaves a paddle at an angle that depends on WHERE it hit:
// center = straight, edges = steep. This one rule is what makes Pong playable.
function bounceOffPaddle(paddle, direction) {
  const paddleCenter = paddle.y + paddle.height / 2;
  const ballCenter = ball.y + ball.height / 2;
  const hitPosition = clamp((ballCenter - paddleCenter) / (paddle.height / 2), -1, 1);   // -1..1
  const angle = hitPosition * MAX_BOUNCE_ANGLE;
  const speed = Math.hypot(ball.velocityX, ball.velocityY) * BALL_SPEED_UP;
  ball.velocityX = Math.cos(angle) * speed * direction;
  ball.velocityY = Math.sin(angle) * speed;
  // Move the ball out of the paddle so it can't hit twice.
  ball.x = direction > 0 ? paddle.x + paddle.width : paddle.x - ball.width;
  particles.emit({ ...presets.sparkle, x: ball.x, y: ballCenter, angle: direction > 0 ? 0 : Math.PI, spread: 1.2 });
  camera.shake(2, 0.15);
  sound("bounce");
}

// ---- Scenes -------------------------------------------------------------------
game.scenes.add("title", {
  update(game) {
    if (game.actions.wasPressed("start") || game.input.touch.wasTapped()) {
      game.scenes.switchTo("play");
    }
  },
  render(game, context) {
    text(context, "PONG", WIDTH / 2, 50, { size: 24, align: "center", bold: true, color: "#ffb347" });
    text(context, "W / S or arrows to move", WIDTH / 2, 95, { align: "center", color: "#bbbbbb" });
    text(context, "Press Space, click or tap to start", WIDTH / 2, 115, { align: "center" });
    text(context, "First to " + WINNING_SCORE + " wins", WIDTH / 2, 135, { align: "center", color: "#888888" });
  },
});

game.scenes.add("play", {
  enter() {
    player.score = 0;
    computer.score = 0;
    serve(random.sign());
  },
  update(game, stepSeconds) {
    // Player: move with the "up" and "down" actions.
    const direction = game.actions.axis("up", "down");
    player.y = clamp(player.y + direction * PADDLE_SPEED * stepSeconds, 0, HEIGHT - player.height);

    // Computer: follow the ball, but only at COMPUTER_SPEED.
    const target = ball.y + ball.height / 2 - computer.height / 2;
    const difference = target - computer.y;
    const maxMove = COMPUTER_SPEED * stepSeconds;
    computer.y = clamp(computer.y + clamp(difference, -maxMove, maxMove), 0, HEIGHT - computer.height);

    particles.update(stepSeconds);
    camera.update(stepSeconds);

    if (serveDelay > 0) {
      serveDelay -= stepSeconds;
      return;
    }

    ball.x += ball.velocityX * stepSeconds;
    ball.y += ball.velocityY * stepSeconds;

    // Top and bottom walls.
    if (ball.y < 0 || ball.y + ball.height > HEIGHT) {
      ball.y = clamp(ball.y, 0, HEIGHT - ball.height);
      ball.velocityY = -ball.velocityY;
      sound("select");
    }

    // Paddles. Only check the paddle the ball is moving toward.
    if (ball.velocityX < 0 && rectsOverlap(ball, player)) bounceOffPaddle(player, 1);
    if (ball.velocityX > 0 && rectsOverlap(ball, computer)) bounceOffPaddle(computer, -1);

    // Scoring: the ball left the screen.
    if (ball.x + ball.width < 0) scorePoint(computer, 1);
    if (ball.x > WIDTH) scorePoint(player, -1);

    game.debug.watch("ball speed", Math.hypot(ball.velocityX, ball.velocityY));
  },
  render(game, context) {
    camera.begin(context);
    // Dashed center line.
    for (let y = 4; y < HEIGHT; y += 12) fillRect(context, WIDTH / 2 - 1, y, 2, 6, "#2b2f3a");
    text(context, String(player.score), WIDTH / 2 - 30, 10, { size: 16, align: "center", color: "#6cb6ff" });
    text(context, String(computer.score), WIDTH / 2 + 30, 10, { size: 16, align: "center", color: "#ff8a80" });
    fillRect(context, player.x, player.y, player.width, player.height, "#6cb6ff");
    fillRect(context, computer.x, computer.y, computer.width, computer.height, "#ff8a80");
    if (serveDelay <= 0 || Math.floor(serveDelay * 8) % 2 === 0) {
      fillCircle(context, ball.x + BALL_SIZE / 2, ball.y + BALL_SIZE / 2, BALL_SIZE / 2 + 0.5, "#ffffff");
    }
    particles.render(context);
    camera.end(context);
    game.debug.box(ball.x, ball.y, ball.width, ball.height);
  },
});

function scorePoint(winner, serveDirection) {
  winner.score += 1;
  camera.shake(5, 0.3);
  sound(winner === player ? "coin" : "hit");
  if (winner.score >= WINNING_SCORE) {
    game.scenes.push("gameOver", { playerWon: winner === player });
  } else {
    serve(serveDirection);
  }
}

// Pushed on top of "play", so the last frame of the game stays visible behind it.
let playerWon = false;
let gameOverWait = 0;    // ignore input for a moment so a held key doesn't skip the screen
game.scenes.add("gameOver", {
  enter(game, data) {
    playerWon = data.playerWon;
    gameOverWait = 0.5;
    sound(playerWon ? "powerup" : "lose");
  },
  update(game, stepSeconds) {
    gameOverWait -= stepSeconds;
    if (gameOverWait <= 0 && (game.actions.wasPressed("start") || game.input.touch.wasTapped())) {
      game.scenes.switchTo("play");
    }
  },
  render(game, context) {
    dim(context, WIDTH, HEIGHT, 0.6);
    text(context, playerWon ? "YOU WIN!" : "COMPUTER WINS", WIDTH / 2, 65, { size: 16, align: "center", bold: true, color: "#ffb347" });
    text(context, "Press Space, click or tap to play again", WIDTH / 2, 100, { align: "center" });
  },
});

game.start("title");
