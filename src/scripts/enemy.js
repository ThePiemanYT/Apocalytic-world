/* src/scripts/enemy.js */
import { 
  handleSummonerAbility, 
  handleJuggernautAbility, 
  handleSpitterDeathSplit, 
  handleThrowerAbility, 
  handleLinkerAbility, 
  handleSniperAbility 
} from "./enemyAbility.js";
import { updateAchievement } from "./achievement.js";
import { camera } from "./camera.js"; 

// Active enemies & pool
export let enemies = [];
const enemyPool = [];
export let projectiles = [];

export function resetEnemies() {
  while(enemies.length > 0) enemyPool.push(enemies.pop());
  projectiles.length = 0;
}

function getFreeEnemy() {
  if (enemyPool.length > 0) return enemyPool.pop();
  return { x: 0, y: 0, width: 40, height: 40, speed: 0, health: 0, maxHealth: 0, color: "red", type: "normal", hitFlash: 0 };
}

export function spawnEnemy(type, zombiesData, canvasWidth, x = null, y = null) {
  const zData = zombiesData[type] || zombiesData["normal"] || zombiesData["basic"]; 
  const enemy = getFreeEnemy();
  
  let size = (zData && zData.size) ? zData.size : 40;
  
  enemy.width = size; enemy.height = size;
  enemy.x = x !== null ? x : Math.random() * (canvasWidth - size);
  enemy.y = y !== null ? y : 0;
  
  enemy.speed = (zData && zData.speed) ? zData.speed : 2;
  enemy.health = (zData && zData.health) ? zData.health : 4;
  enemy.maxHealth = enemy.health;
  enemy.color = (zData && zData.color) ? zData.color : "#66bb6a";
  enemy.type = type;
  enemy.hitFlash = 0;
  
  // Visual scaling props
  enemy._drawWidth = size; 
  enemy._drawHeight = size;
  
  enemies.push(enemy);
}

export function updateEnemies(player, canvas, zombiesData, projectilesRef, sfxEnabled, hitHurt, timeScale = 1, ctx = null) {
  // Move projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.dx * timeScale;
    p.y += p.dy * timeScale;
    if (p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) projectiles.splice(i, 1);
  }

  // Move enemies
  for (let e of enemies) {
    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    let dx = px - ex;
    let dy = py - ey;
    let dist = Math.hypot(dx, dy);
    if (dist > 0) {
      e.x += (dx / dist) * e.speed * timeScale;
      e.y += (dy / dist) * e.speed * timeScale;
    }
  }

  // Separation
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i];
      const b = enemies[j];
      const ax = a.x + a.width / 2;
      const ay = a.y + a.height / 2;
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      let dx = ax - bx;
      let dy = ay - by;
      let dist = Math.hypot(dx, dy);
      const minDist = (a.width + b.width) * 0.5;
      if (dist > 0 && dist < minDist) {
        dx /= dist; dy /= dist;
        const overlap = (minDist - dist) / 2;
        a.x += dx * overlap; a.y += dy * overlap;
        b.x -= dx * overlap; b.y -= dy * overlap;
      }
    }
  }

  // Abilities
  handleSummonerAbility(enemies, zombiesData, canvas);
  handleJuggernautAbility(enemies, zombiesData, player);
  handleThrowerAbility(enemies, player, projectiles, zombiesData);
  
  // New Abilities
  if (handleLinkerAbility) handleLinkerAbility(enemies, ctx, camera);
  if (handleSniperAbility) handleSniperAbility(enemies, player, projectiles, ctx, camera);
}

// --- VISUAL HELPERS ---
function core(ctx, r, color, pulse = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0, r + pulse), 0, Math.PI * 2);
  ctx.fill();
}

function orbitRect(ctx, a, d, s, c) {
  ctx.save();
  ctx.rotate(a);
  ctx.fillStyle = c;
  ctx.fillRect(d, -s / 2, s, s);
  ctx.restore();
}

