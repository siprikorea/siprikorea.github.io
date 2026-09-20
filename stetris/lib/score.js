/** A score counter. */
export class Score {
  #value = 0;

  /** Resets the score to zero. */
  clear() {
    this.#value = 0;
  }

  /** Adds to the score. */
  add(amount) {
    this.#value += amount;
  }

  /** Overwrites the score, used to restore a stored high score. */
  set(amount) {
    this.#value = amount;
  }

  /** Returns the score. */
  get() {
    return this.#value;
  }
}
