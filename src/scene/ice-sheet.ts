import * as THREE from "three";
import {
  SHEET_LENGTH,
  SHEET_WIDTH,
  RING_12,
  RING_8,
  RING_4,
  BUTTON_RADIUS,
  TEE_Z,
  HOG_Z,
  BACK_LINE_Z,
  HACK_Z,
  COLORS,
} from "../utils/constants";

const CANVAS_PX_PER_METER = 120;
const CANVAS_W = Math.ceil(SHEET_WIDTH * CANVAS_PX_PER_METER);
const CANVAS_H = Math.ceil(SHEET_LENGTH * CANVAS_PX_PER_METER);

function metersToCanvas(
  xMeters: number,
  zMeters: number
): [number, number] {
  const cx = (xMeters + SHEET_WIDTH / 2) * CANVAS_PX_PER_METER;
  const cy = (zMeters + SHEET_LENGTH / 2) * CANVAS_PX_PER_METER;
  return [cx, cy];
}

function mToPx(m: number): number {
  return m * CANVAS_PX_PER_METER;
}

function drawHouse(ctx: CanvasRenderingContext2D, centreZ: number) {
  const [cx, cy] = metersToCanvas(0, centreZ);

  const rings: Array<{ radius: number; color: string }> = [
    { radius: RING_12, color: COLORS.ringBlue },
    { radius: RING_8, color: "#e8f0f8" }, // ice colour to "cut out"
    { radius: RING_4, color: COLORS.ringRed },
    { radius: BUTTON_RADIUS, color: "#e8f0f8" },
  ];

  for (const ring of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, mToPx(ring.radius), 0, Math.PI * 2);
    ctx.fillStyle = ring.color;
    ctx.fill();
  }

  // Ring outlines
  for (const ring of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, mToPx(ring.radius), 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.lineWhite;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Cross in the button (middle circle) — horizontal line through center, full lane width
  const halfW = SHEET_WIDTH / 2;
  drawLine(ctx, -halfW, centreZ, halfW, centreZ, 2, "#111111");
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1m: number,
  z1m: number,
  x2m: number,
  z2m: number,
  widthPx = 2,
  color: string = COLORS.lineWhite
) {
  const [ax, ay] = metersToCanvas(x1m, z1m);
  const [bx, by] = metersToCanvas(x2m, z2m);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = color;
  ctx.lineWidth = widthPx;
  ctx.stroke();
}

function drawHack(ctx: CanvasRenderingContext2D, z: number, flip: boolean) {
  const hackWidth = 0.08; // width of each hack foot-hold
  const hackLength = 0.2;
  const spacing = 0.076; // gap from centre line

  const dir = flip ? -1 : 1;

  for (const side of [-1, 1]) {
    const xCentre = side * (spacing + hackWidth / 2);
    const [cx, cy] = metersToCanvas(xCentre, z + (dir * hackLength) / 2);
    ctx.fillStyle = "#222222";
    ctx.fillRect(
      cx - mToPx(hackWidth) / 2,
      cy - mToPx(hackLength) / 2,
      mToPx(hackWidth),
      mToPx(hackLength)
    );
  }
}

function paintIceTexture(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;

  // Ice background
  ctx.fillStyle = "#e8f0f8";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle pebble noise
  for (let i = 0; i < 80000; i++) {
    const x = Math.random() * CANVAS_W;
    const y = Math.random() * CANVAS_H;
    const alpha = 0.02 + Math.random() * 0.04;
    ctx.fillStyle = `rgba(180,200,220,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const halfW = SHEET_WIDTH / 2;

  // For each end (positive z and negative z)
  for (const sign of [1, -1]) {
    const tee = sign * TEE_Z;
    const hog = sign * HOG_Z;
    const back = sign * BACK_LINE_Z;
    const hack = sign * HACK_Z;

    // Tee line
    drawLine(ctx, -halfW, tee, halfW, tee, 2);

    // Back line — touches outer edge of blue ring (12-foot), black for visibility
    drawLine(ctx, -halfW, back, halfW, back, 3, "#111111");

    // Hog line (red, thicker — standard in real curling)
    drawLine(ctx, -halfW, hog, halfW, hog, 6, COLORS.ringRed);

    // House
    drawHouse(ctx, tee);

    // Hacks
    drawHack(ctx, hack, sign === 1);
  }

  // Centre line (full length of sheet) — drawn AFTER houses so it appears on top
  const halfL = SHEET_LENGTH / 2;
  drawLine(ctx, 0, -halfL, 0, halfL, 3, "#111111");

  // Courtesy lines (small marks at the hog line, 1 ft outside the 12-ft ring)
  // These are small tick marks to help skips gauge distance
  for (const sign of [1, -1]) {
    const hogZ = sign * HOG_Z;
    for (const side of [-1, 1]) {
      const x = side * (RING_12 + 0.3);
      drawLine(ctx, x, hogZ - 0.15, x, hogZ + 0.15, 2);
    }
  }

  return canvas;
}

export function createIceSheet(): THREE.Mesh {
  const textureCanvas = paintIceTexture();
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.PlaneGeometry(SHEET_WIDTH, SHEET_LENGTH);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.25,
    metalness: 0.05,
    envMapIntensity: 0.4,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = "iceSheet";

  return mesh;
}
