/* src/scripts/powerup.js */
export let activePowerups = [];
export let powerups = []; // Items on the ground

// --- HUD container ---
let powerupHUD = null;

export function initPowerupHUD() {
  if (!powerupHUD) {
    powerupHUD = document.createElement("div");
    powerupHUD.id = "powerupHUD";
    Object.assign(powerupHUD.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: "14px",
      zIndex: 2000,
      fontFamily: "Press Start 2P, sans-serif",
      fontSize: "14px",
      color: "#ffe066",
      textShadow: "2px 2px 6px #000",
      pointerEvents: "none"
    });
    document.body.appendChild(powerupHUD);
  } else {
    powerupHUD.style.display = "flex";
  }
}

export function updatePowerupHUD() {
  if (!powerupHUD) return;
  powerupHUD.innerHTML = "";

  const now = Date.now();
  activePowerups = activePowerups.filter(p => p.expireTime > now);

  activePowerups.forEach(p => {
    const timeLeft = Math.ceil((p.expireTime - now) / 1000);
    const div = document.createElement("div");
    Object.assign(div.style, {
      padding: "6px 10px",
      borderRadius: "6px",
      background: "rgba(0,0,0,0.6)",
      border: `1px solid ${getColorForType(p.type)}`,
      color: getColorForType(p.type)
    });
    div.textContent = `${p.type}: ${timeLeft}s`;
    powerupHUD.appendChild(div);
  });
}

function getColorForType(type) {
  if (type === "Double") return "yellow";
  if (type === "Immune") return "aqua";
  if (type === "Triple") return "violet";
  return "#fff";
}

// --- FIX: Comprehensive Reset Function ---
export function resetPowerups() {
  // 1. Clear active effects
  activePowerups = [];
  
  // 2. Clear items on ground
  powerups = [];

  // 3. Clear HUD
  if (powerupHUD) {
    powerupHUD.innerHTML = "";
    powerupHUD.style.display = "none";
  }
}

export const powerupTypes = [
  {
    type: "ammo",
    color: "blue",
    effect: (player, updateAmmoDisplay, showPowerupMessage) => {
      player.reserveAmmo += 42;
      updatePowerupHUD();
      if (updateAmmoDisplay) updateAmmoDisplay();
      if (showPowerupMessage) showPowerupMessage("+42 Ammo");
    }
  },
  {
    type: "health",
    color: "green",
    effect: (player, _, showPowerupMessage, updateHealthBar) => {
      if (player.health < player.maxHealth) {
        player.health = Math.min(player.maxHealth, player.health + 1);
        updatePowerupHUD();
        if (updateHealthBar) updateHealthBar();
        if (showPowerupMessage) showPowerupMessage("+1 Health");
      } else {
        if (showPowerupMessage) showPowerupMessage("Health Full");
      }
    }
  },
  {
    type: "double",
    color: "yellow",
    effect: (player, _, showPowerupMessage) => {
      const duration = 10000; 
      const expire = Date.now() + duration;
      activePowerups = activePowerups.filter(p => p.type !== "Double");
      activePowerups.push({ type: "Double", expireTime: expire });
      
      player.doubleDamage = true;
      updatePowerupHUD();
      if (showPowerupMessage) showPowerupMessage("Double Damage!");

      setTimeout(() => {
        if (!activePowerups.some(p => p.type === "Double" && p.expireTime > Date.now())) {
          player.doubleDamage = false;
        }
      }, duration);
    }
  },
  {
    type: "immunity",
    color: "aqua",
    effect: (player, _, showPowerupMessage) => {
      const duration = 10000; 
      const expire = Date.now() + duration;
      activePowerups = activePowerups.filter(p => p.type !== "Immune");
      activePowerups.push({ type: "Immune", expireTime: expire });
      
      player.immune = true;
      updatePowerupHUD();
      if (showPowerupMessage) showPowerupMessage("Immune!");

      setTimeout(() => {
        if (!activePowerups.some(p => p.type === "Immune" && p.expireTime > Date.now())) {
          player.immune = false;
        }
      }, duration);
    }
  },
  {
    type: "triple",
    color: "violet",
    effect: (player, _, showPowerupMessage) => {
      const duration = 10000;
      const expire = Date.now() + duration;
      activePowerups = activePowerups.filter(p => p.type !== "Triple");
      activePowerups.push({ type: "Triple", expireTime: expire });
      
      player.tripleShot = true;
      updatePowerupHUD();
      if (showPowerupMessage) showPowerupMessage("Triple Shot!");

      setTimeout(() => {
        if (!activePowerups.some(p => p.type === "Triple" && p.expireTime > Date.now())) {
          player.tripleShot = false;
        }
      }, duration);
    }
  }
];

export function spawnPowerups() {
  powerups.length = 0;
  const count = 2 + Math.floor(Math.random() * 2); 
  for (let i = 0; i < count; i++) {
    const pType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    powerups.push({
      x: Math.random() * (window.innerWidth - 30),
      y: Math.random() * (window.innerHeight - 30),
      width: 24,
      height: 24,
      type: pType
    });
  }
}

export function drawAndHandlePowerups(ctx, player, updateAmmoDisplay, sfxEnabled, powerUpSound, updateHealthBar, camera = { x: 0, y: 0 }) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i];
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y < p.y + p.height &&
      player.y + player.height > p.y
    ) {
      p.type.effect(player, updateAmmoDisplay, showPowerupMessage, updateHealthBar);
      if (updateHealthBar) updateHealthBar();
      powerups.splice(i, 1);
      if (sfxEnabled && powerUpSound) {
        powerUpSound.currentTime = 0;
        powerUpSound.play().catch(()=>{});
      }
    }
  }
  
  powerups.forEach(p => {
    ctx.fillStyle = p.type.color;
    ctx.fillRect(p.x - camera.x, p.y - camera.y, p.width, p.height);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "black";
    ctx.strokeRect(p.x - camera.x, p.y - camera.y, p.width, p.height);
  });
}

let powerupMsgDiv = null;
function showPowerupMessage(msg) {
  if (!powerupMsgDiv) {
    powerupMsgDiv = document.createElement("div");
    powerupMsgDiv.id = "powerupMsgDiv";
    Object.assign(powerupMsgDiv.style, {
        position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
        fontSize: "38px", color: "#ffe066", fontFamily: "Press Start 2P, Arial, sans-serif",
        textShadow: "2px 2px 8px #222", zIndex: 2001, pointerEvents: "none", transition: "opacity 0.3s"
    });
    document.body.appendChild(powerupMsgDiv);
  }
  powerupMsgDiv.textContent = msg;
  powerupMsgDiv.style.opacity = "1";
  setTimeout(() => {
    powerupMsgDiv.style.opacity = "0";
  }, 1200);
}