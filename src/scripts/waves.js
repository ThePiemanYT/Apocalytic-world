/* src/scripts/waves.js */
import { canvas, player } from "./state.js";
import { spawnEnemy, enemies } from "./enemy.js"; // Import existing logic
import { spawnPowerups } from "./powerup.js";
import { updateAchievement } from "./achievement.js";
import { updateWaveUI } from "./ui.js";

export let waves = [];
export let zombiesData = {};
export let currentWave = 0;
export let waveEnemyQueue = [];
export let waveSpawning = false;
let waveSpawnTimer = 0;

export async function loadGameData() {
  try {
    const zRes = await fetch("data/zombies.json");
    zombiesData = await zRes.json();
    const wRes = await fetch("data/wave.json");
    waves = await wRes.json();
  } catch (e) {
    console.warn("Using fallback data", e);
    zombiesData = {
      basic: { speed: 2, health: 1, color: "red", size: 8 },
      fast: { speed: 4, health: 1, color: "orange", size: 8 },
      tank: { speed: 1, health: 3, color: "purple", size: 12 }
    };
    waves = [
      { wave: 1, zombies: [{ type: "basic", count: 5 }] },
      { wave: 2, zombies: [{ type: "basic", count: 7 }, { type: "fast", count: 2 }] }
    ];
  }
}

export function startWave(waveIdx) {
  if (!waves[waveIdx]) return false; // No more waves
  
  currentWave = waveIdx;
  updateWaveUI(currentWave);
  
  waveEnemyQueue = [];
  // Build queue
  for (const z of waves[waveIdx].zombies) {
    for (let i = 0; i < z.count; i++) waveEnemyQueue.push(z.type);
  }
  
  waveSpawning = true;
  waveSpawnTimer = 0;
  spawnPowerups(); // Spawn powerups at start of wave
  
  // Achievement
  if (waveIdx === 7) updateAchievement("4", 8);

  return true;
}

export function updateWaveLogic() {
  if (waveSpawning) {
    waveSpawnTimer++;
    if (waveSpawnTimer >= 40) { // Spawn every 40 frames
      if (waveEnemyQueue.length > 0) {
        const type = waveEnemyQueue.shift();
        spawnEnemy(type, zombiesData, canvas.width);
      } else {
        waveSpawning = false;
      }
      waveSpawnTimer = 0;
    }
  }
}

export function resetWaveState() {
  currentWave = -1;
  waveEnemyQueue = [];
  waveSpawning = false;
}