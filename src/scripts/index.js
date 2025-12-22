/* src/scripts/index.js */

import { 
  player, bullets, canvas, ctx, gameRunning, paused, score, 
  worldWidth, worldHeight, setGameRunning, setPaused, setScore, 
  resetPlayerState, getPlayerDamage, isReloading, setIsReloading,
  spawnBullet 
} from "./state.js";

import { drawPlayer, drawPlayerIndicator, getBulletStyleDef } from "./cosmetics.js";
import { playerShoot, playerTryReload, updatePlayerMovement, handleSprintKey, resetPlayer } from "./player.js";
import { initUI, updateHUD, openUpgradeScreen, updateWaveUI, openPanel, closePanel, toggleGameUI } from "./ui.js";
import { sounds, playSound, backgroundMusic, musicEnabled } from "./audio.js";
import { camera, updateCamera, zoom } from "./camera.js";
import { loadGameData, startWave, updateWaveLogic, waves, currentWave, waveSpawning, resetWaveState, zombiesData } from "./waves.js";
import { enemies, resetEnemies, updateEnemies, drawEnemies, handleBulletCollisions, handlePlayerCollisions, projectiles, updateProjectiles, drawProjectiles, handleProjectilePlayerCollision, triggerExplosion } from "./enemy.js";
import { reload } from "./reload.js";
import { drawMap, resolveMapCollision, checkCollision } from "./map.js";
import { initPathfinding, updatePathfinding } from "./pathfinding.js";
import { drawAndHandlePowerups, initPowerupHUD, updatePowerupHUD, activePowerups, resetPowerups, pausePowerups, resumePowerups } from "./powerup.js";
import { updateAchievement, loadAchievements } from "./achievement.js";
import { initInput, updateInput, input } from "./input.js";
import { addSessionCoins, saveGameEconomy, resetSessionCoins, sessionCoins, getCosmeticColor } from "./economy.js";

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
function toggleAnimation(show) { const el = document.querySelector(".finisher-header"); if (el) el.style.display = show ? "block" : "none"; }

let waveClearTimeout = null;
let upgradeScreenShown = false;
let lastTime = 0; 
let usedPowerup = false;
let powerupsCollected = 0;
let shakeAmount = 0;
let floatingTexts = []; 
let explosions = []; 
let confetti = []; 

export function spawnFloatingText(x, y, text, color = "#fff", size = 12) { floatingTexts.push({ x, y, text, color, size, life: 60 }); }
function spawnExplosion(x, y, size, color = "orange") { explosions.push({ x, y, size, life: 1.0, color }); }
function triggerShake(amount) { shakeAmount = amount; }

window.onBulletFired = (amount = 1) => { 
    triggerShake(2); 
    updateAchievement("3", amount); 
};

function autoReload() { if (!isReloading && player.ammo === 0 && player.reserveAmmo > 0) playerTryReload(); }

function spawnConfetti(camera) {
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff"];
    const x = (camera.x + Math.random() * canvas.width);
    const y = (camera.y + Math.random() * canvas.height * 0.5); 
    
    confetti.push({
        x: x, y: y,
        dx: (Math.random() - 0.5) * 5,
        dy: Math.random() * -5 - 2, 
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        life: 150
    });
}

function startDeathSequence() {
    if (!player.isDead && !player.isWinning) {
        player.isDead = true;
        player.deathTimer = 120; 
        playSound("playerDeath"); 
        
        if (currentWave >= 2) { 
             addSessionCoins(10);
             spawnFloatingText(player.x, player.y - 60, "+10 Pity Coins", "gold", 14);
        }
        saveGameEconomy(); 
    }
}

function startVictorySequence() {
    if (!player.isWinning && !player.isDead) {
        player.isWinning = true;
        player.victoryTimer = 240; 
        playSound("victory"); 
        
        saveGameEconomy();
        
        bullets.forEach(b => b.active = false);
    }
}

