import * as THREE from "three";
import { SHEET_LENGTH, SHEET_WIDTH, COLORS } from "../utils/constants";

/**
 * Build the arena environment around the ice sheet:
 * - Side boards running along the sheet
 * - End boards behind each hack
 * - A dark floor underneath / around the sheet
 * - Subtle surrounding walls to frame the scene
 */
export function createArena(): THREE.Group {
  const group = new THREE.Group();
  group.name = "arena";

  const boardHeight = 0.25;
  const boardThickness = 0.08;
  const margin = 0.5; // extra length past the sheet ends

  const totalLength = SHEET_LENGTH + margin * 2;
  const halfWidth = SHEET_WIDTH / 2;

  const boardMat = new THREE.MeshStandardMaterial({
    color: COLORS.boardBrown,
    roughness: 0.7,
    metalness: 0.0,
  });

  // Side boards
  const sideBoardGeo = new THREE.BoxGeometry(
    boardThickness,
    boardHeight,
    totalLength
  );
  for (const side of [-1, 1]) {
    const board = new THREE.Mesh(sideBoardGeo, boardMat);
    board.position.set(
      side * (halfWidth + boardThickness / 2),
      boardHeight / 2,
      0
    );
    board.castShadow = true;
    board.receiveShadow = true;
    group.add(board);
  }

  // End boards
  const endBoardGeo = new THREE.BoxGeometry(
    SHEET_WIDTH + boardThickness * 2,
    boardHeight,
    boardThickness
  );
  for (const end of [-1, 1]) {
    const board = new THREE.Mesh(endBoardGeo, boardMat);
    board.position.set(
      0,
      boardHeight / 2,
      end * (SHEET_LENGTH / 2 + margin / 2)
    );
    board.castShadow = true;
    board.receiveShadow = true;
    group.add(board);
  }

  // Dark arena floor surrounding the sheet
  const floorSize = 60;
  const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: COLORS.arenaDark,
    roughness: 0.9,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -0.005;
  floor.receiveShadow = true;
  group.add(floor);

  // Subtle side walls for atmosphere
  const wallHeight = 8;
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a12,
    roughness: 0.95,
    metalness: 0.0,
  });

  const sideWallGeo = new THREE.PlaneGeometry(totalLength, wallHeight);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(sideWallGeo, wallMat);
    wall.position.set(side * 12, wallHeight / 2, 0);
    wall.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(wall);
  }


  return group;
}
