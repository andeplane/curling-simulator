import * as THREE from "three";
import type { ShotRelease } from "../physics/types";
import { DEFAULT_ICE_PARAMS, GRAVITY } from "../physics/types";
import type { GameController } from "./game-controller";
import { HACK_Z, STONE_RADIUS } from "../utils/constants";

const MIN_SPEED = 1.5;
const MAX_SPEED = 5.0;
const MAX_OMEGA = 2.0;
const OMEGA_STEP = 0.008;
const MAX_AIM_ANGLE = Math.PI / 8;
const AIM_ANGLE_STEP = 0.003;
const POWER_STEP = 0.005;

const PREVIEW_DT = 1 / 30;
const PREVIEW_MAX_STEPS = 900; // 30 seconds
const PREVIEW_SAMPLE_EVERY = 3; // plot every 3rd step for smoother line

/**
 * Keyboard-driven aiming. Mouse is always free for camera orbit.
 *
 *   A / D  or  Left / Right  — aim direction
 *   W / S  or  Up / Down     — power
 *   Q / E                    — spin (Q = CCW, E = CW)
 *   SPACE                    — throw / sweep
 *   R                        — restart
 */
export class InputHandler {
  private game: GameController;

  aimAngle = 0;
  aimPower = 0.5;
  aimOmega = 0;

  aimGroup: THREE.Group;
  private ghostStone: THREE.Mesh;
  private trajectoryMesh: THREE.Mesh;
  private trajectoryMat: THREE.MeshBasicMaterial;
  private trajectoryHead: THREE.Mesh;

  private keysDown = new Set<string>();
  private needsTrajectoryUpdate = true;

