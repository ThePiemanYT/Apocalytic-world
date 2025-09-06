import {
  enemies,
  resetEnemies,
  spawnEnemy,
  updateEnemies,
  drawEnemies,
  handleBulletCollisions,
  handlePlayerCollisions
} from "./enemy.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const finalScore = document.getElementById("finalScore");
const healthBar = document.getElementById("healthBar");
const waveDisplay = document.getElementById("waveDisplay");

// --- Player & Game State ---
let player = { x: 0, y: 0, width: 40, height: 40, speed: 6, maxHealth: 5, health: 5 };
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

// --- Audio ---
let musicEnabled = true;
let sfxEnabled = true;

const selectSound = new Audio("src/assets/sound/blipSelect.wav");
const explosionSound = new Audio("src/assets/sound/explosion.wav");
const shootSound = new Audio("src/assets/sound/laserShoot.wav");

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
      basic: { speed: 2, health: 1, color: "red" },
      fast: { speed: 4, health: 1, color: "orange" },
      tank: { speed: 1, health: 3, color: "purple" }
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
}

function spawnWaveEnemy() {
  if (!waveSpawning || waveEnemyQueue.length === 0) return;
  const type = waveEnemyQueue.shift();
  spawnEnemy(type, zombiesData, canvas.width);
  if (waveEnemyQueue.length === 0) waveSpawning = false;
}

let waveClearTimeout = null;
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

// --- Resize Canvas ---
function resizeCanvas() {
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.8;
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

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
  document.getElementById("menu").style.display = "none";
  document.getElementById("settings").style.display = "none";
  document.getElementById("gameOver").style.display = "none";

  playSelect();
  if (musicEnabled) {
    backgroundMusic.currentTime = 0;
    try {
      await backgroundMusic.play();
    } catch (e) {
      // Ignore autoplay error, will play after next user interaction
    }
  }

  document.getElementById("controls").style.display =
    controlMode === "buttons" ? "flex" : "none";

  await loadGameData();
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

function closeSettings() {
  document.getElementById("settings").style.display = "none";
  document.getElementById("menu").style.display = "flex";
  playSelect();
}

function quitGame() {
  alert("Quit Game (close browser tab manually)");
}

function resetGame() {
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
  player.health = player.maxHealth;
  bullets = [];
  resetEnemies();
  score = 0;
  scoreDisplay.textContent = "Score: 0";
  updateHealthBar();
  currentWave = 0;
  updateWaveDisplay();
}

function restartGame() {
  document.getElementById("gameOver").style.display = "none";
  startGame();
  playSelect();
}

function backToMenu() {
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("menu").style.display = "flex";
  playSelect();
}

// Make functions available to HTML
window.startGame = startGame;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.quitGame = quitGame;
window.restartGame = restartGame;
window.backToMenu = backToMenu;

// --- Background ---
const roadBG = new Image();
roadBG.src = "../src/assets/image/roadBG1.png";

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
controlMode = isMobile ? "drag" : "buttons";

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
});

document.addEventListener("keyup", e => {
  if (e.key === customKeys.left) keys["ArrowLeft"] = false;
  if (e.key === customKeys.right) keys["ArrowRight"] = false;
  if (e.key === customKeys.up) keys["ArrowUp"] = false;
  if (e.key === customKeys.down) keys["ArrowDown"] = false;
});

// --- Shooting ---
canvas.addEventListener("mousedown", e => {
  // Always shoot toward mouse position on left click (button 0)
  if (e.button === 0) {
    shootBullet(mouse.x, mouse.y);
  }
});

document.getElementById("leftBtn").addEventListener("touchstart", () => (keys["ArrowLeft"] = true));
document.getElementById("leftBtn").addEventListener("touchend", () => (keys["ArrowLeft"] = false));
document.getElementById("rightBtn").addEventListener("touchstart", () => (keys["ArrowRight"] = true));
document.getElementById("rightBtn").addEventListener("touchend", () => (keys["ArrowRight"] = false));

// Drag movement
let dragging = false;
canvas.addEventListener("touchstart", () => {
  if (controlMode === "drag") dragging = true;
});
canvas.addEventListener("touchend", () => {
  if (controlMode === "drag") dragging = false;
});
canvas.addEventListener("touchmove", e => {
  if (controlMode === "drag" && dragging) {
    let rect = canvas.getBoundingClientRect();
    player.x = e.touches[0].clientX - rect.left - player.width / 2;
    player.y = e.touches[0].clientY - rect.top - player.height / 2;
  }
});

