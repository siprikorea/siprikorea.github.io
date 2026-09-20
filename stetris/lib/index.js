/**
 * Stetris game logic.
 *
 * The package knows nothing about how the game is presented. A front end
 * calls the input methods, hands elapsed time to `Play.tick()` and reads the
 * state back to draw it.
 */
export { Block } from './block.js';
export { Board } from './board.js';
export { Play } from './play.js';
export { Rng } from './rng.js';
export { Score } from './score.js';
export { State } from './state.js';
