import type { StoneState, Team } from "./types";
import {
  SHEET_WIDTH,
  BACK_LINE_Z,
  HOG_Z,
  TEE_Z,
  STONE_RADIUS,
} from "../utils/constants";

const HALF_WIDTH = SHEET_WIDTH / 2;

/**
 * The game plays toward the NEGATIVE-Z house (far end).
 * Delivery happens from positive-Z hack area toward negative-Z tee.
 *
 * Target house tee is at -TEE_Z, back line at -BACK_LINE_Z, far hog at -HOG_Z.
 */

/**
 * Check and enforce out-of-play rules. Mutates stones in place.
 * `deliveredStoneIndex` is the index of the just-delivered stone (for hog-line violation check),
 * or -1 if no delivery in progress.
 */
export function applyRules(
  stones: StoneState[],
  _deliveredStoneIndex: number,
  targetEnd: -1 | 1
): void {
  const backLine = targetEnd * BACK_LINE_Z;

  for (let i = 0; i < stones.length; i++) {
    const s = stones[i];
    if (!s.inPlay) continue;

    // Out of bounds: side walls (generous — wall collision usually handles this,
    // but if somehow past the boards, remove)
    if (Math.abs(s.pos.x) > HALF_WIDTH + STONE_RADIUS * 2) {
      s.inPlay = false;
      continue;
    }

    // Past the back line (behind the target house)
    if (targetEnd === -1 && s.pos.z < backLine - STONE_RADIUS) {
      s.inPlay = false;
      continue;
    }
    if (targetEnd === 1 && s.pos.z > backLine + STONE_RADIUS) {
      s.inPlay = false;
      continue;
    }
  }
}

/**
 * Check hog line violation for a delivered stone that has come to rest.
 * A stone must fully cross the far hog line to be in play.
 */
export function checkHogLineViolation(
  stone: StoneState,
  targetEnd: -1 | 1
): boolean {
  const hogLine = targetEnd * HOG_Z;
  if (targetEnd === -1) {
    // Moving toward -Z: stone must be past (less than) hogLine
    return stone.pos.z + STONE_RADIUS > hogLine;
  } else {
    return stone.pos.z - STONE_RADIUS < hogLine;
  }
}

/**
 * Score an end. Returns { red, yellow } points.
 * Only the team with the stone closest to the button scores.
 * They score 1 point for each of their stones closer than the
 * closest opposing stone.
 */
export function scoreEnd(
  stones: StoneState[],
  targetEnd: -1 | 1
): { red: number; yellow: number; winner: Team | null } {
  const tee = { x: 0, z: targetEnd * TEE_Z };

  const inPlay = stones.filter((s) => s.inPlay);
  if (inPlay.length === 0) return { red: 0, yellow: 0, winner: null };

  // Compute distances to button for each stone
  const withDist = inPlay.map((s) => ({
    team: s.team,
    dist: Math.sqrt(
      (s.pos.x - tee.x) ** 2 + (s.pos.z - tee.z) ** 2
    ),
  }));

  withDist.sort((a, b) => a.dist - b.dist);

  const closestTeam = withDist[0].team;
  const otherTeam: Team = closestTeam === "red" ? "yellow" : "red";

  // Find the closest stone of the other team
  const closestOther = withDist.find((s) => s.team === otherTeam);
  const cutoff = closestOther ? closestOther.dist : Infinity;

  // Count scoring stones
  let score = 0;
  for (const s of withDist) {
    if (s.team === closestTeam && s.dist < cutoff) {
      score++;
    } else {
      break;
    }
  }

  return {
    red: closestTeam === "red" ? score : 0,
    yellow: closestTeam === "yellow" ? score : 0,
    winner: closestTeam,
  };
}
