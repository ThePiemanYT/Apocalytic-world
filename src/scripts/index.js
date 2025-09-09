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

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const finalScore = document.getElementById("finalScore");
const healthBar = document.getElementById("healthBar");
const waveDisplay = document.getElementById("waveDisplay");

// --- Player & Game State ---
let player = {
  x: 0, y: 0, width: 24, height: 24,
  speed: 6,
  normalSpeed: 6,
  sprintSpeed: 10,
  maxHealth: 10, health: 10,
  magazineSize: 16, ammo: 16, reserveAmmo: 1024,
  stamina: 100, maxStamina: 100,
  sprinting: false
};
let bullets = [];
let keys = {};
let controlMode = "buttons"; // default
let gameRunning = false;
let score = 0;
let enemyInterval, shootInterval;

// --- Wave & Zombie Data ---
let waves = [];
let zombiesData = {};
let currentWave = 0;
let waveEnemyQueue = [];
let waveSpawnTimer = 0;
let waveSpawning = false;
let waveClearTimeout = null; // --- Add waveClearTimeout variable ---

// --- Audio ---
let musicEnabled = true;
let sfxEnabled = true;

const selectSound = new Audio("src/assets/sound/blipSelect.wav");
const explosionSound = new Audio("src/assets/sound/explosion.wav");
const shootSound = new Audio("src/assets/sound/laserShoot.wav");
const reloadSound = new Audio("src/assets/sound/reload-gun.mp3"); // --- Reload sound ---

const backgroundMusic = document.getElementById("backgroundMusic");
backgroundMusic.volume = 0.5;

// --- Custom Key Mapping ---
let customKeys = { left: "a", right: "d", up: "w", down: "s" };

// --- Load JSON Data ---
async function loadGameData() {
  // Load zombies.json
  try {
    const zombiesRes = await fetch("data/zombies.json");
    zombiesData = await zombiesRes.json();
  } catch (e) {
    // fallback: default zombies
    zombiesData = {
      basic: { speed: 2, health: 1, color: "red", size: 8 },
      fast: { speed: 4, health: 1, color: "orange", size: 8 },
      tank: { speed: 1, health: 3, color: "purple", size: 12 } // Slightly larger for tank
    };
  }
  // Load wave.json
  try {
    const wavesRes = await fetch("data/wave.json");
    waves = await wavesRes.json();
  } catch (e) {
    // fallback: default waves
    waves = [
      { wave: 1, zombies: [{ type: "basic", count: 5 }] },
      { wave: 2, zombies: [{ type: "basic", count: 7 }, { type: "fast", count: 2 }] }
    ];
  }
}

// --- Health Bar UI ---
function updateHealthBar() {
  const percent = Math.max(0, player.health) / player.maxHealth;
  healthBar.style.width = (percent * 100) + "%";
  if (percent > 0.6) healthBar.style.background = "linear-gradient(90deg, #4CAF50, #ffe066)";
  else if (percent > 0.3) healthBar.style.background = "linear-gradient(90deg, orange, #ffe066)";
  else healthBar.style.background = "linear-gradient(90deg, #d32f2f, #ffe066)";
}

// --- Stamina Bar UI (bottom left) ---
const staminaBar = document.createElement("div");
staminaBar.id = "staminaBar";
staminaBar.style.position = "absolute";
staminaBar.style.bottom = "60px";
staminaBar.style.left = "32px";
staminaBar.style.width = "200px";
staminaBar.style.height = "20px";
staminaBar.style.background = "#444";
staminaBar.style.border = "2px solid #fff";
staminaBar.style.borderRadius = "8px";
staminaBar.style.overflow = "hidden";
staminaBar.style.zIndex = 100;
document.body.appendChild(staminaBar);

const staminaFill = document.createElement("div");
staminaFill.style.height = "100%";
staminaFill.style.background = "linear-gradient(90deg, #80dfff, #4fc3f7)";
staminaFill.style.width = "100%";
staminaBar.appendChild(staminaFill);

function updateStaminaBar() {
  staminaFill.style.width = (player.stamina / player.maxStamina * 100) + "%";
}

// --- Wave UI ---
function updateWaveDisplay() {
  waveDisplay.textContent = "Wave: " + (currentWave + 1);
}

