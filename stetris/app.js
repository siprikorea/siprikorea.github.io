/**
 * Browser front end.
 *
 * The same stetris/ logic the console app uses. Everything the game does
 * not do lives here: reading keys, driving the clock, seeding a new game
 * and keeping the high score.
 */
import { Play } from './lib/index.js';

/** Colour per block type, index 0 is the empty cell. */
const COLORS = [
  '#10182b', // empty
  '#3b82f6', // J - blue
  '#e5e7eb', // L - white
  '#eab308', // O - yellow
  '#22c55e', // S - green
  '#d946ef', // T - magenta
  '#ef4444', // Z - red
  '#06b4d4', // I - cyan
];

const GRID_LINE = '#1a2339';
const HIGH_SCORE_KEY = 'stetris.highscore';

const boardCanvas = document.getElementById('board');
const nextCanvas = document.getElementById('next');
const boardCtx = boardCanvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');

const el = {
  score: document.getElementById('score'),
  high: document.getElementById('high'),
  level: document.getElementById('level'),
  lines: document.getElementById('lines'),
  state: document.getElementById('state'),
};

const play = new Play();

/** The browser has no home directory, so the high score lives here. */
function loadHighScore() {
  try {
    return Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(value));
  } catch {
    // Private windows and blocked storage are not worth failing over
  }
}

/** Scales a canvas for the display, keeping its CSS size. */
function scaleForDisplay(canvas, ctx, width, height) {
  const ratio = window.devicePixelRatio || 1;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawCell(ctx, x, y, size, type) {
  const pad = 1;
  ctx.fillStyle = COLORS[type] ?? COLORS[0];
  ctx.beginPath();
  ctx.roundRect(x + pad, y + pad, size - pad * 2, size - pad * 2, 3);
  ctx.fill();

  if (type !== 0) {
    // A light top edge, the same bevel the console app fakes with colour
    ctx.fillStyle = 'rgb(255 255 255 / 0.22)';
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, size - pad * 2, (size - pad * 2) * 0.28, 3);
    ctx.fill();
  }
}

function drawBoard() {
  const board = play.board;
  const block = play.currentBlock;
  const xSize = board.xSize;
  const ySize = board.ySize;
  const size = boardCanvas.clientWidth / xSize;

  boardCtx.clearRect(0, 0, boardCanvas.clientWidth, boardCanvas.clientHeight);

  for (let y = 0; y < ySize; y++) {
    for (let x = 0; x < xSize; x++) {
      drawCell(boardCtx, x * size, y * size, size, board.getValue(x, y));
    }
  }

  // A locked block is drawn from the board, so only overlay the falling
  // one while the game is running
  if (!play.isGameOver) {
    for (let by = 0; by < block.ySize; by++) {
      for (let bx = 0; bx < block.xSize; bx++) {
        if (!block.getCell(bx, by)) {
          continue;
        }
        const x = block.xPos + bx;
        const y = block.yPos + by;
        if (x >= 0 && x < xSize && y >= 0 && y < ySize) {
          drawCell(boardCtx, x * size, y * size, size, block.type);
        }
      }
    }
  }

  // Grid, drawn over the cells so it reads as one surface
  boardCtx.strokeStyle = GRID_LINE;
  boardCtx.lineWidth = 1;
  boardCtx.beginPath();
  for (let x = 1; x < xSize; x++) {
    boardCtx.moveTo(x * size, 0);
    boardCtx.lineTo(x * size, ySize * size);
  }
  for (let y = 1; y < ySize; y++) {
    boardCtx.moveTo(0, y * size);
    boardCtx.lineTo(xSize * size, y * size);
  }
  boardCtx.stroke();

  if (play.isPaused || play.isGameOver) {
    boardCtx.fillStyle = 'rgb(8 12 20 / 0.72)';
    boardCtx.fillRect(0, 0, boardCanvas.clientWidth, boardCanvas.clientHeight);
  }
}

function drawNext() {
  const next = play.nextBlock;
  const size = nextCanvas.clientWidth / 4;

  nextCtx.clearRect(0, 0, nextCanvas.clientWidth, nextCanvas.clientHeight);

  // The preview is drawn at the origin, the spawn position of the next
  // block is irrelevant here
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const type = next.getCell(x, y) ? next.type : 0;
      if (type) {
        drawCell(nextCtx, x * size, y * size, size, type);
      }
    }
  }
}

function render() {
  drawBoard();
  drawNext();

  el.score.textContent = play.score.get();
  el.high.textContent = play.highScore.get();
  el.level.textContent = play.level;
  el.lines.textContent = play.lines;

  if (play.isGameOver) {
    el.state.textContent = 'GAME OVER - press R';
    el.state.dataset.state = 'gameover';
  } else if (play.isPaused) {
    el.state.textContent = 'PAUSED';
    el.state.dataset.state = 'paused';
  } else {
    el.state.textContent = '';
    el.state.dataset.state = 'playing';
  }
}

function newGame() {
  play.newGame(Date.now() & 0x7fffffff);
  savedScore = false;
}

let savedScore = false;

const ACTIONS = {
  left: () => play.moveLeft(),
  right: () => play.moveRight(),
  rotate: () => play.rotate(),
  soft: () => play.softDrop(),
  drop: () => play.hardDrop(),
  pause: () => play.togglePause(),
  restart: () => newGame(),
};

const KEYS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'soft',
  a: 'left', A: 'left', d: 'right', D: 'right',
  w: 'rotate', W: 'rotate', s: 'soft', S: 'soft',
  ' ': 'drop', p: 'pause', P: 'pause', r: 'restart', R: 'restart',
};

window.addEventListener('keydown', (event) => {
  const action = KEYS[event.key];
  if (!action) {
    return;
  }
  // Stop the arrows and space from scrolling the page
  event.preventDefault();
  ACTIONS[action]();
  render();
});

for (const button of document.querySelectorAll('.touch button')) {
  button.addEventListener('click', () => {
    ACTIONS[button.dataset.key]();
    render();
  });
}

function resize() {
  // The board keeps its 1:2 ratio and fits the viewport
  const height = Math.min(600, window.innerHeight - 40);
  const width = Math.round(height / 2);
  scaleForDisplay(boardCanvas, boardCtx, width, height);
  scaleForDisplay(nextCanvas, nextCtx, 120, 120);
  render();
}

window.addEventListener('resize', resize);

let lastFrame = performance.now();

function frame(now) {
  // Hand the elapsed time to the game, it decides when to fall
  play.tick(Math.min(now - lastFrame, 1000));
  lastFrame = now;

  // Persist the high score as soon as the game ends
  if (play.isGameOver && !savedScore) {
    saveHighScore(play.highScore.get());
    savedScore = true;
  }

  render();
  requestAnimationFrame(frame);
}

play.highScore.set(loadHighScore());
newGame();
resize();
requestAnimationFrame(frame);
