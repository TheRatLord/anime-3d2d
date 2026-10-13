// The direction of the sun for the day picture (the same numbers as SUN in src/world.js, without THREE: the builders
// that run in worker threads use it too).
const l = Math.sqrt(-0.58 * -0.58 + 0.62 * 0.62 + 0.42 * 0.42), k = 1 / l;
export const SUN_X = -0.58 * k, SUN_Y = 0.62 * k, SUN_Z = 0.42 * k;
