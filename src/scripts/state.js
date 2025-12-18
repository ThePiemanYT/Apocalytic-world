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
  color: "default", // Stores the Cosmetic ID now
  isCrit: false
}));

export function spawnBullet(x, y, dx, dy, damage, styleId, isCrit) {
  for (let i = 0; i < MAX_BULLETS; i++) {
    if (!bullets[i].active) {
      const b = bullets[i];
      b.active = true;
      b.x = x;
      b.y = y;
      b.dx = dx;
      b.dy = dy;
      b.damage = damage;
      b.color = styleId; // Pass the cosmetic ID (e.g., "fire", "rainbow")
      b.isCrit = isCrit;
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
  magazine: 40,
  baseDamage: 1,
  baseCritChance: 0.05,
  baseCritMult: 1.5
};

// --- Load Cosmetics ---
const savedCosmetics = JSON.parse(localStorage.getItem("playerCosmetics")) || {
  bodyColor: "cyan",
  eyeStyle: "normal",
  hatStyle: "none",
  indicatorStyle: "dot",
  bulletStyle: "default" // NEW: Bullet Style
};

export let player = {
  x: 0, y: 0, width: 32, height: 32,
  normalSpeed: 4, sprintSpeed: 6, speed: 4,
  maxHealth: 10, health: 10,
  magazineSize: 40, ammo: 40, reserveAmmo: 750,
  stamina: 100, maxStamina: 100,
  sprinting: false,
  dashActive: false, dashTime: 0, dashCooldown: 0,
  upgrades: { damage: 0, health: 0, speed: 0, magazine: 0, critChance: 0, critDamage: 0 },
  critChance: 0.05, critMultiplier: 1.5,
  lastHitTime: 0, immune: false,
  doubleDamage: false, tripleShot: false, alwaysCrit: false,
  
  cosmetics: savedCosmetics
};

export function saveCosmetics() {
  localStorage.setItem("playerCosmetics", JSON.stringify(player.cosmetics));
}

// Functions to manage state
export function setGameRunning(val) { gameRunning = val; }
export function setPaused(val) { paused = val; }
export function setScore(val) { score = val; }
export function setIsReloading(val) { isReloading = val; }

export function recalcPlayerStats() {
  const hpPerLevel = 2;
  const speedPerLevel = 0.25;
  const magazinePerLevel = 4;
  const critChancePerLevel = 0.05;
  const critMultPerLevel = 0.25;

  player.maxHealth = INITIAL_PLAYER_BASES.maxHealth + (player.upgrades.health || 0) * hpPerLevel;
  if (typeof player.health !== 'number' || Number.isNaN(player.health)) player.health = player.maxHealth;
  player.health = Math.min(player.health, player.maxHealth);

  player.normalSpeed = INITIAL_PLAYER_BASES.normalSpeed + (player.upgrades.speed || 0) * speedPerLevel;
  player.sprintSpeed = INITIAL_PLAYER_BASES.sprintSpeed + (player.upgrades.speed || 0) * speedPerLevel;
  player.magazineSize = INITIAL_PLAYER_BASES.magazine + (player.upgrades.magazine || 0) * magazinePerLevel;
  
  player.critChance = INITIAL_PLAYER_BASES.baseCritChance + (player.upgrades.critChance || 0) * critChancePerLevel;
  player.critMultiplier = INITIAL_PLAYER_BASES.baseCritMult + (player.upgrades.critDamage || 0) * critMultPerLevel;

  player.speed = player.sprinting ? player.sprintSpeed : player.normalSpeed;
}

export function getPlayerDamage() {
  const base = INITIAL_PLAYER_BASES.baseDamage + (player.upgrades.damage || 0);
  return player.doubleDamage ? base * 2 : base;
}

export function resetPlayerState() {
  player.upgrades = { damage: 0, health: 0, speed: 0, magazine: 0, critChance: 0, critDamage: 0 };
  recalcPlayerStats();
  
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
  player.health = player.maxHealth;
  player.ammo = player.magazineSize;
  player.reserveAmmo = 750;
  player.stamina = player.maxStamina;
  player.sprinting = false;
  
  player.immune = false;
  player.doubleDamage = false;
  player.tripleShot = false;
  player.alwaysCrit = false;
  
  player.dashActive = false;
  player.dashCooldown = 0;
  
  score = 0;
  clearBullets();
  isReloading = false;
}

window.player = player;
window.gameCanvas = canvas;
window.gameState = { gameRunning, paused, score, bullets };