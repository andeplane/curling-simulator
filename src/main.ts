import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createIceSheet } from "./scene/ice-sheet";
import { StoneManager } from "./scene/stones";
import { createArena } from "./scene/arena";
import { createLighting } from "./scene/lighting";
import { GameController } from "./game/game-controller";
import { InputHandler } from "./game/input-handler";
import { HUD } from "./game/hud";
import { TouchControls } from "./game/touch-controls";
import { HACK_Z, TEE_Z, SHEET_WIDTH, SHEET_LENGTH } from "./utils/constants";

// ── Renderer ────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// ── Scene ───────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08080e);
scene.fog = new THREE.FogExp2(0x08080e, 0.004);

// ── Camera ──────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

// ── Controls (always enabled — mouse is for camera only) ────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.minDistance = 2;
controls.maxDistance = 35;
controls.enablePan = false; // Prevent arbitrary panning - keep view locked to field

// ── Static scene objects ────────────────────────────────────────────
scene.add(createIceSheet());
scene.add(createArena());
scene.add(createLighting());

// ── Stones group (managed by StoneManager) ──────────────────────────
const stonesGroup = new THREE.Group();
stonesGroup.name = "stones";
scene.add(stonesGroup);
const stoneManager = new StoneManager(stonesGroup);

// ── Touch device detection ──────────────────────────────────────────
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ── Game + Input + HUD ──────────────────────────────────────────────
const game = new GameController();
const input = new InputHandler(renderer.domElement, camera, game);
const hud = new HUD();
const touchControls = isTouchDevice ? new TouchControls(game, input) : null;
scene.add(input.aimGroup);
for (const obj of input.sceneObjects) scene.add(obj);

// ── Camera modes ────────────────────────────────────────────────────
const desiredTarget = new THREE.Vector3();
const desiredPos = new THREE.Vector3();
let cameraAutoMode = true;

function updateCamera(): void {
  const targetEnd = game.world.targetEnd;
  const hackZ = targetEnd === -1 ? HACK_Z : -HACK_Z;
  const teeZ = targetEnd === -1 ? -TEE_Z : TEE_Z;

  if (game.phase === "AIMING") {
    const behindHack = targetEnd === -1 ? hackZ + 6 : hackZ - 6;
    desiredPos.set(1.5, 3.5, behindHack);
    desiredTarget.set(0, 0, hackZ + (targetEnd === -1 ? -10 : 10));
  } else if (game.phase === "DELIVERING" || game.phase === "SETTLING") {
    const delivered = game.world.getDeliveredStone();
    if (delivered && delivered.inPlay) {
      const offset = targetEnd === -1 ? 5 : -5;
      desiredPos.set(delivered.pos.x + 2.5, 3.5, delivered.pos.z + offset);
      desiredTarget.set(delivered.pos.x, 0, delivered.pos.z);
    } else {
      desiredPos.set(2, 6, teeZ + (targetEnd === -1 ? -6 : 6));
      desiredTarget.set(0, 0, teeZ);
    }
  } else {
    desiredPos.set(0, 10, teeZ + (targetEnd === -1 ? -3 : 3));
    desiredTarget.set(0, 0, teeZ);
  }

  // Only auto-move camera if user hasn't manually orbited
  if (cameraAutoMode) {
    camera.position.lerp(desiredPos, 0.04);
    controls.target.lerp(desiredTarget, 0.04);
  }

  // Clamp target to field bounds (keeps view centered on sheet)
  const halfW = SHEET_WIDTH / 2;
  const halfL = SHEET_LENGTH / 2;
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -halfW, halfW);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -halfL, halfL);
  controls.target.y = 0; // Looking at ice level

  controls.update();
}

// Detect user manual orbit — disable auto mode temporarily
controls.addEventListener("start", () => {
  cameraAutoMode = false;
});
// Re-enable auto mode when game phase changes (handled in animate)
let lastPhase = game.phase;

// ── Resize handling ─────────────────────────────────────────────────
function handleResize(): void {
  let canvasHeight = window.innerHeight;
  let canvasWidth = window.innerWidth;
  
  // On touch devices, reduce canvas height to leave room for control panel
  if (isTouchDevice && touchControls) {
    const controlPanelHeight = touchControls.getHeight();
    canvasHeight = window.innerHeight - controlPanelHeight;
    // Adjust canvas element position
    renderer.domElement.style.height = `${canvasHeight}px`;
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
  } else {
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.position = "";
    renderer.domElement.style.top = "";
    renderer.domElement.style.left = "";
  }
  
  camera.aspect = canvasWidth / canvasHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvasWidth, canvasHeight);
}

window.addEventListener("resize", handleResize);
// Initial resize to set up mobile layout
handleResize();

// ── Initialize camera position ──────────────────────────────────────
const initHackZ = game.world.targetEnd === -1 ? HACK_Z : -HACK_Z;
camera.position.set(1.5, 3.5, initHackZ + 6);
controls.target.set(0, 0, initHackZ - 10);
controls.update();

// ── Animation loop ──────────────────────────────────────────────────
const clock = new THREE.Clock();
let previousStoneCount = 0;

function animate(): void {
  const dt = Math.min(clock.getDelta(), 0.1);

  // Re-enable auto camera when phase changes
  if (game.phase !== lastPhase) {
    cameraAutoMode = true;
    lastPhase = game.phase;
  }

  // Process continuous input (held keys)
  input.update();

  // Update game logic + physics
  game.update(dt);

  // Detect game reset
  if (game.world.stones.length === 0 && previousStoneCount > 0) {
    stoneManager.clear();
  }
  previousStoneCount = game.world.stones.length;

  // Sync 3D meshes
  stoneManager.sync(game.world.stones);

  // Update camera
  updateCamera();

  // Update HUD
  hud.update(game, input);

  // Update touch controls visibility and sync with input state
  if (touchControls) {
    touchControls.updateVisibility();
    touchControls.sync();
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
