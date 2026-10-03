// Painted masonry. A wall face is: a soft wash (underpainting) -> one hard cool-grey shadow shape
// -> sparse opaque marks. Joints are brushed in from each block's own coordinates, only in
// patches; sunlit top edges get a pale line instead; rain stains hang under ledges; recesses
// and ground contacts take a small amount of the darkest tone.
import * as THREE from 'three';
import { mat, shadowMat } from './glsl.js';

const VS = /* glsl */`
in vec3 position; in vec3 normal; in vec4 aData; in vec4 aFace; in vec4 aMisc; in vec4 aElem; in vec4 aElem2; in vec4 aLN; in vec4 aWall; in vec4 aSlit;
out vec4 vLN; out float vTopNdl; out vec4 vWall; flat out vec4 vSlit; flat out vec3 vEc; flat out vec3 vTop; out float vEdge;
uniform vec3 uSunDir;
out vec3 vW; out vec3 vN; out vec4 vData; out vec4 vFace; out vec4 vMisc; out float vDepth;
flat out vec4 vPlane;
invariant gl_Position;
// depth order -> plane number, gently gathered into three planes (fore / middle / back); still continuous
float planeOf(float d, float nearD, float farD){
  float pl = clamp((d - nearD) / (farD - nearD), 0.0, 1.0);
  float p2 = pl * 2.0, fl = floor(p2), fr = p2 - fl;
  return (fl + smoothstep(0.2, 0.8, fr)) * 0.5;
}
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vData = aData; vFace = aFace; vMisc = aMisc;
  vec4 mv = viewMatrix * w; vDepth = -mv.z;
  // ---- the painter's planned planes. Every architectural element (a whole wall, a pier, a
  // buttress, a heap) gets ONE number from its depth order as seen from here: 0 = foreground plane,
  // 1 = back plane. It is computed from the element's centre, so it is flat over the element (no
  // gradient along a receding wall) and it slides smoothly as the camera walks.
  float dC = distance(uCamPos, SUBJECT);
  float nearD = max(dC - 12.0, 1.5), farD = dC + 12.0;
  vec3 ec = (modelMatrix * vec4(aElem.xyz, 1.0)).xyz;
  float pl = planeOf(distance(uCamPos, ec), nearD, farD);
  float ew = min(aElem.w, 1.0);
  pl = mix(0.42, pl, ew);
  // Where two planes of one wall meet (bay to bay, tier to tier) the stone also knows the plane on
  // the other side (aElem2.xyz) and how far it is from the boundary (aElem2.w, metres, per vertex):
  // the fragment shader chooses between the two with a brushed edge, so the step between planes is
  // a painted contour - not the toothing of the stones that happen to lie either side of it.
  float plB = pl;
  if (aElem2.w < 50.0) plB = planeOf(distance(uCamPos, (modelMatrix * vec4(aElem2.xyz, 1.0)).xyz), nearD, farD);
  vPlane = vec4(pl, ew, plB, aElem.w > 1.5 ? -1.0 : 1.0); vEdge = aElem2.w;
  // The weathered top of a broken wall (mode 3) is not lit as a little horizontal roof - that makes
  // every slab of a low wall a bright tread. It takes the light of the wall FACE on the viewer's
  // side (aLN.xyz = the wall's horizontal normal; none given: the direction toward the viewer), so
  // top and face are one shape and one lighting decision. It turns over smoothly while the viewer
  // crosses the wall's own plane.
  vec3 lnw = mat3(modelMatrix) * aLN.xyz;
  // vTopNdl = how far the viewer is on the +h side of the wall this top belongs to (0..1 over
  // +-1 m either side of the wall's plane). The fragment shader paints the top with the tone of BOTH
  // wall faces and mixes the two COLOURS by it, so the top turns over as a slow fade while the
  // viewer crosses the plane - never as a threshold that flips. A cap that has no wall (pier,
  // buttress) takes the tone of its sun-side face, whoever looks at it.
  // vTop = (n.l of side A, n.l of side B, is the dominant side an east/west face). A top is painted
  // with the tone of BOTH sides and the two COLOURS are mixed by vTopNdl. A wall: A / B are its two
  // faces. A free-standing mass (pier, buttress, stump): A / B are the two upright faces turned
  // toward the viewer, mixed by how squarely each is seen - so the top always goes with the side
  // under it and never shows as a lid of another tone.
  vTopNdl = 1.0; vTop = vec3(1.0, 1.0, 0.0); vWall = aWall; vSlit = aSlit; vEc = ec;
  if (aLN.w > 2.5) {
    vec2 tc = uCamPos.xz - ec.xz, h = lnw.xz;
    if (dot(h, h) > 0.25) {
      h = normalize(h); vTopNdl = smoothstep(-1.0, 1.0, dot(tc, h)); lnw = vec3(h.x, 0.0, h.y);
      float a = dot(h, uSunDir.xz); vTop = vec3(a, -a, step(abs(h.y), abs(h.x)));
    } else {
      lnw = vec3(0.0);
      float ax = abs(tc.x), az = abs(tc.y), wx = smoothstep(0.3, 0.7, ax / max(ax + az, 1e-3));
      vTopNdl = wx;
      vTop = vec3(sign(tc.x) * uSunDir.x, sign(tc.y) * uSunDir.z, wx);
    }
  }
  vLN = vec4(lnw, aLN.w);
  gl_Position = projectionMatrix * mv;
}
`;