// --- Wave System ---
function startWave(waveIdx) {
  if (!waves[waveIdx]) return;
  currentWave = waveIdx;
  updateWaveDisplay();
  waveEnemyQueue = [];
  // Build queue: [{type, left}]
  for (const z of waves[waveIdx].zombies) {
    for (let i = 0; i < z.count; i++) {
      waveEnemyQueue.push(z.type);
    }
  }
  waveSpawning = true;
  waveSpawnTimer = 0;
  spawnPowerups(); // --- Spawn powerups at start of wave ---
}

function spawnWaveEnemy() {
  if (!waveSpawning || waveEnemyQueue.length === 0) return;
  const type = waveEnemyQueue.shift();
  spawnEnemy(type, zombiesData, canvas.width);
  if (waveEnemyQueue.length === 0) waveSpawning = false;
}

// --- Pixel-art rendering for canvas ---
canvas.style.imageRendering = "pixelated";

// --- Background ---
const gameBG = new Image();
gameBG.src = "src/assets/image/gameBG.png";

function drawBackground(ctx) {
  ctx.drawImage(gameBG, 0, 0, canvas.width, canvas.height);
}

// --- Ensure startGame is properly defined and accessible
window.startGame = startGame;
window.openSettings = openSettings;
window.openAudio = openAudio;
window.backAudio = backAudio;
window.openControl = openControl;
window.closeSettings = closeSettings;
window.quitGame = quitGame;
window.restartGame = restartGame;
window.backToMenu = backToMenu;
window.shootBulletWithDelay = shootBulletWithDelay;
window.setControl = setControl;
window.shootBullet = shootBullet;
window.updateAmmoDisplay = updateAmmoDisplay;
window.updateStaminaBar = updateStaminaBar;
window.updateHealthBar = updateHealthBar;
window.updateWaveDisplay = updateWaveDisplay;
window.loadGameData = loadGameData;
window.resetGame = resetGame;
window.endGame = endGame;

// --- Music & SFX Toggles ---
const musicToggle = document.getElementById("musicToggle");
const sfxToggle = document.getElementById("sfxToggle");

musicToggle.addEventListener("change", async () => {
  musicEnabled = musicToggle.checked;
  playSelect();
  if (!musicEnabled) backgroundMusic.pause();
  else if (gameRunning) {
    try {
      await backgroundMusic.play();
    } catch (e) {
      // Ignore autoplay error
    }
  }
});

sfxToggle.addEventListener("change", () => {
  sfxEnabled = sfxToggle.checked;
  playSelect();
});

function playSelect() {
  selectSound.currentTime = 0;
  if (sfxEnabled) selectSound.play();
}

// --- Menu Functions ---
async function startGame() {
  hideMenuBackground(); // Hide menu background when game starts
  document.getElementById("menu").style.display = "none";
  document.getElementById("settings").style.display = "none";
  document.getElementById("gameOver").style.display = "none";

  playSelect();
  if (musicEnabled) {
    backgroundMusic.currentTime = 0;
    try {
      backgroundMusic.play();
    } catch (e) {
      // Ignore autoplay error, will play after next user interaction
    }
  }

  loadGameData();
  resetGame();
  gameRunning = true;
  updateHealthBar();
  updateWaveDisplay();
  gameLoop();
  // Remove old intervals
  clearInterval(enemyInterval);
  clearInterval(shootInterval);
  // Start first wave
  startWave(0);
  // Enemy spawn handled by wave system
  if (controlMode === "drag") shootInterval = setInterval(autoShoot, 400);
}

function openSettings() {
  document.getElementById("menu").style.display = "none";
  document.getElementById("settings").style.display = "flex";
  playSelect();
}

function openAudio() {
  document.getElementById("audioSection").style.display = "flex";
  document.getElementById("controlSetting").style.display = "none";
  document.getElementById("audioSetting").style.display = "none";
  document.getElementById("close-setting").style.display = "none";
  document.getElementById("howToPlay").style.display = "none";
  playSelect();
}

function backAudio () {
  document.getElementById("audioSection").style.display = "none";
  document.getElementById("controlSetting").style.display = "flex";
  document.getElementById("audioSetting").style.display = "flex";
  document.getElementById("close-setting").style.display = "flex";
  document.getElementById("controlSection").style.display = "none";
  document.getElementById("howToPlay").style.display = "flex";
  playSelect();
}

