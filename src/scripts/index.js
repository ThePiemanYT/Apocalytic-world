import {
  enemies,
  resetEnemies,
  spawnEnemy,
  updateEnemies,
  drawEnemies,
  handleBulletCollisions,
  handlePlayerCollisions,
  projectiles,
  updateProjectiles,
  drawProjectiles,
  handleProjectilePlayerCollision
} from "./enemy.js";
import { reload } from "./reload.js";
import { spawnPowerups, drawAndHandlePowerups } from "./powerup.js";
import { initPowerupHUD, updatePowerupHUD, activePowerups } from "./powerup.js";

/* =========================================================================
   DOM references + immediate UI elements that must exist early
   ========================================================================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const finalScore = document.getElementById("finalScore");
const healthBar = document.getElementById("healthBar");
const waveDisplay = document.getElementById("waveDisplay");
const backgroundMusic = document.getElementById("backgroundMusic");
let musicEnabled = true;
let sfxEnabled = true;
let sfxVolume = 1.0;
let musicVolume = 0.5;
let sfxEnabledStored = localStorage.getItem("sfxEnabled");
if (sfxEnabledStored !== null) sfxEnabled = sfxEnabledStored === "true";
let musicEnabledStored = localStorage.getItem("musicEnabled");
if (musicEnabledStored !== null) musicEnabled = musicEnabledStored === "true";

/* =========================================================================
   Menu background image — MUST be created BEFORE startGame/hideMenuBackground
   ========================================================================= */
const menuBackground = document.createElement("img");
menuBackground.src = "src/assets/image/menuScreen1.png";
menuBackground.id = "menuBackground";
Object.assign(menuBackground.style, {
  position: "absolute",
  top: "0",
  left: "0",
  width: "100%",
  height: "100%",
  zIndex: "150",
  display: "block",
  pointerEvents: "none"
});
document.body.appendChild(menuBackground);

function showMenuBackground() { menuBackground.style.display = "block"; }
function hideMenuBackground() { menuBackground.style.display = "none"; }

/* =========================================================================
   Basic resources: images + sounds (create early)
   ========================================================================= */
const gameBG = new Image();
gameBG.src = "src/assets/image/gameBG.png";

const selectSound = new Audio("src/assets/sound/blipSelect.wav");
const explosionSound = new Audio("src/assets/sound/explosion.wav");
const shootSound = new Audio("src/assets/sound/laserShoot.wav");
const hitHurt = new Audio("src/assets/sound/hitHurt.wav");
const powerUpSound = new Audio("src/assets/sound/powerUp.wav");
const reloadSound = new Audio("src/assets/sound/reload-gun.mp3");
const victorySound = new Audio("src/assets/sound/victory.mp3");
victorySound.volume = 0.9;
const gameOverSound = new Audio("src/assets/sound/game-over.mp3");
gameOverSound.volume = 0.9;
backgroundMusic.volume = 0.5;

/* =========================================================================
   Game state — player, bullets, waves, etc.
   ========================================================================= */
let player = {
  x: 0, y: 0, width: 24, height: 24,
  normalSpeed: 4, sprintSpeed: 6, speed: 4,
  maxHealth: 10, health: 10,
  magazineSize: 16, ammo: 16, reserveAmmo: 1024,
  stamina: 100, maxStamina: 100,
  sprinting: false,
  upgrades: { damage: 0, health: 0, speed: 0, magazine: 0, knockback: 0 },
  lastHitTime: 0,
  immune: false,
  // optional flags used in some mechanics
  doubleDamage: false,
  tripleShot: false
};

const INITIAL_PLAYER_BASES = {
  maxHealth: player.maxHealth,
  normalSpeed: player.normalSpeed,
  sprintSpeed: player.sprintSpeed,
  magazine: player.magazineSize,
  baseDamage: 1
};

function recalcPlayerStats() {
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

function getPlayerDamage() {
  const base = INITIAL_PLAYER_BASES.baseDamage + (player.upgrades.damage || 0);
  return player.doubleDamage ? base * 2 : base;
}

function onUpgradeApplied(key) {
  recalcPlayerStats();
  if (key === 'health') {
    const healOnLevel = 2;
    player.health = Math.min(player.health + healOnLevel, player.maxHealth);
    updateHealthBar();
  } else if (key === 'speed') {
    player.speed = player.sprinting ? player.sprintSpeed : player.normalSpeed;
  } else if (key === 'magazine') {
    player.ammo = Math.min(player.ammo + 4, player.magazineSize);
    updateAmmoDisplay();
  }
}

/* other state */
let bullets = [];
let keys = {};
let customKeys = { left: "a", right: "d", up: "w", down: "s" };
let controlMode = "buttons";
let isMobile = /Mobi|Android/i.test(navigator.userAgent);
controlMode = isMobile ? "joystick" : "buttons";

let gameRunning = false;
let paused = false;
let score = 0;
let enemyInterval, shootInterval;

let waves = [];
let zombiesData = {};
let currentWave = 0;
let waveEnemyQueue = [];
let waveSpawnTimer = 0;
let waveSpawning = false;
let waveClearTimeout = null;
let upgradeScreenShown = false;

let isReloading = false;

/* =========================================================================
   UI elements added by script: stamina bar, ammo display, powerup HUD
   ========================================================================= */
const staminaBar = document.createElement("div");
staminaBar.id = "staminaBar";
Object.assign(staminaBar.style, {
  position: "absolute", bottom: "60px", left: "32px",
  width: "200px", height: "20px", background: "#444",
  border: "2px solid #fff", borderRadius: "8px", overflow: "hidden", zIndex: 100
});
document.body.appendChild(staminaBar);

const staminaFill = document.createElement("div");
Object.assign(staminaFill.style, { height: "100%", width: "100%", background: "linear-gradient(90deg, #80dfff, #4fc3f7)" });
staminaBar.appendChild(staminaFill);

function updateStaminaBar() {
  staminaFill.style.width = (player.stamina / player.maxStamina * 100) + "%";
}

const ammoDisplay = document.createElement("div");
ammoDisplay.id = "ammoDisplay";
Object.assign(ammoDisplay.style, {
  position: "absolute",
  bottom: "16px",
  right: "32px",
  fontSize: "20px",
  color: "#ffe066",
  fontFamily: "Press Start 2P",
  textShadow: "2px 2px 4px #222",
  zIndex: 100
});
document.body.appendChild(ammoDisplay);

const powerupHUD = document.createElement("div");
Object.assign(powerupHUD.style, {
  position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)",
  display: "flex", gap: "16px", fontFamily: "Press Start 2P, sans-serif",
  fontSize: "16px", color: "#ffe066", textShadow: "2px 2px 4px #000", zIndex: 1500
});
document.body.appendChild(powerupHUD);

