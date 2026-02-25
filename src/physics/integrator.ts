import type { StoneState, IceParams } from "./types";
import { PHYSICS_DT, SETTLE_VEL_THRESHOLD, SETTLE_OMEGA_THRESHOLD } from "./types";
import { computeIceForces } from "./ice-model";
import { resolveCollisions } from "./collisions";

/**
 * Advance one physics step (semi-implicit Euler).
 * 1. Compute forces / accelerations
 * 2. Update velocities
 * 3. Update positions
 * 4. Resolve collisions
 * 5. Clamp stopped stones
 */
export function stepPhysics(
  stones: StoneState[],
  ice: IceParams,
  sweeping: boolean
): void {
  const dt = PHYSICS_DT;

  // Apply ice forces (semi-implicit Euler: update vel first, then pos)
  for (const s of stones) {
    if (!s.inPlay) continue;
    const speed = Math.sqrt(s.vel.x * s.vel.x + s.vel.z * s.vel.z);
    if (speed < SETTLE_VEL_THRESHOLD && Math.abs(s.omega) < SETTLE_OMEGA_THRESHOLD) {
      s.vel.x = 0;
      s.vel.z = 0;
      s.omega = 0;
      continue;
    }

    const { ax, az, alphaOmega } = computeIceForces(s, ice, sweeping);

    // Update velocity
    s.vel.x += ax * dt;
    s.vel.z += az * dt;
    s.omega += alphaOmega * dt;

    // Prevent velocity reversal from friction overshoot within a single step
    const newSpeed = Math.sqrt(s.vel.x * s.vel.x + s.vel.z * s.vel.z);
    if (speed > SETTLE_VEL_THRESHOLD && newSpeed > speed * 1.5) {
      // Friction caused overshoot — clamp to zero
      s.vel.x = 0;
      s.vel.z = 0;
    }

    // Detect if friction reversed direction (dot product check)
    if (speed > SETTLE_VEL_THRESHOLD) {
      const dot = s.vel.x * (s.vel.x - ax * dt) + s.vel.z * (s.vel.z - az * dt);
      if (dot < 0) {
        s.vel.x = 0;
        s.vel.z = 0;
      }
    }

    // Update position from new velocity
    s.pos.x += s.vel.x * dt;
    s.pos.z += s.vel.z * dt;
    s.angle += s.omega * dt;

    // Clamp spin if it reversed
    if (s.omega !== 0 && Math.abs(s.omega) < SETTLE_OMEGA_THRESHOLD) {
      s.omega = 0;
    }
  }

  resolveCollisions(stones);
}

/**
 * Check if all in-play stones have settled (no motion).
 */
export function allSettled(stones: StoneState[]): boolean {
  for (const s of stones) {
    if (!s.inPlay) continue;
    const speed = Math.sqrt(s.vel.x * s.vel.x + s.vel.z * s.vel.z);
    if (speed > SETTLE_VEL_THRESHOLD || Math.abs(s.omega) > SETTLE_OMEGA_THRESHOLD) {
      return false;
    }
  }
  return true;
}