const FS = /* glsl */`
#define PAVE_TH 0.5
// (c14) the paving that survives: three islands in the nave (where the slab clusters lie), their
// outlines wobbled by a slow world field - world-fixed, the same from every viewpoint
float paveIsl(vec2 p, float wz){
  float a = 1.0 - length((p - vec2(2.5, -3.1)) / vec2(1.9, 2.6));
  float b = 1.0 - length((p - vec2(-2.3, 3.0)) / vec2(2.4, 2.3));
  float c = 1.0 - length((p - vec2(2.7, 2.7)) / vec2(1.6, 1.7));
  return 0.5 + max(a, max(b, c)) * 0.9 + (wz - 0.5) * 0.7;
}
in vec3 vW; in vec3 vN; in vec4 vData; in vec4 vFace; in vec4 vMisc; in float vDepth; in vec4 vLN; in float vTopNdl;
in vec4 vWall; flat in vec4 vSlit; flat in vec3 vEc; flat in vec3 vTop; in float vEdge;
flat in vec4 vPlane;
uniform vec3 uLit, uShadeLo, uShadeMid, uShadeHi, uDeep, uPale, uMoss, uMossShade, uJointLit, uJointShade;
uniform float uFog, uWarm, uMossAmt, uJoint, uPlaneAmt, uShadowPitch, uFoot;

// Sun shadow as a PAINTED shape. The binary depth test is taken on a coarse lattice (every
// uShadowPitch shadow texels, ~20 cm) and rebuilt with a quadratic B-spline, so the lit fraction is
// a smooth field ~0.5 m wide whose 0.5 contour is a few big rounded lobes: holes and sun flecks
// smaller than a hand-span do not survive, and no leaf is projected. The lattice points lie up to
// 0.3 m from the fragment, so each is compared against the depth of the receiving PLANE there
// (receiver-plane bias), not the fragment's own depth. 9 fetches, as before.
float shadowSpline(vec3 wp, vec3 n, vec2 warp){
  vec4 sc = uShadowMat * vec4(wp, 1.0);
  vec3 s = sc.xyz * 0.5 + 0.5;
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  vec3 r0 = vec3(uShadowMat[0][0], uShadowMat[1][0], uShadowMat[2][0]);
  vec3 r1 = vec3(uShadowMat[0][1], uShadowMat[1][1], uShadowMat[2][1]);
  vec3 r2 = vec3(uShadowMat[0][2], uShadowMat[1][2], uShadowMat[2][2]);
  float k = -0.5 * dot(r2, uSunDir) / max(dot(n, uSunDir), 0.22);
  vec2 grad = k * vec2(dot(n, r0) / (0.5 * dot(r0, r0)), dot(n, r1) / (0.5 * dot(r1, r1)));
  float pitch = uShadowTexel * uShadowPitch;
  vec2 g = s.xy / pitch + warp;
  vec2 c = floor(g) + 0.5, f = g - c;
  vec2 w0 = 0.5 * (0.5 - f) * (0.5 - f), w1 = 0.75 - f * f, w2 = 0.5 * (0.5 + f) * (0.5 + f);
  float lit = 0.0;
  vec2 q0 = c * pitch;
  for (int j = 0; j < 3; j++){
    float wy = j == 0 ? w0.y : (j == 1 ? w1.y : w2.y);
    for (int i = 0; i < 3; i++){
      float wx = i == 0 ? w0.x : (i == 1 ? w1.x : w2.x);
      vec2 q = q0 + vec2(float(i - 1), float(j - 1)) * pitch;
      float zr = s.z + dot(grad, q - s.xy) - uShadowBias;
      lit += wy * wx * step(zr, texture(uShadowMap, q).r);
    }
  }
  return lit;
}

// Brush texture on the face plane with separate scales along the horizontal (h) and vertical (v)
// direction of the wall: uv = h * sH + v * sV. Triplanar with hard blending, so it is one fetch
// on a flat wall and continuous round a column.
vec4 faceTex(vec3 p, vec3 n, vec2 sH, vec2 sV, vec2 off){
  vec3 w = pow(abs(n), vec3(8.0)); w /= (w.x + w.y + w.z);
  vec4 c = vec4(0.0);
  if (w.x > 0.01) c += w.x * texture(uBrush, p.z * sH + p.y * sV + off);
  if (w.y > 0.01) c += w.y * texture(uBrush, p.x * sH + p.z * sV + off);
  if (w.z > 0.01) c += w.z * texture(uBrush, p.x * sH + p.y * sV + off);
  return c;
}
// the same, kept at a constant size on screen by crossfading world-anchored octaves (see brushStable)
vec4 faceStable(vec3 p, vec3 n, vec2 sH, vec2 sV, float lvl){
  float l0 = floor(lvl), k = smoothstep(0.15, 0.85, lvl - l0);
  float s0 = exp2(-l0);
  vec4 a = faceTex(p, n, sH * s0, sV * s0, vec2(0.13, 0.57));
  vec4 b = faceTex(p, n, sH * s0 * 0.5, sV * s0 * 0.5, vec2(0.61, 0.29));
  vec4 m = mix(a, b, k);
  return clamp(0.5 + (m - 0.5) / sqrt(k * k + (1.0 - k) * (1.0 - k)), 0.0, 1.0);
}

void main(){
  vec3 n = normalize(vN);
  float dist = distance(vW, uCamPos);
  float id = vData.x, tone = vData.y, base = vData.w;
  float stain = vMisc.x, ao = vMisc.y, cap = min(vMisc.z, 1.0);
  float cyl = step(0.75, vMisc.w), isBlock = 1.0 - cyl;          // turned stone (shaft, drum, bell)
  float lumpF = step(0.25, vMisc.w) * isBlock;                    // an irregular lump (aMisc.w = 0.5)
  vec2 uv = vFace.xy, sz = vFace.zw;
  float isFace = step(sz.y, 90.0);                        // carries block coordinates (not a lump / cut / lathe)
  float px = dist * uPixelK;                              // metres per pixel here

  // ---- lighting normal: a cut, chipped or tilted face takes the decision of the wall plane it
  // belongs to (snapped to the dominant axis when within ~37 deg), so facets do not sparkle
  vec3 an = abs(n);
  vec3 axn = an.x > an.y && an.x > an.z ? vec3(sign(n.x), 0.0, 0.0) : (an.y > an.z ? vec3(0.0, sign(n.y), 0.0) : vec3(0.0, 0.0, sign(n.z)));
  vec3 nl = mix(n, axn, step(0.80, dot(n, axn)) * isBlock);
  // ... or the plane the builder planned for it: a moulding takes its wall's normal, a heap one
  // rounded mass, a shaft its plain radial direction. vLN.w: 1 lit and drawn with it, 2 drawn with
  // its own facets (ink on every arris), 3 the weathered top of a broken wall.
  float lnMode = vLN.w;
  vec3 ng = nl;
  float breakTop = step(2.5, lnMode);
  vec3 topAxis = vLN.xyz;                                 // mode 3: the horizontal normal of the wall this top belongs to (or 0)
  if (lnMode > 2.5) { nl = vec3(0.0, 1.0, 0.0); ng = nl; }
  else if (lnMode > 0.5) { nl = normalize(vLN.xyz); ng = lnMode > 1.5 ? n : nl; }
  float mould = step(1.5, vMisc.z), mouldFlip = step(2.5, vMisc.z), revEdge = step(3.5, vMisc.z);
  float wallFace = abs(nl.y) < 0.5 ? 1.0 : 0.0;
  vec2 fp = abs(n.y) > 0.5 ? vW.xz : (abs(n.x) > abs(n.z) ? vW.zy : vW.xy);   // face-plane coords
  // The paint is laid on the PLANNED surface, not on the facets: a lump or a knocked corner takes
  // its brush coordinates (and its "facing") from the planned normal, so no mask, patch or mark
  // changes at a facet edge - nothing of the mesh shows through the paint.
  vec3 nt = (lnMode > 0.5 && lnMode < 2.5 && isFace < 0.5 && cyl < 0.5) ? nl : n;

  // ---- how much "indication" this place gets: less on the back planes, and thinning to plain
  // wash as the face turns away from the viewer (no compressing grid on a receding wall)
  float facing = abs(dot(nt, normalize(uCamPos - vW)));
  float turn = smoothstep(0.10, 0.42, facing);
  float det;

  // (no screen-sized dab field any more: every mark below is cut from the world-fixed fields - two fetches fewer, and nothing re-forms as the viewer walks)
  vec4 bw = brushWorld(vW + 3.7, nt, 5.5);                // big world-fixed washes
  vec4 bw2 = brushWorld(vW + 11.0, nt, 9.0);              // bigger still: where things are indicated at all
  vec4 pt = brushWorld(vW + 5.3, nt, 4.6);                // world-fixed dabs a few stones wide (G 0.6-1.3 m, R 0.25-0.5 m): patches, shadow edge
  // the plane of this place: its element's, or across a brushed contour the neighbouring element's
  float pl = vPlane.x;
  // (CONTINUOUS noise against the ramp: a field of flat dabs here cuts the contour into ruled
  // segments, one per dab - the 'stepped' edges. softN is the soft drift, a little dab on top.)
  float softN = clamp((bw.a - 0.5) * 1.5 + (bw2.a - 0.5) * 0.7 + 0.5, 0.0, 1.0);
  if (vEdge < 50.0) pl = mix(vPlane.z, pl, toneStep(vEdge * vPlane.w, 0.0, softN * 0.85 + pt.g * 0.15, 1.5 * vPlane.w));
  float nearP = 1.0 - smoothstep(0.0, 0.5, pl), farP = smoothstep(0.5, 1.0, pl);
  det = turn * mix(1.0, 0.45, pl * uPlaneAmt);
  // wall-scale vertical paint: G tall stain patches (3-6 m x 1 m), R tongues (1-2 m x 0.3 m),
  // B long thin rain streaks (1.5-4 m x 5-10 cm), A soft drift. World-fixed, crosses every joint.
  vec4 ws = faceTex(vW, nt, vec2(0.0, 0.11), vec2(0.02, 0.0), vec2(0.37, 0.71));
  // dry strokes at constant screen size: vertical drags and horizontal bedding strokes
  float lvl = clamp(log2(max(px, 1e-5) / 0.0024), -2.0, 2.6);

  float nearB = 1.0 - smoothstep(6.0, 16.0, dist);
  float nearK = 1.0 - smoothstep(3.5, 9.0, dist);
  float calm = 1.0;    // within a few metres the drawing thins out: a quiet wall and a few marks
  float xFace = step(abs(nl.z), abs(nl.x));
  // the place ALONG the wall (world-fixed), and a field that varies along it only: every drip, blade
  // and wandering line that hangs or stands on the wall is shaped by it
  // (a lump has no wall plane: its 'along' coordinate is a diagonal one, continuous all round it)
  float hc = lumpF > 0.5 ? (vW.x + vW.z) * 0.7071 : (xFace > 0.5 ? vW.z : vW.x);
  float pc = xFace > 0.5 ? vW.x : vW.z;                       // ... and which wall plane this is (constant over a face)
  vec4 colT = texture(uBrush, vec2(hc * 0.83, vW.y * 0.021 + 0.37));
  float nearIn = 1.0 - smoothstep(3.0, 6.0, dist);          // the near-detail layer: fades IN within a few metres
  // how steeply this place is looked DOWN on (0 at eye level, 1 from above ~40 deg): from above the
  // tops of things are brushed into the ground, not modelled
  float hiK = smoothstep(0.50, 0.72, (uCamPos.y - vW.y) / max(dist, 0.1));
  float hiK2 = smoothstep(0.40, 0.62, (uCamPos.y - vW.y) / max(dist, 0.1));   // (the brushing-in of floor and wall tops starts lower: from about 25 deg, full by 38)
  // what is narrow (a pier, a buttress, a shaft, a loose stone) carries its base tone and ONE patch tone, never more
  float narrow = max(step(1.5, vData.z), cyl);
  float eh = fract(vEc.x * 0.37 + vEc.z * 0.23 + 0.5);       // the element's own number
  float coursed = isBlock * (1.0 - lumpF);                // dressed, coursed stone (walls, piers, slabs) and its chips
  float axial = step(0.9, max(abs(nl.x), abs(nl.z)));     // a plane of the building (not a rounded mass)
  // a loose stone, or the upper face of a slab or step, is painted as ITS OWN piece of stone: one
  // colour for the piece. Wall-scale patches that carried on from one stone to the next read as a
  // sheet of tinted glass lying over all of them.
  float own = max(max(lumpF, cyl), step(0.7, nl.y) * (1.0 - breakTop) * isBlock);

  // ---- the light step's brushed edge (also used by every flat band below)
  float edgeN = softN * 0.78 + pt.g * 0.22;                  // world-fixed, large, and CONTINUOUS (see softN): a wavering edge with a few nicks, never ruled steps
  float lost = smoothstep(0.50, 0.66, bw2.r) * (1.0 - lumpF);
  // (world-fixed only: mixing in the screen-stable dab field made sun patches pop while walking)
  float eN = edgeN;
  float eAmp = mix(0.30, 0.85, lost);
  float bAmp = mix(0.30, 0.50, lost);
  float bandH = base + (bw.a - 0.5) * 1.5 + (ws.a - 0.5) * 0.8;
  float b0 = toneStep(bandH, 1.05, eN, bAmp * 0.8);
  float b1 = toneStep(bandH, 2.5, eN, bAmp);
  float b2 = toneStep(bandH, 5.2, eN, bAmp * 1.5);

  // ---- weathering at the scale of the WALL (it ignores the blocks entirely).
  // stainPix: how much dirt the stones above shed here (under broken tops, string courses, sills)
  // (a stain >= 2 is already a continuous field over the wall; a per-stone one is graded down the stone)
  float stainPix = stain > 1.5 ? clamp(stain - 2.0, 0.0, 1.0) : clamp(stain - (sz.y - uv.y) * 0.6 * isFace, 0.0, 1.0);
  // a drip tapers to a point: how far the dirt runs down differs from one hand's width of wall to the
  // next (a smooth field along the wall), so the foot of every tongue is a tip, never a square end
  float stainTip = clamp(stainPix + (colT.a - 0.5) * 0.55 * smoothstep(0.0, 0.25, stainPix) * (1.0 - stainPix), 0.0, 1.0);
  // ---- the colour of the stone: ONE opaque choice per place. Large brush-shaped fields of ochre,
  // pink-grey, green-grey (damp, hanging from the tops) and small violet-grey patches lie on the
  // cream ground; where two meet, the later one simply covers the earlier (no third tone in the
  // overlap, which is what made the washes look like glass). Every edge is a hard step with a
  // brushed contour, at any distance.
  float fP = toneStep(bw2.a, 0.61, pt.r, 0.05);
  float fO = toneStep(bw2.g, 0.63, pt.g, 0.07);
  float fG = toneStep(ws.g + stainPix * 0.12, 0.60, pt.g, 0.06) * wallFace;
  float fV = toneStep(bw.g, 0.74, pt.g, 0.06);
  vec3 fam = vec3(1.0);
  fam = mix(fam, vec3(0.985, 0.915, 0.895), fP);
  fam = mix(fam, vec3(1.02, 0.945, 0.79), fO);
  fam = mix(fam, vec3(0.875, 0.91, 0.83), fG);
  fam = mix(fam, vec3(0.93, 0.925, 0.975), fV);
  fam = mix(vec3(1.0), fam, uWarm);
  // In LIGHT the stone is one warm pale tone. The families (which separate by value in shade) are
  // only a quarter as strong there, and the one thing laid over the wash is a slightly darker warm
  // stain: tall streak-shaped fields hanging from tops and ledges, on well under half of a wall.
  // (c14: the families are NOT laid on a coursed wall any more - thresholded dab fields came out as
  // axis-aligned tint rectangles. A coursed wall in light is one near-uniform tone; its colour comes
  // from a few large stains tied to the building (rust under ledges, green-grey at the foot, a cool
  // wash from the broken top), read from WORLD 3D fields below, which run on round every corner.)
  float famK = 1.0 - isFace * coursed * wallFace;
  vec3 famLit = mix(vec3(1.0), fam, 0.25 * famK) * mix(vec3(1.0), vec3(1.0, 0.988, 0.955), (1.0 - famK) * uWarm);
  // world 3D soft field (continuous across arrises: no face-bounded patch), metres-scale
  // (wv: tall world-fixed shapes, a function of world position only - continuous round corners - a metre
  // or two wide; it also pushes the shade-zone boundary up and down in tongues)
  // (both are a few warped sines - no texture fetch: the stone shader stays at its old fetch count)
  float uD = (vW.x + vW.z) * 0.7071;
  float wv = 0.5 + 0.22 * sin(uD * 1.35 + 1.4 * sin(uD * 0.41 + vW.y * 0.23) + 0.7) + 0.13 * sin(uD * 2.9 - vW.y * 0.55 + 2.1);
  float wz = 0.5 + 0.17 * sin(vW.x * 0.47 + 1.3 * sin(vW.z * 0.31 + vW.y * 0.21 + 1.1)) + 0.13 * sin(vW.z * 0.59 - vW.y * 0.33 + 1.2 * sin(vW.x * 0.27 + 0.4))
           + 0.08 * sin((vW.x - vW.z) * 1.1 + vW.y * 0.7 + 1.2 * sin(vW.y * 0.37 + vW.x * 0.5));
  wz = wz * 0.62 + wv * 0.38;
  float tf = fract(tone * 3.97);
  vec3 tint = tf < 0.4 ? vec3(0.975, 0.975, 0.97) : tf < 0.6 ? vec3(1.0, 0.975, 0.925) : tf < 0.85 ? vec3(0.925, 0.93, 0.965) : vec3(0.95, 0.965, 0.915);
  tint *= 1.0 + (fract(tone * 7.31) - 0.5) * 0.10;
  vec3 ownT = mix(vec3(1.0), tint, max(lumpF, 0.55));
  // In SHADE the wall is one violet-grey: the families are a breath of hue only, and one or two
  // large warm scraps per wall (a very slow field) are the only patches. Everything else that
  // varies the shade is vertical: streaks and tongues hanging from the tops.
  vec3 famSh = mix(vec3(1.0), fam, 0.10 * famK);
  // a loose block is painted like the wall it fell from: two brushed tone patches fixed to it (never one blank value)
  // (c14: soft world fields, not dab fields - a dab threshold printed a rectangle on the stone)
  float ownP = toneStep(bw.a * 0.6 + wv * 0.4, 0.57, pt.r * 0.5 + 0.25, 0.05);
  // (ONE patch tone on a stone: the cooler one, or on some stones the paler one - never both)
  float ownP2 = toneStep(bw2.a * 0.6 + wz * 0.4, 0.58, pt.g * 0.5 + 0.25, 0.05);
  float ownW = step(0.5, fract(tone * 5.77));
  vec3 ownPatch = mix(mix(vec3(1.0), vec3(0.93, 0.925, 0.95), ownP), mix(vec3(1.0), vec3(1.055, 1.04, 1.0), ownP2), ownW);
  // Every stone a painter finds is a little its own colour: about half of the blocks of a coursed
  // wall take one of four close tints (a greyer one, an ochre one, a grey-green one, a violet-grey
  // one - all within a few percent), in light and in shade. In the patches where no joint is drawn
  // the tints alone tell the courses.
  float bt = fract(tone * 13.37);
  // (c14: within +-3% of value, a breath of hue: the courses are told by drawn joints, not by fills)
  vec3 blk = bt < 0.46 ? vec3(1.0) : bt < 0.64 ? vec3(0.978, 0.976, 0.972) : bt < 0.80 ? vec3(1.008, 1.0, 0.985) : bt < 0.92 ? vec3(0.982, 0.986, 0.98) : vec3(0.972, 0.97, 0.975);
  float blkK = isFace * coursed * wallFace * (1.0 - mould) * (1.0 - own) * smoothstep(0.34, 0.46, bw2.g * 0.6 + bw.a * 0.4) * (1.0 - smoothstep(60.0, 110.0, dist)) * mix(0.55, 1.0, smoothstep(3.0, 9.0, dist));
  blk = mix(vec3(1.0), blk, blkK);
  famLit *= blk; famSh *= mix(vec3(1.0), blk, 0.6);
  fam = mix(fam, ownT, own); ownPatch = mix(vec3(1.0), ownPatch, 1.0 - 0.65 * cyl);          // (a standing shaft stays nearly one tone each side of its terminator)
  famLit = mix(famLit, ownT * mix(vec3(1.0), ownPatch, 0.7), own); famSh = mix(famSh, mix(vec3(1.0), ownT, 0.45) * ownPatch, own);

  // ---- marks: sparse, all crossing the joints
  float quiet = smoothstep(0.42, 0.62, bw.r);              // at least half of every big face stays plain
  float dab = step(0.93, pt.b) * smoothstep(5.0, 10.0, dist) * quiet;
  float bare = smoothstep(0.56, 0.64, bw.g);               // where drags are allowed (~30% of a wall)
  // The dry-brush marks are laid in PATCHES (about a third of a wall, world-fixed), the rest stays
  // plain wash - near or far. The two stroke textures are only read inside their patches.
  float markM = smoothstep(0.47, 0.55, bw2.r * 0.45 + bw.a * 0.55 + 0.05 * cyl);
  float dragOn = max(max(bare, 0.6 * cyl), nearIn * 0.45 * markM);
  float sB = 0.5, bB = 0.5;
  if (dragOn > 0.0) sB = faceStable(vW, nt, vec2(0.0, 0.24), vec2(0.09, 0.0), lvl).b;
  // (c14: the horizontal dry bedding strokes are left out on coursed masonry - the drawn joints tell the
  // courses now, and two fetches go to the world zone fields instead)
  if (markM > 0.0 && coursed * wallFace * isFace < 0.5) bB = faceStable(vW, nt, vec2(0.21, 0.0), vec2(0.0, 0.62), lvl).b;
  // (the dry vertical drags are few, and most of them hang where the wall sheds dirt: under ledges, sills and tops)
  float streakD = smoothstep(0.905, 0.93, sB) * dragOn * mix(1.0, wallFace, 0.6) * mix(1.0, mix(0.3, 1.0, smoothstep(0.05, 0.4, stainPix)), wallFace);
  float bedL = smoothstep(0.80, 0.84, bB) * (1.0 - quiet) * markM;
  float bedD = smoothstep(0.17, 0.13, bB) * quiet * (1.0 - bare) * markM;
  float mk = det * (1.0 - 0.6 * lumpF) * (1.0 + 0.5 * nearK + 0.8 * nearIn);     // (within arm's reach the dry strokes are firm marks, not a tint)
  float marksLit = (1.0 - (0.055 * streakD + 0.05 * bedD) * mk + 0.04 * bedL * mk * (1.0 - streakD)) * (1.0 - 0.055 * dab * mk);
  float marksSh = (1.0 - (0.06 * streakD + 0.055 * bedD) * mk + 0.055 * bedL * mk * (1.0 - streakD)) * (1.0 - 0.05 * dab * mk);
  // rain: long streaks hanging from ledges, sills and broken tops, dense and dark right under the
  // ledge and thinning out downward over several courses; a few stray ones elsewhere
  float shed = smoothstep(0.30, 0.55, bw2.a);              // long stretches of ledge shed nothing
  // (a weep hangs from a ledge, a sill or a broken top - nowhere else - and every hand's width of wall
  // sheds a different length, 3 : 1: sL is the dirt as that column of wall sees it)
  float lenK = mix(0.33, 1.0, smoothstep(0.25, 0.75, colT.a * 0.6 + colT.g * 0.4));
  float sL = clamp(1.0 - (1.0 - stainTip) / lenK, 0.0, 1.0);
  float rain = toneStep(ws.b + sL * shed * 0.26 - 0.12, 0.815, 0.5, 0.0) * smoothstep(0.0, 0.2, sL * shed);
  // dark tongues hanging from every shedding edge: one ragged field, not separate streaks
  // (... which hangs from SOME stretches of a ledge only: under a string course it is a few separate
  // weeps a metre or so wide, never a band that follows the moulding)
  float shedT = smoothstep(0.44, 0.60, bw2.r * 0.5 + bw.g * 0.5);
  // ONE stain per shedding stretch: a curtain hanging from the ledge whose foot is a row of unequal
  // tapering fingers (how far it runs down is a smooth field along the wall: neighbours merge, the
  // tips are points). It is not cut out of a texture of tongues, so it has no square ends.
  // (the fingers are pointed: two saw waves along the wall, their phase pushed about by the slow field)
  float saw1 = 1.0 - abs(fract(hc * 2.1 + colT.a * 2.5) - 0.5) * 2.0, saw2 = 1.0 - abs(fract(hc * 0.83 + colT.a * 1.7 + 0.31) - 0.5) * 2.0;
  float drip = clamp((colT.a - 0.42) * 2.6, 0.0, 1.0) * shedT * mix(0.55, 1.0, ws.g) * (0.25 + 0.75 * saw1 * saw1 * mix(0.4, 1.0, saw2));
  float tongue = toneStep(stainPix + drip * 0.85 + (ws.r - 0.5) * 0.10, 1.05, pt.r, 0.05) * step(0.03, stainPix) * wallFace;
  float st = max(rain * mix(0.35, 1.0, calm), tongue) * wallFace * mix(0.6, 1.0, turn) * (1.0 - lumpF);

  // ---- joints, from this block's own coordinates (metres from its edges); found only within a
  // few metres and in a few patches beyond, lost elsewhere and on faces that turn away
  // world-fixed, fine: A ~4 cm drift, R dabs a few cm wide. Beyond ~25 m nothing it draws is a pixel wide: not read.
  vec2 wobUV = fp * 2.3;
  float wobK = 1.0 - smoothstep(19.0, 26.0, dist);
  vec4 wobT = vec4(0.5);
  if (wobK > 0.0) wobT = mix(wobT, texture(uBrush, wobUV), wobK);
  float wobN = wobT.a - 0.5;
  float wob = wobN * mix(0.012, 0.02, nearK);
#ifdef PAVING
  // Paving that is grown over is not painted at all: the ground itself shows (the paving is a mesh of
  // its own, with no depth pre-pass), so a buried slab is exactly the turf - no quad of another green.
  // (the same mask as the turf on the slabs further down; taken here, before the shadow is read)
  {
    // (c14: the paving that survives is two or three ISLANDS - one slow world field (wz, metres
    // across), the same from every viewpoint; no dab field in the mask (dab fields cut rectangles).
    // Inside an island the turf does not creep into every joint - only near the island's edge.)
    float islP = paveIsl(vW.xz, wz);
    float overP = 1.0 - toneStep(islP, PAVE_TH, pt.r * 0.5 + 0.25, 0.06);
    float dEP = min(min(uv.x, sz.x - uv.x), min(uv.y, sz.y - uv.y)) * step(0.7, n.y) * isFace;
    float creepP = smoothstep(0.50, 0.68, pt.g * 0.5 + bw.r * 0.5) * (1.0 - smoothstep(0.0, 0.05, islP - PAVE_TH));
    float gsP = max(overP, 1.0 - toneStep(dEP, 0.004 + 0.13 * creepP, pt.r * 0.5 + wobT.a * 0.5, 0.01 + 0.25 * creepP));
    if (gsP > 0.5 && nl.y > 0.7) discard;
  }
#endif
  // The drawn bed line does not sit on the stone's edge: it wanders up to a hand's width above or
  // below it, following a slow wall-fixed field that is different on every face direction. So the
  // courses are not parallel rulings, and a joint never turns a corner at the same height.
  float jo = ((bw.a - 0.5) * 0.13 + (bw2.a - 0.5) * 0.08) * wallFace * (1.0 - mould);
  float yv = uv.y + wob;
  float lB = yv - jo, lT = yv - sz.y - jo;                   // signed height above the two drawn bed lines
  if (cyl > 0.5) { lB = yv - abs(jo) * 0.6 - 0.012; lT = 9.0; }   // a drum draws only its own lower bed
  float dSide = min(uv.x, sz.x - uv.x) - wob;
  float region = 0.75 + 0.5 * bw.r;                          // mortar is fatter in some parts of the wall
  float wBed = (0.006 + 0.007 * bw2.r + 0.006 * wobT.a * nearK) * region;
  float wPerp = (0.004 + 0.005 * fract(tone * 29.71)) * region;
  float minW = px * 0.8;
  float aa = px * 1.1 + 0.004 * (1.0 - nearK);
  // (a course line is hinted out to the middle distance: there it is a faint stroke two pixels
  // wide - thinner, the paint filter eats it - and it fades with distance, not with a ruler)
  // (c14: a bed joint on a coursed wall is a firm dark stroke ~2.5 px wide, so the paint filter keeps it)
  // (its width is measured in metres of WALL HEIGHT per pixel - a gable seen from below is foreshortened)
  float pyW = clamp(fwidth(vW.y), px, px * 3.0);
  float hw = max(mix(wPerp, wBed * 0.5, wallFace), mix(minW, max(pyW * 1.3, 0.0032), wallFace * coursed));
  float jwS = min(max(wPerp, mix(minW, max(px * 1.2, 0.003), wallFace * coursed)), max(px * 2.0, 0.004));
  hw = min(hw, max(pyW * 2.2, 0.0045));                         // (at nose range a joint is still a drawn line, not a slot)
  // (not every bed is drawn: about four in ten are left out, by the height of the bed itself, so the
  // stones a painter finds are of different sizes - one, two, three courses high)
  float bedY = (vW.y - uv.y) * 13.0, cw_ = wallFace * coursed * (1.0 - nearIn);
  float kB = max(step(0.40, hash11(floor(bedY) + 3.0)), 1.0 - cw_), kT = max(step(0.40, hash11(floor(bedY + sz.y * 13.0) + 3.0)), 1.0 - cw_);
  { float nrw = step(1.5, vData.z) * isFace * wallFace * coursed; kB = max(kB, nrw); kT = max(kT, nrw); }   // (c14: a pier or buttress keeps every course)
  float aaJ = pyW * 0.75;
  float narrowC = step(1.5, vData.z) * isFace * wallFace * coursed;
  float jdBed = max((1.0 - smoothstep(hw - aaJ, hw, abs(lB))) * kB, (1.0 - smoothstep(hw - aaJ, hw, abs(lT))) * kT);
  // (c14: a tall stone of a pier or buttress - a 0.9 m foot stone - is drawn as two or three courses:
  // the painter coursing the mass, not the builder's stone)
  if (sz.y > 0.6 && sz.y < 3.0 && narrowC > 0.5) {
    float nC = floor(sz.y / 0.32 + 0.5), lM = fract((yv - jo) / sz.y * nC + 0.5) - 0.5;
    jdBed = max(jdBed, (1.0 - smoothstep(hw - aaJ, hw, abs(lM) * sz.y / nC)) * step(0.5 / nC, min(uv.y, sz.y - uv.y) / sz.y + 0.01));
  }
  float jFadeBed = mix(1.0 - smoothstep(18.0, 42.0, dist), (1.0 - smoothstep(34.0, 80.0, dist)) * mix(0.8, 1.0, nearB), wallFace * coursed);
  float jFade = 1.0 - smoothstep(18.0, 42.0, dist);
  // (a perpend is drawn on one stone in three, and never into the corners of the stone: a joint is a
  // short stroke, not the outline of a rectangle)
  // every joint is a stroke a few hands long with gaps as long (world-fixed), and it goes where the
  // wall is seen at a grazing angle (there a ruled course line measures the plane in perspective).
  // A perpend is drawn only in a gap of the bed strokes: the two never meet as a ruled L.
  float jSn = pt.r * 0.55 + wobT.r * 0.2 + bw.a * 0.25;
  float jStroke = smoothstep(0.42, 0.50, jSn + 0.13 * nearIn);
  // (a perpend never reaches the bed lines: it is a short upright stroke in the middle of the course.
  // One stone in three has one; within arm's reach, two in three.)
  float fP9 = fract(tone * 9.13);
  float jPerp = step(0.66, fP9) + (1.0 - step(0.66, fP9)) * step(0.30, fP9) * nearIn;
  float jd = max(jdBed * jFadeBed * jStroke, (1.0 - smoothstep(jwS - px * 0.75, jwS, dSide)) * jPerp * mix(jFade, jFadeBed, wallFace * coursed) * mix(smoothstep(0.05, 0.12, min(uv.y, sz.y - uv.y)), 1.0, nearIn * 0.8) * smoothstep(0.30, 0.42, wobT.g * 0.5 + pt.r * 0.5));
  // found in patches only: about a third of any wall carries joints, near or far
  // (c14: clustered on ~35-40% of a wall, the clusters a world 3D field - not dab rectangles)
  float jMask = toneStep(bw2.a * 0.7 + bw.a * 0.3, 0.465, pt.g, 0.05);
  // (a pier or a buttress - a narrow coursed mass - is drawn coursed over most of its height, as ac12's are)
  jMask = max(jMask, toneStep(bw2.a * 0.6 + wz * 0.4, 0.27, pt.g, 0.05) * narrowC);
  float jNear = nearIn;   // within arm's reach most stones are found - each as broken strokes
  float jCover = max(jMask * mix(1.0, 0.7, nearB), jNear);
  float lift = smoothstep(0.25, 0.5, pt.b * 0.5 + bw.r * 0.6 + nearB * 0.3);  // the brush lifts off now and then
  lift = mix(lift, 1.0, wallFace * coursed);   // (c14: on coursed masonry the one dropout is jStroke's ~50%)
  float hasJ = isFace * (1.0 - lumpF);                       // blocks, and the two ends of a drum
  // every joint is a stroke a few hands long with gaps as long (world-fixed), and it goes where the
  // wall is seen at a grazing angle (there a ruled course line measures the plane in perspective)
  float jTurn = smoothstep(0.22, 0.55, facing);
  // (on a coursed wall the patches of found stones are drawn nearly as firmly on the back planes: a few
  // clusters of blocks on the lit gable are what tells the eye it is masonry)
  float joint = jd * jCover * uJoint * hasJ * lift * det * jTurn;
  float jBoost = max(det, turn * 0.85 * wallFace * coursed) / max(det, 0.05);       // (in the light only: see litC)
  float lipW = max(0.004 + 0.005 * fract(tone * 5.3), px * 1.1);
  float lipOn = max(cap * turn, jCover * det * step(0.8, fract(tone * 5.3)) * smoothstep(0.3, 0.45, pt.b + nearK * 0.2));
  float lipD = min(abs(lB + hw + lipW * 0.5), abs(lT + hw + lipW * 0.5));
  // (the pale lip is brushed too: it comes and goes along the stone, never a ruled hairline)
  float edgeHL = (1.0 - smoothstep(lipW * 0.5 - aa, lipW * 0.5, lipD)) * wallFace * lipOn * jFade * isBlock * smoothstep(0.42, 0.56, pt.r * 0.5 + pt.g * 0.5);
  // the arris of a pier or a buttress (the builder marks which side of which stone: fract(aData.z))
  // carries a pale line, a finger wide, brushed: it comes and goes up the corner
  {
    float ar = floor(fract(vData.z) * 4.0 + 0.5);
    if (ar > 0.5) {
      float arD = min(mix(9.0, uv.x, step(0.5, mod(ar, 2.0))), mix(9.0, sz.x - uv.x, step(1.5, ar))) + wob * 0.6;
      float arW = max(0.02 + 0.012 * bw.r, px * 1.5);
      float arris = (1.0 - smoothstep(arW - aa, arW, arD)) * isFace * wallFace * smoothstep(0.40, 0.52, pt.g * 0.45 + bw.r * 0.3 + colT.a * 0.25) * (1.0 - smoothstep(40.0, 80.0, dist));
      edgeHL = max(edgeHL, arris * turn);
    }
  }
  // a moulding (string course, hood mould, sill) is two strokes on the wall: a dark line under
  // it and a pale line along its top, each a couple of centimetres wide and lost here and there
  float keepD = smoothstep(0.22, 0.34, bw.r * 0.6 + pt.g * 0.4), keepL = smoothstep(0.30, 0.42, bw.g * 0.6 + pt.r * 0.4);
  {
    float mv = mix(uv.y, sz.y - uv.y, mouldFlip) + wob * 0.5;
    float mw = max(0.026, px * 2.5), mh = sz.y;
    float mD = (1.0 - smoothstep(mw - aa, mw, mv)) * keepD;
    float mL = (1.0 - smoothstep(mw - aa, mw, mh - mv)) * keepL;
    // the dressed stone lining an opening (cap 4): a light edge along the arris of the reveal and a
    // fine dark line a finger outside it, both lost here and there
    if (revEdge > 0.5) {
      float rw = max(0.02, px * 1.6);
      mL = (1.0 - smoothstep(rw - aa, rw, mv)) * keepL;
      mD = (1.0 - smoothstep(rw * 0.45 - aa, rw * 0.45, abs(mv - rw * 1.9))) * keepD * smoothstep(0.40, 0.52, pt.r * 0.5 + bw.a * 0.5) * 0.75;
    }
    // (the two strokes that draw a capital are broken: each is there on about half of its length)
    float duty = smoothstep(0.42, 0.52, pt.r * 0.55 + bw.a * 0.45);
    mD *= mix(1.0, duty, cyl); mL *= mix(1.0, 1.0 - duty, cyl);
    float mOn = mould * isFace * wallFace * (1.0 - smoothstep(30.0, 60.0, dist));
    joint = mix(joint, mD * 1.15 * jTurn, mOn);
    edgeHL = mix(edgeHL, mL * jTurn, mOn);
  }

  // ---- the architect's drawing, ruled on the wall plane from line data (no geometry): plinth
  // line, string courses, cornice and set-off lines - each a dark stroke with a pale one above it -
  // and blind slits and putlog holes: small dark shapes with a pale dressed frame. World-anchored;
  // firm on the near planes, lost in places, thinning on the back planes and with distance.
  // (the data comes with the stone: the one line that crosses it and the one slit that touches it)
  float slit = 0.0;
  if ((vWall.z > 0.0 || vSlit.w != 0.0) && wallFace > 0.5 && breakTop < 0.5) {
    // (the line does not turn a corner at one height: faces looking east / west carry it a little lower)
    float yy = vW.y + wobN * 0.014 + (bw.a - 0.5) * 0.20 + (colT.a - 0.5) * 0.10 + (pt.g - 0.5) * 0.04 + (xFace - 0.5) * 0.07;
    float lw0 = max(0.026, px * 2.3) * (0.45 + 1.1 * ws.a);
    float fD = 0.0, fL = 0.0;
    if (vWall.z > 0.0) {
      float lw = lw0 * (0.55 + 0.6 * vWall.z), dy = yy - vWall.y, k = min(1.0, vWall.z * 1.3);
      fD = (1.0 - smoothstep(lw * 0.5 - aa, lw * 0.5, abs(dy + lw * 0.5))) * k;
      fL = (1.0 - smoothstep(lw * 0.7 - aa, lw * 0.7, abs(dy - lw * 0.95))) * k;
    }
    float lf = (1.0 - smoothstep(45.0, 95.0, dist)) * mix(1.0, 0.55, pl) * turn;
    if (vSlit.w != 0.0) {
      // a blind slit or a putlog hole is ONE flat dark brush mark: no frame, no reveal, no lit side.
      // Its outline is brushed (world-fixed), its foot is torn. A putlog hole is a middle-distance
      // mark only: it fades out beyond ~12 m and inside ~3 m.
      float hs = abs(vSlit.z), hh = vSlit.w;
      float rag = (pt.r - 0.5) * 0.022 + (wobT.r - 0.5) * 0.006;
      float ds = vWall.x - vSlit.x + wobN * 0.02 + (bw.a - 0.5) * 0.04, yr = vW.y - vSlit.y;
      float half_ = hs;
      if (vSlit.z > 0.0) { float dA = yr - (hh - 1.732 * hs); if (dA > 0.0) half_ = sqrt(max(4.0 * hs * hs - dA * dA, 0.0)) - hs; }
      float e = max(abs(ds) - half_, max(-yr + (pt.g - 0.4) * 0.16 * min(hh, 0.6), yr - hh)) + rag * min(1.0, hs * 12.0);
      float isPut = step(hh, 0.3);
      float fadeP = smoothstep(2.6, 4.6, dist) * (1.0 - smoothstep(9.0, 13.0, dist));
      slit = (1.0 - smoothstep(-aa, aa, e)) * mix(1.0, fadeP, isPut) * (1.0 - smoothstep(55.0, 100.0, dist));
    }
    // (a ruled line is drawn in segments a metre or so long with gaps between: never one line the
    // length of the wall, and never round a corner)
    float seg = smoothstep(0.46, 0.56, bw.g * 0.45 + pt.r * 0.3 + bw2.r * 0.25);
    joint = max(joint, fD * keepD * seg * lf * 1.15 * jTurn);
    edgeHL = max(edgeHL * (1.0 - fD), fL * keepL * seg * lf * jTurn);
  }

  // ---- the foot of the wall: a dark green-ochre stained band a metre or more high, in two flat
  // steps (the band, and a darker core at the ground), and moss lowest. Wall-scale shapes with slow
  // lobed upper edges (large world-fixed fields only - no dabs, so no torn fringe). Opaque.
  // Its height wanders between a hand and a man's height along the wall (slow world-fixed field);
  // its top is torn upward in dry vertical strokes; it is the damp of the GROUND creeping up, so it
  // nearly goes from sunlit faces and from low free-standing blocks (vWall.w), and it takes the
  // green of the grass at its foot.
  float footOn = wallFace * (1.0 - lumpF) * (1.0 - mould * (1.0 - revEdge));
  float footK = uFoot * (1.0 - vWall.w) * (1.0 - 0.8 * cyl);    // (a drum standing in the grass is not stained like a wall)
  float footH = mix(0.2, 1.15, smoothstep(0.30, 0.72, bw2.a * 0.55 + bw2.r * 0.45)) * footK;
  float tornF = clamp((ws.a - 0.5) * 1.6 + 0.5, 0.0, 1.0) * 0.55 + softN * 0.2 + ws.r * 0.25;                       // (world-fixed only: a screen-sized stroke here re-tears the edge as the viewer walks up)
  // Within a few metres the band is not a shape any more: its edge softens to a scumble a hand
  // wide, its teeth shorten and its colour closes on the wall's (footNear, below) - at nose range it
  // is two close brushed tones, not a stencil.
  float footNear = smoothstep(1.2, 4.2, dist);
  float footW = 0.0, footAmp = mix(0.6, 1.0, footNear);
  float fxA = footH - base + (tornF - 0.5) * (0.5 * footK + 0.15) * footAmp;
  float fxB = footH * 0.42 - base + (tornF - 0.5) * (0.45 * footK + 0.1) * footAmp;
  float fwA = max(max(fwidth(fxA), 0.004), footW), fwB = max(max(fwidth(fxB), 0.004), footW);
  float footA = smoothstep(-fwA, fwA, fxA) * footOn;
  float footB = smoothstep(-fwB, fwB, fxB) * footOn;
  float footC = mix(0.45, 1.0, footNear);                      // how far the band's colour departs from the wall's
  float m = toneStep(0.28 - base, 0.0, softN * 0.7 + pt.g * 0.3, 0.6) * wallFace * uMossAmt * (1.0 - lumpF);   // (c14: a loose stone has no moss band - its foot is the turf skirt)
  // on a lump the moss is a brushed cap over the top of the heap: some lumps have one
  float lump = lumpF * (1.0 - breakTop);
  float mossTop = mix(step(0.7, nl.y) * toneStep(pt.r * 0.6 + bw.g * 0.4, 0.60, pt.g, 0.12) * (1.0 - cyl), 0.0, lump);   // (a loose stone lying in the grass carries NO moss patch: light top, side, shade, one crack)   // (a brushed patch or two on the top - never the whole face as one green polygon)
  m = max(m, mossTop * uMossAmt * (1.0 - breakTop));
  m *= step(base, 3.2);
  // moss sits on the ledges and hangs a hand or two down from them: a few places per wall only
  // (a ragged patch: it thins out sideways and downward on the brush, and never ends on the corners of the ledge)
  // (its foot is not a level line a fixed way below the ledge and its ends are not the corners of the
  // pier: it comes and goes along the wall on a slow wave, and thins out downward on the brush)
  float mSide = 0.5 + 0.5 * sin(hc * 1.7 + pc * 0.25 + 2.0 * sin(hc * 0.61 + 1.0) + xFace);
  float mLedge = toneStep(stainPix * 0.42 + pt.g * 0.26 + colT.a * 0.20 + bw2.a * 0.12 - (1.0 - mSide) * 0.22, 0.80, pt.r, 0.12) * wallFace * (1.0 - lumpF) * (1.0 - mould) * step(0.2, stainPix) * (1.0 - vWall.w * 1.4);
  m = max(m, mLedge * uMossAmt * 0.5);
  // the top of a broken wall: rubble core under moss and grass, with bare stone showing through in patches
  // (only where the break looks up: the plumb end of a broken course is plain wall, or every course end along a slope is a little green riser)
  m = max(m, breakTop * step(0.45, n.y) * toneStep(bw.g * 0.55 + bw2.r * 0.45, 0.66, pt.r, 0.25));
  // ... and the top of a WALL is drawn, not modelled: it is the tone of the wall's face, and its
  // thickness is told by one ragged crack line wandering along its middle (seen from above)
  if (breakTop > 0.5 && dot(topAxis, topAxis) > 0.25 && n.y > 0.45) {
    float ac = dot(vW.xz - vEc.xz, topAxis.xz) + (bw.a - 0.5) * 0.55 + (pt.r - 0.5) * 0.14;
    float cw = max(0.02, px * 1.3);
    joint = max(joint, (1.0 - smoothstep(cw - aa, cw, abs(ac))) * smoothstep(0.34, 0.46, bw.r * 0.6 + pt.g * 0.4) * 0.8 * (1.0 - smoothstep(40.0, 80.0, dist)));
  }
  float mA = mix(1.0, 0.5, breakTop);                        // (on a break the moss is a thin green-grey, still one flat tone)

  // ---- lit side
  vec3 lit = uLit * mix(0.975, 1.02, b2);                    // bleached toward the top, in one step
  vec3 stC = vec3(0.80, 0.825, 0.835);
  vec3 litC = lit * famLit * marksLit;
  // one cool violet-grey wash per stretch of wall, hanging from a ledge or the broken top (a FEW big
  // shapes placed by the architecture, never a scatter)
  // (c14: both stains are read from the world 3D field wz and the per-vertex stain - no dab texture
  // in their threshold except a small nick, so their edges are wandering curves, never rectangles)
  float coolL = toneStep(wz * 0.55 + bw2.a * 0.15 + stainPix * 0.40, 0.71, pt.g * 0.5 + 0.25, 0.04) * wallFace * (1.0 - lumpF) * (1.0 - mould);
  litC = mix(litC, litC * vec3(0.925, 0.92, 0.95), coolL * uWarm);
  // ochre and rust wept out under string courses, sills and broken tops: ragged scraps hanging from
  // the feature, on some stretches of it only
  float rust = toneStep(stainPix * 0.62 + wz * 0.38 + (ws.a - 0.5) * 0.10, 0.66, pt.r * 0.5 + 0.25, 0.05) * wallFace * (1.0 - lumpF) * (1.0 - mould) * step(0.05, stainPix) * (1.0 - cyl);
  litC = mix(litC, litC * vec3(0.975, 0.92, 0.82), rust * uWarm * 0.75);
  litC = mix(litC, litC * stC, st);
  // the foot in light: an ochre stain creeping up from the ground, its low core olive
  litC = mix(litC, lit * mix(vec3(0.955, 0.895, 0.715), vec3(0.76, 0.81, 0.55), footB) * marksLit, footA * mix(0.62, 0.85, footB) * uWarm * footC * (1.0 - 0.8 * uSnow));
  litC = mix(litC, mix(litC, uMoss, mA * (1.0 - 0.75 * uSnow)), m);
  // a loose block, a drum or a slab carries a few short broken strokes of its own (old joints, cracks)
  if (own > 0.5) {
    float ck = smoothstep(0.89, 0.92, pt.b) * smoothstep(0.50, 0.60, bw.r * 0.5 + wobT.a * 0.5) * (1.0 - smoothstep(14.0, 30.0, dist));
    joint = max(joint, ck * own * (1.0 - breakTop) * turn * 0.85 * (1.0 - lumpF));
  }
  // (c14) a loose stone carries one or two CRACKS: the contour of a slow world-fixed field (features
  // ~0.8 m) drawn as a broken line ~1.5 px wide; on two stones in three
  if (lumpF > 0.5 && breakTop < 0.5) {
    float ckF = texture(uBrush, vec2(vW.x * 0.31 + vW.y * 0.19 + 0.13, vW.z * 0.31 - vW.y * 0.23 + 0.71)).a;
    float ckD = abs(ckF - 0.5) / max(fwidth(ckF), 1e-5);
    float ckL = (1.0 - smoothstep(0.5, 1.3, ckD)) * smoothstep(0.44, 0.52, pt.r * 0.6 + bw.a * 0.4) * step(0.34, fract(tone * 3.71)) * (1.0 - smoothstep(10.0, 22.0, dist));
    joint = max(joint, ckL * 0.9);
  }
  litC = mix(litC, uJointLit, min(joint * jBoost, 1.0) * mix(0.86, 0.9, nearK) * (1.0 - edgeHL));
  litC = mix(litC, uPale, edgeHL * 0.85);

  // ---- shadow side: grey-violet in three FLAT bands: a warm bounce step near the ground, neutral
  // in the middle, cooler up high (sky). The boundaries are wall-scale brushed contours that pay
  // no attention to the blocks; hard in places, lost in others.
  // (the bounce zone is stepped: warmest and palest within a metre of the lit ground, a second step to ~2.5 m)
  // (painted ambient, the same from every side: ONE soft gradient - warm and a little paler where the
  // lit ground throws light back, low on the wall; cooler toward the top - on its own slow wandering
  // height field. No bands, no N.L: the shade side of a wall is one shape with a breath in it.)
  float gH = bandH + (bw2.g - 0.5) * 1.2;
  // three FLAT zones with brushed edges (no gradient): warm bounce low, the plain shade, sky high
  float bK = 1.0 - 0.6 * lumpF - 0.5 * cyl;                  // (a shaft keeps to its two tones: the zones are only a breath on it)
  // (the height of each edge is the element's own: it never runs level from pier to pier)
  // The zones are STAINS tied to the building, not bands at a height. The warm bounce creeps up from
  // the ground: its top is a slow wall-space field (metres up and down along the wall), it climbs
  // toward the corners and jambs of each mass and sinks in the middle of a panel, and every pier has
  // its own height. The cool tone is a wash hanging from broken tops and ledges on some stretches.
  // Never level, never along a moulding; a narrow mass shows one of the two only.
  // The zone fields live in WALL-PLANE coordinates shared by everything that stands in that plane
  // (wall, jamb, pilaster, buttress face): slow waves along the wall. An element only shifts the
  // threshold by a hand or two (eh), so a patch runs on past a pilaster or a jamb with a small jog -
  // it never ends on the ruled vertical where one element meets the next.
  // (c14: TWO zones on every shaded wall - a cooler upper ~60% and a warmer, paler foot - split by
  // one wandering boundary 1-3.5 m up. Its height is a WORLD 3D field (wz), so it runs on across a
  // corner, a pilaster or a buttress face without a jog: no zone ever fills one face between arrises.)
  float lowW = clamp(vWall.w * 1.6, 0.0, 1.0);              // a wall that is down to a footing is ONE tone (the warm one)
  float zB = 2.1 + (wz - 0.5) * 9.0 + (wv - 0.5) * 3.2 + lowW * 6.0;
  float zLo = (1.0 - toneStep(base, zB, pt.r * 0.35 + softN * 0.65, 0.5)) * bK;
  float zHi = (1.0 - zLo) * wallFace * (1.0 - lumpF) * (1.0 - cyl);
  zHi = max(zHi, step(5.0, base) * step(0.7, nl.y) * (1.0 - breakTop) * isBlock * (1.0 - lumpF));   // (paving and steps: the tone of the sky, as before)
  vec3 shade = mix(uShadeMid, mix(uShadeMid, uShadeLo, 0.55) * vec3(1.02, 1.005, 0.96), zLo);
  shade = mix(shade, mix(uShadeMid, uShadeHi, 0.45) * 1.03, zHi);
  vec3 shade0 = shade;
  shade *= famSh * marksSh;
  shade = mix(shade, shade * vec3(1.045, 0.99, 0.92), rust * uWarm * 0.6);
  shade = mix(shade, shade * vec3(0.86, 0.87, 0.90), st);
  shade = mix(shade, shade0 * mix(vec3(0.90, 0.94, 0.83), vec3(0.78, 0.875, 0.72), footB) * marksSh, footA * uWarm * footC * (1.0 - 0.8 * uSnow));
  shade = mix(shade, mix(shade, uMossShade, mA), m);
  // -- found edges. Two walls that meet at a corner never share one tone: the planes that look
  // east / west sit a step below the ones that look north / south, whatever the light does. So a
  // pier or buttress corner is a firm vertical with a tone change across it. (A cap takes the
  // step of the face it is painted with - see the vertex shader.)
  shade *= mix(1.0, mix(1.02, 0.965, xFace), axial * wallFace * coursed);
  shade *= mix(1.0, mix(1.02, 0.965, vTop.z), breakTop * coursed);
  // A shaft is two tones and a line. The split between them is the sun's terminator, fixed in the
  // world: in sunlight it divides light from shade; where a cast shadow lies over the shaft the
  // same line divides a paler strip from a darker one. Nothing on it follows the viewer.
  vec2 sunH = normalize(uSunDir.xz);
  float wTop = vTopNdl;
  float ndl = mix(dot(nl, uSunDir), vTop.x, breakTop);      // a break top: the tone of the side under it (see the vertex shader)
  // the terminator of a shaft is a DRAWN edge: it wanders a hand's width either way up the shaft on
  // a slow field fixed to the column (height and the column's own place), so it is never the ruled
  // line where N.L = 0
  if (cyl > 0.5 && wallFace > 0.5) {
    vec2 tq = vec2(vW.y * 0.085 + vEc.x * 0.37, vEc.z * 0.29 + vW.y * 0.021);
    ndl += (texture(uBrush, tq).a - 0.5) * 0.62 + (texture(uBrush, tq * 3.1 + 0.4).a - 0.5) * 0.2 + (softN - 0.5) * 0.3;
  }
  float form = toneStep(smoothstep(-0.05, 0.2, ndl), 0.5, edgeN, mix(eAmp, 0.45, cyl));
  shade *= mix(1.0, mix(0.95, 1.19, form), cyl * wallFace);
  float lipSh = edgeHL * 0.6;
  shade = mix(shade, mix(shade, uJointShade, 0.62), min(joint * jBoost, 1.0) * mix(0.72, 0.8, nearK) * (1.0 - lipSh));   // (c14: the same strokes, at lower contrast)
  shade = mix(shade, shade * 1.13 + 0.01, lipSh);

  // ---- the darkest tone: soffits and reveals: violet-black, in two flat steps (a warmer, paler
  // one low down where the ground throws light back) with a brushed edge; a few strokes and ticks
  float under = step(nl.y, -0.3) * (1.0 - lumpF);            // (a boulder has no dark soffit: its underside is its shade)
  float reveal = step(0.5, ao);
  float deep = clamp(max(under * 0.85, ao), 0.0, 1.0);
  float lowBand = 1.0 - toneStep(bandH, mix(1.5, 2.6, under), eN, bAmp);
  vec3 deepC = mix(uDeep * 1.10, uDeep * vec3(1.46, 1.36, 1.30), lowBand);
  deepC *= mix(1.0, marksSh, 0.7);
  deepC = mix(deepC, uDeep * 0.85, joint * 0.5 * (1.0 - lipSh));
  deepC = mix(deepC, deepC * 1.12 + 0.01, lipSh);
  // the reveal of an opening is a flat dark shape from sill to crown, with one more shape inside
  // it: the bounce step near the ground. No joints, no sun patches measure the wall's thickness.
  // ... and something to look at inside: the deepest dark gathers under the head of the opening,
  // and one or two tall brushed shapes (a pier, a jamb seen in the gloom) stand in it.
  {
    float rTop = toneStep(bandH, 3.3, eN, bAmp * 1.2);
    float rSh = toneStep(ws.g * 0.55 + ws.r * 0.45, 0.56, pt.r, 0.05);
    vec3 rv = mix(uDeep * vec3(1.14, 1.09, 1.15), uDeep * vec3(1.0, 0.96, 1.05), rTop);
    rv = mix(rv, uDeep * vec3(1.46, 1.36, 1.36), lowBand);
    rv *= mix(vec3(1.0), vec3(0.90, 0.89, 0.93), rSh);
    deepC = mix(deepC, rv, reveal);
  }
  deepC = mix(deepC, uMossShade * 0.8, m * 0.5);
  vec3 slitC = uDeep * vec3(1.06, 1.0, 1.08);

  // ---- planned planes: one flat offset per element. Foreground: a little darker and warmer.
  // Back: paler, cooler, greyer (and less detail, above). Lit, shade and dark all separate.
  float pa = uPlaneAmt;
  litC = mix(litC, litC * vec3(0.965, 0.945, 0.905), nearP * pa);
  litC = mix(litC, mix(litC, vec3(0.80, 0.84, 0.86), 0.5) * 1.03, farP * pa * 0.7);
  shade = mix(shade, shade * vec3(0.89, 0.87, 0.89), nearP * pa);
  shade = mix(shade, mix(shade, vec3(0.60, 0.66, 0.75), 0.6), farP * pa * 0.65);
  deepC = mix(deepC, deepC * vec3(0.92, 0.89, 0.90), nearP * pa);
  deepC = mix(deepC, mix(deepC, vec3(0.50, 0.56, 0.66), 0.6), farP * pa * 0.4);
  slitC = mix(slitC, slitC * vec3(0.92, 0.89, 0.90), nearP * pa);
  slitC = mix(slitC, mix(slitC, vec3(0.50, 0.56, 0.66), 0.6), farP * pa * 0.4);

  shade = mix(shade, deepC, deep);

  // The cast shadow. On a shaft it is taken once per height, at the shaft's sunward edge (found
  // from the element's axis), so it crosses the column as one cut - no ruled notches where the
  // lattice meets a surface that lies along the light.
  vec3 sp = vW + n * 0.06, sn = n;
  if (lumpF > 0.5 && lnMode > 0.5 && lnMode < 2.5) { sp = vW + nl * 0.3; sn = nl; }   // a lump is not shaded by its own facets: read the shadow just outside the planned mass
  if (cyl > 0.5 && wallFace > 0.5) { sp = vec3(vEc.x, vW.y, vEc.z) + vec3(sunH.x, 0.0, sunH.y) * 0.5; sn = normalize(vec3(sunH.x, 0.5, sunH.y)); }
  // (the map is not read where the answer cannot matter: on faces turned from the sun and in reveals)
  float sh = 0.0;
  if (reveal < 0.5 && (breakTop > 0.5 ? max(vTop.x, vTop.y) : ndl) > -0.06) sh = shadowSpline(sp, sn, (vec2(bw.a, bw.r) - 0.5) * vec2(0.9, 0.5));
  sh *= 1.0 - reveal;                                        // an arch reveal is one flat dark shape: no sun patches measure its depth
  float l = min(smoothstep(-0.05, 0.2, ndl), sh);
  float t = toneStep(l, 0.5, eN, eAmp);
  // lit planes separate by flat steps: top, sun side, grazing side (a rounded mass has one lit tone)
  // a rock is two brushed tones in the light (a half-tone turning toward the terminator, laid in
  // dabs) and carries a few pale dabs of bounce in its shade; its terminator is broken by the brush
  float lumpAny = lumpF * (1.0 - breakTop);
  // (world-fixed fields only in every light threshold: nothing here changes with the viewer's distance)
  float eNl = mix(eN, wobT.r * 0.5 + pt.r * 0.5, lumpAny), eAl = mix(eAmp, 0.62, lumpAny);
  float halfT = toneStep(smoothstep(-0.05, 0.75, ndl), 0.52, pt.g * 0.55 + pt.r * 0.45, 0.6);
  litC = mix(litC, litC * vec3(0.905, 0.89, 0.875), (1.0 - halfT) * lumpAny);
  // (its shade is ONE tone: dabs of bounce in it made a mottled, textured lump)
  // the edge of a cast shadow is broken in leaf-sized dabs, and a sun patch never sits on the shade as
  // a cut-out: a warm half-tone, one step between shade and light, rims it
  // (dabs a hand or two wide, world-fixed; where they would be smaller than a few pixels - far off, or
  // seen from above - the edge is plain. The half-tone is a FRINGE, not a rim: it lies on the shadow
  // side only, its width runs from nothing to a hand's breadth along the edge, and on well over half
  // of the edge there is none. Far off (a sun patch a few pixels across) there is none at all.)
  float castE = (1.0 - lumpAny) * (1.0 - cyl);
  float farE = smoothstep(0.006, 0.014, px);
  float dapK = 0.6 * castE * (1.0 - farE) * (1.0 - hiK);
  // (the dabs only BITE into the light - min(.., 0.5) - they never lift a fleck of light out of the shade)
  eNl = mix(eNl, min(pt.r, 0.5) * 0.7 + 0.1 + eN * 0.3, dapK); eAl = mix(eAl, max(eAl, 0.42), dapK);
  eAl = mix(eAl, min(eAl, 0.3), hiK * castE);
  // (a fleck of leaf shadow too faint to be a shape is left out: on a wall the cut is taken a little on the dark side)
  float thL = 0.5 - 0.08 * castE;
  // ... and where the sun's share is under a fifth there is no light at all, whatever the brush does:
  // no stray fleck on a shaded wall (a cut on the smooth world-fixed field itself)
  float lk = mix(smoothstep(0.15, 0.23, l), 1.0, lumpAny);
  t = toneStep(l, thL, eNl, eAl) * lk;
  float rimW = smoothstep(0.70, 0.90, bw.g * 0.5 + pt.g * 0.5) * (1.0 - farE) * (1.0 - hiK);
  float tRim = toneStep(l, thL - 0.12 * rimW, eNl, eAl) * castE * step(0.01, rimW) * lk;
  float plane = mix(0.935 + 0.065 * step(0.55, ndl) + 0.03 * step(0.7, nl.y) * (1.0 - breakTop), 0.975, max(cyl, lumpF));
  vec3 c = mix(shade, litC * plane, t);
  c = mix(c, mix(shade, litC * plane, 0.40) * vec3(1.05, 1.0, 0.93), max(tRim - t, 0.0));
  if (breakTop > 0.5 && wTop < 0.999) {
    // the same top as the wall's other face paints it; the two colours are mixed, not the threshold
    float t2 = toneStep(min(smoothstep(-0.05, 0.2, vTop.y), sh), 0.5, eN, eAmp);
    c = mix(mix(shade, litC * (0.935 + 0.065 * step(0.55, vTop.y)), t2), c, wTop);
    t = mix(t2, t, wTop);
  }
  c = mix(c, slitC, slit);

  // ---- grass against the stone. Where stone stands in the turf the grass overlaps its foot: an
  // irregular fringe of blades (clumps along the wall, bare stretches between), in the tone of the
  // grass that stands there. World-fixed. On a slab or a step the turf creeps in over the edges.
  if (base < 0.4 || base > 5.0) {
    vec3 gcol = mix(vec3(0.285, 0.475, 0.385), vec3(0.56, 0.73, 0.41), t);
    if (uSnow > 0.5) gcol = mix(SNOW_S, SNOW_C, t);            // (the drift against the foot)
    float tri1 = 1.0 - abs(fract(hc * 7.3 + colT.a * 3.0) - 0.5) * 2.0;
    float tri2 = 1.0 - abs(fract(hc * 3.1 + colT.a * 5.0 + 0.31) - 0.5) * 2.0;
    float clump = smoothstep(0.38, 0.62, colT.a * 0.6 + bw2.r * 0.4);
    // (far off the fringe keeps a few pixels of height, and here and there a low mound of weeds stands
    // against the stone: the wall meets the grass on an irregular line, never along its own base)
    float mound = smoothstep(0.52, 0.70, pt.g * 0.6 + bw2.a * 0.4) * (0.10 + 0.22 * pt.r) * wallFace * (1.0 - cyl) * (1.0 - lumpF);
    float gh = ((0.035 + clump * (0.09 * tri1 + 0.17 * tri2 * tri2)) * max(1.0, px * 55.0) + mound) * step(0.3, uMossAmt);
    // (c14: round a loose stone the turf is a ragged SKIRT - pointed tufts of very different heights,
    // some reaching a third of the way up, bare stretches between - never a level band)
    float triL = 1.0 - abs(fract(hc * 11.0 + colT.a * 4.0) - 0.5) * 2.0;
    gh = mix(gh, ((0.03 + 0.05 * tri1) + clump * (0.10 * tri2 * tri2 + 0.12 * triL * triL * triL)) * max(1.0, px * 55.0) * step(0.3, uMossAmt), lumpF);
    float gx = gh - base, gw = max(fwidth(gx), 0.003);
    float fr = smoothstep(-gw, gw, gx) * step(abs(n.y), mix(0.6, 0.9, lumpF)) * (1.0 - cyl * step(base, -1.0));
    float slab = step(5.0, base) * step(0.7, nl.y) * isBlock * (1.0 - lumpF) * (1.0 - breakTop);
    // (a slab has no thickness for the painter: its edge faces, sawn or broken, are turf)
    float dE = min(min(uv.x, sz.x - uv.x), min(uv.y, sz.y - uv.y)) * step(0.7, n.y) * isFace;
    // Paving: the turf lies over the stone in big brushed shapes that take no notice of the slabs -
    // an island of bare stone here, a stretch grown over there - and inside an island it only creeps
    // into a joint in places. No stripe, no comb, no outline round every slab.
    float isl = paveIsl(vW.xz, wz);
    float over = 1.0 - toneStep(isl, PAVE_TH, pt.r * 0.5 + 0.25, 0.06);
    vec3 turf = mix(vec3(0.325, 0.53, 0.445), vec3(0.86, 0.91, 0.58) * mix(0.965, 1.0, step(0.45, pt.g)), t);   // (the wash of the ground itself)
    if (uSnow > 0.5){
      turf = mix(SNOW_S, SNOW_L, t);
      // (a drift is a low rounded bank, not a fringe of blades)
      gh = (0.05 + clump * 0.13 + mound * 1.4) * max(1.0, px * 55.0);
      gx = gh - base; gw = max(fwidth(gx), 0.003);
      fr = smoothstep(-gw, gw, gx) * step(abs(n.y), mix(0.6, 0.9, lumpF)) * (1.0 - cyl * step(base, -1.0));
    }
    float creep = smoothstep(0.50, 0.68, pt.g * 0.5 + bw.r * 0.5) * (1.0 - smoothstep(0.0, 0.05, isl - PAVE_TH));
    float gs = max(over, 1.0 - toneStep(dE, 0.004 + 0.13 * creep, pt.r * 0.5 + wobT.a * 0.5, 0.01 + 0.25 * creep));
    // (the fringe is one green with a brushed second value in it - never a blade-by-blade stripe)
    c = mix(c, mix(gcol * mix(0.93, 1.0, step(0.5, pt.r * 0.6 + colT.a * 0.4)), turf, slab), max(fr, gs * slab));
  }

  // Seen from above, the top of a broken wall is not a ribbon with two ruled edges: toward both of
  // its edges it is grown over (the green of the turf below), on a brushed line of its own.
  if (breakTop > 0.5 && hiK2 > 0.0 && n.y > 0.45) {
    float eT = dot(topAxis, topAxis) > 0.25 ? abs(dot(vW.xz - vEc.xz, topAxis.xz)) : 0.25;
    // (the strip of stone left in the middle wanders in width, and on a third of the wall's length
    // there is none: the top is turf from edge to edge there)
    float gT = toneStep(eT + (pt.g - 0.5) * 0.30 + (bw.a - 0.5) * 0.25 + (bw2.a - 0.5) * 0.30, mix(0.52, 0.20, hiK2), pt.r, 0.08);
    gT = max(gT, toneStep(bw2.g * 0.55 + bw.r * 0.45, 0.57, pt.g, 0.10) * hiK2);
    c = mix(c, (uSnow > 0.5 ? mix(SNOW_S, SNOW_L, t) : mix(vec3(0.285, 0.475, 0.385), vec3(0.56, 0.73, 0.41), t)) * 0.97, gT * step(0.3, uMossAmt));
  }

  // ---- SNOW. It lies on whatever looks at the sky: the broken tops of the walls, ledges and sills, the
  // paving, the upper side of every fallen stone. One white (and the sky's blue where the stone is in
  // shade), its edge a brushed contour that creeps down the sloping faces in places and is thin over an
  // arris; on a rounded stone it is a cap. The stone under it is a step deeper, so the white has something
  // to stand on.
  if (uSnow > 0.0){
    float up = max(n.y, nl.y * step(0.5, breakTop));
    float lie = toneStep(up, mix(0.60, 0.46, lumpF), pt.r * 0.45 + bw.a * 0.35 + wobT.a * 0.2, 0.34);
    vec3 sn = mix(mix(SNOW_S, SNOW_D, step(0.62, pt.g) * 0.6), mix(SNOW_C, SNOW_L, step(0.42, bw.g)), t);
    // (winter stone: a step deeper and greyer - the cream of summer would be yellow against the white)
    c = mix(mix(c, vec3(dot(c, LUMA)) * vec3(0.99, 0.99, 1.04), 0.22 * uSnow) * mix(vec3(1.0), vec3(0.93, 0.925, 0.95), uSnow), sn, lie * uSnow);
    gOwnSnow = true;
  }

  // the drawn contour of a shaft on its shade side: a line of constant width on the canvas where
  // the surface turns away from the viewer, lost here and there
  {
    float side = dot(normalize(nl.xz + 1e-5), sunH);
    vec2 vh = normalize(uCamPos.xz - vW.xz);
    float fh = abs(dot(normalize(nl.xz + 1e-5), vh));
    float rw = sqrt(clamp(px * 20.0, 0.0, 0.5));             // ~4 px on a 0.4 m shaft (thinner is eaten by the paint filter)
    float contour = (1.0 - smoothstep(rw * 0.75, rw, fh)) * step(side, 0.1) * cyl * wallFace * smoothstep(0.25, 0.4, bw.r * 0.6 + pt.r * 0.5);
    c = mix(c, c * vec3(0.62, 0.60, 0.70), contour * 0.85 * (1.0 - smoothstep(30.0, 60.0, dist)) * smoothstep(3.0, 7.0, dist));
  }

  // pigment granulation, a different grain on every depth plane: the near plane carries the coarse
  // world-fixed bristle of the brush, the middle a finer screen-sized one, the back plane almost none
  c *= 1.0 + (pt.b - 0.5) * mix(0.05, 0.012, smoothstep(0.1, 0.9, pl)) * uPlaneAmt;
  gLit = t;
  c = atmo(c, uFog);
  oColor = vec4(c, 1.0);
  // oNormal.a = how the outline here should be drawn: 0 = a broken, irregular edge (full hand
  // wobble, may be lost), 0.5 = a clean dressed edge (arches, arrises: keep it true), 1 = a firm
  // found edge (columns, capitals, pier corners: never blended away)
  float irregular = max(max(breakTop, lumpF), step(0.5, cap) * (1.0 - mould));
  // (a pier or a buttress is drawn by hand: its arrises wander like a broken edge, and are lost where
  // the tones either side are close; a shaft keeps a little of its ruling)
  float edgeCls = mix(mix(0.5, mix(0.12, 0.3, cyl), max(cyl, step(1.5, vData.z))), 0.0, irregular);
  writeAux(ng, edgeCls, vDepth, id, t, 1.0);
}
`;