function openControl() {
  document.getElementById("controlSection").style.display = "flex";
  document.getElementById("audioSetting").style.display = "none";
  document.getElementById("controlSetting").style.display = "none";
  document.getElementById("close-setting").style.display = "none";
  document.getElementById("howToPlay").style.display = "none";
  playSelect();

}

function closeSettings() {
  document.getElementById("settings").style.display = "none";
  document.getElementById("menu").style.display = "flex";
  document.getElementById("howToPlay").style.display = "flex";
  playSelect();
}

function quitGame() {
  playSelect();
  window.close();
}

// Ensure the wave starts from 0 when the game begins
function resetGame() {
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
  player.health = player.maxHealth;
  player.ammo = player.magazineSize;
  player.reserveAmmo = 1500;
  player.stamina = player.maxStamina;
  player.sprinting = false;
  updateAmmoDisplay();
  updateStaminaBar();
  bullets = [];
  resetEnemies();
  score = 0;
  scoreDisplay.textContent = "Score: 0";
  updateHealthBar();
  updateAmmoDisplay();
  currentWave = -1; // Set to -1 so the first wave starts as 0
  updateWaveDisplay();
}

function restartGame() {
  paused = false;
  hidePauseOverlay();
  document.getElementById("gameOver").style.display = "none";
  startGame();
  playSelect();
}

function backToMenu() {
  paused = false;
  hidePauseOverlay();
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("menu").style.display = "flex";
  showMenuBackground(); // Show menu background when returning to menu
  playSelect();
}

// Make functions available to HTML
window.startGame = startGame;
window.openSettings = openSettings;
window.openAudio = openAudio;
window.backAudio = backAudio;
window.openControl = openControl;
window.closeSettings = closeSettings;
window.quitGame = quitGame;
window.restartGame = restartGame;
window.backToMenu = backToMenu;

// --- Custom Key Setup ---
function updateKeyInputs() {
  document.getElementById("leftKeyInput").value =
    customKeys.left.length === 1 ? customKeys.left.toUpperCase() : "←";
  document.getElementById("rightKeyInput").value =
    customKeys.right.length === 1 ? customKeys.right.toUpperCase() : "→";
  document.getElementById("upKeyInput").value =
    customKeys.up.length === 1 ? customKeys.up.toUpperCase() : "↑";
  document.getElementById("downKeyInput").value =
    customKeys.down.length === 1 ? customKeys.down.toUpperCase() : "↓";
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
    input.addEventListener("click", () => {
      input.value = "_";
      waitingFor = dir;
    });
  });

  document.addEventListener("keydown", e => {
    if (!waitingFor) return;
    e.preventDefault();
    if (
      e.key.length === 1 ||
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      customKeys[waitingFor] = e.key;
      updateKeyInputs();
      waitingFor = null;
    }
  });

  document.getElementById("resetKeysBtn").addEventListener("click", () => {
    customKeys = {
      left: "ArrowLeft",
      right: "ArrowRight",
      up: "ArrowUp",
      down: "ArrowDown"
    };
    updateKeyInputs();
  });

  updateKeyInputs();
}
window.addEventListener("DOMContentLoaded", setupCustomKeyInputs);

// --- Detect Mobile or PC ---
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
controlMode = isMobile ? "joystick" : "buttons";

