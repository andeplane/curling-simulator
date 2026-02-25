import type { StoneState, IceParams, Vec2 } from "./types";
import { GRAVITY } from "./types";
import { STONE_MASS } from "../utils/constants";

function vecLen(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.z * v.z);
}

/**
 * Velocity-dependent kinetic friction coefficient.
 * mu(v) = mu0 * v^(-0.5), clamped to muMax at low speeds.
 */
export function mu(speed: number, ice: IceParams, sweeping: boolean): number {
  const baseMu = speed > 0.01
    ? Math.min(ice.mu0 * Math.pow(speed, -0.5), ice.muMax)
    : ice.muMax;
  return sweeping ? baseMu * ice.sweepMuFactor : baseMu;
}

/**
 * Compute the acceleration vector for a stone on ice.
 * Returns { ax, az, alphaSpin } — linear accel in XZ and angular accel.
 */
export function computeIceForces(
  stone: StoneState,
  ice: IceParams,
  sweeping: boolean
): { ax: number; az: number; alphaOmega: number } {
  const speed = vecLen(stone.vel);

  if (speed < 0.0005) {
    // Stone is essentially stopped — only apply spin decay
    const alphaOmega = spinDecay(stone.omega, speed, ice);
    return { ax: 0, az: 0, alphaOmega };
  }

  const vHatX = stone.vel.x / speed;
  const vHatZ = stone.vel.z / speed;

  // Longitudinal friction: opposes velocity
  const frictionMu = mu(speed, ice, sweeping);
  const frictionAccel = frictionMu * GRAVITY;
  let ax = -frictionAccel * vHatX;
  let az = -frictionAccel * vHatZ;

  // Curl: lateral acceleration perpendicular to velocity, increasing as stone slows.
  // Direction: positive omega (CW from above) curls to the right when moving in -Z.
  // Perpendicular to velocity: rotate v_hat by 90° in the direction determined by omega sign.
  const hasSignificantSpin = Math.abs(stone.omega) > 0.05;
  if (hasSignificantSpin) {
    const curlCoeff = sweeping ? ice.curlCoeff * ice.sweepCurlFactor : ice.curlCoeff;
    // Curl increases at low speed (late break): scale as 1/v, clamped
    const curlMagnitude = curlCoeff * Math.min(1.0 / speed, 8.0);
    // Omega sign determines curl direction
    // Perpendicular direction: rotate v_hat 90° CW → (vHatZ, -vHatX)
    const spinSign = Math.sign(stone.omega);
    // Weak dependence on |omega|: saturate above threshold
    const omegaFactor = Math.min(Math.abs(stone.omega) / 0.3, 1.0);
    ax += -spinSign * curlMagnitude * omegaFactor * vHatZ;
    az += -spinSign * curlMagnitude * omegaFactor * (-vHatX);
  }

  const alphaOmega = spinDecay(stone.omega, speed, ice);

  return { ax, az, alphaOmega };
}

/**
 * Spin decay torque: angular deceleration opposing current spin direction.
 */
function spinDecay(omega: number, speed: number, ice: IceParams): number {
  if (Math.abs(omega) < 0.001) return 0;
  // Decay faster when stone is slower (more contact time per pebble)
  const speedFactor = 1.0 + 2.0 / (1.0 + speed);
  return -ice.kSpin * Math.sign(omega) * speedFactor * STONE_MASS * GRAVITY;
}
