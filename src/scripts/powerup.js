/* src/scripts/powerup.js */
import { checkCollision } from "./map.js";
import { worldWidth, worldHeight, player } from "./state.js"; 
import { playSound } from "./audio.js"; 

export let activePowerups = [];
export let powerups = [];
export let powerupRoulettes = []; // Queue system

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
export function pausePowerups() {
    const now = Date.now();
    activePowerups.forEach(p => {
        p.remaining = p.expireTime - now; 
    });
}

export function resumePowerups() {
    const now = Date.now();
    activePowerups.forEach(p => {
        if (p.remaining) {
            p.expireTime = now + p.remaining; 
            delete p.remaining;
        }
    });
}

export function updatePowerupHUD(playerRef) {
  if (!powerupHUD) return;
  powerupHUD.innerHTML = "";
  const now = Date.now();
  
  // Clean up expired
  activePowerups = activePowerups.filter(p => {
      if (p.remaining) return true; 
      return p.expireTime > now;
  });

  // Sync State flags
  if (playerRef) {
      playerRef.doubleDamage = activePowerups.some(p => p.type === "Double");
      playerRef.immune = activePowerups.some(p => p.type === "Immune");
      playerRef.tripleShot = activePowerups.some(p => p.type === "Triple");
      playerRef.alwaysCrit = activePowerups.some(p => p.type === "Critical");
      playerRef.piercingShot = activePowerups.some(p => p.type === "Piercing");
      playerRef.explosiveShot = activePowerups.some(p => p.type === "Explosive");
      playerRef.timeSlowed = activePowerups.some(p => p.type === "TimeSlow");
      playerRef.whirlwind = activePowerups.some(p => p.type === "Whirlwind");
  }

  // Draw HUD Elements
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
  const def = powerupTypes.find(p => p.label === type);
  return def ? def.color : "#fff";
}

// --- Powerup Definitions ---
export const powerupTypes = [
  {
    label: "Ammo", color: "#4fc3f7",
    effect: (p, updateAmmo) => {
      p.reserveAmmo += 60;
      if (updateAmmo) updateAmmo();
    }
  },
  {
    label: "Health", color: "#66bb6a",
    effect: (p, _, __, updateHP) => {
      if (p.health < p.maxHealth) {
        p.health = Math.min(p.maxHealth, p.health + 20);
        if (updateHP) updateHP();
      }
    }
  },
  {
    label: "Double", color: "#ffeb3b",
    effect: (p) => { applyTimedPowerup(p, "Double"); }
  },
  {
    label: "Immune", color: "#00e5ff",
    effect: (p) => { applyTimedPowerup(p, "Immune"); }
  },
  {
    label: "Triple", color: "#536dfe",
    effect: (p) => { applyTimedPowerup(p, "Triple"); }
  },
  {
    label: "Critical", color: "#ff1744",
    effect: (p) => { applyTimedPowerup(p, "Critical"); }
  },
  {
    label: "Piercing", color: "#eeeeee",
    effect: (p) => { applyTimedPowerup(p, "Piercing"); }
  },
  {
    label: "Explosive", color: "#ff6d00",
    effect: (p) => { applyTimedPowerup(p, "Explosive"); }
  },
  {
    label: "TimeSlow", color: "#9c27b0", // Purple
    effect: (p) => { applyTimedPowerup(p, "TimeSlow"); }
  },
  {
    label: "Whirlwind", color: "#81d4fa", // Light Blue
    effect: (p) => { applyTimedPowerup(p, "Whirlwind"); }
  },
  {
    label: "MaxAmmo", color: "#b0bec5",
    effect: (p, updateAmmo) => {
      p.ammo = p.magazineSize;
      p.reserveAmmo = Math.max(p.reserveAmmo, 100);
      if (updateAmmo) updateAmmo();
    }
  }
];

function applyTimedPowerup(playerRef, typeName) {
  const duration = (typeName === "TimeSlow") ? 5000 : 10000; 
  const expire = Date.now() + duration;
  activePowerups = activePowerups.filter(p => p.type !== typeName);
  activePowerups.push({ type: typeName, expireTime: expire });
  updatePowerupHUD(playerRef); 
}

// --- SPAWNING LOGIC ---
export function spawnPowerups() {
  powerups.length = 0;
  const count = 2 + Math.floor(Math.random() * 3); 
  const pSize = 20; 
  const spawnRadius = 1000;

  for (let i = 0; i < count; i++) {
    let x, y;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 20) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * (spawnRadius - 300);
        x = player.x + Math.cos(angle) * dist;
        y = player.y + Math.sin(angle) * dist;
        x = Math.max(50, Math.min(worldWidth - 50, x));
        y = Math.max(50, Math.min(worldHeight - 50, y));

        if (!checkCollision(x, y, pSize, pSize)) valid = true;
        attempts++;
    }

    if (valid) {
        powerups.push({
            x: x, y: y,
            width: pSize, height: pSize,
            animOffset: Math.random() * Math.PI * 2
        });
    }
  }
}

