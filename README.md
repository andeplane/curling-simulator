# Curling Simulator

A browser-based curling game with realistic physics, built with [Three.js](https://threejs.org/) and TypeScript.

**[Play it here](https://andeplane.github.io/curling-simulator/)**

## Features

- **Realistic ice physics** — velocity-dependent friction (µ ∝ v⁻¹/²), calibrated lateral curl that strengthens late in the trajectory, and angular spin decay
- **Stone collisions** — impulse-based resolution with restitution, tangential friction, spin transfer, and positional correction
- **Sweeping** — hold space while a stone is in motion to reduce friction and extend travel distance
- **Full game rules** — 10-end matches with alternating hammer, hog-line violation detection, and official WCF-based scoring
- **3D arena** — textured ice sheet with pebble noise, house rings, side boards, overhead spotlights with shadows
- **Trajectory preview** — a curved ghost line shows the predicted path before you throw

## Controls

| Key | Action |
|-----|--------|
| **A / D** | Aim left / right |
| **W / S** | Increase / decrease power |
| **Q / E** | Adjust spin (curl direction) |
| **Space** | Throw stone (aiming phase) / Sweep (while stone is moving) |
| **R** | Restart game |
| Mouse | Orbit camera (click + drag) |

## Getting Started

```bash
npm install
npm run dev
```

This opens the game at `http://localhost:5173`.

To create a production build:

```bash
npm run build
```

The output goes to `dist/`.

## Architecture

```
src/
├── main.ts                  # Entry point, render loop, camera control
├── utils/
│   └── constants.ts         # WCF sheet dimensions, stone properties, colors
├── physics/
│   ├── types.ts             # Core types (StoneState, Vec2, IceParams, etc.)
│   ├── world.ts             # PhysicsWorld — fixed-timestep simulation manager
│   ├── ice-model.ts         # Friction µ(v), lateral curl, spin decay
│   ├── integrator.ts        # Semi-implicit Euler stepping
│   ├── collisions.ts        # Stone–stone and stone–wall impulse resolution
│   └── rules.ts             # Scoring, out-of-bounds, hog-line violations
├── scene/
│   ├── ice-sheet.ts         # Canvas-textured ice surface with house markings
│   ├── arena.ts             # Side boards, end boards, floor
│   ├── stones.ts            # 3D stone meshes synced to physics state
│   └── lighting.ts          # Hemisphere, spot, and fill lights
└── game/
    ├── game-controller.ts   # Game phases, end/score management, delivery flow
    ├── input-handler.ts     # Keyboard input, aiming state, trajectory preview
    └── hud.ts               # HTML overlay for scores, power bar, controls
```

The physics layer runs independently of rendering at a fixed timestep (1/120 s) using semi-implicit Euler integration. The renderer interpolates at 60 fps. This separation makes the physics deterministic and keeps the simulation stable regardless of frame rate.

## Physics Model

The simulator implements a phenomenological curl model rather than attempting to resolve the still-debated microscopic mechanisms of curling stone dynamics. Key aspects:

- **Friction** is velocity-dependent, following a µ ∝ v⁻¹/² relationship consistent with mixed-lubrication models on pebbled ice. Real measurements put µ in the range 0.006–0.016.
- **Curl** is applied as a lateral acceleration perpendicular to the velocity vector, scaled to produce the characteristic late break seen in real deliveries. The curl magnitude has weak dependence on angular velocity above a small threshold, matching empirical observations.
- **Sweeping** reduces the friction coefficient and extends stone travel distance, modeled as a modifier on µ(v).
- **Collisions** use impulse-based resolution with configurable restitution (~0.8) and tangential friction for realistic post-collision angles and roll behavior.

For more background on the physics of curling simulation, see `deep-research-report.md`.

## Tech Stack

- [Three.js](https://threejs.org/) — 3D rendering
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Vite](https://vite.dev/) — dev server and bundler

## License

MIT
