import type { StoneState } from "./types";
import { COLLISION_RESTITUTION, COLLISION_TANGENTIAL_FRICTION } from "./types";
import { STONE_RADIUS, STONE_MASS, SHEET_WIDTH } from "../utils/constants";

const CONTACT_DIST = STONE_RADIUS * 2;
const POSITIONAL_SLOP = 0.001;
const POSITIONAL_CORRECTION_FACTOR = 0.8;

/**
 * Detect and resolve all stone-stone and stone-wall collisions.
 * Modifies stones in place.
 */
export function resolveCollisions(stones: StoneState[]): void {
  const active = stones.filter((s) => s.inPlay);

  // Stone-stone collisions
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      resolveStoneStone(active[i], active[j]);
    }
  }

  // Stone-wall collisions (side boards)
  const halfW = SHEET_WIDTH / 2;
  for (const s of active) {
    resolveWall(s, halfW);
  }
}

function resolveStoneStone(a: StoneState, b: StoneState): void {
  const dx = b.pos.x - a.pos.x;
  const dz = b.pos.z - a.pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist >= CONTACT_DIST || dist < 1e-8) return;

  // Contact normal (a -> b)
  const nx = dx / dist;
  const nz = dz / dist;

  // Relative velocity of b w.r.t. a
  const dvx = b.vel.x - a.vel.x;
  const dvz = b.vel.z - a.vel.z;

  // Relative velocity along normal
  const relVelNormal = dvx * nx + dvz * nz;

  // Only resolve if stones are approaching
  if (relVelNormal > 0) {
    // Still do positional correction if overlapping
    positionalCorrection(a, b, dist, nx, nz);
    return;
  }

  // Normal impulse (equal mass simplifies things)
  const e = COLLISION_RESTITUTION;
  const jNormal = (-(1 + e) * relVelNormal) / (1 / STONE_MASS + 1 / STONE_MASS);

  a.vel.x -= (jNormal / STONE_MASS) * nx;
  a.vel.z -= (jNormal / STONE_MASS) * nz;
  b.vel.x += (jNormal / STONE_MASS) * nx;
  b.vel.z += (jNormal / STONE_MASS) * nz;

  // Tangential impulse for spin transfer
  const tx = -nz;
  const tz = nx;
  const relVelTangent = dvx * tx + dvz * tz;

  // Surface velocity contribution from spin at contact point
  const surfaceVelA = a.omega * STONE_RADIUS;
  const surfaceVelB = -b.omega * STONE_RADIUS;
  const totalTangentVel = relVelTangent + surfaceVelA + surfaceVelB;

  const jTangentMax = Math.abs(jNormal) * COLLISION_TANGENTIAL_FRICTION;
  const jTangent = Math.max(-jTangentMax, Math.min(jTangentMax, -totalTangentVel * STONE_MASS * 0.5));

  a.vel.x -= (jTangent / STONE_MASS) * tx;
  a.vel.z -= (jTangent / STONE_MASS) * tz;
  b.vel.x += (jTangent / STONE_MASS) * tx;
  b.vel.z += (jTangent / STONE_MASS) * tz;

  // Spin transfer from tangential impulse
  const I = 0.5 * STONE_MASS * STONE_RADIUS * STONE_RADIUS; // moment of inertia for solid disk
  a.omega += (jTangent * STONE_RADIUS) / I;
  b.omega -= (jTangent * STONE_RADIUS) / I;

  positionalCorrection(a, b, dist, nx, nz);
}

function positionalCorrection(
  a: StoneState,
  b: StoneState,
  dist: number,
  nx: number,
  nz: number
): void {
  const overlap = CONTACT_DIST - dist;
  if (overlap <= POSITIONAL_SLOP) return;

  const correction = ((overlap - POSITIONAL_SLOP) * POSITIONAL_CORRECTION_FACTOR) / 2;
  a.pos.x -= correction * nx;
  a.pos.z -= correction * nz;
  b.pos.x += correction * nx;
  b.pos.z += correction * nz;
}

function resolveWall(s: StoneState, halfWidth: number): void {
  // Side wall contact = disqualification (stone removed from play)
  if (s.pos.x - STONE_RADIUS < -halfWidth || s.pos.x + STONE_RADIUS > halfWidth) {
    s.inPlay = false;
  }
}
