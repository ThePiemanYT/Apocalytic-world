/* src/scripts/index.js */

import { 
  player, bullets, canvas, ctx, gameRunning, paused, score, 
  worldWidth, worldHeight, setGameRunning, setPaused, setScore, 
  resetPlayerState, getPlayerDamage, isReloading, setIsReloading,
  spawnBullet 
} from "./state.js";

import { 
  initUI, updateHUD, openUpgradeScreen, updateWaveUI, 
  openPanel, closePanel, toggleGameUI 
} from "./ui.js";

import { 
  sounds, playSound, backgroundMusic, musicEnabled 
} from "./audio.js";

import { camera, updateCamera, zoom } from "./camera.js";

import { 
  loadGameData, startWave, updateWaveLogic, waves, currentWave, 
  waveSpawning, resetWaveState, zombiesData 
} from "./waves.js";

import { 
  enemies, resetEnemies, updateEnemies, drawEnemies, 
  handleBulletCollisions, handlePlayerCollisions, 
  projectiles, updateProjectiles, drawProjectiles, 
  handleProjectilePlayerCollision 
} from "./enemy.js";

import { reload } from "./reload.js";
import { 
    drawAndHandlePowerups, initPowerupHUD, updatePowerupHUD, 
    activePowerups, resetPowerups 
} from "./powerup.js";

import { updateAchievement, loadAchievements } from "./achievement.js";
import { initInput, updateInput, input } from "./input.js";

// --- Global Setup for Menu Background ---
const menuBackground = document.createElement("img");
menuBackground.src = "src/assets/image/menuScreen1.png";
menuBackground.id = "menuBackground";
Object.assign(menuBackground.style, {
  position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
  zIndex: "150", display: "block", pointerEvents: "none"
});
document.body.appendChild(menuBackground);

function showMenuBackground() { menuBackground.style.display = "block"; }
function hideMenuBackground() { menuBackground.style.display = "none"; }

function toggleAnimation(show) {
    const el = document.querySelector(".finisher-header");
    if (el) el.style.display = show ? "block" : "none";
}

const gameBG = new Image();
gameBG.src = "src/assets/image/gameBG.png";

// --- Logic Variables ---
let waveClearTimeout = null;
let upgradeScreenShown = false;
let usedPowerup = false;
let lastTime = 0; 

// --- FX State (Juice) ---
let shakeAmount = 0;
let floatingTexts = []; // {x, y, text, color, life, size}

function spawnFloatingText(x, y, text, color = "#fff", size = 12) {
    floatingTexts.push({ x, y, text, color, size, life: 60 });
}

function triggerShake(amount) {
    shakeAmount = amount;
}

// --- Core Gameplay Functions ---

function shootBullet(targetX, targetY) {
  if (!gameRunning || player.ammo <= 0 || isReloading) return;

  player.ammo--;
  updateHUD();

  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  const speed = 7;

  // Calculate World Coordinates from Screen Input
  const worldX = targetX / zoom + camera.x;
  const worldY = targetY / zoom + camera.y;
  const angle = Math.atan2(worldY - cy, worldX - cx);

  const fire = (ang) => {
    spawnBullet(
      cx, cy, 
      Math.cos(ang) * speed, Math.sin(ang) * speed,
      getPlayerDamage(),
      player.doubleDamage ? "orange" : "yellow",
      false // IsCrit flag (calculated on hit usually, or here if needed)
    );
  };

  if (player.tripleShot) {
    fire(angle - 0.25); fire(angle); fire(angle + 0.25);
  } else {
    fire(angle);
  }

  // Visual Feedack
  triggerShake(2); // Small shake on shoot
  playSound("shoot", 50); 
  window.onBulletFired && window.onBulletFired();
}

function tryReload() {
  if (!isReloading && player.ammo < player.magazineSize && player.reserveAmmo > 0) {
      setIsReloading(true);
      playSound("reload");
      setTimeout(() => { 
        reload(player, updateHUD); 
        setIsReloading(false); 
      }, 3000);
  }
}

function autoReload() {
  if (!isReloading && player.ammo === 0 && player.reserveAmmo > 0) tryReload();
}