export function stoneMaterial(o = {}) {
  const C = (v) => ({ value: new THREE.Color(v) });
  return mat({
    vs: VS, fs: FS,
    // (o.paving: the variant for the floor slabs - the only one that discards; a discard in the wall
    // shader costs every wall pixel its early depth write)
    defines: o.paving ? { PAVING: 1 } : {},
    uniforms: {
      uLit: C(o.lit ?? 0xe2dfcb), uShadeLo: C(o.shadeLo ?? 0x8e8288), uShadeMid: C(o.shadeMid ?? 0x7d778a), uShadeHi: C(o.shadeHi ?? 0x6d7693),
      uDeep: C(o.deep ?? 0x292539), uPale: C(o.pale ?? 0xf3f1e4),
      uMoss: C(o.moss ?? 0xa8ad93), uMossShade: C(o.mossShade ?? 0x6b7269),
      uJointLit: C(o.jointLit ?? 0x8a8576), uJointShade: C(o.jointShade ?? 0x45414f),
      uShadowPitch: { value: o.shadowPitch ?? 4 }, uFog: { value: o.fog ?? 0 }, uWarm: { value: o.warm ?? 1 }, uMossAmt: { value: o.mossAmt ?? 1 }, uJoint: { value: o.joint ?? 1 }, uPlaneAmt: { value: o.plane ?? 1 },
      uFoot: { value: o.foot ?? 1 },
    },
  });
}
export const stoneShadow = () => shadowMat();

