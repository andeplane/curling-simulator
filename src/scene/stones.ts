import * as THREE from "three";
import { STONE_RADIUS, STONE_HEIGHT, COLORS } from "../utils/constants";
import type { StoneState, Team } from "../physics/types";

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

  const postHeight = 0.018;
  const postGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, postHeight, 8);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, handleMat);
    post.position.set(side * archRadius, STONE_HEIGHT + postHeight / 2, 0);
    post.castShadow = true;
    group.add(post);
  }

  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.012, 12),
    boltMat
  );
  bolt.position.y = STONE_HEIGHT + 0.004;
  bolt.castShadow = true;
  group.add(bolt);

  return group;
}

export function createStoneMesh(team: Team): THREE.Group {
  const group = new THREE.Group();
  const stoneColor = team === "red" ? COLORS.red : COLORS.yellow;

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

  const bandGeo = new THREE.TorusGeometry(STONE_RADIUS * 0.82, 0.016, 8, 48);
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

  const handle = createHandle(stoneColor);
  group.add(handle);

  group.name = `stone_${team}`;
  return group;
}

/**
 * Manages the 3D mesh representations of all curling stones,
 * syncing their transforms from the physics state each frame.
 */
export class StoneManager {
  private parentGroup: THREE.Group;
  private meshes: Map<number, THREE.Group> = new Map();

  constructor(parent: THREE.Group) {
    this.parentGroup = parent;
  }

  /**
   * Sync 3D meshes to match physics stone states.
   * Creates new meshes as needed, hides removed stones.
   */
  sync(stones: StoneState[]): void {
    // Track which delivery indices are still present
    const activeIndices = new Set<number>();

    for (const s of stones) {
      activeIndices.add(s.deliveryIndex);

      let mesh = this.meshes.get(s.deliveryIndex);
      if (!mesh) {
        mesh = createStoneMesh(s.team);
        this.meshes.set(s.deliveryIndex, mesh);
        this.parentGroup.add(mesh);
      }

      if (s.inPlay) {
        mesh.visible = true;
        mesh.position.set(s.pos.x, 0, s.pos.z);
        mesh.rotation.y = -s.angle * 3;
      } else {
        mesh.visible = false;
      }
    }

    // Hide meshes for stones that no longer exist
    for (const [idx, mesh] of this.meshes) {
      if (!activeIndices.has(idx)) {
        mesh.visible = false;
      }
    }
  }

  /** Remove all meshes (for game reset). */
  clear(): void {
    for (const [, mesh] of this.meshes) {
      this.parentGroup.remove(mesh);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    this.meshes.clear();
  }
}
