import * as THREE from "three";
import { SHEET_LENGTH } from "../utils/constants";

/**
 * Arena lighting rig:
 * - A row of overhead spotlights running along the sheet (mimics arena ceiling lights)
 * - Soft hemisphere light for ambient fill
 * - A gentle directional light for broad highlights on the ice
 */
export function createLighting(): THREE.Group {
  const group = new THREE.Group();
  group.name = "lighting";

  // Hemisphere light: sky/ground ambient fill
  const hemi = new THREE.HemisphereLight(0xc8d8f0, 0x222230, 0.6);
  group.add(hemi);

  // Overhead spot lights along the sheet
  const spotCount = 6;
  const spacing = SHEET_LENGTH / (spotCount + 1);
  const startZ = -SHEET_LENGTH / 2 + spacing;
  const height = 7;

  for (let i = 0; i < spotCount; i++) {
    const z = startZ + i * spacing;

    const spot = new THREE.SpotLight(0xfff8e8, 40, 20, Math.PI / 5, 0.6, 1.2);
    spot.position.set(0, height, z);
    spot.target.position.set(0, 0, z);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.001;
    spot.shadow.camera.near = 1;
    spot.shadow.camera.far = 15;

    group.add(spot);
    group.add(spot.target);
  }

  // Soft directional fill light
  const dir = new THREE.DirectionalLight(0xe8e0d8, 0.3);
  dir.position.set(5, 10, 0);
  dir.castShadow = false;
  group.add(dir);

  return group;
}
