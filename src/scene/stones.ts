import * as THREE from "three";
import { STONE_RADIUS, STONE_HEIGHT, COLORS } from "../utils/constants";

/**
 * Cross-section profile for the curling stone body, rotated around the Y axis.
 * The stone is roughly a squat cylinder with rounded edges and a concave running band
 * on the bottom.
 */
function createStoneProfile(): THREE.Vector2[] {
  const r = STONE_RADIUS;
  const h = STONE_HEIGHT;
  const bevel = 0.02;
  const concaveDepth = 0.003;

  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(r * 0.25, concaveDepth),
    new THREE.Vector2(r * 0.7, concaveDepth),
    new THREE.Vector2(r - bevel * 0.3, 0),
    new THREE.Vector2(r, bevel),
    new THREE.Vector2(r, h - bevel),
    new THREE.Vector2(r - bevel * 0.3, h),
    new THREE.Vector2(r * 0.75, h + 0.005),
    new THREE.Vector2(r * 0.42, h + 0.005),
    new THREE.Vector2(r * 0.38, h),
    new THREE.Vector2(0, h),
  ];
}

function createHandle(color: THREE.ColorRepresentation): THREE.Group {
  const group = new THREE.Group();

  const handleMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.1,
  });

  const boltMat = new THREE.MeshStandardMaterial({
    color: 0x888890,
    roughness: 0.3,
    metalness: 0.7,
  });

  // Handle arch — a torus arc
  const archRadius = 0.055;
  const tubeRadius = 0.012;
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(archRadius, tubeRadius, 12, 24, Math.PI),
    handleMat
  );
  arch.rotation.x = Math.PI / 2;
  arch.rotation.z = Math.PI / 2;
  arch.position.y = STONE_HEIGHT + tubeRadius + 0.002;
  arch.castShadow = true;
  group.add(arch);

  // Two vertical posts connecting arch to stone top
  const postHeight = 0.018;
  const postGeo = new THREE.CylinderGeometry(
    tubeRadius,
    tubeRadius,
    postHeight,
    8
  );
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, handleMat);
    post.position.set(side * archRadius, STONE_HEIGHT + postHeight / 2, 0);
    post.castShadow = true;
    group.add(post);
  }

  // Central bolt
  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.012, 12),
    boltMat
  );
  bolt.position.y = STONE_HEIGHT + 0.004;
  bolt.castShadow = true;
  group.add(bolt);

  return group;
}

export function createStone(color: "red" | "yellow"): THREE.Group {
  const group = new THREE.Group();

  const stoneColor = color === "red" ? COLORS.red : COLORS.yellow;

  // Granite body via LatheGeometry
  const profile = createStoneProfile();
  const bodyGeo = new THREE.LatheGeometry(profile, 48);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: COLORS.granite,
    roughness: 0.55,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Colored band around the top rim
  const bandGeo = new THREE.TorusGeometry(
    STONE_RADIUS * 0.82,
    0.016,
    8,
    48
  );
  const bandMat = new THREE.MeshStandardMaterial({
    color: stoneColor,
    roughness: 0.3,
    metalness: 0.05,
  });
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.rotation.x = Math.PI / 2;
  band.position.y = STONE_HEIGHT + 0.003;
  band.castShadow = true;
  group.add(band);

  // Handle
  const handle = createHandle(stoneColor);
  group.add(handle);

  group.name = `stone_${color}`;
  return group;
}

/**
 * Place a set of demo stones on the sheet for the initial visual.
 */
export function createDemoStones(): THREE.Group {
  const group = new THREE.Group();
  group.name = "stones";

  const positions: Array<{
    color: "red" | "yellow";
    x: number;
    z: number;
  }> = [
    { color: "red", x: 0.3, z: 17.0 },
    { color: "red", x: -0.5, z: 17.6 },
    { color: "red", x: 0.1, z: 16.5 },
    { color: "yellow", x: -0.2, z: 17.3 },
    { color: "yellow", x: 0.6, z: 16.8 },
    { color: "yellow", x: -0.1, z: 18.0 },
  ];

  for (const p of positions) {
    const stone = createStone(p.color);
    stone.position.set(p.x, 0, p.z);
    group.add(stone);
  }

  return group;
}