// --- Mouse Tracking (PC) ---
let mouse = { x: 0, y: 0 };
canvas.addEventListener("mousemove", e => {
  let rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

// --- Last Direction (Mobile) ---
let lastDirection = { dx: 0, dy: -1 };

// --- Input Handling ---
document.addEventListener("keydown", e => {
  if (e.key === customKeys.left) keys["ArrowLeft"] = true;
  if (e.key === customKeys.right) keys["ArrowRight"] = true;
  if (e.key === customKeys.up) keys["ArrowUp"] = true;
  if (e.key === customKeys.down) keys["ArrowDown"] = true;
  if (e.key === "Shift") player.sprinting = true;
});

document.addEventListener("keyup", e => {
  if (e.key === customKeys.left) keys["ArrowLeft"] = false;
  if (e.key === customKeys.right) keys["ArrowRight"] = false;
  if (e.key === customKeys.up) keys["ArrowUp"] = false;
  if (e.key === customKeys.down) keys["ArrowDown"] = false;
  if (e.key === "Shift") player.sprinting = false;
});

// --- Shooting ---
canvas.addEventListener("mousedown", e => {
  // Add debugging to the shooting event listener
  console.log("Mouse down event detected:", {
    button: e.button,
    mouseX: mouse.x,
    mouseY: mouse.y
  });

  // Always shoot toward mouse position on left click (button 0)
  if (e.button === 0) {
    shootBullet(mouse.x, mouse.y);
  }
});

// Joystick firing cooldown
let lastJoystickShoot = 0;                // timestamp of last joystick shot
const JOYSTICK_SHOOT_DELAY = 200;         // milliseconds between shots (adjust as needed)
const JOYSTICK_AIM_DISTANCE = 200;        // how far ahead to aim in world units

// Ensure joystick elements are only created and shown on mobile devices
if (isMobile) {
  const joystickContainer = document.createElement("div");
  joystickContainer.id = "joystickContainer";
  joystickContainer.style.position = "absolute";
  joystickContainer.style.bottom = "20px";
  joystickContainer.style.left = "20px";
  joystickContainer.style.width = "150px";
  joystickContainer.style.height = "150px";
  joystickContainer.style.background = "rgba(255, 255, 255, 0.1)";
  joystickContainer.style.borderRadius = "50%";
  joystickContainer.style.zIndex = "100";
  document.body.appendChild(joystickContainer);

  const joystick = document.createElement("div");
  joystick.id = "joystick";
  joystick.style.position = "absolute";
  joystick.style.width = "60px";
  joystick.style.height = "60px";
  joystick.style.background = "rgba(255, 255, 255, 0.8)";
  joystick.style.borderRadius = "50%";
  joystick.style.left = "50%";
  joystick.style.top = "50%";
  joystick.style.transform = "translate(-50%, -50%)";
  joystickContainer.appendChild(joystick);

  const shootJoystickContainer = document.createElement("div");
  shootJoystickContainer.id = "shootJoystickContainer";
  shootJoystickContainer.style.position = "absolute";
  shootJoystickContainer.style.bottom = "20px";
  shootJoystickContainer.style.right = "20px";
  shootJoystickContainer.style.width = "150px";
  shootJoystickContainer.style.height = "150px";
  shootJoystickContainer.style.background = "rgba(255, 255, 255, 0.1)";
  shootJoystickContainer.style.borderRadius = "50%";
  shootJoystickContainer.style.zIndex = "100";
  document.body.appendChild(shootJoystickContainer);

  const shootJoystick = document.createElement("div");
  shootJoystick.id = "shootJoystick";
  shootJoystick.style.position = "absolute";
  shootJoystick.style.width = "60px";
  shootJoystick.style.height = "60px";
  shootJoystick.style.background = "rgba(255, 255, 255, 0.8)";
  shootJoystick.style.borderRadius = "50%";
  shootJoystick.style.left = "50%";
  shootJoystick.style.top = "50%";
  shootJoystick.style.transform = "translate(-50%, -50%)";
  shootJoystickContainer.appendChild(shootJoystick);

  let joystickActive = false;
  let shootJoystickActive = false;
  let joystickStartX, joystickStartY;
  let shootJoystickStartX, shootJoystickStartY;

  joystickContainer.addEventListener("touchstart", (e) => {
    joystickActive = true;
    joystickStartX = e.touches[0].clientX;
    joystickStartY = e.touches[0].clientY;
  });

  joystickContainer.addEventListener("touchmove", (e) => {
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

  shootJoystickContainer.addEventListener("touchstart", (e) => {
    shootJoystickActive = true;
    shootJoystickStartX = e.touches[0].clientX;
    shootJoystickStartY = e.touches[0].clientY;
  });

  shootJoystickContainer.addEventListener("touchmove", (e) => {
    if (!shootJoystickActive) return;
    const dx = e.touches[0].clientX - shootJoystickStartX;
    const dy = e.touches[0].clientY - shootJoystickStartY;
    const distance = Math.min(Math.hypot(dx, dy), 50);
    const angle = Math.atan2(dy, dx);

    shootJoystick.style.left = `${50 + Math.cos(angle) * distance}%`;
    shootJoystick.style.top = `${50 + Math.sin(angle) * distance}%`;
  });

  shootJoystickContainer.addEventListener("touchend", () => {
    shootJoystickActive = false;
    shootJoystick.style.left = "50%";
    shootJoystick.style.top = "50%";
  });
}

// --- Manual reload key ---
document.addEventListener("keydown", e => {
  // ...existing code...
  if ((e.key === "r" || e.key === "R") && !isReloading && player.ammo < player.magazineSize && player.reserveAmmo > 0) {
    isReloading = true;
    if (sfxEnabled) {
      reloadSound.currentTime = 0;
      reloadSound.play();
    }
    setTimeout(() => {
      reload(player, updateAmmoDisplay);
      isReloading = false; // Ensure this runs last
      console.log("Reload complete. Ammo:", player.ammo, "/", player.reserveAmmo);
    }, 3000); // 3s reload
  }
  // ...existing code...
});

// Define isReloading variable
let isReloading = false;

// --- Ensure ammo display is created and rendered
const ammoDisplay = document.createElement("div");
ammoDisplay.id = "ammoDisplay";
ammoDisplay.style.position = "absolute";
ammoDisplay.style.bottom = "16px";
ammoDisplay.style.right = "32px";
ammoDisplay.style.fontSize = "20px";
ammoDisplay.style.color = "#ffe066";
ammoDisplay.style.fontFamily = "Press Start 2P";
ammoDisplay.style.textShadow = "2px 2px 4px #222";
ammoDisplay.style.zIndex = "100";
document.body.appendChild(ammoDisplay);

// --- Update bullet positions and remove off-screen bullets ---
function updateBullets() {
  bullets = bullets.filter(bullet => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    const distanceFromPlayer = Math.hypot(bullet.x - (player.x + player.width / 2), bullet.y - (player.y + player.height / 2));
    const onScreen =
      bullet.x + bullet.width > 0 &&
      bullet.x - bullet.width < canvas.width &&
      bullet.y + bullet.height > 0 &&
      bullet.y - bullet.height < canvas.height;

    if (!onScreen && distanceFromPlayer > 2000) {
      return false;
    }

    return true;
  });
}

// --- Define updateAmmoDisplay function
function updateAmmoDisplay() {
  const ammoDisplay = document.getElementById("ammoDisplay");
  if (ammoDisplay) {
    ammoDisplay.textContent = `Ammo: ${player.ammo} / ${player.reserveAmmo}`;
  }
}

// Ensure bullet creation logic uses the player's current position
function shootBullet(targetX, targetY, isWorldCoords = false) {
  if (!gameRunning || player.ammo <= 0 || isReloading) {
    return;
  }

  player.ammo--;
  updateAmmoDisplay();

  let cx = player.x + player.width / 2;
  let cy = player.y + player.height / 2;
  let speed = 7;
  let dx = 0, dy = 0;

  if (typeof targetX === "number" && typeof targetY === "number") {
    let worldX, worldY;
    if (isWorldCoords) {
      worldX = targetX;
      worldY = targetY;
    } else {
      worldX = targetX / zoom + camera.x;
      worldY = targetY / zoom + camera.y;
    }

    let angle = Math.atan2(worldY - cy, worldX - cx);
    dx = Math.cos(angle) * speed;
    dy = Math.sin(angle) * speed;
  } else {
    dx = (lastDirection.dx || 1) * speed;
    dy = (lastDirection.dy || 0) * speed;
  }

  const newBullet = {
    x: cx,
    y: cy,
    dx: dx,
    dy: dy,
    width: 8,
    height: 8,
  };

  bullets.push(newBullet);

  if (sfxEnabled) {
    shootSound.currentTime = 0;
    shootSound.play();
  }
}

// Add delay between each shot when using the joystick by tracking the last shoot time and enforcing a minimum delay.
let lastShootTime = 0;
const shootDelay = 400; // Delay in milliseconds

// Fix joystick delay implementation in shootBulletWithDelay
function shootBulletWithDelay(targetX, targetY) {
  const currentTime = performance.now(); // Use performance.now() for better precision
  if (currentTime - lastShootTime < shootDelay) return;

  lastShootTime = currentTime;
  shootBullet(targetX, targetY, true); // Ensure world coordinates are passed correctly
}

window.shootBulletWithDelay = shootBulletWithDelay;

// --- End Game ---
function endGame(victory = false) {
  gameRunning = false;
  clearInterval(enemyInterval);
  clearInterval(shootInterval);

  finalScore.textContent = (victory ? "You Win! " : "Your Score: ") + score;
  document.getElementById("gameOver").style.display = "flex";
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
}

// --- Control Mode Highlight & Export for HTML ---
function setControl(mode) {
  controlMode = mode;
  // Highlight selected mode button
  const buttonBtn = document.getElementById("buttonModeBtn");
  const joystickBtn = document.getElementById("joystickModeBtn");
  if (buttonBtn && joystickBtn) {
    if (mode === "buttons") {
      buttonBtn.classList.add("selected-mode");
      buttonBtn.classList.remove("unselected-mode");
      joystickBtn.classList.remove("selected-mode");
      joystickBtn.classList.add("unselected-mode");
    } else {
      joystickBtn.classList.add("selected-mode");
      joystickBtn.classList.remove("unselected-mode");
      buttonBtn.classList.remove("selected-mode");
      buttonBtn.classList.add("unselected-mode");
    }
  }
  playSelect();
}
// Make setControl available globally for HTML onclick
window.setControl = setControl;

// --- Pause Overlay ---
let paused = false;

function showPauseOverlay() {
  // Only show pause overlay if gameRunning is true and overlays are hidden
  if (!gameRunning) return;
  // Don't show if menu, settings, or gameOver is visible
  if (
    document.getElementById("menu").style.display !== "none" ||
    document.getElementById("settings").style.display !== "none" ||
    document.getElementById("gameOver").style.display !== "none"
  ) {
    return;
  }
  if (!document.getElementById("pauseOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "pauseOverlay";
    overlay.style.position = "absolute";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.right = 0;
    overlay.style.bottom = 0;
    overlay.style.background = "rgba(0,0,0,0.7)";
    overlay.style.zIndex = 500; // Lower than menu/settings/gameOver (2000+)
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.innerHTML = `
      <h2 style="color:#ffe066;font-size:36px;">Paused</h2>
      <button id="resumeBtn" style="font-size:22px;padding:10px 26px;margin-top:24px;">Resume</button>
      <button id="pauseRestartBtn" style="font-size:20px;padding:10px 26px;margin-top:14px;">Restart</button>
      <button id="pauseMenuBtn" style="font-size:20px;padding:10px 26px;margin-top:14px;">Main Menu</button>
    `;
    document.body.appendChild(overlay);
    document.getElementById("resumeBtn").onclick = resumeGame;
    document.getElementById("pauseRestartBtn").onclick = () => {
      hidePauseOverlay();
      restartGame();
    };
    document.getElementById("pauseMenuBtn").onclick = () => {
      hidePauseOverlay();
      backToMenu();
    };
  } else {
    document.getElementById("pauseOverlay").style.display = "flex";
  }
}

function hidePauseOverlay() {
  const overlay = document.getElementById("pauseOverlay");
  if (overlay) overlay.style.display = "none";
}

// --- Pause/Resume Functions ---
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
  if (musicEnabled) {
    try {
      backgroundMusic.play();
    } catch (e) {
      // Ignore autoplay error
    }
  }
}

// --- Pause Button & Esc Key ---
document.getElementById("pauseBtn").onclick = pauseGame;
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (!paused && gameRunning) pauseGame();
    else if (paused) resumeGame();
  }
  // --- Player Movement Keys ---
  if (e.key === customKeys.left) keys["ArrowLeft"] = true;
  if (e.key === customKeys.right) keys["ArrowRight"] = true;
  if (e.key === customKeys.up) keys["ArrowUp"] = true;
  if (e.key === customKeys.down) keys["ArrowDown"] = true;
});