/* =========================================================================
   UI update helpers
   ========================================================================= */
function updateAmmoDisplay() {
  const el = document.getElementById("ammoDisplay");
  if (el) el.textContent = `Ammo: ${player.ammo} / ${player.reserveAmmo}`;
}

function updateHealthBar() {
  const percent = Math.max(0, player.health) / player.maxHealth;
  healthBar.style.width = (percent * 100) + "%";
  if (percent > 0.6) healthBar.style.background = "linear-gradient(90deg, #4CAF50, #ffe066)";
  else if (percent > 0.3) healthBar.style.background = "linear-gradient(90deg, orange, #ffe066)";
  else healthBar.style.background = "linear-gradient(90deg, #d32f2f, #ffe066)";
}

function updateWaveDisplay() {
  if (waveDisplay) waveDisplay.textContent = "Wave: " + (currentWave + 1);
}

/* =========================================================================
   Load external game data (zombies/waves) with fallbacks
   ========================================================================= */
async function loadGameData() {
  try {
    const zombiesRes = await fetch("data/zombies.json");
    zombiesData = await zombiesRes.json();
  } catch (e) {
    zombiesData = {
      basic: { speed: 2, health: 1, color: "red", size: 8 },
      fast: { speed: 4, health: 1, color: "orange", size: 8 },
      tank: { speed: 1, health: 3, color: "purple", size: 12 }
    };
  }
  try {
    const wavesRes = await fetch("data/wave.json");
    waves = await wavesRes.json();
  } catch (e) {
    waves = [
      { wave: 1, zombies: [{ type: "basic", count: 5 }] },
      { wave: 2, zombies: [{ type: "basic", count: 7 }, { type: "fast", count: 2 }] }
    ];
  }
}

/* =========================================================================
   Wave system
   ========================================================================= */
function startWave(waveIdx) {
  if (!waves[waveIdx]) return;
  currentWave = waveIdx;
  updateWaveDisplay();
  waveEnemyQueue = [];
  for (const z of waves[waveIdx].zombies) {
    for (let i = 0; i < z.count; i++) waveEnemyQueue.push(z.type);
  }
  waveSpawning = true;
  waveSpawnTimer = 0;
  try { spawnPowerups(); } catch (e) { /* safe */ }
}

function spawnWaveEnemy() {
  if (!waveSpawning || waveEnemyQueue.length === 0) return;
  const type = waveEnemyQueue.shift();
  spawnEnemy(type, zombiesData, canvas.width);
  if (waveEnemyQueue.length === 0) waveSpawning = false;
}

/* =========================================================================
   Upgrade modal
   ========================================================================= */