// Depth pre-pass. The masonry is tens of thousands of small stones drawn in building order, so a wall
// seen through an arch, the far side of the nave, every stone behind another was shaded in full and
// then painted over. A twin of the mesh with a depth-only material is drawn first (renderOrder -1):
// after it the painted material runs once per visible pixel. Both vertex shaders compute gl_Position
// by the same expression and declare it invariant, so the depths agree exactly.
const PRE_VS = /* glsl */`
in vec3 position;
invariant gl_Position;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec4 mv = viewMatrix * w;
  gl_Position = projectionMatrix * mv;
}
`;
export function stonePrepass(scene, mesh) {
  const m = shadowMat(PRE_VS, undefined, {}, THREE.FrontSide);
  m.colorWrite = false;
  // (paving is left out: where it is grown over its fragments are discarded and the ground must show)
  let geo = mesh.geometry;
  if (geo.userData.preIndex) { geo = new THREE.BufferGeometry(); geo.setAttribute('position', mesh.geometry.getAttribute('position')); geo.setIndex(mesh.geometry.userData.preIndex); geo.boundingSphere = mesh.geometry.boundingSphere; }
  const pre = new THREE.Mesh(geo, m);
  pre.renderOrder = -1; pre.frustumCulled = false; pre.matrixAutoUpdate = false; pre.userData.prepass = true;
  pre.matrix.copy(mesh.matrix); pre.matrixWorld.copy(mesh.matrixWorld);
  scene.add(pre);
  return pre;
}
