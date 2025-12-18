/* src/scripts/powerup.js */
export let activePowerups = [];
export let powerups = [];

// --- HUD Container ---
let powerupHUD = null;

export function initPowerupHUD() {
  if (!powerupHUD) {
    powerupHUD = document.createElement("div");
    powerupHUD.id = "powerupHUD";
    Object.assign(powerupHUD.style, {
      position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: "14px", zIndex: 2000, fontFamily: "'Press Start 2P', sans-serif",
      fontSize: "14px", color: "#ffe066", textShadow: "2px 2px 6px #000", pointerEvents: "none"
    });
    document.body.appendChild(powerupHUD);
  } else {
    powerupHUD.style.display = "flex";
  }
}

// --- PAUSE LOGIC ---
// Called when opening Upgrade Screen or Pausing
export function pausePowerups() {
    const now = Date.now();
    activePowerups.forEach(p => {
        p.remaining = p.expireTime - now; // Save remaining time
    });
}

// Called when closing Upgrade Screen or Resuming
export function resumePowerups() {
    const now = Date.now();
    activePowerups.forEach(p => {
        if (p.remaining) {
            p.expireTime = now + p.remaining; // Restore expiration based on new current time
            delete p.remaining;
        }
    });
}

// FIX: Added 'player' parameter to sync stats
export function updatePowerupHUD(player) {
  if (!powerupHUD) return;
  powerupHUD.innerHTML = "";
  const now = Date.now();
  
  // 1. Filter out expired powerups (unless paused)
  activePowerups = activePowerups.filter(p => {
      if (p.remaining) return true; // Keep if paused
      return p.expireTime > now;
  });

  // 2. BUG FIX: Sync Player Flags with Active Powerups
  // This ensures that if it's not in the list, the effect is OFF.
  if (player) {
      player.doubleDamage = activePowerups.some(p => p.type === "Double");
      player.immune = activePowerups.some(p => p.type === "Immune");
      player.tripleShot = activePowerups.some(p => p.type === "Triple");
      player.alwaysCrit = activePowerups.some(p => p.type === "Critical");
  }

  // 3. Draw HUD
  activePowerups.forEach(p => {
    let timeLeft;
    if (p.remaining) {
        timeLeft = Math.ceil(p.remaining / 1000);
    } else {
        timeLeft = Math.ceil((p.expireTime - now) / 1000);
    }
    
    const div = document.createElement("div");
    Object.assign(div.style, {
      padding: "6px 10px", borderRadius: "6px", background: "rgba(0,0,0,0.6)",
      border: `1px solid ${getColorForType(p.type)}`, color: getColorForType(p.type)
    });
    div.textContent = `${p.type}: ${timeLeft}s`;
    powerupHUD.appendChild(div);
  });
}

function getColorForType(type) {
  if (type === "Double") return "yellow";
  if (type === "Immune") return "aqua";
  if (type === "Triple") return "violet";
  if (type === "Critical") return "#ff3333";
  if (type === "MaxAmmo") return "#b0bec5"; 
  return "#fff";
}

// --- Powerup Definitions ---
export const powerupTypes = [
  {
    type: "ammo", color: "blue",
    effect: (player, updateAmmo, showMsg) => {
      player.reserveAmmo += 42;
      if (updateAmmo) updateAmmo();
      if (showMsg) showMsg("+42 Ammo");
    }
  },
  {
    type: "health", color: "green",
    effect: (player, _, showMsg, updateHP) => {
      if (player.health < player.maxHealth) {
        player.health = Math.min(player.maxHealth, player.health + 1);
        if (updateHP) updateHP();
        if (showMsg) showMsg("+1 Health");
      } else {
        if (showMsg) showMsg("Health Full");
      }
    }
  },
  {
    type: "double", color: "yellow",
    effect: (player, _, showMsg) => {
      applyTimedPowerup(player, "Double", "doubleDamage", showMsg, "Double Damage!");
    }
  },
  {
    type: "immunity", color: "aqua",
    effect: (player, _, showMsg) => {
      applyTimedPowerup(player, "Immune", "immune", showMsg, "Immune!");
    }
  },
  {
    type: "triple", color: "violet",
    effect: (player, _, showMsg) => {
      applyTimedPowerup(player, "Triple", "tripleShot", showMsg, "Triple Shot!");
    }
  },
  {
    type: "critical", color: "#ff3333",
    effect: (player, _, showMsg) => {
      applyTimedPowerup(player, "Critical", "alwaysCrit", showMsg, "Max Crit!");
    }
  },
  {
    type: "max_ammo", color: "#b0bec5", 
    effect: (player, updateAmmo, showMsg) => {
      player.ammo = player.magazineSize;
      if (updateAmmo) updateAmmo();
      if (showMsg) showMsg("Max Ammo");
    }
  }
];

