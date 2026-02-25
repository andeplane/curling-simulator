import type { Team, ShotRelease } from "../physics/types";
import { PhysicsWorld } from "../physics/world";

export type GamePhase = "AIMING" | "DELIVERING" | "SETTLING" | "END_SCORE" | "GAME_OVER";

const STONES_PER_TEAM = 8;
const ENDS_PER_GAME = 2; // short game for testing; increase for full game

export class GameController {
  phase: GamePhase = "AIMING";
  world: PhysicsWorld;

  /** Scores indexed by end number */
  scoreHistory: Array<{ red: number; yellow: number }> = [];
  totalScore = { red: 0, yellow: 0 };

  currentEnd = 1;
  /** Which team throws first this end (team without hammer throws first) */
  hammerTeam: Team = "yellow";
  /** Index into delivery order (0-15, alternating teams) */
  deliveryCount = 0;

  /** Time spent in END_SCORE phase (to show score briefly before next end) */
  private scoreDisplayTimer = 0;
  private static SCORE_DISPLAY_DURATION = 3.0;

  constructor() {
    this.world = new PhysicsWorld();
  }

  /** Which team is currently delivering */
  get currentTeam(): Team {
    const firstTeam = this.hammerTeam === "red" ? "yellow" : "red";
    return this.deliveryCount % 2 === 0 ? firstTeam : this.hammerTeam;
  }

  get stonesRemaining(): { red: number; yellow: number } {
    const thrown = { red: 0, yellow: 0 };
    for (let i = 0; i < this.deliveryCount; i++) {
      const firstTeam = this.hammerTeam === "red" ? "yellow" : "red";
      const team = i % 2 === 0 ? firstTeam : this.hammerTeam;
      thrown[team]++;
    }
    return {
      red: STONES_PER_TEAM - thrown.red,
      yellow: STONES_PER_TEAM - thrown.yellow,
    };
  }

  /** Called when the player releases a shot. Omega sign is already set by input. */
  throwStone(release: ShotRelease): void {
    if (this.phase !== "AIMING") return;

    this.world.deliverStone(this.currentTeam, release, this.deliveryCount);
    this.deliveryCount++;
    this.phase = "DELIVERING";
  }

  /** Called every frame with delta time. */
  update(dt: number): void {
    switch (this.phase) {
      case "DELIVERING":
      case "SETTLING": {
        const stillMoving = this.world.update(dt);
        if (stillMoving) {
          this.phase = "DELIVERING";
        } else {
          // All settled
          if (this.deliveryCount >= STONES_PER_TEAM * 2) {
            // End is over — score it
            this.endEnd();
          } else {
            this.phase = "AIMING";
          }
        }
        break;
      }

      case "END_SCORE": {
        this.scoreDisplayTimer += dt;
        if (this.scoreDisplayTimer >= GameController.SCORE_DISPLAY_DURATION) {
          this.startNextEnd();
        }
        break;
      }

      default:
        break;
    }
  }

  private endEnd(): void {
    const result = this.world.score();
    this.scoreHistory.push({ red: result.red, yellow: result.yellow });
    this.totalScore.red += result.red;
    this.totalScore.yellow += result.yellow;

    // Team that scored does NOT get hammer next end (in curling, scoring team loses hammer)
    if (result.winner) {
      this.hammerTeam = result.winner === "red" ? "yellow" : "red";
    }

    if (this.currentEnd >= ENDS_PER_GAME) {
      this.phase = "GAME_OVER";
    } else {
      this.phase = "END_SCORE";
      this.scoreDisplayTimer = 0;
    }
  }

  private startNextEnd(): void {
    this.currentEnd++;
    this.deliveryCount = 0;
    this.world.resetEnd();
    // Flip target end
    this.world.targetEnd = this.world.targetEnd === -1 ? 1 : -1;
    this.phase = "AIMING";
  }

  /** Reset entire game. */
  resetGame(): void {
    this.currentEnd = 1;
    this.deliveryCount = 0;
    this.totalScore = { red: 0, yellow: 0 };
    this.scoreHistory = [];
    this.hammerTeam = "yellow";
    this.world = new PhysicsWorld();
    this.phase = "AIMING";
  }

  setSweeping(active: boolean): void {
    this.world.sweeping = active;
  }
}