// --- MAIN LOOP ---
export function drawAndHandlePowerups(ctx, playerRef, updateAmmo, sfxEnabled, powerUpSound, updateHP, camera, onPick) {
  const time = performance.now();

  updateAndDrawRoulettes(ctx, playerRef, camera, updateAmmo, updateHP, sfxEnabled, powerUpSound, onPick);

  let nearestDist = Infinity;
  let nearestItem = null;

  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i];
    
    const dist = Math.hypot(p.x - playerRef.x, p.y - playerRef.y);
    if (dist < nearestDist) {
        nearestDist = dist;
        nearestItem = p;
    }

    if (
      playerRef.x < p.x + p.width + 5 && playerRef.x + playerRef.width > p.x - 5 &&
      playerRef.y < p.y + p.height + 5 && playerRef.y + playerRef.height > p.y - 5
    ) {
      startRoulette(playerRef);
      powerups.splice(i, 1);
      continue;
    }
    
    drawMysteryCrate(ctx, p, camera, time);
  }

  if (nearestItem) {
      drawEdgeTracker(ctx, playerRef, nearestItem, camera, time);
  }

  // Removed internal call to drawActiveBuffs to allow external rendering (e.g. for color/grayscale separation)
}

// --- VISUALS: ACTIVE BUFFS ---
export function drawActiveBuffs(ctx, playerRef, camera, time) {
    const cx = playerRef.x + playerRef.width / 2 - camera.x;
    const cy = playerRef.y + playerRef.height / 2 - camera.y;

    if (activePowerups.some(p => p.type === "Triple")) {
        const orbitSpeed = time / 150;
        const radius = 40;
        ctx.fillStyle = "#536dfe";
        ctx.shadowColor = "#536dfe"; ctx.shadowBlur = 10;
        for (let i = 0; i < 3; i++) {
            const angle = orbitSpeed + (i * (Math.PI * 2 / 3));
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle)*radius, cy + Math.sin(angle)*radius, 5, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    if (activePowerups.some(p => p.type === "Double")) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time / 200);
        ctx.strokeStyle = `rgba(255, 235, 59, 0.6)`;
        ctx.lineWidth = 2;
        const size = 50 + Math.sin(time/100) * 5;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI/2);
            ctx.moveTo(-size/2, -size/2);
            ctx.lineTo(0, -size/2 - 10);
            ctx.lineTo(size/2, -size/2);
        }
        ctx.stroke();
        ctx.restore();
    }

    if (activePowerups.some(p => p.type === "Piercing")) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time / -100);
        ctx.strokeStyle = "rgba(220, 220, 220, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const r = 45;
        for(let i=0; i<8; i++) {
            const a = (i/8) * Math.PI * 2;
            ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            ctx.lineTo(Math.cos(a + 0.4)*(r+10), Math.sin(a + 0.4)*(r+10));
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    if (activePowerups.some(p => p.type === "Explosive")) {
        const orbitSpeed = time / 250;
        const radius = 55;
        ctx.fillStyle = "#ff6d00";
        ctx.shadowColor = "red"; ctx.shadowBlur = 10;
        for (let i = 0; i < 2; i++) {
            const angle = orbitSpeed + (i * Math.PI);
            const mx = cx + Math.cos(angle) * radius;
            const my = cy + Math.sin(angle) * radius;
            ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // --- NEW: PRECISION HUNTER EFFECT (Replacing Old Squares) ---
    if (activePowerups.some(p => p.type === "Critical")) {
        ctx.save();
        ctx.translate(cx, cy);
        
        // Rotating Tactical Ring
        const angle = time / 300;
        ctx.rotate(angle);
        ctx.strokeStyle = "#ff1744"; // Neon Red
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ff1744";
        ctx.shadowBlur = 12; // Glow effect
        
        // Dashed Target Circle
        ctx.setLineDash([10, 15]); 
        ctx.beginPath();
        const r = 50 + Math.sin(time / 100) * 5; // Pulsing
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner Crosshairs
        ctx.setLineDash([]); // Solid lines
        ctx.beginPath();
        const len = 10;
        // North
        ctx.moveTo(0, -r); ctx.lineTo(0, -r + len);
        // South
        ctx.moveTo(0, r); ctx.lineTo(0, r - len);
        // West
        ctx.moveTo(-r, 0); ctx.lineTo(-r + len, 0);
        // East
        ctx.moveTo(r, 0); ctx.lineTo(r - len, 0);
        ctx.stroke();

        ctx.restore();
    }

    if (activePowerups.some(p => p.type === "Immune")) {
        drawImmunityShield(ctx, playerRef, camera); 
    }

    if (activePowerups.some(p => p.type === "TimeSlow")) {
        // Simple visual: Purple aura or clock
        ctx.save();
        ctx.translate(cx, cy);
        const ringScale = 1 + Math.sin(time / 300) * 0.1;
        ctx.scale(ringScale, ringScale);
        ctx.strokeStyle = "rgba(156, 39, 176, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 54, 0, Math.PI * 2); // Increased from 45 (45 * 1.2 = 54)
        ctx.stroke();
        
        // Clock hand
        ctx.rotate(time / 500);
        ctx.beginPath(); // Added beginPath for safety
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -48); // Increased from 40 (40 * 1.2 = 48)
        ctx.stroke();
        ctx.restore();
    }

    if (activePowerups.some(p => p.type === "Whirlwind")) {
        ctx.save();
        ctx.translate(cx, cy);
        const spin = time / 100;
        ctx.rotate(spin);
        ctx.strokeStyle = "rgba(129, 212, 250, 0.6)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        const r = 84; // Increased from 80
        
        // Inner Ring
        ctx.beginPath(); ctx.arc(0, 0, r - 20, 0, 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r - 20, 3, 5); ctx.stroke();
        
        // Outer Ring
        ctx.rotate(spin * -0.5); // Counter rotate slightly
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r, 1, 3); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r, 4, 6); ctx.stroke();
        
        ctx.restore();
    }
}