document.addEventListener("keyup", e => {
  if (e.key === customKeys.left) keys["ArrowLeft"] = false;
  if (e.key === customKeys.right) keys["ArrowRight"] = false;
  if (e.key === customKeys.up) keys["ArrowUp"] = false;
  if (e.key === customKeys.down) keys["ArrowDown"] = false;
});

// --- Player movement logic ---
function updatePlayerMovement() {
  let moveX = 0, moveY = 0;

  if (keys["ArrowLeft"]) moveX -= 1;
  if (keys["ArrowRight"]) moveX += 1;
  if (keys["ArrowUp"]) moveY -= 1;
  if (keys["ArrowDown"]) moveY += 1;

  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    moveX /= len;
    moveY /= len;

    player.x += moveX * player.speed;
    player.y += moveY * player.speed;
  }

  // Remove clamping to allow free movement
}

// --- Ensure lastDirection is updated even when no keys are pressed
function updateLastDirection() {
  let dx = 0, dy = 0;
  if (keys["ArrowLeft"]) dx -= 1;
  if (keys["ArrowRight"]) dx += 1;
  if (keys["ArrowUp"]) dy -= 1;
  if (keys["ArrowDown"]) dy += 1;

  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    lastDirection.dx = dx / len;
    lastDirection.dy = dy / len;
  } else {
    // Maintain the last known direction if no keys are pressed
  }
}

