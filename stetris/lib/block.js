import * as blocks from './blocks.js';

/** Offsets tried when a rotation does not fit where the block stands. */
const KICKS = [0, -1, 1, -2, 2];

/** The falling block: a shape, a rotation and a position on the board. */
export class Block {
  #board;
  #type;
  #xSize;
  #ySize;
  #xPos;
  #yPos;
  #rotation;
  #cells;

  constructor(board, type) {
    this.#board = board;
    this.reset(type);
  }

  /** Puts the block back at its spawn position with the given type. */
  reset(type) {
    // Clamp so an out of range type cannot index past the table
    if (!(type >= 1 && type <= blocks.COUNT)) {
      type = 1;
    }

    this.#type = type;
    this.#xSize = blocks.X_SIZE[type - 1];
    this.#ySize = blocks.Y_SIZE[type - 1];
    this.#xPos = Math.floor(this.#board.xSize / 2) - Math.floor(this.#xSize / 2);
    this.#yPos = 0;
    this.#rotation = 0;
    this.#cells = blocks.SHAPE[type - 1][0].map((row) => [...row]);
  }

  /** Takes another block's shape and position, as an assignment would. */
  copyFrom(other) {
    this.#type = other.#type;
    this.#xSize = other.#xSize;
    this.#ySize = other.#ySize;
    this.#xPos = other.#xPos;
    this.#yPos = other.#yPos;
    this.#rotation = other.#rotation;
    this.#cells = other.#cells.map((row) => [...row]);
  }

  get type() {
    return this.#type;
  }

  get xSize() {
    return this.#xSize;
  }

  get ySize() {
    return this.#ySize;
  }

  get xPos() {
    return this.#xPos;
  }

  get yPos() {
    return this.#yPos;
  }

  /** Returns a cell of the shape, or zero when it is out of bounds. */
  getCell(x, y) {
    if (x < 0 || x >= blocks.SIZE || y < 0 || y >= blocks.SIZE) {
      return 0;
    }
    return this.#cells[y][x];
  }

  /** Turns the block, nudging it sideways when it does not fit in place. */
  rotate() {
    const next = (this.#rotation + 1) % blocks.ROTATIONS;
    const shape = blocks.SHAPE[this.#type - 1][next];

    // Without the kicks a block could never be turned against a wall
    for (const kick of KICKS) {
      const x = this.#xPos + kick;
      if (!this.fits(x, this.#yPos, shape)) {
        continue;
      }

      this.#rotation = next;
      this.#xPos = x;
      this.#cells = shape.map((row) => [...row]);
      return true;
    }

    return false;
  }

  moveLeft() {
    if (!this.fits(this.#xPos - 1, this.#yPos, this.#cells)) {
      return false;
    }
    this.#xPos -= 1;
    return true;
  }

  moveRight() {
    if (!this.fits(this.#xPos + 1, this.#yPos, this.#cells)) {
      return false;
    }
    this.#xPos += 1;
    return true;
  }

  moveDown() {
    if (!this.fits(this.#xPos, this.#yPos + 1, this.#cells)) {
      return false;
    }
    this.#yPos += 1;
    return true;
  }

  /** Drops as far as the block goes, returning how many cells it fell. */
  drop() {
    let distance = 0;
    while (this.moveDown()) {
      distance += 1;
    }
    return distance;
  }

  /** Returns whether the block fits where it currently stands. */
  canPlace() {
    return this.fits(this.#xPos, this.#yPos, this.#cells);
  }

  /** Returns whether the given shape fits at the given position. */
  fits(x, y, shape) {
    // Scan the whole grid, not just this block's extent - the shape being
    // tested may reach further than the current one
    for (let cy = 0; cy < blocks.SIZE; cy++) {
      for (let cx = 0; cx < blocks.SIZE; cx++) {
        if (!shape[cy][cx]) {
          continue;
        }

        const bx = x + cx;
        const by = y + cy;

        if (bx < 0 || bx >= this.#board.xSize) {
          return false;
        }
        if (by < 0 || by >= this.#board.ySize) {
          return false;
        }
        if (this.#board.getValue(bx, by)) {
          return false;
        }
      }
    }

    return true;
  }
}
