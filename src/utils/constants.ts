// All distances in meters, derived from World Curling Federation official rules.
// 1 foot = 0.3048 m

const FT = 0.3048;

// ── Sheet overall ────────────────────────────────────────────────────
export const SHEET_LENGTH = 150 * FT; // 45.72 m
export const SHEET_WIDTH = 15.5 * FT; // ~4.72 m

// ── House (target) rings — radii ─────────────────────────────────────
export const RING_12 = 6 * FT; // 12-foot ring radius
export const RING_8 = 4 * FT;
export const RING_4 = 2 * FT;
export const BUTTON_RADIUS = 0.5 * FT;

// ── Longitudinal distances measured from centre of sheet ─────────────
// The tee line sits 16 ft from the back board at each end.
// With a 150 ft sheet, the tee is at  ±(75 − 16) = ±59 ft from centre  → wrong
// Better: measure from the tee line.
// Hack line: 12 ft behind tee
// Back line: 6 ft behind tee
// Hog line: 21 ft in front of tee (toward centre)
// Distance between tee lines = 114 ft (from WCF rules: 150 − 2×(12+6) = 114 isn't right either)
//
// WCF layout (from hack to hack = 126 ft):
//   hack → tee = 12 ft
//   tee → hog = 21 ft
//   hog to hog = 72 ft
//   Total one half: 12 + 21 + 36 = 69 ft, × 2 = 138 ft  — that's hack-to-hack...
//
// Simpler: use absolute positions along the Z axis with 0 at sheet centre.
// tee-to-tee = 114 ft   → each tee at ±57 ft from centre
export const TEE_Z = 57 * FT; // distance of tee line from sheet centre
export const HOG_Z = TEE_Z - 21 * FT; // hog line (toward centre)
export const BACK_LINE_Z = TEE_Z + 6 * FT; // back line (behind tee)
export const HACK_Z = TEE_Z + 12 * FT; // hack (behind tee)

export const LINE_WIDTH = 0.025; // painted line width in metres (~1 inch)

// ── Curling stone ────────────────────────────────────────────────────
export const STONE_RADIUS = 0.145; // ~29 cm diameter
export const STONE_HEIGHT = 0.114; // ~11.4 cm tall (granite body)
export const STONE_MASS = 19.96; // kg (44 lb)

// ── Colors ───────────────────────────────────────────────────────────
export const COLORS = {
  ice: 0xe8f0f8,
  iceAmbient: 0xd0dce8,
  red: 0xcc2233,
  yellow: 0xe8b800,
  blue: 0x2255bb,
  white: 0xffffff,
  lineWhite: "#ffffff",
  ringRed: "#cc2233",
  ringBlue: "#2255bb",
  granite: 0x555560,
  boardBrown: 0x3a2a1a,
  arenaDark: 0x111118,
} as const;