// --- Add auto-reloading functionality
function autoReload() {
  if (!isReloading && player.ammo === 0 && player.reserveAmmo > 0) {
    isReloading = true;
    if (sfxEnabled) {
      reloadSound.currentTime = 0;
      reloadSound.play();
    }
    setTimeout(() => {
      reload(player, updateAmmoDisplay);
      isReloading = false; // Ensure reset here
    }, 3000);
  }
}

// --- Scale the map larger
const worldWidth = 5000; // Increased world width
const worldHeight = 5000; // Increased world height

// --- Camera (declare early so it's ready to use) ---
let camera = {
  x: 0,
  y: 0,
  width: canvas.width,
  height: canvas.height
};
let zoom = 1.5; // keep your zoom factor

function updateCamera() {
  // Center camera on player
  camera.x = Math.round(player.x + player.width / 2 - canvas.width / (2 * zoom));
  camera.y = Math.round(player.y + player.height / 2 - canvas.height / (2 * zoom));

  // Clamp so camera stays inside map
  camera.x = Math.max(0, Math.min(camera.x, worldWidth - canvas.width / zoom));
  camera.y = Math.max(0, Math.min(camera.y, worldHeight - canvas.height / zoom));
}

// Add zoom controls
window.addEventListener("keydown", (e) => {
  if (e.key === "+") {
    zoom = Math.min(zoom + 0.1, 3); // Max zoom level
  } else if (e.key === "-") {
    zoom = Math.max(zoom - 0.1, 0.5); // Min zoom level
  }
});