function orbitTri(ctx, a, d, s, c) {
  ctx.save();
  ctx.rotate(a);
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(d, 0);
  ctx.lineTo(d - s, -s / 2);
  ctx.lineTo(d - s, s / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- ENEMY DRAW FUNCTIONS ---

function drawBasic(ctx, t, hitFlash, color) {
  const pulse = Math.sin(t * 2) * 1.5;
  const driftX = Math.sin(t * 0.7) * 2;
  const driftY = Math.cos(t * 0.9) * 2;
  ctx.translate(driftX, driftY);
  const s = 32 + pulse;
  ctx.fillStyle = hitFlash ? "white" : (color || "#ef5350"); 
  ctx.fillRect(-s/2, -s/2, s, s);
}

function drawNormal(ctx, t, hitFlash, color) {
  core(ctx, 18, hitFlash ? "white" : (color || "#66bb6a"), Math.sin(t * 2) * 2);
  if (!hitFlash) {
    for (let i = 0; i < 3; i++) {
      orbitRect(ctx, t + i * 2, 30, 7, "#c8e6c9");
    }
  }
}

function drawSpeed(ctx, t, hitFlash, color) {
  core(ctx, 13, hitFlash ? "white" : (color || "#29b6f6"), Math.sin(t * 5));
  if (!hitFlash) {
    for (let i = 0; i < 4; i++) {
      orbitTri(ctx, t * 3 + i * 1.6, 26, 10, "#b3e5fc");
    }
  }
}

function drawTank(ctx, t, hitFlash, color) {
  core(ctx, 26, hitFlash ? "white" : (color || "#81c784"), 0);
  if (!hitFlash) {
    for (let i = 0; i < 4; i++) {
      orbitRect(ctx, t * 0.4 + Math.sin(t + i), 40, 14, "#e8f5e9");
    }
  }
}

function drawSummoner(ctx, t, hitFlash, color) {
  const pulse = Math.sin(t * 1.5) * 2;
  core(ctx, 20, hitFlash ? "white" : (color || "#ab47bc"), pulse);
  if (!hitFlash) {
      ctx.strokeStyle = "#e1bee7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 38 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        orbitTri(ctx, -t + i * 2, 44, 12, "#f3e5f5");
      }
  }
}

function drawGiant(ctx, t, hitFlash, color) {
  const pulse = Math.sin(t) * 3;
  core(ctx, 42, hitFlash ? "white" : (color || "#ff7043"), pulse);
  if (!hitFlash) {
    for (let layer = 0; layer < 2; layer++) {
        for (let i = 0; i < 4; i++) {
        orbitRect(
            ctx,
            t * (0.3 + layer * 0.15) + i * Math.PI / 2,
            56 + layer * 12,
            16,
            layer === 0 ? "#ffccbc" : "#ffab91"
        );
        }
    }
  }
}

function drawArmored(ctx, t, hitFlash, color) {
  const size = 30;
  ctx.fillStyle = hitFlash ? "white" : (color || "aquamarine");
  ctx.fillRect(-size/2, -size/2, size, size);
  if (!hitFlash) {
    ctx.save();
    ctx.rotate(Math.sin(t) * 0.5); 
    ctx.strokeStyle = color || "aquamarine";
    ctx.lineWidth = 4;
    ctx.strokeRect(-(size+10)/2, -(size+10)/2, size+10, size+10);
    ctx.restore();
  }
}

function drawJuggernaut(ctx, t, hitFlash, color) {
  ctx.rotate(t * 0.5);
  const size = 50;
  ctx.fillStyle = hitFlash ? "white" : (color || "darkslategrey");
  ctx.fillRect(-size/2, -size/6, size, size/3); 
  ctx.fillRect(-size/6, -size/2, size/3, size); 
  ctx.fillStyle = hitFlash ? "white" : "#222";
  ctx.fillRect(-size/4, -size/4, size/2, size/2);
}

// Spitter (variable size)
function drawSpitter(ctx, t, hitFlash, color, radius) {
  const coreSize = Math.max(10, radius - 2); 
  const pulse = Math.sin(t * 8) * (radius / 6);
  core(ctx, coreSize, hitFlash ? "white" : (color || "red"), pulse);
  
  if (!hitFlash) {
    const pCount = 4;
    const orbitDist = radius * 1.5 - (Math.abs(Math.sin(t * 2)) * (radius / 2));
    
    for(let i=0; i<pCount; i++) {
       const ang = t + (i * Math.PI * 2 / pCount);
       ctx.fillStyle = "rgba(255, 100, 100, 0.7)";
       ctx.beginPath();
       ctx.arc(Math.cos(ang)*orbitDist, Math.sin(ang)*orbitDist, radius/5, 0, Math.PI*2);
       ctx.fill();
    }
  }
}

function drawThrower(ctx, t, hitFlash, color) {
  core(ctx, 20, hitFlash ? "white" : (color || "burlywood"), 0);
  if (!hitFlash) {
    orbitRect(ctx, t * 2, 35, 15, "#a1887f");
  }
}

function drawMinion(ctx, t, hitFlash, color) {
   ctx.rotate(Math.sin(t * 10) * 0.5);
   ctx.fillStyle = hitFlash ? "white" : (color || "gray");
   ctx.beginPath();
   ctx.moveTo(0, -15);
   ctx.lineTo(10, 0);
   ctx.lineTo(0, 15);
   ctx.lineTo(-10, 0);
   ctx.closePath();
   ctx.fill();
}

// --- UPDATED BIGGER NEW ENEMIES ---

function drawLinker(ctx, t, hitFlash, color) {
    ctx.rotate(t * 1.5);
    ctx.fillStyle = hitFlash ? "white" : (color || "#00e676"); 
    // Increased size: 30 -> 45
    const s = 45;
    const w = 15; 
    ctx.fillRect(-s/2, -w/2, s, w);
    ctx.fillRect(-w/2, -s/2, w, s);
}

function drawSniper(ctx, t, hitFlash, color) {
    // Scaled up by ~1.5x
    ctx.fillStyle = hitFlash ? "white" : (color || "#ff1744");
    ctx.beginPath();
    ctx.moveTo(22, 0);       // Was 15
    ctx.lineTo(-15, 15);     // Was -10, 10
    ctx.lineTo(-7, 0);       // Was -5
    ctx.lineTo(-15, -15);    // Was -10, -10
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI*2); // Was 4
    ctx.fill();
}

