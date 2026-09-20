import * as blocks from './blocks.js';
import { Block } from './block.js';
import { Board } from './board.js';
import { Rng } from './rng.js';
import { Score } from './score.js';
import { State } from './state.js';

/** Score for clearing one to four lines at once, times the level. */
const LINE_SCORE = [0, 100, 300, 500, 800];

const SOFT_DROP_SCORE = 1;
const HARD_DROP_SCORE = 2;

const LINES_PER_LEVEL = 10;

const FALL_INTERVAL_BASE = 800;
const FALL_INTERVAL_STEP = 70;
const FALL_INTERVAL_MIN = 100;

/**
 * The game. It knows nothing about how it is presented: a front end calls
 * the input methods, hands it elapsed time through `tick()` and reads the
 * state back to draw it.
 */
export class Play {
  #board = new Board();
  #currentBlock;
  #nextBlock;
  #score = new Score();
  #highScore = new Score();
  #rng = new Rng();
  #state = State.PLAYING;
  #lines = 0;
  #fallTimer = 0;

  constructor() {
    this.#currentBlock = new Block(this.#board, 1);
    this.#nextBlock = new Block(this.#board, 1);
    this.newGame(1);
  }

  /**
   * Starts a new game. The caller supplies the seed, so a given seed always
   * replays the same game. The high score is kept.
   */
  newGame(seed) {
    this.#rng.seed(seed);
    this.#board.clear();
    this.#score.clear();
    this.#state = State.PLAYING;
    this.#lines = 0;
    this.#fallTimer = 0;

    this.#currentBlock.reset(this.#nextBlockType());
    this.#nextBlock.reset(this.#nextBlockType());
  }

  moveLeft() {
    return this.isPlaying && this.#currentBlock.moveLeft();
  }

  moveRight() {
    return this.isPlaying && this.#currentBlock.moveRight();
  }

  rotate() {
    return this.isPlaying && this.#currentBlock.rotate();
  }

  /** Moves the block down one cell, locking it when it has landed. */
  softDrop() {
    if (!this.isPlaying) {
      return false;
    }

    // A manual drop restarts the fall timer, so the block does not
    // immediately fall again on the next tick
    this.#fallTimer = 0;

    if (!this.#currentBlock.moveDown()) {
      this.#lockBlock();
      return false;
    }

    this.#score.add(SOFT_DROP_SCORE);
    this.#updateHighScore();
    return true;
  }

  /** Drops the block all the way and locks it. */
  hardDrop() {
    if (!this.isPlaying) {
      return false;
    }

    const distance = this.#currentBlock.drop();
    this.#score.add(HARD_DROP_SCORE * distance);
    this.#updateHighScore();

    this.#lockBlock();
    return true;
  }

  /** Advances the game by the elapsed time, in milliseconds. */
  tick(elapsedMillis) {
    if (!this.isPlaying) {
      return;
    }

    this.#fallTimer += elapsedMillis;

    let interval = this.fallInterval;

    // Catch up if more than one interval has passed
    while (this.#fallTimer >= interval && this.isPlaying) {
      this.#fallTimer -= interval;
      this.#applyGravity();
      interval = this.fallInterval;
    }
  }

  /** Pauses or resumes. A finished game cannot be resumed. */
  setPause(pause) {
    if (this.#state === State.GAMEOVER) {
      return;
    }
    this.#state = pause ? State.PAUSED : State.PLAYING;
  }

  togglePause() {
    this.setPause(this.#state === State.PLAYING);
  }

  get state() {
    return this.#state;
  }

  get isPlaying() {
    return this.#state === State.PLAYING;
  }

  get isPaused() {
    return this.#state === State.PAUSED;
  }

  get isGameOver() {
    return this.#state === State.GAMEOVER;
  }

  get board() {
    return this.#board;
  }

  get currentBlock() {
    return this.#currentBlock;
  }

  get nextBlock() {
    return this.#nextBlock;
  }

  get score() {
    return this.#score;
  }

  get highScore() {
    return this.#highScore;
  }

  /** The level, starting at one. */
  get level() {
    return Math.floor(this.#lines / LINES_PER_LEVEL) + 1;
  }

  /** How many lines have been cleared. */
  get lines() {
    return this.#lines;
  }

  /** The current fall interval in milliseconds. */
  get fallInterval() {
    const interval = FALL_INTERVAL_BASE - (this.level - 1) * FALL_INTERVAL_STEP;
    return Math.max(interval, FALL_INTERVAL_MIN);
  }

  /** Falling on its own scores nothing. */
  #applyGravity() {
    if (!this.#currentBlock.moveDown()) {
      this.#lockBlock();
    }
  }

  #lockBlock() {
    this.#setBlockToBoard();

    let cleared = this.#clearCompleteLines();
    if (cleared > 0) {
      this.#lines += cleared;
      cleared = Math.min(cleared, 4);

      // Scored after the level has taken the new lines into account
      this.#score.add(LINE_SCORE[cleared] * this.level);
      this.#updateHighScore();
    }

    this.#changeBlock();
    this.#fallTimer = 0;
  }

  #setBlockToBoard() {
    const block = this.#currentBlock;
    for (let y = 0; y < block.ySize; y++) {
      for (let x = 0; x < block.xSize; x++) {
        if (block.getCell(x, y)) {
          this.#board.setValue(block.xPos + x, block.yPos + y, block.type);
        }
      }
    }
  }

  /** Removes every complete line, returning how many there were. */
  #clearCompleteLines() {
    const xSize = this.#board.xSize;
    const ySize = this.#board.ySize;
    let cleared = 0;

    for (let y = ySize - 1; y >= 0; ) {
      let count = 0;
      for (let x = 0; x < xSize; x++) {
        if (this.#board.getValue(x, y)) {
          count += 1;
        }
      }

      if (count !== xSize) {
        // Not complete, look at the line above
        y -= 1;
        continue;
      }

      // Pull everything above down by one, then empty the top line
      for (let move = y; move > 0; move--) {
        for (let x = 0; x < xSize; x++) {
          this.#board.setValue(x, move, this.#board.getValue(x, move - 1));
        }
      }
      for (let x = 0; x < xSize; x++) {
        this.#board.setValue(x, 0, 0);
      }

      cleared += 1;
    }

    return cleared;
  }

  #changeBlock() {
    this.#currentBlock.copyFrom(this.#nextBlock);
    this.#nextBlock.reset(this.#nextBlockType());

    // The new block does not fit where it spawns, so the stack has reached
    // the top
    if (!this.#currentBlock.canPlace()) {
      this.#state = State.GAMEOVER;
    }
  }

  #nextBlockType() {
    return this.#rng.nextRange(1, blocks.COUNT);
  }

  #updateHighScore() {
    if (this.#highScore.get() < this.#score.get()) {
      this.#highScore.set(this.#score.get());
    }
  }
}
