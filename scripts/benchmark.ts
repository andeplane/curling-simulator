/**
 * Benchmark script to measure headless physics simulation throughput.
 * 
 * Run with: npx tsx scripts/benchmark.ts
 */

import { HeadlessGame } from "../src/headless-entry";
import type { ShotRelease } from "../src/headless-entry";

// Generate a random shot release
function randomShot(): ShotRelease {
  return {
    x: (Math.random() - 0.5) * 0.5, // Small lateral variation
    z: 0,
    speed: 2.5 + Math.random() * 1.5, // 2.5-4.0 m/s
    angle: (Math.random() - 0.5) * 0.1, // Small angle variation
    omega: (Math.random() - 0.5) * 3.0, // Spin variation
  };
}

// Generate a full end of random shots
function generateEnd(): ShotRelease[] {
  const shots: ShotRelease[] = [];
  for (let i = 0; i < 16; i++) {
    shots.push(randomShot());
  }
  return shots;
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toFixed(0);
}

function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(1)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

async function benchmark() {
  console.log("🧊 Curling Physics Benchmark\n");
  console.log("Measuring headless simulation throughput...\n");

  // Warmup
  const warmupGame = new HeadlessGame();
  warmupGame.simulateEnd(generateEnd());
  console.log("✓ Warmup complete\n");

  // Benchmark single shot
  console.log("📊 Single Shot Benchmark:");
  const shotGame = new HeadlessGame();
  const shot = randomShot();
  
  const shotStart = performance.now();
  const shotResult = shotGame.throwAndSettle(shot);
  const shotTime = performance.now() - shotStart;
  
  console.log(`  Steps: ${shotResult.steps}`);
  console.log(`  Time: ${formatTime(shotTime)}`);
  console.log(`  Steps/sec: ${formatNumber((shotResult.steps / shotTime) * 1000)}`);
  console.log(`  Shots/sec: ${formatNumber(1000 / shotTime)}\n`);

  // Benchmark full end
  console.log("📊 Full End Benchmark:");
  const endShots = generateEnd();
  const endGame = new HeadlessGame();
  
  const endStart = performance.now();
  const endScore = endGame.simulateEnd(endShots);
  const endTime = performance.now() - endStart;
  
  console.log(`  Shots: ${endShots.length}`);
  console.log(`  Time: ${formatTime(endTime)}`);
  console.log(`  Score: Red ${endScore.red}, Yellow ${endScore.yellow}`);
  console.log(`  Ends/sec: ${formatNumber(1000 / endTime)}\n`);

  // Benchmark batch throughput
  console.log("📊 Batch Throughput Benchmark:");
  const batchSize = 100;
  const batchGames: HeadlessGame[] = [];
  const batchShots: ShotRelease[][] = [];
  
  for (let i = 0; i < batchSize; i++) {
    batchGames.push(new HeadlessGame());
    batchShots.push(generateEnd());
  }
  
  const batchStart = performance.now();
  for (let i = 0; i < batchSize; i++) {
    batchGames[i].simulateEnd(batchShots[i]);
  }
  const batchTime = performance.now() - batchStart;
  
  const endsPerSecond = (batchSize / batchTime) * 1000;
  console.log(`  Batch size: ${batchSize} ends`);
  console.log(`  Total time: ${formatTime(batchTime)}`);
  console.log(`  Avg time/end: ${formatTime(batchTime / batchSize)}`);
  console.log(`  Throughput: ${formatNumber(endsPerSecond)} ends/sec\n`);

  // Summary
  console.log("✨ Summary:");
  console.log(`  Single shot: ~${formatTime(shotTime)}`);
  console.log(`  Full end: ~${formatTime(endTime)}`);
  console.log(`  Batch throughput: ~${formatNumber(endsPerSecond)} ends/sec`);
  console.log(`\n  This is suitable for ML training! 🚀\n`);
}

benchmark().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
