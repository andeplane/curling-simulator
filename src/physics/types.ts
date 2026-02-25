export type Team = "red" | "yellow";

export interface Vec2 {
  x: number;
  z: number;
}

export interface StoneState {
  pos: Vec2;
  vel: Vec2;
  omega: number; // angular velocity (yaw spin), rad/s; positive = clockwise viewed from above
  angle: number; // cumulative rotation angle for rendering
  team: Team;
  inPlay: boolean;
  /** Index of this stone in the delivery order (0-15) */
  deliveryIndex: number;
}

export interface IceParams {
  mu0: number; // base friction coefficient for mu(v) = mu0 * v^(-0.5)
  muMax: number; // clamped max mu at low speed
  curlCoeff: number; // lateral acceleration coefficient
  kSpin: number; // spin decay constant
  sweepMuFactor: number; // multiplier on mu when sweeping (< 1 = less friction)
  sweepCurlFactor: number; // multiplier on curl when sweeping (< 1 = straighter)
}

export interface ShotRelease {
  x: number; // release X position (usually near 0, centre line)
  z: number; // release Z position (hack area)
  speed: number; // release speed (m/s)
  angle: number; // direction angle in radians (0 = straight down -Z toward far house)
  omega: number; // initial spin (rad/s)
}

export interface SweepAction {
  active: boolean;
}

export const DEFAULT_ICE_PARAMS: IceParams = {
  mu0: 0.008,
  muMax: 0.06,
  curlCoeff: 0.028,
  kSpin: 0.00008,
  sweepMuFactor: 0.78,
  sweepCurlFactor: 0.45,
};

export const PHYSICS_DT = 1 / 120;
export const GRAVITY = 9.81;
export const SETTLE_VEL_THRESHOLD = 0.003;
export const SETTLE_OMEGA_THRESHOLD = 0.01;

export const COLLISION_RESTITUTION = 0.85;
export const COLLISION_TANGENTIAL_FRICTION = 0.3;