// Main Draw Function
export function drawEnemies(ctx, camera = { x: 0, y: 0 }, scale = 1) {
  const t = performance.now() / 1000;

  for (let e of enemies) {
    ctx.save();
    
    // Position & Scale
    const centerX = e.x - camera.x + (e.width / 2);
    const centerY = e.y - camera.y + (e.height / 2);

    if (e.hitFlash > 0) e.hitFlash--;
    
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    const type = e.type.toLowerCase();
    const isFlashing = e.hitFlash > 0;
    const c = e.color;
    const radius = e.width / 2;

    if (type === 'basic') drawBasic(ctx, t, isFlashing, c);
    else if (type === 'normal') drawNormal(ctx, t, isFlashing, c);
    else if (type === 'speed' || type === 'fast') drawSpeed(ctx, t, isFlashing, c);
    else if (type === 'tank') drawTank(ctx, t, isFlashing, c);
    else if (type === 'summoner') drawSummoner(ctx, t, isFlashing, c);
    else if (type === 'giant') drawGiant(ctx, t, isFlashing, c);
    
    else if (type === 'armored') drawArmored(ctx, t, isFlashing, c);
    else if (type === 'juggernaut') drawJuggernaut(ctx, t, isFlashing, c);
    
    // Uses radius for drawing size difference
    else if (type === 'spitter' || type === 'spitter1') drawSpitter(ctx, t, isFlashing, c, radius);
    
    else if (type === 'thrower') drawThrower(ctx, t, isFlashing, c);
    else if (type === 'minion') drawMinion(ctx, t, isFlashing, c);
    else if (type === 'linker') drawLinker(ctx, t, isFlashing, c);
    else if (type === 'sniper') drawSniper(ctx, t, isFlashing, c);
    
    else drawBasic(ctx, t, isFlashing, c); 

    // Health Bar
    if (e.maxHealth > 1) {
      const barW = Math.max(30, e.width); 
      const barH = 5;
      const barY = - (e.height/2 + 10); 

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(-barW/2, barY, barW, barH);
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(-barW/2, barY, barW * (e.health / e.maxHealth), barH);
    }

    ctx.restore();
  }
}