function openUpgradeScreen() {
  if (document.getElementById("upgrade-modal")) return;
  paused = true;

  const upgradeKeys = [
    { key: "damage", label: "Damage" },
    { key: "health", label: "Health" },
    { key: "speed", label: "Speed" },
    { key: "magazine", label: "Magazine" },
    { key: "knockback", label: "Knockback" }
  ];
  const maxPerUpgrade = 5;
  const pickLimit = 3;
  let picks = 0;
  player.upgrades = player.upgrades || {};
  upgradeKeys.forEach(u => { if (typeof player.upgrades[u.key] !== "number") player.upgrades[u.key] = 0; });

  const modal = document.createElement("div");
  modal.id = "upgrade-modal";
  Object.assign(modal.style, {
    position: "fixed", inset: "0", display: "flex", alignItems: "center",
    justifyContent: "center", background: "rgba(0,0,0,0.55)", zIndex: 9999
  });

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    width: "600px", maxWidth: "96%", background: "rgba(20,20,20,0.85)",
    borderRadius: "12px", padding: "18px", boxShadow: "0 10px 28px rgba(0,0,0,0.7)",
    color: "#fff", fontFamily: "Press Start 2P, sans-serif", textAlign: "center"
  });

  const header = document.createElement("div");
  header.style.marginBottom = "14px";
  header.innerHTML = `<div style="font-size:18px;color:#ffd166">Upgrades</div>
                      <div id="pick-count" style="font-size:13px;opacity:0.9">Picked: 0 / ${pickLimit}</div>`;
  panel.appendChild(header);

  const rows = document.createElement("div");
  rows.style.display = "flex"; rows.style.flexDirection = "column"; rows.style.gap = "12px";
  panel.appendChild(rows);

  upgradeKeys.forEach(u => {
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" });

    const label = document.createElement("div");
    label.textContent = u.label; label.style.fontSize = "14px";
    row.appendChild(label);

    const blocks = document.createElement("div");
    blocks.style.display = "flex"; blocks.style.gap = "6px";
    for (let i = 0; i < maxPerUpgrade; i++) {
      const block = document.createElement("div");
      block.className = "upgrade-block";
      block.dataset.upgrade = u.key;
      block.dataset.index = i;
      Object.assign(block.style, { width: "20px", height: "14px", borderRadius: "4px",
        background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" });
      blocks.appendChild(block);
    }
    row.appendChild(blocks);

    const plus = document.createElement("button");
    plus.textContent = "+"; plus.dataset.upgrade = u.key;
    Object.assign(plus.style, { width: "34px", height: "24px", borderRadius: "6px",
      border: "none", cursor: "pointer", fontWeight: 800, fontSize: "14px",
      background: "linear-gradient(180deg,#ffd166,#ffb347)", color: "#222" });
    row.appendChild(plus);

    rows.appendChild(row);
  });

  modal.appendChild(panel);
  document.body.appendChild(modal);

  function refreshBlocks() {
    modal.querySelectorAll(".upgrade-block").forEach(b => {
      const key = b.dataset.upgrade;
      const idx = Number(b.dataset.index);
      const lvl = player.upgrades[key] || 0;
      if (idx < lvl) {
        b.style.background = "#ffd166";
        b.style.boxShadow = "0 0 6px rgba(255,209,102,0.45)";
      } else {
        b.style.background = "rgba(255,255,255,0.08)";
        b.style.boxShadow = "none";
      }
    });
    const pc = document.getElementById("pick-count");
    if (pc) pc.textContent = `Picked: ${picks} / ${pickLimit}`;
  }

  modal.querySelectorAll("button[data-upgrade]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (picks >= pickLimit) return;
      const key = btn.dataset.upgrade;
      const cur = player.upgrades[key] || 0;
      if (cur >= maxPerUpgrade) return;
      player.upgrades[key] = cur + 1;
      picks++;
      onUpgradeApplied(key);
      refreshBlocks();
      if (picks >= pickLimit) finishAndContinue();
    });
  });

  function escHandler(e) {
    if (e.key === "Escape") {
      if (picks > 0) finishAndContinue();
    }
  }
  document.addEventListener("keydown", escHandler);

  function finishAndContinue() {
    const m = document.getElementById("upgrade-modal");
    if (m) m.remove();
    document.removeEventListener("keydown", escHandler);
    paused = false;
    try { requestAnimationFrame(gameLoop); } catch (e) {}
  }
  refreshBlocks();
}

/* =========================================================================
   Input handling: keyboard, mouse, mobile joystick
   ========================================================================= */
document.addEventListener("keydown", e => {
  // Key remaps via customKeys (when they are single-character strings)
  if (e.key === customKeys.left) keys["ArrowLeft"] = true;
  if (e.key === customKeys.right) keys["ArrowRight"] = true;
  if (e.key === customKeys.up) keys["ArrowUp"] = true;
  if (e.key === customKeys.down) keys["ArrowDown"] = true;
  if (e.key === "Shift") player.sprinting = true;

  if ((e.key === "r" || e.key === "R") && !isReloading && player.ammo < player.magazineSize && player.reserveAmmo > 0) {
    isReloading = true;
    if (sfxEnabled) { reloadSound.currentTime = 0; reloadSound.play(); }
    setTimeout(() => { reload(player, updateAmmoDisplay); isReloading = false; }, 3000);
  }
});

document.addEventListener("keyup", e => {
  if (e.key === customKeys.left) keys["ArrowLeft"] = false;
  if (e.key === customKeys.right) keys["ArrowRight"] = false;
  if (e.key === customKeys.up) keys["ArrowUp"] = false;
  if (e.key === customKeys.down) keys["ArrowDown"] = false;
  if (e.key === "Shift") player.sprinting = false;
});

/* Mouse tracking for canvas */
let mouse = { x: 0, y: 0 };
if (canvas) {
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener("mousedown", e => {
    // left click
    if (e.button === 0) shootBullet(mouse.x, mouse.y);
  });
}

/* Mobile joystick UI (only if mobile) */
if (isMobile) {
  // minimal joystick setup (keeps your earlier behavior)
  const joystickContainer = document.createElement("div");
  joystickContainer.id = "joystickContainer";
  Object.assign(joystickContainer.style, {
    position: "absolute", bottom: "20px", left: "20px", width: "150px", height: "150px",
    background: "rgba(255,255,255,0.06)", borderRadius: "50%", zIndex: "100"
  });
  document.body.appendChild(joystickContainer);

  const joystick = document.createElement("div");
  joystick.id = "joystick";
  Object.assign(joystick.style, {
    position: "absolute", width: "60px", height: "60px", background: "rgba(255,255,255,0.8)",
    borderRadius: "50%", left: "50%", top: "50%", transform: "translate(-50%,-50%)"
  });
  joystickContainer.appendChild(joystick);

  let joystickActive = false, joystickStartX = 0, joystickStartY = 0;
  joystickContainer.addEventListener("touchstart", e => {
    joystickActive = true;
    joystickStartX = e.touches[0].clientX;
    joystickStartY = e.touches[0].clientY;
  });
  joystickContainer.addEventListener("touchmove", e => {
    if (!joystickActive) return;
    const dx = e.touches[0].clientX - joystickStartX;
    const dy = e.touches[0].clientY - joystickStartY;
    const distance = Math.min(Math.hypot(dx, dy), 50);
    const angle = Math.atan2(dy, dx);
    joystick.style.left = `${50 + Math.cos(angle) * distance}%`;
    joystick.style.top = `${50 + Math.sin(angle) * distance}%`;
    player.x += Math.cos(angle) * player.speed;
    player.y += Math.sin(angle) * player.speed;
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
  });
  joystickContainer.addEventListener("touchend", () => {
    joystickActive = false;
    joystick.style.left = "50%";
    joystick.style.top = "50%";
  });
}