// --- Main Game Loop ---
function gameLoop(timestamp) {
  if (!gameRunning) return;
  
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  
  let timeScale = deltaTime / (1000 / 60);
  if (timeScale > 4) timeScale = 4;

  if (paused) {
    requestAnimationFrame(gameLoop);
    return;
  }

  // 1. Input
  updateInput(player.x, player.y, camera.x, camera.y, zoom);
  player.sprinting = input.isSprinting;

  // 2. Dash Logic
  if (player.dashCooldown > 0) player.dashCooldown -= deltaTime;
  
  if (player.dashActive) {
      player.dashTime -= deltaTime;
      if (player.dashTime <= 0) {
          player.dashActive = false;
          player.immune = false; // End invincibility
      }
  } else if (input.dashPressed && player.dashCooldown <= 0 && (input.move.x !== 0 || input.move.y !== 0)) {
      // Start Dash
      player.dashActive = true;
      player.dashTime = 200; // 200ms duration
      player.dashCooldown = 1500; // 1.5s cooldown
      player.immune = true;
      playSound("select", 0); // Placeholder dash sound
      // Create a burst of speed
  }

  // 3. Movement Physics
  let currentSpeed = player.normalSpeed;
  
  if (player.dashActive) {
      currentSpeed = player.sprintSpeed * 3.5; // High speed dash
  } else if (player.sprinting && player.stamina > 0) {
      currentSpeed = player.sprintSpeed;
      player.stamina -= 0.5 * timeScale;
      if (player.stamina < 0) player.stamina = 0;
  } else {
      currentSpeed = player.normalSpeed;
      const moving = Math.abs(input.move.x) > 0.05 || Math.abs(input.move.y) > 0.05;
      player.stamina += (moving ? 0.15 : 0.25) * timeScale;
      if (player.stamina > player.maxStamina) player.stamina = player.maxStamina;
  }
  if (player.stamina === 0) player.sprinting = false;

  // Apply Velocity
  if (Math.abs(input.move.x) > 0.05 || Math.abs(input.move.y) > 0.05) {
      player.x += input.move.x * currentSpeed * timeScale;
      player.y += input.move.y * currentSpeed * timeScale;
      player.x = Math.max(0, Math.min(worldWidth - player.width, player.x));
      player.y = Math.max(0, Math.min(worldHeight - player.height, player.y));
  }

  // 4. Updates
  updateHUD();
  updateCamera(player);
  
  // Bullets
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (b.active) {
      b.x += b.dx * timeScale;
      b.y += b.dy * timeScale;
      if (Math.hypot(b.x - player.x, b.y - player.y) > 2000) {
        b.active = false; 
      }
    }
  }

  // Enemies & Collisions
  import("./waves.js").then(module => {
     updateEnemies(player, canvas, module.zombiesData || zombiesData, timeScale);
     
     const sfxWrapper = { currentTime: 0, play: () => { playSound("explosion", 80); return Promise.resolve(); } };
     const hitWrapper = { currentTime: 0, play: () => { playSound("hitHurt", 50); return Promise.resolve(); } };
     
     // Pass effects callbacks to enemy.js
     const effects = { spawnText: spawnFloatingText, shake: triggerShake };

     handleBulletCollisions(bullets, true, sfxWrapper, { value: score }, document.getElementById("score"), module.zombiesData || zombiesData, canvas, hitWrapper, player, effects);
     
     setScore(parseInt(document.getElementById("score").textContent.replace(/\D/g, "")) || 0);
  });
  
  updateProjectiles(canvas, timeScale);
  updateWaveLogic();
  autoReload();

  // Collisions (Player)
  if (handlePlayerCollisions(player, updateHUD, endGame)) return;
  if (handleProjectilePlayerCollision(player, updateHUD, endGame)) return;

  // Wave Clear Check
  if (!waveSpawning && enemies.length === 0) {
    if (!waveClearTimeout) {
      waveClearTimeout = setTimeout(() => {
        waveClearTimeout = null;
        if ((currentWave + 1) % 3 === 0 && !upgradeScreenShown) {
          setPaused(true);
          openUpgradeScreen(() => {
            setPaused(false);
            upgradeScreenShown = true; 
            lastTime = 0; 
            checkNextWave();
          });
        } else {
          checkNextWave();
        }
      }, 1200);
    }
  }

  // 5. Drawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Screen Shake Application
  ctx.save();
  if (shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * shakeAmount;
      const sy = (Math.random() - 0.5) * shakeAmount;
      ctx.translate(sx, sy);
      shakeAmount *= 0.9; // Dampen shake
      if (shakeAmount < 0.5) shakeAmount = 0;
  }

  ctx.drawImage(gameBG, 0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.scale(zoom, zoom);
  
  // Draw Player (Ghost effect if dashing)
  if (player.dashActive) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "white";
      // Draw trails
      ctx.fillRect(Math.round(player.x - camera.x - input.move.x*15), Math.round(player.y - camera.y - input.move.y*15), player.width, player.height);
      ctx.fillRect(Math.round(player.x - camera.x - input.move.x*30), Math.round(player.y - camera.y - input.move.y*30), player.width, player.height);
      ctx.globalAlpha = 1.0;
  }

  ctx.fillStyle = "cyan";
  ctx.fillRect(Math.round(player.x - camera.x), Math.round(player.y - camera.y), player.width, player.height);

  // Draw Bullets
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (b.active) {
      ctx.fillStyle = b.color || "yellow";
      ctx.fillRect(Math.round(b.x - b.width / 2 - camera.x), Math.round(b.y - b.height / 2 - camera.y), b.width, b.height);
    }
  }

  drawEnemies(ctx, camera, 0.6);
  drawProjectiles(ctx, camera);
  drawAndHandlePowerups(ctx, player, updateHUD, true, sounds.powerUp, undefined, camera);
  drawReticle(ctx);
  
  // Draw Floating Texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 0.5 * timeScale; // Float up
      ft.life -= 1 * timeScale;
      
      ctx.globalAlpha = Math.max(0, ft.life / 40);
      ctx.fillStyle = ft.color;
      ctx.font = `${ft.size}px 'Press Start 2P', sans-serif`;
      ctx.strokeStyle = "black";
      ctx.lineWidth = 3;
      
      const dx = ft.x - camera.x;
      const dy = ft.y - camera.y;
      
      ctx.strokeText(ft.text, dx, dy);
      ctx.fillText(ft.text, dx, dy);
      
      if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
  ctx.globalAlpha = 1.0;

  ctx.restore(); // Undo scale
  ctx.restore(); // Undo shake
  
  // Update Powerup Timer UI
  try { updatePowerupHUD(); } catch (e) {}
  
  requestAnimationFrame(gameLoop);
}