function updateLastDirection() {
  let dx = 0,
    dy = 0;
  if (keys["ArrowLeft"]) dx -= 1;
  if (keys["ArrowRight"]) dx += 1;
  if (keys["ArrowUp"]) dy -= 1;
  if (keys["ArrowDown"]) dy += 1;
  if (dx || dy) {
    let len = Math.hypot(dx, dy);
    lastDirection.dx = dx / len;
    lastDirection.dy = dy / len;
  }
}

function shootBullet(targetX, targetY) {
  if (!gameRunning) return;
  let cx = player.x + player.width / 2;
  let cy = player.y + player.height / 2;
  let speed = 7;
  let dx, dy;

  // Always shoot toward mouse if coordinates provided
  if (typeof targetX === "number" && typeof targetY === "number") {
    let angle = Math.atan2(targetY - cy, targetX - cx);
    dx = Math.cos(angle) * speed;
    dy = Math.sin(angle) * speed;
  } else {
    dx = lastDirection.dx * speed;
    dy = lastDirection.dy * speed;
  }

  bullets.push({ x: cx, y: cy, width: 8, height: 8, dx, dy });

  if (sfxEnabled) {
    shootSound.currentTime = 0;
    shootSound.play();
  }
}

function autoShoot() {
  if (gameRunning && controlMode === "drag") shootBullet();
}

// --- End Game ---
function endGame(victory = false) {
  gameRunning = false;
  clearInterval(enemyInterval);
  clearInterval(shootInterval);

  finalScore.textContent = (victory ? "You Win! " : "Your Score: ") + score;
  document.getElementById("gameOver").style.display = "flex";
  document.getElementById("controls").style.display = "none";

  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
}

// --- Control Mode Highlight & Export for HTML ---
function setControl(mode) {
  controlMode = mode;
  // Highlight selected mode button
  const buttonBtn = document.getElementById("buttonModeBtn");
  const dragBtn = document.getElementById("dragModeBtn");
  if (buttonBtn && dragBtn) {
    if (mode === "buttons") {
      buttonBtn.classList.add("selected-mode");
      buttonBtn.classList.remove("unselected-mode");
      dragBtn.classList.remove("selected-mode");
      dragBtn.classList.add("unselected-mode");
    } else {
      dragBtn.classList.add("selected-mode");
      dragBtn.classList.remove("unselected-mode");
      buttonBtn.classList.remove("selected-mode");
      buttonBtn.classList.add("unselected-mode");
    }
  }
  playSelect();
}
// Make setControl available globally for HTML onclick
window.setControl = setControl;

// --- Game Loop ---
function gameLoop() {
  if (!gameRunning) return;

  // Movement (8 directions)
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;
  if (keys["ArrowUp"]) player.y -= player.speed;
  if (keys["ArrowDown"]) player.y += player.speed;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  updateLastDirection();

  // Bullets
  bullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
  });
  bullets = bullets.filter(
    b => b.x > -20 && b.x < canvas.width + 20 && b.y > -20 && b.y < canvas.height + 20
  );

  // Enemies AI movement & summoner ability
  updateEnemies(player, canvas, zombiesData);

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
    scoreDisplay
  );
  score = parseInt(scoreDisplay.textContent.replace(/\D/g, "")) || 0;

  // Enemy vs player
  if (handlePlayerCollisions(player, updateHealthBar, endGame)) return;

  // Draw
  if (roadBG.complete) ctx.drawImage(roadBG, 0, 0, canvas.width, canvas.height);
  else ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw player
  ctx.fillStyle = "cyan";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw bullets
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height));

  // Draw enemies with color and health bar
  enemies.forEach(e => {
    ctx.fillStyle = e.color || "red";
    ctx.fillRect(e.x, e.y, e.width, e.height);
    // Draw enemy health bar
    if (e.maxHealth > 1) {
      ctx.fillStyle = "#222";
      ctx.fillRect(e.x, e.y - 8, e.width, 6);
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(e.x, e.y - 8, e.width * (e.health / e.maxHealth), 6);
    }
  });

  // Check wave clear
  checkWaveClear();

  requestAnimationFrame(gameLoop);
}

// --- Spawn Enemies ---
// (No longer used, handled by wave system)
// function spawnEnemy() { ... }

// --- Init ---
window.addEventListener("DOMContentLoaded", () => {
  setupCustomKeyInputs();
  setControl(controlMode);
  updateHealthBar();
  updateWaveDisplay();
});
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(e.x, e.y - 8, e.width * (e.health / e.maxHealth), 6);

  // Check wave clear
  checkWaveClear();

  requestAnimationFrame(gameLoop);

// --- Spawn Enemies ---
// (No longer used, handled by wave system)
// function spawnEnemy() { ... }

// --- Init ---
window.addEventListener("DOMContentLoaded", () => {
  setupCustomKeyInputs();
  setControl(controlMode);
  updateHealthBar();
  updateWaveDisplay();
});