/* =========================================================================
   Bullet creation + update + removal
   ========================================================================= */
function shootBullet(targetX, targetY, isWorldCoords = false) {
  if (!gameRunning || player.ammo <= 0 || isReloading) return;
  player.ammo--;
  updateAmmoDisplay();

  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  const speed = 7;

  const worldX = targetX / zoom + camera.x;
  const worldY = targetY / zoom + camera.y;
  const angle = Math.atan2(worldY - cy, worldX - cx);

  const fireBullet = ang => {
    bullets.push({
      x: cx, y: cy,
      dx: Math.cos(ang) * speed, dy: Math.sin(ang) * speed,
      width: 8, height: 8, damage: getPlayerDamage(),
      color: player.doubleDamage ? "orange" : "yellow"
    });
  };

  if (player.tripleShot) {
    fireBullet(angle - 0.25); fireBullet(angle); fireBullet(angle + 0.25);
  } else fireBullet(angle);

  if (sfxEnabled) { shootSound.currentTime = 0; shootSound.play(); }
}

function updateBullets() {
  bullets = bullets.filter(bullet => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    const distanceFromPlayer = Math.hypot(bullet.x - (player.x + player.width / 2), bullet.y - (player.y + player.height / 2));
    const onScreen = bullet.x + bullet.width > 0 && bullet.x - bullet.width < canvas.width &&
                     bullet.y + bullet.height > 0 && bullet.y - bullet.height < canvas.height;
    if (!onScreen && distanceFromPlayer > 2000) return false;
    return true;
  });
}

/* joystick-shoot wrapper to rate-limit */
let lastShootTime = 0;
const shootDelay = 400;
function shootBulletWithDelay(targetX, targetY) {
  const currentTime = performance.now();
  if (currentTime - lastShootTime < shootDelay) return;
  lastShootTime = currentTime;
  shootBullet(targetX, targetY, true);
}
window.shootBulletWithDelay = shootBulletWithDelay;

/* =========================================================================
   Camera & world
   ========================================================================= */
const worldWidth = 5000, worldHeight = 5000;
let camera = { x: 0, y: 0, width: canvas.width, height: canvas.height };
let zoom = 1.5;

function updateCamera() {
  camera.x = Math.round(player.x + player.width / 2 - canvas.width / (2 * zoom));
  camera.y = Math.round(player.y + player.height / 2 - canvas.height / (2 * zoom));
  camera.x = Math.max(0, Math.min(camera.x, worldWidth - canvas.width / zoom));
  camera.y = Math.max(0, Math.min(camera.y, worldHeight - canvas.height / zoom));
}

// draw background
function drawBackground(ctx) {
  ctx.drawImage(gameBG, 0, 0, canvas.width, canvas.height);
}

/* zoom keys */
window.addEventListener("keydown", e => {
  if (e.key === "+") zoom = Math.min(zoom + 0.1, 3);
  else if (e.key === "-") zoom = Math.max(zoom - 0.1, 0.5);
});

/* =========================================================================
   Wave clear checker (with upgrade screens)
   ========================================================================= */
function checkWaveClear() {
  if (!waveSpawning && enemies.length === 0) {
    if (!gameRunning) return;
    if (waveClearTimeout) return;
    waveClearTimeout = setTimeout(() => {
      waveClearTimeout = null;
      if ((currentWave + 1) % 3 === 0 && !upgradeScreenShown) {
        openUpgradeScreen();
        upgradeScreenShown = true;
      } else if (waves[currentWave + 1]) {
        upgradeScreenShown = false;
        startWave(currentWave + 1);
      } else {
        endGame(true);
      }
    }, 1200);
  }
}

/* =========================================================================
   Auto reload helper
   ========================================================================= */
function autoReload() {
  if (!isReloading && player.ammo === 0 && player.reserveAmmo > 0) {
    isReloading = true;
    if (sfxEnabled) { reloadSound.currentTime = 0; reloadSound.play(); }
    setTimeout(() => { reload(player, updateAmmoDisplay); isReloading = false; }, 3000);
  }
}

/* =========================================================================
   Game loop — renders world, updates enemies, bullets, projectiles
   ========================================================================= */
function gameLoop() {
  if (!gameRunning) return;
  if (paused) return;

  // sprint & stamina
  if (player.sprinting && player.stamina > 0) {
    player.speed = player.sprintSpeed;
    player.stamina -= 0.5;
    if (player.stamina < 0) player.stamina = 0;
  } else {
    player.speed = player.normalSpeed;
    const moving = keys["ArrowLeft"] || keys["ArrowRight"] || keys["ArrowUp"] || keys["ArrowDown"];
    const regen = moving ? 0.15 : 0.25;
    player.stamina += regen;
    if (player.stamina > player.maxStamina) player.stamina = player.maxStamina;
  }
  if (player.stamina === 0) player.sprinting = false;
  updateStaminaBar();

  // movement
  let moveX = 0, moveY = 0;
  if (keys["ArrowLeft"]) moveX -= 1;
  if (keys["ArrowRight"]) moveX += 1;
  if (keys["ArrowUp"]) moveY -= 1;
  if (keys["ArrowDown"]) moveY += 1;
  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    moveX /= len; moveY /= len;
    player.x += moveX * player.speed; player.y += moveY * player.speed;
  }

  updateHealthBar();
  updateBullets();
  updateCamera();

  // enemies, projectiles
  updateEnemies(player, canvas, zombiesData);
  updateProjectiles(canvas);

  // spawn wave enemies periodically (tick)
  if (waveSpawning && gameRunning) {
    waveSpawnTimer++;
    if (waveSpawnTimer >= 40) { spawnWaveEnemy(); waveSpawnTimer = 0; }
  }

  // collisions: bullets vs enemies
  handleBulletCollisions(
    bullets, sfxEnabled, explosionSound, { value: score }, scoreDisplay,
    zombiesData, canvas, hitHurt, player
  );
  score = parseInt(scoreDisplay.textContent.replace(/\D/g, "")) || 0;

  // enemy -> player
  if (handlePlayerCollisions(player, updateHealthBar, endGame)) return;
  if (handleProjectilePlayerCollision(player, updateHealthBar, endGame)) return;

  // draw
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  try { drawBackground(ctx); } catch (e) {}
  ctx.save();
  ctx.scale(zoom, zoom);

  // player
  ctx.fillStyle = "cyan";
  ctx.fillRect(Math.round(player.x - camera.x), Math.round(player.y - camera.y), player.width, player.height);

  // bullets
  bullets.forEach(b => {
    ctx.fillStyle = b.color || "yellow";
    ctx.fillRect(Math.round(b.x - b.width / 2 - camera.x), Math.round(b.y - b.height / 2 - camera.y), b.width, b.height);
  });

  // enemies
  drawEnemies(ctx, camera, 0.6);

  // enemy projectiles
  drawProjectiles(ctx, camera);

  // powerups
  drawAndHandlePowerups(ctx, player, updateAmmoDisplay, sfxEnabled, powerUpSound, undefined, camera);

  ctx.restore();

  // housekeeping
  checkWaveClear();
  autoReload();
  try { updatePowerupHUD(); } catch (e) {}
  requestAnimationFrame(gameLoop);
}