// --- Game Loop ---
function gameLoop() {
  if (!gameRunning) return;
  if (paused) return;

  // --- Sprint & Stamina logic ---
  if (player.sprinting && player.stamina > 0) {
    player.speed = player.sprintSpeed;
    player.stamina -= 0.5;
    if (player.stamina < 0) player.stamina = 0;
  } else {
    player.speed = player.normalSpeed;
    // Regen slower if moving
    let moving = keys["ArrowLeft"] || keys["ArrowRight"] || keys["ArrowUp"] || keys["ArrowDown"];
    let regen = moving ? 0.15 : 0.25;
    player.stamina += regen;
    if (player.stamina > player.maxStamina) player.stamina = player.maxStamina;
  }
  // Prevent sprint if stamina is 0
  if (player.stamina === 0) player.sprinting = false;
  updateStaminaBar();

  updatePlayerMovement(); // Call movement logic
  updateBullets(); // Update bullet positions
  updateCamera(); // Update camera position
  updateLastDirection(); // Update last movement direction

  // --- Enemies AI movement & abilities ---
  updateEnemies(player, canvas, zombiesData);

  // --- Projectiles (from throwers) ---
  updateProjectiles(canvas);

  // --- Wave enemy spawn ---
  if (waveSpawning && gameRunning) {
    waveSpawnTimer++;
    if (waveSpawnTimer >= 40) {
      spawnWaveEnemy();
      waveSpawnTimer = 0;
    }
  }

  // Bullet vs enemy
  handleBulletCollisions(
    bullets,
    sfxEnabled,
    explosionSound,
    { value: score },
    scoreDisplay,
    zombiesData,
    canvas
  );
  score = parseInt(scoreDisplay.textContent.replace(/\D/g, "")) || 0;

  // Enemy vs player
  if (handlePlayerCollisions(player, updateHealthBar, endGame)) return;

  // Projectile vs player
  if (handleProjectilePlayerCollision(player, updateHealthBar, endGame)) return;

  // Draw
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  drawBackground(ctx);

  ctx.save();
  ctx.scale(zoom, zoom);

  // Draw player
  ctx.fillStyle = "cyan";
  ctx.fillRect(
    Math.round((player.x - camera.x)),
    Math.round((player.y - camera.y)),
    player.width, player.height
  );

  // Draw bullets
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(
    Math.round(b.x - b.width / 2 - camera.x),
    Math.round(b.y - b.height / 2 - camera.y),
    b.width, b.height
  ));

  // Draw enemies
  drawEnemies(ctx, camera, 0.6);

  // Draw enemy projectiles
  drawProjectiles(ctx, camera);

  // Draw powerups
  drawAndHandlePowerups(ctx, player, updateAmmoDisplay, sfxEnabled, selectSound, undefined, camera);

  ctx.restore();

  // Check wave clear
  checkWaveClear();

  autoReload(); // Check for auto-reloading

  requestAnimationFrame(gameLoop);
}

