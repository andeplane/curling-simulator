import type { StoneState, IceParams, ShotRelease, Team } from "./types";
import { DEFAULT_ICE_PARAMS, PHYSICS_DT } from "./types";
import { stepPhysics } from "./integrator";
import { applyRules, checkHogLineViolation, scoreEnd } from "./rules";
import { HACK_Z } from "../utils/constants";

export type TargetEnd = -1 | 1;

export class PhysicsWorld {
  stones: StoneState[] = [];
  ice: IceParams;
  sweeping = false;
  targetEnd: TargetEnd = -1; // -1 = playing toward negative-Z house
  deliveredStoneIndex = -1;
  accumulator = 0;

  /** True while any stone has non-zero velocity */
  get isSimulating(): boolean {
    return this.stones.some(
      (s) => s.inPlay && (Math.abs(s.vel.x) > 0.001 || Math.abs(s.vel.z) > 0.001 || Math.abs(s.omega) > 0.01)
    );
  }

  constructor(ice?: Partial<IceParams>) {
    this.ice = { ...DEFAULT_ICE_PARAMS, ...ice };
  }

  /** Remove all stones and reset for a new end. */
  resetEnd(): void {
    this.stones = [];
    this.deliveredStoneIndex = -1;
    this.accumulator = 0;
  }

  /**
   * Deliver a new stone onto the sheet.
   * The stone starts at the hack and is given an initial velocity + spin.
   */
  deliverStone(team: Team, release: ShotRelease, deliveryIndex: number): void {
    const hackZ = this.targetEnd === -1 ? HACK_Z : -HACK_Z;

    // release.angle = 0 → straight toward target end
    // targetEnd gives the z-direction: -1 = toward -Z, +1 = toward +Z
    const stone: StoneState = {
      pos: { x: release.x, z: hackZ },
      vel: {
        x: -this.targetEnd * Math.sin(release.angle) * release.speed,
        z: this.targetEnd * Math.cos(release.angle) * release.speed,
      },
      omega: release.omega,
      angle: 0,
      team,
      inPlay: true,
      deliveryIndex,
    };

    this.stones.push(stone);
    this.deliveredStoneIndex = this.stones.length - 1;
  }

  /**
   * Advance physics by the given real elapsed time (in seconds).
   * Uses fixed-dt accumulator for deterministic stepping.
   * Returns true if simulation is still active (stones moving).
   */
  update(elapsedSec: number): boolean {
    this.accumulator += elapsedSec;

    // Cap to prevent spiral of death
    if (this.accumulator > 0.2) this.accumulator = 0.2;

    while (this.accumulator >= PHYSICS_DT) {
      stepPhysics(this.stones, this.ice, this.sweeping);
      applyRules(this.stones, this.deliveredStoneIndex, this.targetEnd);
      this.accumulator -= PHYSICS_DT;
    }

    if (!this.isSimulating) {
      // Check hog line violation on the delivered stone
      if (this.deliveredStoneIndex >= 0) {
        const delivered = this.stones[this.deliveredStoneIndex];
        if (delivered && delivered.inPlay) {
          if (checkHogLineViolation(delivered, this.targetEnd)) {
            delivered.inPlay = false;
          }
        }
      }
      this.deliveredStoneIndex = -1;
      return false;
    }

    return true;
  }

  /** Score the current end. */
  score(): { red: number; yellow: number; winner: Team | null } {
    return scoreEnd(this.stones, this.targetEnd);
  }

  /** Get the currently delivered (moving) stone, if any. */
  getDeliveredStone(): StoneState | null {
    if (this.deliveredStoneIndex < 0) return null;
    return this.stones[this.deliveredStoneIndex] ?? null;
  }
}
