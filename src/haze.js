// The haze contract: atmosphere is laid in flat steps by distance from the hilltop (the camera never leaves it),
// like the layers of a background painting. [from this distance (m), this much haze]. The ground (src/terrain.js)
// and everything beyond the hill (src/extra/far.js) read the same table.
export const HAZE = [[110, 0.12], [230, 0.24], [380, 0.36], [739, 0.48], [1049, 0.58]];
export const stepFog = (r) => { let a = 0; for (const [d, h] of HAZE) if (r >= d) a = h; return a; };
