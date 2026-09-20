/** The well the blocks fall into. Each cell holds a block type, or zero. */

/** Width of the board in cells. */
export const X_SIZE = 10;
/** Height of the board in cells. */
export const Y_SIZE = 20;

export class Board {
  #cells = Array.from({ length: Y_SIZE }, () => new Array(X_SIZE).fill(0));

  /** Empties the board. */
  clear() {
    for (const row of this.#cells) {
      row.fill(0);
    }
  }

  /** Width in cells. */
  get xSize() {
    return X_SIZE;
  }

  /** Height in cells. */
  get ySize() {
    return Y_SIZE;
  }

  /** Returns the cell value, or zero when it is empty or out of bounds. */
  getValue(x, y) {
    if (x < 0 || x >= X_SIZE || y < 0 || y >= Y_SIZE) {
      return 0;
    }
    return this.#cells[y][x];
  }

  /** Sets the cell value, ignoring positions outside the board. */
  setValue(x, y, value) {
    if (x < 0 || x >= X_SIZE || y < 0 || y >= Y_SIZE) {
      return;
    }
    this.#cells[y][x] = value;
  }
}