export function drawProjectiles(ctx, camera) {
  const t = performance.now() / 200;
  for (let p of projectiles) {
    ctx.save();
    ctx.translate(p.x - camera.x + p.width/2, p.y - camera.y + p.height/2);
    
    const isRock = (p.from === "thrower");
    const isSniper = (p.from === "sniper");
    
    if (isRock) {
        ctx.rotate(t);
        ctx.fillStyle = "#8d6e63"; ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.width/2, 0); ctx.lineTo(p.width*0.2, p.width*0.4); ctx.lineTo(-p.width*0.3, p.width*0.3); ctx.lineTo(-p.width/2, -p.width*0.1); ctx.lineTo(0, -p.width*0.4); ctx.closePath();
        ctx.fill(); ctx.stroke();
    } else if (isSniper) {
        ctx.fillStyle = "red";
        ctx.shadowBlur = 10; ctx.shadowColor = "red";
        ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = p.color || "#a0522d";
        ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
    }
    ctx.restore();
  }
}

// --- COLLISION + LOGIC ---
export function handleBulletCollisions(bullets, sfxEnabled, explosionSound, scoreObj, scoreDisplay, zombiesData, canvas, hitHurt, player, effects) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    let enemyHit = false;

    for (let j = 0; j < bullets.length; j++) {
      let b = bullets[j];
      if (!b.active) continue;

      if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
        let dmg = b.damage || 1;
        let isCrit = false;
        
        if (player.alwaysCrit || Math.random() < player.critChance) {
            isCrit = true;
            dmg *= player.critMultiplier;
        }
        dmg = Math.ceil(dmg);

        e.health -= dmg;
        b.active = false; 
        e.hitFlash = 10;
        enemyHit = true;
        
        // Knockback
        const knockback = 5; 
        let kdx = b.dx || 0, kdy = b.dy || 0;
        if(kdx===0 && kdy===0) { kdx=1; }
        const klen = Math.hypot(kdx, kdy);
        e.x += (kdx/klen) * knockback;
        e.y += (kdy/klen) * knockback;

        if (effects && effects.spawnText) {
             const tx = e.x + e.width/2;
             const ty = e.y;
             const color = isCrit ? "#ff3333" : "#fff";
             const text = isCrit ? `${dmg}!` : `${dmg}`;
             const size = isCrit ? 20 : 12;
             effects.spawnText(tx, ty, text, color, size);
        }
        
        if (isCrit && effects && effects.shake) {
            effects.shake(3);
        }
        break; 
      }
    }

    if (enemyHit && sfxEnabled) {
      hitHurt.currentTime = 0; 
      hitHurt.play().catch(()=>{});
    }

    if (e.health <= 0) {
      handleSpitterDeathSplit(e, enemies, zombiesData, canvas.width);
      const zData = zombiesData[e.type] || zombiesData["normal"] || zombiesData["basic"];
      scoreObj.value += (zData && zData.score) ? zData.score : 10;
      scoreDisplay.textContent = "Score: " + scoreObj.value;
      if (effects && effects.shake) effects.shake(5);
      enemyPool.push(e);
      enemies.splice(i, 1);
      updateAchievement("2", 1);
      if (sfxEnabled) { explosionSound.currentTime = 0; explosionSound.play().catch(()=>{}); }
    }
  }
}

export function handlePlayerCollisions(player, updateHealthBar, endGame) {
  const now = Date.now();
  for (let e of enemies) {
    if (player.x < e.x + e.width && player.x + player.width > e.x && player.y < e.y + e.height && player.y + player.height > e.y) {
      if (player.immune) continue;
      if (now - player.lastHitTime >= 1000) {
        player.health -= 1;
        player.lastHitTime = now;
        updateHealthBar();
        if (player.health <= 0) {
          endGame();
          return true;
        }
      }
    }
  }
  return false;
}

export function handleProjectilePlayerCollision(player, updateHealthBar, endGame) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (player.x < p.x + p.width && player.x + player.width > p.x && player.y < p.y + p.height && player.y + player.height > p.y) {
      if (player.immune) { projectiles.splice(i, 1); continue; }
      player.health -= 1;
      updateHealthBar();
      projectiles.splice(i, 1);
      if (player.health <= 0) {
        endGame();
        return true;
      }
    }
  }
  return false;
}

export function updateProjectiles(canvas, timeScale = 1) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.dx * timeScale;
    p.y += p.dy * timeScale;
    if (p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100) {
      projectiles.splice(i, 1);
    }
  }
}