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
export let showMinimap = localStorage.getItem("showMinimap") !== "false"; 

export function setShowMinimap(val) { 
    showMinimap = val; 
    localStorage.setItem("showMinimap", val);
}

// --- LIFETIME STATS ---
const defaultStats = {
  totalKills: 0,
  totalBulletsFired: 0,
  totalDeaths: 0,
  totalWavesSurvived: 0,
  totalCoinsEarned: 0,
  highScore: 0
};

const savedStats = JSON.parse(localStorage.getItem("lifetimeStats")) || {};
export const lifetimeStats = { ...defaultStats, ...savedStats };

export function updateLifetimeStat(key, amount = 1) {
    if (key === 'highScore') {
        if (amount > (lifetimeStats.highScore || 0)) {
            lifetimeStats.highScore = amount;
        }
    } else {
        lifetimeStats[key] = (lifetimeStats[key] || 0) + amount;
    }
    localStorage.setItem("lifetimeStats", JSON.stringify(lifetimeStats));
}

// --- MULTIPLAYER STATE ---
export let isSinglePlayer = true; // Moved here from index.js
export let myId = null;
export const remotePlayers = {}; 

export function setMyId(id) { myId = id; }
export function setIsSinglePlayer(val) { isSinglePlayer = val; }
// -----------------------------

// --- Bullet Pooling System ---
export const MAX_BULLETS = 300;
export const bullets = new Array(MAX_BULLETS).fill(null).map(() => ({
  active: false,
  x: 0, y: 0,
  dx: 0, dy: 0,
  width: 8, height: 8,
  damage: 1,
  color: "default", 
  isCrit: false,
  ownerId: null
}));

export function spawnBullet(x, y, dx, dy, damage, styleId, isCrit, ownerId = null) {
  for (let i = 0; i < MAX_BULLETS; i++) {
    if (!bullets[i].active) {
      const b = bullets[i];
      b.active = true;
      b.x = x;
      b.y = y;
      b.dx = dx;
      b.dy = dy;
      b.damage = damage;
      b.color = styleId; 
      b.isCrit = isCrit;
      b.ownerId = ownerId; 
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
  normalSpeed: 5,
  sprintSpeed: 7.5,
  magazine: 50,
  baseDamage: 1,
  baseCritChance: 0.05,
  baseCritMult: 1.5
};

const savedMetaUpgrades = JSON.parse(localStorage.getItem("metaUpgrades")) || {
  health: 0,
  speed: 0,
  damage: 0,
  magazine: 0,
  reserve: 0,
  totalSpent: 0
};

const savedCosmetics = JSON.parse(localStorage.getItem("playerCosmetics")) || {
  bodyColor: "cyan",
  eyeStyle: "normal",
  hatStyle: "none",
  indicatorStyle: "dot",
  bulletStyle: "default",
  trailStyle: "none"
};

export let player = {
  x: 0, y: 0, width: 32, height: 32,
  normalSpeed: INITIAL_PLAYER_BASES.normalSpeed, 
  sprintSpeed: INITIAL_PLAYER_BASES.sprintSpeed, 
  speed: INITIAL_PLAYER_BASES.normalSpeed,
  maxHealth: 10, health: 10,
  magazineSize: 50, ammo: 50, reserveAmmo: 1250,
  stamina: 125, maxStamina: 125,
  sprinting: false, dashActive: false, dashTime: 0, dashCooldown: 0,
  metaUpgrades: savedMetaUpgrades,
  upgrades: { damage: 0, health: 0, speed: 0, magazine: 0, critChance: 0, critDamage: 0 },
  critChance: 0.05, critMultiplier: 1.5,
  lastHitTime: 0, immune: false,
  doubleDamage: false, tripleShot: false, alwaysCrit: false,
  timeSlowed: false, // NEW
  whirlwind: false, // NEW: Whirlwind Powerup
  
  // Status Effects
  frostbiteStacks: 0,
  isSliding: false,
  slideDir: { x: 0, y: 0 },
  slideTimer: 0,
  
  isFrozen: false,
  freezeTimer: 0,

  // Chrono-Thief Specifics
  positionHistory: [], // Stores {x,y} for Time Skip
  ageingCurse: false,
  ageingTimer: 0,
  lastShootTime: 0, // To throttle shooting speed

  isDead: false, deathTimer: 0,
  isWinning: false, victoryTimer: 0,
  hurtTime: 0, maxHurtTime: 10,   
  muzzleFlash: 0, 
  chromaticAberration: 0,
  critFeedback: 0,
  cosmetics: savedCosmetics
};

export function saveCosmetics() {
  localStorage.setItem("playerCosmetics", JSON.stringify(player.cosmetics));
}

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

  // Apply META upgrades first
  const metaHP = (player.metaUpgrades.health || 0) * 2; // +2 HP per meta level
  const metaSpeed = (player.metaUpgrades.speed || 0) * 0.25; // +0.25 speed per meta level
  const metaDmg = (player.metaUpgrades.damage || 0) * 0.2; // +0.2 dmg per meta level (hidden base)
  const metaMag = (player.metaUpgrades.magazine || 0) * 2; // +2 mag per meta level
  const metaRsv = (player.metaUpgrades.reserve || 0) * 25; // +25 reserve per meta level

  player.maxHealth = INITIAL_PLAYER_BASES.maxHealth + metaHP + (player.upgrades.health || 0) * hpPerLevel;
  if (typeof player.health !== 'number' || Number.isNaN(player.health)) player.health = player.maxHealth;
  player.health = Math.min(player.health, player.maxHealth);

  player.normalSpeed = INITIAL_PLAYER_BASES.normalSpeed + metaSpeed + (player.upgrades.speed || 0) * speedPerLevel;
  player.sprintSpeed = INITIAL_PLAYER_BASES.sprintSpeed + metaSpeed + (player.upgrades.speed || 0) * speedPerLevel;
  player.magazineSize = INITIAL_PLAYER_BASES.magazine + metaMag + (player.upgrades.magazine || 0) * magazinePerLevel;
  player.reserveAmmo = 1250 + metaRsv; 
  player.critChance = INITIAL_PLAYER_BASES.baseCritChance + (player.upgrades.critChance || 0) * critChancePerLevel;
  player.critMultiplier = INITIAL_PLAYER_BASES.baseCritMult + (player.upgrades.critDamage || 0) * critMultPerLevel;
  player.speed = player.sprinting ? player.sprintSpeed : player.normalSpeed;
}

export function getPlayerDamage() {
  const metaDmg = (player.metaUpgrades.damage || 0) * 0.2;
  const base = INITIAL_PLAYER_BASES.baseDamage + metaDmg + (player.upgrades.damage || 0);
  return player.doubleDamage ? base * 2 : base;
}

export function resetPlayerState() {
  player.upgrades = { damage: 0, health: 0, speed: 0, magazine: 0, critChance: 0, critDamage: 0 };
  recalcPlayerStats();
  
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
  player.health = player.maxHealth;
  player.ammo = player.magazineSize;
  player.reserveAmmo = 1250;
  player.stamina = player.maxStamina;
  
  player.isDead = false; player.deathTimer = 0;
  player.isWinning = false; player.victoryTimer = 0;
  player.hurtTime = 0;
  
  player.doubleDamage = false; player.tripleShot = false;
  player.alwaysCrit = false; player.piercingShot = false;
  player.explosiveShot = false; player.immune = false;
  player.timeSlowed = false; // NEW
  player.whirlwind = false;
  player.frostbiteStacks = 0;
  player.isSliding = false;
  player.slideTimer = 0;
}