export function drawImmunityShield(ctx, playerRef, camera) {
    const cx = playerRef.x + playerRef.width / 2 - camera.x;
    const cy = playerRef.y + playerRef.height / 2 - camera.y;
    const time = performance.now();
    
    const pulse = Math.sin(time / 200) * 0.05 + 1.1; 
    const size = (playerRef.width * 1.3) * pulse;

    ctx.save();
    ctx.translate(cx, cy);
    
    ctx.rotate(time / 500); 
    
    ctx.shadowColor = "rgba(0, 229, 255, 0.9)"; 
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "rgba(200, 255, 255, 0.9)"; 
    ctx.lineWidth = 3;
    ctx.strokeRect(-size/2, -size/2, size, size);
    
    ctx.fillStyle = "rgba(0, 229, 255, 0.1)";
    ctx.fillRect(-size/2, -size/2, size, size);
    
    ctx.rotate(time / -250); 
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "rgba(0, 229, 255, 0.5)"; 
    ctx.lineWidth = 2;
    ctx.strokeRect(-(size*0.7)/2, -(size*0.7)/2, size*0.7, size*0.7);
    
    ctx.shadowBlur = 0;
    ctx.restore();
}

// --- QUEUE SYSTEM / SLOT MACHINE ---
function startRoulette(playerRef) {
    playSound("powerProcess"); 
    
    const queueIndex = powerupRoulettes.length;
    
    powerupRoulettes.push({
        timer: 135, 
        x: playerRef.x,
        y: playerRef.y - 40 - (queueIndex * 25), 
        text: "?",
        color: "#fff",
        finalType: null, 
        done: false,
        offsetY: queueIndex * 25 
    });
}

function updateAndDrawRoulettes(ctx, playerRef, camera, updateAmmo, updateHP, sfxEnabled, powerUpSound, onPick) {
    for (let i = powerupRoulettes.length - 1; i >= 0; i--) {
        let r = powerupRoulettes[i];
        
        r.x = playerRef.x + playerRef.width / 2;
        r.y = playerRef.y - 40 - r.offsetY;

        if (r.timer > 0) {
            r.timer--;
            let spinSpeed = 4;
            if (r.timer < 60) spinSpeed = 8;
            if (r.timer < 30) spinSpeed = 12;

            if (r.timer % spinSpeed === 0) {
                const randomPick = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
                r.text = randomPick.label;
                r.color = randomPick.color;
            }
            ctx.save(); 
            ctx.fillStyle = r.color; 
            ctx.font = "14px 'Press Start 2P'"; 
            ctx.shadowColor = "black"; 
            ctx.shadowBlur = 4; 
            ctx.textAlign = "center"; 
            ctx.fillText(r.text, r.x - camera.x, r.y - camera.y); 
            ctx.restore();
        } else {
            if (!r.done) {
                const result = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
                r.finalType = result; r.text = result.label; r.color = result.color;
                
                result.effect(playerRef, updateAmmo, null, updateHP);
                
                if (onPick) onPick(result.label);
                
                if (sfxEnabled && powerUpSound) { 
                    powerUpSound.currentTime = 0; 
                    powerUpSound.play().catch(()=>{}); 
                }
                
                r.done = true; 
                r.floatTimer = 40; 
            }
            
            r.floatTimer--;
            r.y -= (40 - r.floatTimer) * 0.1;
            
            ctx.save(); 
            ctx.globalAlpha = r.floatTimer / 40; 
            ctx.fillStyle = r.color; 
            ctx.font = "20px 'Press Start 2P'"; 
            ctx.shadowColor = r.color; 
            ctx.shadowBlur = 10; 
            ctx.textAlign = "center"; 
            ctx.fillText(r.text + "!", r.x - camera.x, r.y - camera.y); 
            ctx.restore();
            
            if (r.floatTimer <= 0) powerupRoulettes.splice(i, 1);
        }
    }
}