let frameCount = 0;

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
  
  if (player.isDead) {
      if (player.deathTimer > 0) {
          player.deathTimer -= timeScale; 
          if (player.deathTimer > 30 && Math.floor(player.deathTimer) % 15 === 0) {
               triggerExplosion(player.x + Math.random()*40 - 20, player.y + Math.random()*40 - 20, 0, { spawnExplosion: spawnExplosion });
               triggerShake(2);
          }
          if (player.deathTimer <= 2 && player.deathTimer > -1) {
               triggerExplosion(player.x + player.width/2, player.y + player.height/2, 0, { spawnExplosion, shake: triggerShake });
          }
      } else {
          endGame(false);
          return;
      }
  }

  if (player.isWinning) {
      player.victoryTimer -= timeScale;
      if (Math.random() < 0.5 * timeScale) {
          spawnConfetti(camera);
          spawnConfetti(camera);
      }
      for (let i = confetti.length - 1; i >= 0; i--) {
          let c = confetti[i];
          c.x += c.dx * timeScale;
          c.y += c.dy * timeScale;
          c.dy += 0.1 * timeScale; 
          c.rotation += c.rotSpeed * timeScale;
          c.life -= timeScale;
          if (c.life <= 0) confetti.splice(i, 1);
      }
      if (player.victoryTimer <= 0) {
          endGame(true);
          return;
      }
  }

  frameCount++;
  if (frameCount % 15 === 0) { 
      updatePathfinding(player.x + player.width/2, player.y + player.height/2); 
  }

  if (!player.isDead && !player.isWinning) {
      updateInput(player.x, player.y, camera.x, camera.y, zoom);
      player.sprinting = input.isSprinting;
      
      updatePlayerMovement(input.keys || {}, canvas, timeScale);
      resolveMapCollision(player);
  }

  updateHUD();
  updateCamera(player);
  
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (b.active) {
      b.x += b.dx * timeScale;
      b.y += b.dy * timeScale;
      if (checkCollision(b.x - b.width, b.y - b.width, b.width*2, b.width*2)) {
          if (!b.hasHitWall) {
             b.hasHitWall = true;
             const centerX = b.x + b.width/2;
             const centerY = b.y + b.height/2;
             if (player.explosiveShot) {
                triggerExplosion(centerX, centerY, b.damage || 1, { spawnText: spawnFloatingText, shake: triggerShake, spawnExplosion: spawnExplosion });
             } else { spawnFloatingText(centerX, centerY, "•", "#ccc", 10); }
          }
          if (!player.piercingShot) b.active = false; 
      } else { b.hasHitWall = false; }
      if (Math.hypot(b.x - player.x, b.y - player.y) > 2000) b.active = false; 
    }
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].life -= 0.05 * timeScale;
    if (explosions[i].life <= 0) explosions.splice(i, 1);
  }

  // --- UPDATED: Use 'explosionPowerup' for the Exploder/Creeper ---
  const effects = { 
      spawnText: spawnFloatingText, 
      shake: triggerShake, 
      spawnExplosion: spawnExplosion,
      playExplosion: () => playSound("explosionPowerup", 80) // FIXED HERE
  };
  
  import("./waves.js").then(module => {
     updateEnemies(player, canvas, module.zombiesData || zombiesData, projectiles, true, null, timeScale, ctx, effects); 
     
     // --- UPDATED: Use 'explosionPowerup' for general deaths too if you want ---
     // (Or keep it as "explosion" if you have two different sounds)
     const sfxWrapper = { currentTime: 0, play: () => { playSound("explosion", 80); return Promise.resolve(); } };
     const hitWrapper = { currentTime: 0, play: () => { playSound("hitHurt", 50); return Promise.resolve(); } };
     
     handleBulletCollisions(bullets, true, sfxWrapper, { value: score }, document.getElementById("score"), module.zombiesData || zombiesData, canvas, hitWrapper, player, effects);
     setScore(parseInt(document.getElementById("score").textContent.replace(/\D/g, "")) || 0);
  });
  
  updateProjectiles(canvas, timeScale);
  updateWaveLogic();
  autoReload();

  handlePlayerCollisions(player, updateHUD, startDeathSequence);
  handleProjectilePlayerCollision(player, updateHUD, startDeathSequence);

  if (!waveSpawning && enemies.length === 0) {
    if (!waveClearTimeout) {
      waveClearTimeout = setTimeout(() => {
        waveClearTimeout = null;
        
        let reward = 5;
        if ((currentWave + 1) % 3 === 0) reward += 5;
        
        addSessionCoins(reward);
        spawnFloatingText(player.x, player.y - 50, `+${reward} Coins!`, "gold", 20);
        playSound("powerUp"); 

        if ((currentWave + 2) % 5 === 0) {
             spawnFloatingText(player.x, player.y - 80, "Reinforcements Incoming...", "#4fc3f7", 14);
        }

        if ((currentWave + 1) % 3 === 0 && !upgradeScreenShown) {
          setPaused(true);
          pausePowerups();
          openUpgradeScreen(() => {
            setPaused(false);
            resumePowerups();
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

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  if (shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * shakeAmount;
      const sy = (Math.random() - 0.5) * shakeAmount;
      ctx.translate(sx, sy);
      shakeAmount *= 0.9; 
      if (shakeAmount < 0.5) shakeAmount = 0;
  }

  ctx.save();
  ctx.scale(zoom, zoom);
  drawMap(ctx, camera);
  
  if (player.dashActive && !player.isDead) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = player.cosmetics.bodyColor || "cyan"; 
      ctx.fillRect(Math.round(player.x - camera.x - input.move.x*15), Math.round(player.y - camera.y - input.move.y*15), player.width, player.height);
      ctx.fillRect(Math.round(player.x - camera.x - input.move.x*30), Math.round(player.y - camera.y - input.move.y*30), player.width, player.height);
      ctx.globalAlpha = 1.0;
  }

  if (player.isWinning) {
      ctx.save();
      for(let c of confetti) {
          ctx.translate(c.x - camera.x, c.y - camera.y);
          ctx.rotate(c.rotation);
          ctx.fillStyle = c.color;
          ctx.fillRect(-c.size/2, -c.size/2, c.size, c.size);
          ctx.rotate(-c.rotation);
          ctx.translate(-(c.x - camera.x), -(c.y - camera.y));
      }
      ctx.restore();
  }

  if (player.isDead) {
      ctx.save();
      const px = player.x - camera.x + player.width / 2;
      const py = player.y - camera.y + player.height / 2;
      ctx.translate(px, py);
      
      const progress = 1 - (player.deathTimer / 120);
      const rotation = Math.pow(progress, 3) * 30; 
      ctx.rotate(rotation);
      
      let scale = 1;
      if (player.deathTimer > 40) { scale = 1 + Math.sin(player.deathTimer) * 0.1; } 
      else { scale = Math.max(0, player.deathTimer / 40); }
      ctx.scale(scale, scale);
      
      if (player.deathTimer > 60) { ctx.globalAlpha = 0.6 + Math.random() * 0.4; }

      const dummyPlayer = { ...player, x: -player.width/2, y: -player.height/2 };
      const dummyCamera = { x: 0, y: 0 }; 
      drawPlayer(ctx, dummyPlayer, {x:0, y:0}, {x:0, y:0}, dummyCamera);
      ctx.restore();

  } else if (player.isWinning) {
      ctx.save();
      const px = player.x - camera.x + player.width / 2;
      const py = player.y - camera.y + player.height / 2;
      ctx.translate(px, py);
      
      const jumpOffset = Math.sin(player.victoryTimer * 0.2) * 20; 
      ctx.translate(0, jumpOffset);
      ctx.rotate(Math.sin(player.victoryTimer * 0.1) * 0.2);
      
      const dummyPlayer = { ...player, x: -player.width/2, y: -player.height/2 };
      const dummyCamera = { x: 0, y: 0 }; 
      drawPlayer(ctx, dummyPlayer, {x:0, y:0}, {x:0, y:0}, dummyCamera);
      
      ctx.fillStyle = "gold";
      ctx.font = "20px 'Press Start 2P', sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.strokeText("VICTORY!", 0, -50);
      ctx.fillText("VICTORY!", 0, -50);
      
      ctx.restore();

  } else {
      drawPlayer(ctx, player, input.aim, input.move, camera);
      
      if (player.hurtTime && player.hurtTime > 0) {
          ctx.save();
          ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
          ctx.fillRect(player.x - camera.x, player.y - camera.y, player.width, player.height);
          ctx.restore();
      }
  }

  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (b.active) {
      const bx = b.x - camera.x;
      const by = b.y - camera.y;
      if (!Number.isFinite(bx) || !Number.isFinite(by)) continue; 
      const styleDef = getBulletStyleDef(b.color); 
      ctx.shadowColor = styleDef.color; ctx.shadowBlur = 10;
      if (styleDef.type === "gradient") {
          const grad = ctx.createLinearGradient(bx - b.width, by - b.width, bx + b.width, by + b.width);
          if (styleDef.colors && styleDef.colors.length > 0) { styleDef.colors.forEach((c, idx) => grad.addColorStop(idx / (styleDef.colors.length - 1), c)); } 
          else { grad.addColorStop(0, "white"); }
          ctx.fillStyle = grad;
      } else { ctx.fillStyle = styleDef.color; }
      ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(bx, by, b.width, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1.0; ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(bx, by, b.width / 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; 
    }
  }

  drawEnemies(ctx, camera, 0.6);
  drawProjectiles(ctx, camera);
  
  for (const exp of explosions) {
      ctx.globalAlpha = exp.life;
      ctx.fillStyle = exp.color;
      ctx.beginPath();
      const currentRadius = exp.size * (1 - exp.life * 0.5); 
      ctx.arc(exp.x - camera.x, exp.y - camera.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  drawAndHandlePowerups(ctx, player, updateHUD, true, sounds.powerUp, undefined, camera, (type) => {
      usedPowerup = true; powerupsCollected++; updateAchievement("5", 1); 
      if (powerupsCollected >= 20) { updateAchievement("6", 1); }
  });
  
  drawPlayerIndicator(ctx, player, input.aim, camera);
  
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 0.5 * timeScale; ft.life -= 1 * timeScale;
      ctx.globalAlpha = Math.max(0, ft.life / 40);
      ctx.fillStyle = ft.color;
      ctx.font = `${ft.size}px 'Press Start 2P', sans-serif`;
      ctx.strokeStyle = "black"; ctx.lineWidth = 3;
      const dx = ft.x - camera.x; const dy = ft.y - camera.y;
      ctx.strokeText(ft.text, dx, dy); ctx.fillText(ft.text, dx, dy);
      if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
  ctx.globalAlpha = 1.0;

  ctx.restore(); ctx.restore(); 
  try { updatePowerupHUD(player); } catch (e) {}
  
  requestAnimationFrame(gameLoop);
}

function checkNextWave() {
  upgradeScreenShown = false;
  updateAchievement("4", currentWave + 1);
  const success = startWave(currentWave + 1);
  if (!success) {
      startVictorySequence();
  }
}

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
  
  initInput(canvas, { 
      onShoot: (x, y) => playerShoot(x, y, camera, zoom), 
      onReload: playerTryReload 
  });
  
  startWave(0);
  
  lastTime = 0; 
  requestAnimationFrame(gameLoop);
}

function resetGame() {
  if (waveClearTimeout) { 
    clearTimeout(waveClearTimeout); 
    waveClearTimeout = null; 
  }
  
  resetSessionCoins(); 

  let savedBody = localStorage.getItem("equippedBodyColor") || "cyan";
  if (savedBody === "green") savedBody = "lime"; 

  player.cosmetics.bodyColor = savedBody;
  player.cosmetics.hatStyle = localStorage.getItem("equippedHatStyle") || "none";
  player.cosmetics.eyeStyle = localStorage.getItem("equippedEyeStyle") || "normal";
  player.cosmetics.indicatorStyle = localStorage.getItem("equippedIndicatorStyle") || "dot";
  player.cosmetics.bulletStyle = localStorage.getItem("equippedBulletStyle") || "default";

  resetPlayerState();
  
  const safeCosmetics = { ...player.cosmetics };
  resetPlayer(canvas); 
  player.cosmetics = safeCosmetics; 

  resetEnemies();
  resetWaveState();
  resetPowerups();
  updateHUD();
  usedPowerup = false;
  powerupsCollected = 0;
  shakeAmount = 0;
  floatingTexts = [];
  explosions = []; 
  confetti = []; 
}

function endGame(victory = false) {
  setGameRunning(false);
  const finalScore = document.getElementById("finalScore");
  finalScore.innerHTML = (victory ? "You Win!<br>" : "Your Score: ") + score + "<br><br><span style='color:gold'>Coins Earned: " + sessionCoins + "</span>";
  document.getElementById("gameOver").style.display = "flex";
  backgroundMusic.pause();
  
  if (victory && !usedPowerup) {
      updateAchievement("1", 1);
  }
  
  if (!victory) playSound("game-over"); 
  
  toggleGameUI(false);
  resetPowerups();
  
  const wBtn = document.getElementById("wardrobeBtn");
  if(wBtn) wBtn.style.display = "none";
}

function quitGame() { 
  playSound("select"); 
  window.close(); 
}

function restartGame() { 
  setPaused(false); 
  hidePauseOverlay(); 
  
  saveGameEconomy();
  
  startGame(); 
}

function backToMenu() {
  setPaused(false); 
  hidePauseOverlay();
  setGameRunning(false);
  
  saveGameEconomy(); 
  resetSessionCoins(); 

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
  
  const wBtn = document.getElementById("wardrobeBtn");
  if(wBtn) wBtn.style.display = "flex";
  
  const wCoin = document.getElementById("wardrobeCoins");
  if(wCoin) wCoin.textContent = "Coins: " + (parseInt(localStorage.getItem("zombieCoins")) || 0);
}

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
  pausePowerups();
  showPauseOverlay();
  backgroundMusic.pause();
}

function resumeGame() {
  if (!paused) return;
  setPaused(false);
  resumePowerups();
  hidePauseOverlay();
  if(musicEnabled) backgroundMusic.play().catch(()=>{});
  lastTime = 0; 
  requestAnimationFrame(gameLoop);
}

// --- CONTROLS & SETTINGS ---

const musicSlider = document.getElementById("musicSlider");
if(musicSlider) {
    musicSlider.addEventListener("input", () => {
        backgroundMusic.volume = musicSlider.value / 100;
        localStorage.setItem("musicVolume", musicSlider.value / 100);
    });
}

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

function openSettings() { 
  const m = document.getElementById("menu"); 
  if (m) m.style.display = "none"; 
  const s = document.getElementById("settings"); 
  if (s) s.style.display = "flex"; 
  hideAllSections(); 
  showMainButtons(); 
  playSound("select"); 
}

function closeSettings() { 
  const s = document.getElementById("settings"); 
  if (s) s.style.display = "none"; 
  const m = document.getElementById("menu"); 
  if (m) m.style.display = "flex"; 
  playSound("select"); 
}

function openAudio() { 
  hideMainButtons(); 
  const a = document.getElementById("audioPanel"); 
  if (a) a.style.display = "block"; 
  playSound("select"); 
}

function backAudio() { 
  const a = document.getElementById("audioPanel"); 
  if (a) a.style.display = "none"; 
  showMainButtons(); 
  playSound("select"); 
}

function openControl() { 
  openPanel('controlPanel'); 
  playSound("select"); 
}

function backControl() { 
  closePanel('controlPanel'); 
  playSound("select"); 
}

function openCredit() { 
  openPanel('creditsPanel'); 
  playSound("select"); 
}

function backCredit() { 
  closePanel('creditsPanel'); 
  playSound("select"); 
}

function hideAllSections() { 
  ["audioSection", "controlSection", "creditSection"].forEach(id => { 
    const el = document.getElementById(id); 
    if (el) el.style.display = "none"; 
  }); 
}

function hideMainButtons() { 
  ["audioSetting", "controlSetting", "howToPlay", "close-setting"].forEach(id => { 
    const el = document.getElementById(id); 
    if (el) el.style.display = "none"; 
  }); 
}

function showMainButtons() { 
  ["audioSetting", "controlSetting", "howToPlay", "close-setting"].forEach(id => { 
    const el = document.getElementById(id); 
    if (el) el.style.display = "flex"; 
  }); 
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      const btn = document.getElementById("fullscreenBtn"); 
      if (btn) btn.classList.add("fullscreen-active");
    }).catch(()=>{});
  } else {
    document.exitFullscreen().then(() => {
      const btn = document.getElementById("fullscreenBtn"); 
      if (btn) btn.classList.remove("fullscreen-active");
    }).catch(()=>{});
  }
}

// --- Global Assignments ---
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

window.addEventListener("DOMContentLoaded", () => {
  initUI();
  toggleGameUI(false);
  loadAchievements();
  initPathfinding();
  
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  showMenuBackground();
  toggleAnimation(true);
});

// NEW: Save coins on close/refresh
window.addEventListener("beforeunload", () => {
  saveGameEconomy();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (!paused && gameRunning) pauseGame();
    else if (paused) resumeGame();
  }
});

const pauseBtn = document.getElementById("pauseBtn");
if (pauseBtn) pauseBtn.onclick = pauseGame;