/* =========================================================================
   Game control (start/stop/reset/pause/resume)
   ========================================================================= */
async function startGame() {
  hideMenuBackground();
  const menuEl = document.getElementById("menu");
  if (menuEl) menuEl.style.display = "none";
  const goEl = document.getElementById("gameOver");
  if (goEl) goEl.style.display = "none";
  const finisher = document.getElementById("finisher-canvas"); if (finisher) finisher.style.display = "none";
  const versionLabel = document.getElementById("versionLabel");
  if (versionLabel) versionLabel.style.display = "none";

  playSelect();
  if (musicEnabled) {
    backgroundMusic.currentTime = 0;
    try { await backgroundMusic.play(); } catch (e) { /* ignore autoplay policy */ }
  }

  await loadGameData();
  resetGame();
  gameRunning = true;
  updateHealthBar(); updateWaveDisplay();
  try { initPowerupHUD(); } catch (e) {}

  clearInterval(enemyInterval); clearInterval(shootInterval);
  startWave(0);
  if (controlMode === "drag") shootInterval = setInterval(autoShoot, 400);

  requestAnimationFrame(gameLoop);
}

function quitGame() { playSelect(); try { window.close(); } catch (e) {} }
function restartGame() { paused = false; hidePauseOverlay(); const go = document.getElementById("gameOver"); if (go) go.style.display = "none"; startGame(); playSelect(); }
function backToMenu() {
  paused = false; hidePauseOverlay();
  const go = document.getElementById("gameOver"); if (go) go.style.display = "none";
  const menuEl = document.getElementById("menu"); if (menuEl) menuEl.style.display = "flex";
  showMenuBackground();
  const finisher = document.getElementById("finisher-canvas"); if (finisher) finisher.style.display = "block";
  playSelect();
}

window.startGame = startGame;
window.quitGame = quitGame;
window.restartGame = restartGame;
window.backToMenu = backToMenu;

/* resetGame that resets state for a fresh run */
function resetGame() {
  if (waveClearTimeout) { clearTimeout(waveClearTimeout); waveClearTimeout = null; }

  player.upgrades = { damage: 0, health: 0, speed: 0, magazine: 0, knockback: 0 };
  recalcPlayerStats();

  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
  player.health = player.maxHealth;
  player.ammo = player.magazineSize;
  player.reserveAmmo = 1500;
  player.stamina = player.maxStamina;
  player.sprinting = false;

  updateAmmoDisplay(); updateStaminaBar();
  bullets = [];
  resetEnemies();
  score = 0;
  if (scoreDisplay) scoreDisplay.textContent = "Score: 0";
  updateHealthBar(); updateAmmoDisplay();
  currentWave = -1; updateWaveDisplay();
}

/* =========================================================================
   Pause / resume / overlay
   ========================================================================= */
function showPauseOverlay() {
  if (!gameRunning) return;
  // don't show if any major menu is open
  const menuEl = document.getElementById("menu"), settingsEl = document.getElementById("settings"), goEl = document.getElementById("gameOver");
  if ((menuEl && menuEl.style.display !== "none") || (settingsEl && settingsEl.style.display !== "none") || (goEl && goEl.style.display !== "none")) return;

  if (!document.getElementById("pauseOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "pauseOverlay";
    Object.assign(overlay.style, { position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center" });
    overlay.innerHTML = `
      <h2 style="color:#ffe066;font-size:36px;">Paused</h2>
      <button id="resumeBtn" style="font-size:22px;padding:10px 26px;margin-top:24px;">Resume</button>
      <button id="pauseRestartBtn" style="font-size:20px;padding:10px 26px;margin-top:14px;">Restart</button>
      <button id="pauseMenuBtn" style="font-size:20px;padding:10px 26px;margin-top:14px;">Main Menu</button>
    `;
    document.body.appendChild(overlay);
    document.getElementById("resumeBtn").onclick = resumeGame;
    document.getElementById("pauseRestartBtn").onclick = () => { hidePauseOverlay(); restartGame(); };
    document.getElementById("pauseMenuBtn").onclick = () => { hidePauseOverlay(); backToMenu(); };
  } else document.getElementById("pauseOverlay").style.display = "flex";
}

function hidePauseOverlay() {
  const overlay = document.getElementById("pauseOverlay");
  if (overlay) overlay.style.display = "none";
}

function pauseGame() {
  if (!gameRunning || paused) return;
  paused = true;
  showPauseOverlay();
  selectSound.currentTime = 0;
  if (sfxEnabled) selectSound.play();
  backgroundMusic.pause();
}

function resumeGame() {
  if (!paused) return;
  paused = false;
  hidePauseOverlay();
  requestAnimationFrame(gameLoop);
  selectSound.currentTime = 0;
  if (sfxEnabled) selectSound.play();
  if (musicEnabled) try { backgroundMusic.play(); } catch (e) {}
}

const pauseBtn = document.getElementById("pauseBtn");
if (pauseBtn) pauseBtn.onclick = pauseGame;
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (!paused && gameRunning) pauseGame();
    else if (paused) resumeGame();
  }
});

