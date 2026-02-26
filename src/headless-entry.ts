/**
 * Headless entry point for ML training and batch simulation.
 * This module re-exports physics and game logic without any browser/Three.js dependencies.
 * 
 * Usage:
 * ```typescript
 * import { HeadlessGame } from './headless-entry';
 * const game = new HeadlessGame();
 * const result = game.throwAndSettle({ x: 0, z: 0, speed: 3.2, angle: 0.01, omega: 1.5 });
 * ```
 */

// Re-export physics types
export type {
  Team,
  Vec2,
  StoneState,
  IceParams,
  ShotRelease,
  SweepAction,
} from "./physics/types";

export type { TargetEnd } from "./physics/world";

export {
  DEFAULT_ICE_PARAMS,
  PHYSICS_DT,
  GRAVITY,
  SETTLE_VEL_THRESHOLD,
  SETTLE_OMEGA_THRESHOLD,
  COLLISION_RESTITUTION,
  COLLISION_TANGENTIAL_FRICTION,
} from "./physics/types";

// Re-export physics world
export { PhysicsWorld } from "./physics/world";

// Re-export game controller
export type { GamePhase } from "./game/game-controller";
export { GameController } from "./game/game-controller";

// Re-export headless game API
export type { BoardState, ThrowResult } from "./physics/headless";
export { HeadlessGame } from "./physics/headless";
