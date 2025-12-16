/* src/scripts/state.js */

export const canvas = document.getElementById("gameCanvas");
export const ctx = canvas.getContext("2d");

export const worldWidth = 5000;
export const worldHeight = 5000;

// Global Game Flags
export let gameRunning = false;
export let paused = false;
export let score = 0;
export let isReloading = false;

// --- Bullet Pooling System ---
export const MAX_BULLETS = 300;
export const bullets = new Array(MAX_BULLETS).fill(null).map(() => ({
  active: false,
  x: 0, y: 0,
  dx: 0, dy: 0,
  width: 8, height: 8,
  damage: 1,
  color: "yellow"
}));

export function spawnBullet(x, y, dx, dy, damage, color) {
  for (let i = 0; i < MAX_BULLETS; i++) {
    if (!bullets[i].active) {
      const b = bullets[i];
      b.active = true;
      b.x = x;
      b.y = y;
      b.dx = dx;
      b.dy = dy;
      b.damage = damage;
      b.color = color;
      return;
    }
  }
}

export function clearBullets() {
  for (let i = 0; i < MAX_BULLETS; i++) {
    bullets[i].active = false;
  }
}

// Player State
export const INITIAL_PLAYER_BASES = {
  maxHealth: 10,
  normalSpeed: 4,
  sprintSpeed: 6,
  magazine: 16,
  baseDamage: 1
};

export let player = {
  x: 0, y: 0, width: 24, height: 24,
  normalSpeed: 4, sprintSpeed: 6, speed: 4,
  maxHealth: 10, health: 10,
  magazineSize: 16, ammo: 16, reserveAmmo: 1024,
  stamina: 100, maxStamina: 100,
  sprinting: false,
  upgrades: { damage: 0, health: 0, speed: 0, magazine: 0, knockback: 0 },
  lastHitTime: 0,
  immune: false,
  doubleDamage: false,
  tripleShot: false
};

// Functions to manage state
export function setGameRunning(val) { gameRunning = val; }
export function setPaused(val) { paused = val; }
export function setScore(val) { score = val; }
export function setIsReloading(val) { isReloading = val; }

export function recalcPlayerStats() {
  const hpPerLevel = 2;
  const speedPerLevel = 0.25;
  const magazinePerLevel = 4;

  player.maxHealth = INITIAL_PLAYER_BASES.maxHealth + (player.upgrades.health || 0) * hpPerLevel;
  if (typeof player.health !== 'number' || Number.isNaN(player.health)) player.health = player.maxHealth;
  player.health = Math.min(player.health, player.maxHealth);

  player.normalSpeed = INITIAL_PLAYER_BASES.normalSpeed + (player.upgrades.speed || 0) * speedPerLevel;
  player.sprintSpeed = INITIAL_PLAYER_BASES.sprintSpeed + (player.upgrades.speed || 0) * speedPerLevel;
  player.magazineSize = INITIAL_PLAYER_BASES.magazine + (player.upgrades.magazine || 0) * magazinePerLevel;
  player.speed = player.sprinting ? player.sprintSpeed : player.normalSpeed;
}

export function getPlayerDamage() {
  const base = INITIAL_PLAYER_BASES.baseDamage + (player.upgrades.damage || 0);
  return player.doubleDamage ? base * 2 : base;
}

export function resetPlayerState() {
  player.upgrades = { damage: 0, health: 0, speed: 0, magazine: 0, knockback: 0 };
  recalcPlayerStats();
  
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
  player.health = player.maxHealth;
  player.ammo = player.magazineSize;
  player.reserveAmmo = 1500;
  player.stamina = player.maxStamina;
  player.sprinting = false;
  
  // --- FIX: Reset Powerup Flags ---
  player.immune = false;
  player.doubleDamage = false;
  player.tripleShot = false;
  
  score = 0;
  clearBullets();
  isReloading = false;
}

window.player = player;
window.gameCanvas = canvas;
window.gameState = { gameRunning, paused, score, bullets };