/* =========================================================================
   End game
   ========================================================================= */
function endGame(victory = false) {
  gameRunning = false;
  clearInterval(enemyInterval); clearInterval(shootInterval);
  finalScore.textContent = (victory ? "You Win! " : "Your Score: ") + score;
  const go = document.getElementById("gameOver"); if (go) go.style.display = "flex";
  backgroundMusic.pause(); backgroundMusic.currentTime = 0;
  if (sfxEnabled) {
    if (victory) { victorySound.currentTime = 0; victorySound.play(); }
    else { gameOverSound.currentTime = 0; gameOverSound.play(); }
  }
}

/* =========================================================================
   Menu / panels helpers (openPanel/closePanel used by your HTML)
   ========================================================================= */
let panelStack = [];
let helpData = null;
let aboutData = null;

// Load about.json dynamically
async function loadAboutData() {
  const aboutTabs = document.getElementById("aboutTabs");
  const aboutContent = document.getElementById("aboutContent");

  //console.log("[About] loadAboutData() called");

  try {
    //console.log("[About] Fetching data/about.json …");
    const res = await fetch("data/about.json");

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} – ${res.statusText}`);
    }

    aboutData = await res.json();
    //console.log("[About] JSON parsed successfully:", aboutData);

    // Clear existing tabs
    if (!aboutTabs) {
      //console.error("[About] #aboutTabs element not found in DOM");
    } else {
      aboutTabs.innerHTML = "";
    }

    // Generate sidebar buttons
    Object.keys(aboutData).forEach(key => {
      //console.log(`[About] Creating tab button for ${key}`);
      const button = document.createElement("button");
      button.id = "aboutTab" + key;
      button.textContent = key;
      button.onclick = () => switchAboutTab(key);
      aboutTabs.appendChild(button);
    });

    // Default open first section
    const firstKey = Object.keys(aboutData)[0];
    if (firstKey) switchAboutTab(firstKey);

  } catch (err) {
    console.error("[About] Failed to load about.json:", err);
    if (aboutContent) {
      aboutContent.innerHTML =
        `<p class="error">Error loading about content. Please check that <b>data/about.json</b> exists and is valid JSON.</p>`;
    }
  }
}

// Switch between About sections
function switchAboutTab(tabId) {
  //console.log(`[About] switchAboutTab(${tabId}) called`);

  const aboutContent = document.getElementById("aboutContent");
  if (!aboutContent) {
    //console.error("[About] #aboutContent element not found in DOM");
    return;
  }

  if (!aboutData) {
    //console.error("[About] aboutData is null – did loadAboutData() run?");
    aboutContent.innerHTML = `<p class="error">About data not loaded yet.</p>`;
    return;
  }

  const entry = aboutData[tabId];
  if (!entry) {
    //console.warn(`[About] No entry found in aboutData for key: ${tabId}`);
    aboutContent.innerHTML = `<p class="error">No content for section ${tabId}</p>`;
    return;
  }

  // Replace \n with <br> for multi-line formatting
  const formattedContent = entry.content.replace(/\n/g, "<br>");

  aboutContent.innerHTML = `
    <h4 style="color:#ffd166">${entry.title}</h4>
    <p style="color:#ddd; font-size:13px; line-height:1.6;">${formattedContent}</p>
  `;
  aboutContent.scrollTop = 0;

  // Highlight active tab
  document.querySelectorAll("#aboutTabs button").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.getElementById("aboutTab" + tabId);
  if (activeBtn) activeBtn.classList.add("active");
  playSelect.currentTime = 0;
  playSelect?.();
}

// Hook loader when About panel is opened
const __openPanel = window.openPanel;
window.openPanel = function (id) {
  //console.log(`[Global] openPanel(${id})`);
  __openPanel(id);
  if (id === "aboutPanel") {
    console.log("[About] Detected aboutPanel opening – loading data …");
    loadAboutData();
  }
};

// Open a panel
function openPanel(id) {
  //console.log(`[Panel] openPanel(${id})`);

  // Hide all panels
  document.querySelectorAll(".menuPanel").forEach(p => {
    p.style.display = "none";
    p.setAttribute("inert", "");
  });

  // Show target panel
  const el = document.getElementById(id);
  if (el) {
    el.style.display = "flex";
    el.removeAttribute("inert");
    panelStack.push(id);

    // Focus first focusable element
    const focusable = el.querySelector("button, [tabindex], input, select, textarea, a[href]");
    if (focusable) focusable.focus();
  }

  // Hide version label + menu
  const versionLabel = document.getElementById("versionLabel");
  if (versionLabel) versionLabel.style.display = "none";
  const menuEl = document.getElementById("menu1");
  if (menuEl) menuEl.style.display = "none";

  // If Help panel opened → load data
  if (id === "helpPanel") {
    //console.log("[Help] Detected helpPanel opening – loading data …");
    loadHelpData();
  }
  playSelect.currentTime = 0;
  playSelect?.();
}

// Close a panel
function closePanel(id) {
  console.log(`[Panel] closePanel(${id})`);

  const el = document.getElementById(id);
  if (el) {
    if (el.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    el.style.display = "none";
    el.setAttribute("inert", "");
  }

  // Remove from stack
  panelStack.pop();

  const prev = panelStack[panelStack.length - 1];
  if (prev) {
    const prevEl = document.getElementById(prev);
    if (prevEl) {
      prevEl.style.display = "flex";
      prevEl.removeAttribute("inert");
      const focusable = prevEl.querySelector("button, [tabindex], input, select, textarea, a[href]");
      if (focusable) focusable.focus();
    }
  } else {
    const versionLabel = document.getElementById("versionLabel");
    if (versionLabel) versionLabel.style.display = "block";
    const menuEl = document.getElementById("menu1");
    if (menuEl) {
      menuEl.style.display = "flex";
      const focusable = menuEl.querySelector("button, [tabindex]");
      if (focusable) focusable.focus();
    }
  }
  playSelect.currentTime = 0;
  playSelect?.();
}

// Load help.json dynamically
async function loadHelpData() {
  const helpTabs = document.getElementById("helpTabs");
  const helpContent = document.getElementById("helpContent");
  const statusMessage = document.getElementById("statusMessage");

  //console.log("[Help] loadHelpData() called");

  if (statusMessage) statusMessage.innerHTML = '<span class="loading">Loading help data...</span>';

  try {
    //console.log("[Help] Fetching data/help.json …");
    const res = await fetch("data/help.json");

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} – ${res.statusText}`);
    }

    helpData = await res.json();
    //console.log("[Help] JSON parsed successfully:", helpData);

    if (statusMessage) statusMessage.innerHTML = '<span class="success">Help data loaded successfully!</span>';

    // Clear existing tabs
    if (!helpTabs) {
      console.error("[Help] #helpTabs element not found in DOM");
    } else {
      helpTabs.innerHTML = "";
    }

    // Generate tabs (A–F)
    Object.keys(helpData).forEach(key => {
      //console.log(`[Help] Creating tab button for ${key}`);
      const button = document.createElement("button");
      button.id = "tab" + key;
      button.textContent = key;
      button.onclick = () => switchHelpTab(key);
      helpTabs.appendChild(button);
    });

    // Default to first tab
    const firstKey = Object.keys(helpData)[0];
    //console.log("[Help] Default tab:", firstKey);
    if (firstKey) switchHelpTab(firstKey);

  } catch (err) {
    console.error("[Help] Failed to load help.json:", err);
    if (statusMessage) statusMessage.innerHTML = `<span class="error">Failed to load help data: ${err.message}</span>`;
    if (helpContent) {
      helpContent.innerHTML = `<p class="error">Error loading help content. Please check that <b>data/help.json</b> exists and is valid JSON.</p>`;
    }
  }
}