// Scale the map to the maximum possible size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Adjust canvas size dynamically on window resize
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// --- Spawn Enemies ---
// (No longer used, handled by wave system)
// function spawnEnemy() { ... }

// --- Menu Background (must be defined before startGame calls hideMenuBackground) ---
const menuBackground = document.createElement("img");
menuBackground.src = "src/assets/image/menuScreen1.png";
menuBackground.id = "menuBackground";
menuBackground.style.position = "absolute";
menuBackground.style.top = "0";
menuBackground.style.left = "0";
menuBackground.style.width = "100%";
menuBackground.style.height = "100%";
menuBackground.style.zIndex = "1000";
menuBackground.style.display = "block"; // show menu background initially
document.body.appendChild(menuBackground);

function showMenuBackground() {
  menuBackground.style.display = "block";
}

function hideMenuBackground() {
  menuBackground.style.display = "none";
}

// --- Init ---
window.addEventListener("DOMContentLoaded", () => {
  setupCustomKeyInputs();
  setControl(controlMode);
  updateHealthBar();
  updateWaveDisplay();
  updateAmmoDisplay();
  updateStaminaBar();
});

// Define the checkWaveClear function
function checkWaveClear() {
  if (!waveSpawning && enemies.length === 0) {
    if (waveClearTimeout) return;
    waveClearTimeout = setTimeout(() => {
      waveClearTimeout = null;
      if (waves[currentWave + 1]) {
        startWave(currentWave + 1);
      } else {
        // All waves done, player wins
        endGame(true);
      }
    }, 1200); // Short delay before next wave or win
  }
  if (enemies.length > 0 && waveClearTimeout) {
    clearTimeout(waveClearTimeout);
    waveClearTimeout = null;
  }
}

// Add fullscreen toggle functionality
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    playSelect();
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
    });
  } else {
    playSelect();
    document.exitFullscreen().catch(err => {
      console.error(`Error attempting to exit fullscreen mode: ${err.message} (${err.name})`);
    });
  }
}

window.toggleFullscreen = toggleFullscreen;

// Force horizontal orientation on mobile devices
if (isMobile) {
  window.addEventListener("orientationchange", () => {
    if (window.orientation !== 90 && window.orientation !== -90) {
      alert("Please rotate your device to landscape mode for the best experience.");
    }
  });

  if (window.orientation !== 90 && window.orientation !== -90) {
    alert("Please rotate your device to landscape mode for the best experience.");
  }
}

// --- Check for service worker support and register ---
if ('serviceWorker' in navigator && location.hostname !== "itch.io") {
  navigator.serviceWorker.register("service-worker.js").catch(err => {
    console.warn("Service Worker registration failed:", err);
  });
}

// --- Cache static assets ---
const CACHE_NAME = 'game-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'game.js',
  'style.css',
  'src/assets/image/gameBG.png',
  'src/assets/image/menuScreen1.png',
  'src/assets/sound/blipSelect.wav',
  'src/assets/sound/explosion.wav',
  'src/assets/sound/laserShoot.wav',
  '/src/assets/sound/reload-gun.mp3',
  'data/zombies.json',
  'data/wave.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return the response from the cached version
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Update reload key listener to ensure isReloading resets properly
document.addEventListener("keydown", e => {
  if ((e.key === "r" || e.key === "R") && !isReloading && player.ammo < player.magazineSize && player.reserveAmmo > 0) {
    isReloading = true;
    if (sfxEnabled) {
      reloadSound.currentTime = 0;
      reloadSound.play();
    }
    setTimeout(() => {
      reload(player, updateAmmoDisplay);
      isReloading = false; // Ensure this runs last
      console.log("Reload complete. Ammo:", player.ammo, "/", player.reserveAmmo);
    }, 3000); // 3s reload
  }
});