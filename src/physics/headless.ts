import type { Team, ShotRelease } from "./types";
import { GameController } from "../game/game-controller";
import { PhysicsWorld } from "./world";

export interface BoardState {
  stones: Array<{
    pos: { x: number; z: number };
    team: Team;
    inPlay: boolean;
    deliveryIndex: number;
  }>;
  currentTeam: Team;
  score: { red: number; yellow: number };
  currentEnd: number;
  deliveryCount: number;
}

export interface ThrowResult {
  steps: number;
  finalState: BoardState;
  score?: { red: number; yellow: number; winner: Team | null };
}

/**
 * Headless game driver optimized for ML training and batch simulation.
 * Runs physics in tight loops without real-time throttling.
 */
export class HeadlessGame {
  private controller: GameController;

  constructor(iceParams?: Partial<import("./types").IceParams>) {
    this.controller = new GameController();
    if (iceParams) {
      this.controller.world.ice = { ...this.controller.world.ice, ...iceParams };
    }
  }

  /**
   * Deliver a stone and run simulation until it settles.
   * Returns the number of physics steps taken and the final board state.
   */
  throwAndSettle(release: ShotRelease): ThrowResult {
    if (this.controller.phase !== "AIMING") {
      throw new Error(`Cannot throw stone in phase: ${this.controller.phase}`);
    }

    this.controller.throwStone(release);
    const steps = this.controller.world.runUntilSettled();

    // Manually update phase after simulation settles (normally done by controller.update())
    // This mirrors the logic in GameController.update()
    if (!this.controller.world.isSimulating) {
      if (this.controller.deliveryCount >= 16) {
        // End is complete - score it
        const result = this.controller.world.score();
        this.controller.scoreHistory.push({ red: result.red, yellow: result.yellow });
        this.controller.totalScore.red += result.red;
        this.controller.totalScore.yellow += result.yellow;

        // Team that scored loses hammer
        if (result.winner) {
          this.controller.hammerTeam = result.winner === "red" ? "yellow" : "red";
        }

        if (this.controller.currentEnd >= 2) {
          this.controller.phase = "GAME_OVER";
        } else {
          this.controller.phase = "END_SCORE";
        }
      } else {
        this.controller.phase = "AIMING";
      }
    }

    const result: ThrowResult = {
      steps,
      finalState: this.getState(),
    };

    // If end is complete, include score
    if (this.controller.phase === "END_SCORE" || this.controller.phase === "GAME_OVER") {
      result.score = this.controller.world.score();
    }

    return result;
  }

  /**
   * Get current board state in a compact format suitable for ML feature extraction.
   */
  getState(): BoardState {
    return {
      stones: this.controller.world.stones.map((s) => ({
        pos: { x: s.pos.x, z: s.pos.z },
        team: s.team,
        inPlay: s.inPlay,
        deliveryIndex: s.deliveryIndex,
      })),
      currentTeam: this.controller.currentTeam,
      score: { ...this.controller.totalScore },
      currentEnd: this.controller.currentEnd,
      deliveryCount: this.controller.deliveryCount,
    };
  }

  /**
   * Simulate a full end (up to 16 shots, alternating teams).
   * Returns the final score for the end.
   */
  simulateEnd(shots: ShotRelease[]): { red: number; yellow: number; winner: Team | null } {
    const maxShots = 16;
    const actualShots = shots.slice(0, maxShots);

    for (const shot of actualShots) {
      this.throwAndSettle(shot);
      // If end is complete, break
      if (this.controller.phase === "END_SCORE" || this.controller.phase === "GAME_OVER") {
        break;
      }
      // Otherwise phase should be "AIMING" and we continue
    }

    // Get score before potentially resetting
    const score = this.controller.world.score();

    // If we ended in END_SCORE phase, advance to next end
    if (this.controller.phase === "END_SCORE") {
      this.controller.currentEnd++;
      this.controller.deliveryCount = 0;
      this.controller.world.resetEnd();
      this.controller.world.targetEnd = this.controller.world.targetEnd === -1 ? 1 : -1;
      this.controller.phase = "AIMING";
    }

    return score;
  }

  /**
   * Create a deep copy of the game state for tree search / rollouts.
   */
  clone(): HeadlessGame {
    const cloned = new HeadlessGame();
    cloned.controller.phase = this.controller.phase;
    cloned.controller.currentEnd = this.controller.currentEnd;
    cloned.controller.deliveryCount = this.controller.deliveryCount;
    cloned.controller.hammerTeam = this.controller.hammerTeam;
    cloned.controller.totalScore = { ...this.controller.totalScore };
    cloned.controller.scoreHistory = this.controller.scoreHistory.map((s) => ({ ...s }));

    // Deep clone physics world
    cloned.controller.world.ice = { ...this.controller.world.ice };
    cloned.controller.world.sweeping = this.controller.world.sweeping;
    cloned.controller.world.targetEnd = this.controller.world.targetEnd;
    cloned.controller.world.deliveredStoneIndex = this.controller.world.deliveredStoneIndex;
    cloned.controller.world.accumulator = this.controller.world.accumulator;
    cloned.controller.world.stones = this.controller.world.stones.map((s) => ({
      pos: { x: s.pos.x, z: s.pos.z },
      vel: { x: s.vel.x, z: s.vel.z },
      omega: s.omega,
      angle: s.angle,
      team: s.team,
      inPlay: s.inPlay,
      deliveryIndex: s.deliveryIndex,
    }));

    return cloned;
  }

  /**
   * Reset the game to initial state.
   */
  reset(): void {
    this.controller.resetGame();
  }

  /**
   * Get the underlying physics world (for advanced use cases).
   */
  getWorld(): PhysicsWorld {
    return this.controller.world;
  }

  /**
   * Get the underlying game controller (for advanced use cases).
   */
  getController(): GameController {
    return this.controller;
  }
}