// Switch tabs
function switchHelpTab(tabId) {
  //console.log(`[Help] switchHelpTab(${tabId}) called`);

  const helpContent = document.getElementById("helpContent");
  if (!helpContent) {
    console.error("[Help] #helpContent element not found in DOM");
    return;
  }

  if (!helpData) {
    console.error("[Help] helpData is null – did loadHelpData() run?");
    helpContent.innerHTML = `<p class="error">Help data not loaded yet.</p>`;
    return;
  }

  const entry = helpData[tabId];
  if (!entry) {
    console.warn(`[Help] No entry found in helpData for key: ${tabId}`);
    helpContent.innerHTML = `<p class="error">No content for section ${tabId}</p>`;
    return;
  }

  helpContent.innerHTML = `
    <h4 style="color:#ffd166">${entry.title}</h4>
    <p style="color:#ddd; font-size:13px; line-height:1.6;">${entry.content}</p>
  `;
  helpContent.scrollTop = 0;

  // Highlight active tab
  const buttons = document.querySelectorAll("#helpTabs button");
  //console.log("[Help] Clearing active state from", buttons.length, "buttons");
  buttons.forEach(btn => btn.classList.remove("active"));

  const activeBtn = document.getElementById("tab" + tabId);
  if (activeBtn) {
    //console.log(`[Help] Setting active tab: ${tabId}`);
    activeBtn.classList.add("active");
  } else {
    //console.warn(`[Help] Could not find button with id: tab${tabId}`);
  }
  playSelect.currentTime = 0;
  playSelect?.();
}

// Hook loadHelpData when Help panel is opened
const _openPanel = window.openPanel;
window.openPanel = function (id) {
  //console.log(`[Help] openPanel(${id})`);
  _openPanel(id);
  if (id === "helpPanel") {
    //console.log("[Help] Detected helpPanel opening – loading data …");
    loadHelpData();
  }
};

window.openPanel = openPanel;
window.closePanel = closePanel;
window.switchHelpTab = switchHelpTab;
window.loadHelpData = loadHelpData;

/* Also supply the old-named openSettings/openControl etc. in case other scripts call them */
function openSettings() { const m = document.getElementById("menu"); if (m) m.style.display = "none"; const s = document.getElementById("settings"); if (s) s.style.display = "flex"; hideAllSections(); showMainButtons(); playSelect(); }
function closeSettings() { const s = document.getElementById("settings"); if (s) s.style.display = "none"; const m = document.getElementById("menu"); if (m) m.style.display = "flex"; playSelect(); }
window.openSettings = openSettings;
window.closeSettings = closeSettings;

/* Minimal implementations for helpers referenced in your previous code.
   They attempt to show/hide known sections if present. */
