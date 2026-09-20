/**
 * The random generator the game runs on.
 *
 * A linear congruential generator rather than `Math.random`, so that a seed
 * produces the same sequence in every port of this logic, and so that a game
 * can be replayed from its seed.
 */
export class Rng {
  #state = 1;

  /** Seeds the generator. A zero seed would make it stick at zero. */
  seed(value) {
    this.#state = (value >>> 0) || 1;
  }

  /** Returns the next value. */
  next() {
    // Math.imul keeps the multiply exact in 32 bits, which a plain `*`
    // would not once the product passes 2^53
    this.#state = (Math.imul(this.#state, 1664525) + 1013904223) >>> 0;

    // The low bits of an LCG are weak, so use the high ones
    return this.#state >>> 16;
  }

  /** Returns the next value in `[low, high]`. */
  nextRange(low, high) {
    if (high <= low) {
      return low;
    }
    return low + (this.next() % (high - low + 1));
  }
}