function checkNextWave() {
  upgradeScreenShown = false;
  const success = startWave(currentWave + 1);
  if (!success) endGame(true); 
}

function drawReticle(ctx) {
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  let rx, ry;

  if (input.aim.isVector) {
    if (!input.aim.active) return;
    rx = cx + (input.aim.x * 150);
    ry = cy + (input.aim.y * 150);
  } else {
    rx = input.aim.x / zoom + camera.x;
    ry = input.aim.y / zoom + camera.y;
  }
  
  const dx = Math.round(rx - camera.x);
  const dy = Math.round(ry - camera.y);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(dx, dy, 10, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = "red";
  ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI*2); ctx.fill();
}

// --- Game Control ---
async function startGame() {
  hideMenuBackground();
  toggleAnimation(false);
  document.getElementById("menu").style.display = "none";
  document.getElementById("gameOver").style.display = "none";
  
  const vLabel = document.getElementById("versionLabel");
  if (vLabel) vLabel.style.display = "none";
  
  playSound("select");
  if (musicEnabled) {
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(()=>{});
  }

  await loadGameData();
  resetGame();
  
  setGameRunning(true);
  initUI();
  initPowerupHUD();
  toggleGameUI(true);
  initInput(canvas, { onShoot: shootBullet, onReload: tryReload });
  startWave(0);
  
  lastTime = 0; 
  requestAnimationFrame(gameLoop);
}

function resetGame() {
  if (waveClearTimeout) { clearTimeout(waveClearTimeout); waveClearTimeout = null; }
  resetPlayerState();
  resetEnemies();
  resetWaveState();
  resetPowerups();
  updateHUD();
  shakeAmount = 0;
  floatingTexts = [];
}

function endGame(victory = false) {
  setGameRunning(false);
  const finalScore = document.getElementById("finalScore");
  finalScore.textContent = (victory ? "You Win! " : "Your Score: ") + score;
  document.getElementById("gameOver").style.display = "flex";
  backgroundMusic.pause();
  
  if (victory && !usedPowerup) updateAchievement("1", 1);
  playSound(victory ? "victory" : "gameOver");
  
  toggleGameUI(false);
  resetPowerups();
}

function quitGame() { playSound("select"); window.close(); }
function restartGame() { setPaused(false); hidePauseOverlay(); startGame(); }

function backToMenu() {
  setPaused(false); 
  hidePauseOverlay();
  setGameRunning(false);
  
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("menu").style.display = "flex";
  
  const menu1 = document.getElementById("menu1");
  if(menu1) menu1.style.display = "flex";

  const vLabel = document.getElementById("versionLabel");
  if (vLabel) vLabel.style.display = "block";

  showMenuBackground();
  toggleAnimation(true);
  playSound("select");
  
  toggleGameUI(false);
  resetPowerups();
}