function applyTimedPowerup(player, typeName, flagName, showMsg, msgText) {
  const duration = 10000; 
  const expire = Date.now() + duration;
  
  // Remove existing same type to refresh
  activePowerups = activePowerups.filter(p => p.type !== typeName);
  activePowerups.push({ type: typeName, expireTime: expire });
  
  player[flagName] = true;
  updatePowerupHUD(player); // Pass player to sync immediately
  if (showMsg) showMsg(msgText);
}

export function spawnPowerups() {
  powerups.length = 0;
  const count = 2 + Math.floor(Math.random() * 2); 
  for (let i = 0; i < count; i++) {
    const pType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    powerups.push({
      x: Math.random() * (window.innerWidth - 30),
      y: Math.random() * (window.innerHeight - 30),
      width: 24, height: 24, type: pType
    });
  }
}

export function drawAndHandlePowerups(ctx, player, updateAmmo, sfxEnabled, powerUpSound, updateHP, camera, onPick) {
  // 1. Draw and handle pickup items
  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i];
    if (
      player.x < p.x + p.width && player.x + player.width > p.x &&
      player.y < p.y + p.height && player.y + player.height > p.y
    ) {
      p.type.effect(player, updateAmmo, showPowerupMessage, updateHP);
      if (updateHP) updateHP();
      if (onPick) onPick(p.type);
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

  // 2. Draw Active Powerup Visuals (Immunity Shield)
  // FIX: Only draw shield if an "Immune" POWERUP is active.
  const isPowerupImmune = activePowerups.some(p => p.type === "Immune");
  
  if (isPowerupImmune) {
    drawImmunityShield(ctx, player, camera);
  }
}

function drawImmunityShield(ctx, player, camera) {
    const centerX = player.x + player.width / 2 - camera.x;
    const centerY = player.y + player.height / 2 - camera.y;
    
    const time = Date.now();
    const pulse = Math.sin(time / 200) * 0.05 + 1.1; 
    const alphaPulse = Math.sin(time / 300) * 0.15 + 0.75; 

    const baseW = player.width * 1.5;
    const baseH = player.height * 1.5;
    const sW = baseW * pulse;
    const sH = baseH * pulse;
    const depth = 6; 

    ctx.save();
    ctx.translate(centerX, centerY);

    // Glow
    ctx.shadowColor = "rgba(0, 180, 255, 1)";
    ctx.shadowBlur = 20 * pulse;
    ctx.fillStyle = `rgba(0, 100, 255, ${alphaPulse * 0.2})`;
    ctx.fillRect(-sW/2 - 4, -sH/2 - 4, sW + 8, sH + 8);
    ctx.shadowBlur = 0; 

    // Side Faces
    ctx.fillStyle = `rgba(0, 80, 200, ${alphaPulse * 0.7})`;
    ctx.beginPath();
    ctx.moveTo(-sW/2, sH/2); ctx.lineTo(sW/2, sH/2); ctx.lineTo(sW/2 + depth, sH/2 + depth); ctx.lineTo(-sW/2 + depth, sH/2 + depth); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sW/2, -sH/2); ctx.lineTo(sW/2, sH/2); ctx.lineTo(sW/2 + depth, sH/2 + depth); ctx.lineTo(sW/2 + depth, -sH/2 + depth); ctx.closePath(); ctx.fill();

    // Top Face
    const grad = ctx.createLinearGradient(-sW/2, -sH/2, sW/2, sH/2);
    grad.addColorStop(0, `rgba(0, 191, 255, ${alphaPulse * 0.8})`); 
    grad.addColorStop(1, `rgba(135, 206, 250, ${alphaPulse * 0.8})`); 
    ctx.fillStyle = grad;
    ctx.fillRect(-sW/2, -sH/2, sW, sH);

    // Border
    ctx.strokeStyle = `rgba(200, 255, 255, ${alphaPulse + 0.1})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-sW/2, -sH/2, sW, sH);
    
    // Details
    ctx.strokeStyle = `rgba(255, 255, 255, ${alphaPulse * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-sW/2, -sH/2); ctx.lineTo(sW/2, sH/2);
    ctx.moveTo(sW/2, sH/2); ctx.lineTo(sW/2 + depth, sH/2 + depth);
    ctx.moveTo(sW/2, -sH/2); ctx.lineTo(sW/2 + depth, -sH/2 + depth);
    ctx.moveTo(-sW/2, sH/2); ctx.lineTo(-sW/2 + depth, sH/2 + depth);
    ctx.stroke();

    ctx.restore();
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
  setTimeout(() => { powerupMsgDiv.style.opacity = "0"; }, 1200);
}

export function resetPowerups() {
  activePowerups = [];
  powerups = [];
  if (powerupHUD) { 
      powerupHUD.innerHTML = ""; 
      powerupHUD.style.display = "none"; 
  }
}