function openAudio() { hideMainButtons(); const a = document.getElementById("audioPanel"); if (a) a.style.display = "block"; playSelect(); }
function backAudio() { const a = document.getElementById("audioPanel"); if (a) a.style.display = "none"; showMainButtons(); playSelect(); }
window.openAudio = openAudio; window.backAudio = backAudio;

function openControl() { openPanel('controlPanel'); playSelect(); }
function backControl() { closePanel('controlPanel'); playSelect(); }
window.openControl = openControl; window.backControl = backControl;

function openCredit() { openPanel('creditsPanel'); playSelect(); }
function backCredit() { closePanel('creditsPanel'); playSelect(); }
window.openCredit = openCredit; window.backCredit = backCredit;

/* Utility helpers used by settings nav */
function hideAllSections() {
  ["audioSection", "controlSection", "creditSection"].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = "none";
  });
}
function hideMainButtons() {
  ["audioSetting", "controlSetting", "howToPlay", "close-setting"].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = "none";
  });
}
function showMainButtons() {
  ["audioSetting", "controlSetting", "howToPlay", "close-setting"].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = "flex";
  });
}

/* =========================================================================
   Fullscreen toggle
   ========================================================================= */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      const btn = document.getElementById("fullscreenBtn"); if (btn) btn.classList.add("fullscreen-active");
    }).catch(()=>{});
  } else {
    document.exitFullscreen().then(() => {
      const btn = document.getElementById("fullscreenBtn"); if (btn) btn.classList.remove("fullscreen-active");
    }).catch(()=>{});
  }
}
window.toggleFullscreen = toggleFullscreen;

/* =========================================================================
   Custom key remapping UI wiring
   Expects inputs with IDs leftKeyInput/rightKeyInput/upKeyInput/downKeyInput
   and a button with id resetKeysBtn
   ========================================================================= */
function updateKeyInputs() {
  const left = document.getElementById("leftKeyInput");
  const right = document.getElementById("rightKeyInput");
  const up = document.getElementById("upKeyInput");
  const down = document.getElementById("downKeyInput");
  if (left) left.value = customKeys.left.length === 1 ? customKeys.left.toUpperCase() : "←";
  if (right) right.value = customKeys.right.length === 1 ? customKeys.right.toUpperCase() : "→";
  if (up) up.value = customKeys.up.length === 1 ? customKeys.up.toUpperCase() : "↑";
  if (down) down.value = customKeys.down.length === 1 ? customKeys.down.toUpperCase() : "↓";
}

function setupCustomKeyInputs() {
  const map = {
    left: document.getElementById("leftKeyInput"),
    right: document.getElementById("rightKeyInput"),
    up: document.getElementById("upKeyInput"),
    down: document.getElementById("downKeyInput")
  };
  let waitingFor = null;

  Object.entries(map).forEach(([dir, input]) => {
    if (!input) return;
    input.addEventListener("click", () => { input.value = "_"; waitingFor = dir; });
  });

  document.addEventListener("keydown", e => {
    if (!waitingFor) return;
    e.preventDefault();
    if (e.key.length === 1 || ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
      customKeys[waitingFor] = e.key;
      updateKeyInputs();
      waitingFor = null;
    }
  });

  const resetBtn = document.getElementById("resetKeysBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      customKeys = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown" };
      updateKeyInputs();
    });
  }
  updateKeyInputs();
}

/* =========================================================================
   Music & SFX toggles wiring (IDs expected in DOM)
   ========================================================================= */
const musicToggle = document.getElementById("musicToggle");
const sfxToggle = document.getElementById("sfxToggle");

if (musicToggle) {
  musicToggle.addEventListener("change", async () => {
    musicEnabled = musicToggle.checked;
    playSelect();
    if (!musicEnabled) backgroundMusic.pause();
    else if (gameRunning) { try { await backgroundMusic.play(); } catch (e) {} }
  });
}
if (sfxToggle) {
  sfxToggle.addEventListener("change", () => {
    sfxEnabled = sfxToggle.checked;
    playSelect();
  });
}

/* helper already used earlier */
function playSelect() {
  try {
    selectSound.currentTime = 0;
    if (sfxEnabled) selectSound.play();
  } catch (e) {}
}

/* =========================================================================
   Canvas sizing
   ========================================================================= */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* =========================================================================
   Init — wire up global window methods and initial state
   ========================================================================= */
window.startGame = startGame;
window.openPanel = openPanel;
window.closePanel = closePanel;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.openAudio = openAudio;
window.backAudio = backAudio;
window.openControl = openControl;
window.backControl = backControl;
window.openCredit = openCredit;
window.backCredit = backCredit;
window.quitGame = quitGame;
window.restartGame = restartGame;
window.backToMenu = backToMenu;
window.toggleFullscreen = toggleFullscreen;
window.setControl = function(mode){ controlMode = mode; playSelect(); }; // minimal setControl

window.addEventListener("DOMContentLoaded", () => {
  try { setupCustomKeyInputs(); } catch (e) {}
  setControl(controlMode);
  recalcPlayerStats();
  updateHealthBar();
  updateWaveDisplay();
  updateAmmoDisplay();
  updateStaminaBar();
  loadGameData().then(() => {
    console.log("Game data loaded");
  }).catch(err => {
    console.error("Failed to load game data:", err);
  });
  switchHelpTab("A"); // default help tab
  loadAboutData(); // pre-load about data
  switchAboutTab("Game"); // default about tab
});

/* =========================================================================
   CAVEATS & NOTES
   - This file merges and preserves the logic from your scattered snippets.
   - If some helper functions (autoShoot, some DOM IDs) are missing from your project,
     they should be added or the callsites removed.
   - Keep enemy.js, powerup.js, reload.js exports intact.
   - If you see `null` DOM references in console, verify the HTML contains the expected IDs.
   ========================================================================= */