// --- Pause System ---
function showPauseOverlay() {
  if (!document.getElementById("pauseOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "pauseOverlay";
    Object.assign(overlay.style, {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center"
    });
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
  } else {
    document.getElementById("pauseOverlay").style.display = "flex";
  }
}

function hidePauseOverlay() {
  const o = document.getElementById("pauseOverlay");
  if(o) o.style.display = "none";
}

function pauseGame() {
  if (!gameRunning || paused) return;
  setPaused(true);
  showPauseOverlay();
  backgroundMusic.pause();
}

function resumeGame() {
  if (!paused) return;
  setPaused(false);
  hidePauseOverlay();
  if(musicEnabled) backgroundMusic.play().catch(()=>{});
  lastTime = 0; 
  requestAnimationFrame(gameLoop);
}

// --- Settings & UI Global Hooks ---
// (Required for HTML buttons to access module functions)
const musicSlider = document.getElementById("musicSlider");
if(musicSlider) {
    musicSlider.addEventListener("input", () => {
        backgroundMusic.volume = musicSlider.value / 100;
        localStorage.setItem("musicVolume", musicSlider.value / 100);
    });
}

// Control Cycling
let controlMode = "Keyboard";
const controlModes = ["Keyboard", "Mobile", "Controller"];

function cycleControlMode() {
  const btn = document.getElementById("controlOptionsBtn");
  const currentIndex = controlModes.indexOf(controlMode);
  const nextIndex = (currentIndex + 1) % controlModes.length;
  controlMode = controlModes[nextIndex];

  if (btn) {
    btn.textContent = controlMode;
    btn.classList.remove("swapText");
    void btn.offsetWidth; 
    btn.classList.add("swapText");
  }
  playSound("select");
}

window.addEventListener("device-changed", (e) => {
  const deviceMap = { 'touch': 'Mobile', 'gamepad': 'Controller', 'keyboard': 'Keyboard' };
  const newMode = deviceMap[e.detail.device] || 'Keyboard';
  if (controlMode !== newMode) {
      controlMode = newMode;
      const btn = document.getElementById("controlOptionsBtn");
      if(btn) {
          btn.textContent = controlMode;
          btn.classList.remove("swapText");
          void btn.offsetWidth;
          btn.classList.add("swapText");
      }
  }
});

// Menu Panel Wrappers
function openSettings() { const m = document.getElementById("menu"); if (m) m.style.display = "none"; const s = document.getElementById("settings"); if (s) s.style.display = "flex"; hideAllSections(); showMainButtons(); playSound("select"); }
function closeSettings() { const s = document.getElementById("settings"); if (s) s.style.display = "none"; const m = document.getElementById("menu"); if (m) m.style.display = "flex"; playSound("select"); }

function openAudio() { hideMainButtons(); const a = document.getElementById("audioPanel"); if (a) a.style.display = "block"; playSound("select"); }
function backAudio() { const a = document.getElementById("audioPanel"); if (a) a.style.display = "none"; showMainButtons(); playSound("select"); }

function openControl() { openPanel('controlPanel'); playSound("select"); }
function backControl() { closePanel('controlPanel'); playSound("select"); }

function openCredit() { openPanel('creditsPanel'); playSound("select"); }
function backCredit() { closePanel('creditsPanel'); playSound("select"); }

function hideAllSections() { ["audioSection", "controlSection", "creditSection"].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "none"; }); }
function hideMainButtons() { ["audioSetting", "controlSetting", "howToPlay", "close-setting"].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "none"; }); }
function showMainButtons() { ["audioSetting", "controlSetting", "howToPlay", "close-setting"].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "flex"; }); }

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

// Global Assignments
window.startGame = startGame;
window.quitGame = quitGame;
window.restartGame = restartGame;
window.backToMenu = backToMenu;
window.pauseGame = pauseGame;
window.cycleControlMode = cycleControlMode;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.openAudio = openAudio;
window.backAudio = backAudio;
window.openControl = openControl;
window.backControl = backControl;
window.openCredit = openCredit;
window.backCredit = backCredit;
window.toggleFullscreen = toggleFullscreen;

// Initialization
window.addEventListener("DOMContentLoaded", () => {
  initUI();
  toggleGameUI(false);
  loadAchievements();
  
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  showMenuBackground();
  toggleAnimation(true);
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (!paused && gameRunning) pauseGame();
    else if (paused) resumeGame();
  }
});

const pauseBtn = document.getElementById("pauseBtn");
if (pauseBtn) pauseBtn.onclick = pauseGame;