  constructor(
    _canvas: HTMLCanvasElement,
    _camera: THREE.PerspectiveCamera,
    game: GameController
  ) {
    this.game = game;

    this.aimGroup = new THREE.Group();
    this.aimGroup.name = "aimGroup";

    // Ghost stone
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.45,
      roughness: 0.5,
    });
    this.ghostStone = new THREE.Mesh(
      new THREE.CylinderGeometry(STONE_RADIUS, STONE_RADIUS, 0.08, 32),
      ghostMat
    );
    this.ghostStone.position.y = 0.04;
    this.aimGroup.add(this.ghostStone);

    // Curved trajectory tube (world-space, thick and visible)
    this.trajectoryMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.55,
    });
    this.trajectoryMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.trajectoryMat);
    this.trajectoryMesh.frustumCulled = false;

    // Arrow head at end of trajectory
    this.trajectoryHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8 })
    );
    this.trajectoryHead.frustumCulled = false;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  /** These need to be added to the scene directly (not via aimGroup) */
  get sceneObjects(): THREE.Object3D[] {
    return [this.trajectoryMesh, this.trajectoryHead];
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keysDown.add(e.code);

    if (e.code === "Space") {
      e.preventDefault();
      if (this.game.phase === "AIMING") {
        this.game.throwStone(this.buildRelease());
      } else if (this.game.phase === "DELIVERING") {
        this.game.setSweeping(true);
      }
    }

    if (e.code === "KeyR" && (this.game.phase === "GAME_OVER" || this.game.phase === "END_SCORE")) {
      this.game.resetGame();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
    if (e.code === "Space") {
      this.game.setSweeping(false);
    }
  };

  update(): void {
    if (this.game.phase !== "AIMING") {
      this.aimGroup.visible = false;
      this.trajectoryMesh.visible = false;
      this.trajectoryHead.visible = false;
      return;
    }

    const prevAngle = this.aimAngle;
    const prevPower = this.aimPower;
    const prevOmega = this.aimOmega;

    if (this.keysDown.has("ArrowLeft") || this.keysDown.has("KeyA")) {
      this.aimAngle = Math.max(-MAX_AIM_ANGLE, this.aimAngle - AIM_ANGLE_STEP);
    }
    if (this.keysDown.has("ArrowRight") || this.keysDown.has("KeyD")) {
      this.aimAngle = Math.min(MAX_AIM_ANGLE, this.aimAngle + AIM_ANGLE_STEP);
    }
    if (this.keysDown.has("ArrowUp") || this.keysDown.has("KeyW")) {
      this.aimPower = Math.min(1.0, this.aimPower + POWER_STEP);
    }
    if (this.keysDown.has("ArrowDown") || this.keysDown.has("KeyS")) {
      this.aimPower = Math.max(0.0, this.aimPower - POWER_STEP);
    }
    if (this.keysDown.has("KeyQ")) {
      this.aimOmega = Math.max(-MAX_OMEGA, this.aimOmega - OMEGA_STEP);
    }
    if (this.keysDown.has("KeyE")) {
      this.aimOmega = Math.min(MAX_OMEGA, this.aimOmega + OMEGA_STEP);
    }

    if (
      this.aimAngle !== prevAngle ||
      this.aimPower !== prevPower ||
      this.aimOmega !== prevOmega
    ) {
      this.needsTrajectoryUpdate = true;
    }

    this.updateVisuals();
  }

  private updateVisuals(): void {
    this.aimGroup.visible = true;
    this.trajectoryMesh.visible = true;
    this.trajectoryHead.visible = true;

    const targetEnd = this.game.world.targetEnd;
    const hackZ = targetEnd === -1 ? HACK_Z : -HACK_Z;

    // Ghost stone at hack
    this.aimGroup.position.set(0, 0, hackZ);
    this.aimGroup.rotation.y = 0; // no rotation — trajectory is world-space

    const ghostColor = this.game.currentTeam === "red" ? 0xff4455 : 0xffcc00;
    (this.ghostStone.material as THREE.MeshStandardMaterial).color.setHex(ghostColor);

    if (this.needsTrajectoryUpdate) {
      this.needsTrajectoryUpdate = false;
      this.updateTrajectory();
    }
  }

  /**
   * Run a lightweight physics preview to generate the curved trajectory.
   * Uses the same ice model as the real simulation but with lower time resolution.
   */
  private updateTrajectory(): void {
    const targetEnd = this.game.world.targetEnd;
    const hackZ = targetEnd === -1 ? HACK_Z : -HACK_Z;
    const speed = MIN_SPEED + this.aimPower * (MAX_SPEED - MIN_SPEED);

    let px = 0;
    let pz = hackZ;
    let vx = -targetEnd * Math.sin(this.aimAngle) * speed;
    let vz = targetEnd * Math.cos(this.aimAngle) * speed;
    let omega = this.aimOmega;

    const ice = DEFAULT_ICE_PARAMS;
    const points: THREE.Vector3[] = [new THREE.Vector3(px, 0.10, pz)];

    for (let step = 0; step < PREVIEW_MAX_STEPS; step++) {
      const spd = Math.sqrt(vx * vx + vz * vz);
      if (spd < 0.01) break;

      const vHatX = vx / spd;
      const vHatZ = vz / spd;

      // Friction
      const mu = Math.min(ice.mu0 * Math.pow(spd, -0.5), ice.muMax);
      let ax = -mu * GRAVITY * vHatX;
      let az = -mu * GRAVITY * vHatZ;

      // Curl
      if (Math.abs(omega) > 0.05) {
        const curlMag = ice.curlCoeff * Math.min(1.0 / spd, 8.0);
        const omegaF = Math.min(Math.abs(omega) / 0.3, 1.0);
        ax += -Math.sign(omega) * curlMag * omegaF * vHatZ;
        az += -Math.sign(omega) * curlMag * omegaF * (-vHatX);
      }

      vx += ax * PREVIEW_DT;
      vz += az * PREVIEW_DT;
      px += vx * PREVIEW_DT;
      pz += vz * PREVIEW_DT;

      // Spin decay
      if (Math.abs(omega) > 0.01) {
        const sF = 1.0 + 2.0 / (1.0 + spd);
        omega -= ice.kSpin * Math.sign(omega) * sF * 19.96 * GRAVITY * PREVIEW_DT;
        if (Math.abs(omega) < 0.01) omega = 0;
      }

      if (step % PREVIEW_SAMPLE_EVERY === 0) {
        points.push(new THREE.Vector3(px, 0.10, pz));
      }
    }

    points.push(new THREE.Vector3(px, 0.10, pz));

    // Build a tube from the path
    if (points.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, Math.min(points.length, 200), 0.035, 6, false);
      this.trajectoryMesh.geometry.dispose();
      this.trajectoryMesh.geometry = tubeGeo;
    }

    // Arrow head at the end, pointing along final direction
    const lastPt = points[points.length - 1];
    const prevPt = points.length > 1 ? points[points.length - 2] : lastPt;
    this.trajectoryHead.position.copy(lastPt);

    const dx = lastPt.x - prevPt.x;
    const dz = lastPt.z - prevPt.z;
    const headAngle = Math.atan2(dx, dz);
    this.trajectoryHead.rotation.set(Math.PI / 2, headAngle, 0, "YXZ");
  }

  private buildRelease(): ShotRelease {
    const speed = MIN_SPEED + this.aimPower * (MAX_SPEED - MIN_SPEED);
    return {
      x: 0,
      z: 0,
      speed,
      angle: this.aimAngle,
      omega: this.aimOmega,
    };
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