// --- VISUALS: CRATE (Original Wood) ---
function drawMysteryCrate(ctx, p, camera, time) {
    const cx = p.x - camera.x;
    const cy = p.y - camera.y;
    const size = p.width;
    const bob = Math.sin((time / 200) + p.animOffset) * 3;
    const drawY = cy + bob;

    ctx.fillStyle = "rgba(0,0,0,0.4)"; 
    ctx.beginPath(); 
    ctx.ellipse(cx + size/2, drawY + size + 5, size/1.5, size/4, 0, 0, Math.PI*2); 
    ctx.fill();

    ctx.fillStyle = "#3e2723"; 
    ctx.fillRect(cx, drawY, size, size);

    ctx.fillStyle = "#1b0000"; 
    ctx.beginPath(); 
    ctx.moveTo(cx + size, drawY); 
    ctx.lineTo(cx + size + 5, drawY - 5); 
    ctx.lineTo(cx + size + 5, drawY + size - 5); 
    ctx.lineTo(cx + size, drawY + size); 
    ctx.closePath(); 
    ctx.fill();

    ctx.fillStyle = "#5d4037"; 
    ctx.beginPath(); 
    ctx.moveTo(cx, drawY); 
    ctx.lineTo(cx + 5, drawY - 5); 
    ctx.lineTo(cx + size + 5, drawY - 5); 
    ctx.lineTo(cx + size, drawY); 
    ctx.closePath(); 
    ctx.fill();

    ctx.fillStyle = "#8d6e63"; 
    const b = 4; 
    ctx.fillRect(cx, drawY, size, b); 
    ctx.fillRect(cx, drawY + size - b, size, b); 
    ctx.fillRect(cx, drawY, b, size); 
    ctx.fillRect(cx + size - b, drawY, b, size);

    ctx.fillStyle = "#ffe066"; 
    ctx.shadowColor = "#ffb300"; 
    ctx.shadowBlur = 10; 
    ctx.font = "bold 16px 'Press Start 2P'"; 
    ctx.textAlign = "center"; 
    ctx.textBaseline = "middle"; 
    ctx.fillText("?", cx + size/2 + 2, drawY + size/2); 
    ctx.shadowBlur = 0;
}

// --- VISUALS: TRACKER (Off-screen arrow) ---
function drawEdgeTracker(ctx, playerRef, target, camera, time) {
    const t = ctx.getTransform();
    const zoom = t.a; 
    const logicalW = ctx.canvas.width / zoom;
    const logicalH = ctx.canvas.height / zoom;

    const tx = target.x - camera.x;
    const ty = target.y - camera.y;
    const pad = 50;
    
    if (tx > -pad && tx < logicalW + pad && ty > -pad && ty < logicalH + pad) return;

    const cx = logicalW / 2;
    const cy = logicalH / 2;
    let dx = tx - cx;
    let dy = ty - cy;
    const angle = Math.atan2(dy, dx);

    const edgePad = 40; 
    const halfW = logicalW / 2 - edgePad;
    const halfH = logicalH / 2 - edgePad;
    const scale = Math.min(Math.abs(halfW / dx), Math.abs(halfH / dy));

    const arrowX = cx + dx * scale;
    const arrowY = cy + dy * scale;

    const pulse = 1 + Math.sin(time / 150) * 0.2;
    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#ffe066"; 
    ctx.shadowColor = "black"; ctx.shadowBlur = 4; 
    ctx.strokeStyle = "black"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-10, 10); ctx.lineTo(-10, -10); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
}

export function resetPowerups() {
  activePowerups = [];
  powerups = [];
  powerupRoulettes = [];
  if (powerupHUD) { powerupHUD.innerHTML = ""; powerupHUD.style.display = "none"; }
}