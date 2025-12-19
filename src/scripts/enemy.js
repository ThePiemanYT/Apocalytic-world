/* src/scripts/enemy.js */
import { 
  handleSummonerAbility, handleJuggernautAbility, handleSpitterDeathSplit, 
  handleThrowerAbility, handleLinkerAbility, handleSniperAbility 
} from "./enemyAbility.js";
import { updateAchievement } from "./achievement.js";
import { camera } from "./camera.js"; 
import { resolveMapCollision, checkCollision } from "./map.js"; 
import { getFlowDirection } from "./pathfinding.js"; 

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
  const lowerType = type.toLowerCase();
  if (lowerType === 'juggernaut') size = 77; 
  else if (lowerType === 'spitter') size = size * 1.1; 
  
  enemy.width = size; enemy.height = size;
  enemy.x = x !== null ? x : Math.random() * (canvasWidth - size);
  enemy.y = y !== null ? y : 0;
  enemy.speed = (zData && zData.speed) ? zData.speed : 2;
  enemy.health = (zData && zData.health) ? zData.health : 4;
  enemy.maxHealth = enemy.health;
  enemy.color = (zData && zData.color) ? zData.color : "#66bb6a";
  enemy.type = type;
  enemy.hitFlash = 0;
  if (type === 'sniper') enemy.sniperState = null;

  enemies.push(enemy);
}

// --- EXPLOSION LOGIC (Updated) ---
export function triggerExplosion(x, y, baseDamage, effects) {
    const blastRadius = 100;
    
    // Calculate Explosion Damage: 30% of base damage, minimum 1
    const explosionDmg = Math.max(1, Math.ceil(baseDamage * 0.3));

    // 1. Visual Effect (Layered for Depth)
    if (effects && effects.spawnExplosion) {
        // Outer Dark Orange
        effects.spawnExplosion(x, y, blastRadius, "rgba(255, 69, 0, 0.4)"); 
        // Middle Orange
        effects.spawnExplosion(x, y, blastRadius * 0.7, "rgba(255, 165, 0, 0.6)");
        // Inner White Core
        effects.spawnExplosion(x, y, blastRadius * 0.35, "rgba(255, 255, 255, 0.9)");
    }

    // 2. Text Effect
    if (effects && effects.spawnText) {
        effects.spawnText(x, y, "BOOM!", "#ff6d00", 16);
    }
    
    // 3. Screen Shake
    if (effects && effects.shake) {
        effects.shake(4);
    }

    // 4. Area Damage (Uses explosionDmg, no crits)
    enemies.forEach(other => {
        const d = Math.hypot(other.x + other.width/2 - x, other.y + other.height/2 - y);
        if (d < blastRadius) {
            other.health -= explosionDmg;
            other.hitFlash = 5;
            
            // Optional: Show damage number for explosion
            if (effects && effects.spawnText) {
                effects.spawnText(other.x + other.width/2, other.y, `-${explosionDmg}`, "#ffcc80", 10);
            }
        }
    });
}

export function updateEnemies(player, canvas, zombiesData, projectilesRef, sfxEnabled, hitHurt, timeScale = 1, ctx = null) {
  // 1. Move Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.dx * timeScale;
    p.y += p.dy * timeScale;
    
    if (checkCollision(p.x, p.y, p.width, p.height)) {
        projectiles.splice(i, 1);
        continue;
    }
    if (p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100) {
        projectiles.splice(i, 1);
    }
  }

  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;

  // 2. Move Enemies
  for (let e of enemies) {
    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    const distToPlayer = Math.hypot(px - ex, py - ey);
    
    let dirX = 0; let dirY = 0;
    const isClose = distToPlayer < 200;
    const hasLOS = isClose && !checkLineOfSight(ex, ey, px, py);

    if (hasLOS && distToPlayer > 0) {
        dirX = (px - ex) / distToPlayer;
        dirY = (py - ey) / distToPlayer;
    } else {
        const flow = getFlowDirection(ex, ey);
        if (flow.x !== 0 || flow.y !== 0) { dirX = flow.x; dirY = flow.y; }
        else if (distToPlayer > 0) { dirX = (px - ex) / distToPlayer; dirY = (py - ey) / distToPlayer; }
    }

    const moveStep = e.speed * timeScale;
    const nextX = e.x + dirX * moveStep;
    const nextY = e.y + dirY * moveStep;

    if (!checkCollision(nextX, nextY, e.width, e.height)) {
        e.x += dirX * moveStep; e.y += dirY * moveStep;
    } else {
        const slideSpeed = moveStep * 1.2; 
        const canSlideX = !checkCollision(e.x + Math.sign(dirX) * slideSpeed, e.y, e.width, e.height);
        const canSlideY = !checkCollision(e.x, e.y + Math.sign(dirY) * slideSpeed, e.width, e.height);

        if (canSlideX && Math.abs(dirX) > 0.1) e.x += Math.sign(dirX) * slideSpeed;
        else if (canSlideY && Math.abs(dirY) > 0.1) e.y += Math.sign(dirY) * slideSpeed;
        else {
            const wiggle = slideSpeed * 0.7;
            if (!checkCollision(e.x + wiggle, e.y + wiggle, e.width, e.height)) { e.x+=wiggle; e.y+=wiggle; }
            else if (!checkCollision(e.x - wiggle, e.y + wiggle, e.width, e.height)) { e.x-=wiggle; e.y+=wiggle; }
        }
    }
    resolveMapCollision(e);
  }

  // 3. Separation
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i]; const b = enemies[j];
      if (Math.abs(a.x - b.x) > 60 || Math.abs(a.y - b.y) > 60) continue;
      let dx = (a.x + a.width/2) - (b.x + b.width/2);
      let dy = (a.y + a.height/2) - (b.y + b.height/2);
      let distSq = dx*dx + dy*dy;
      const minDist = (a.width + b.width) * 0.5;
      if (distSq > 0 && distSq < minDist * minDist) {
        let dist = Math.sqrt(distSq);
        dx /= dist; dy /= dist;
        const overlap = (minDist - dist) / 2;
        a.x += dx * overlap; a.y += dy * overlap;
        b.x -= dx * overlap; b.y -= dy * overlap;
      }
    }
  }

  handleSummonerAbility(enemies, zombiesData, canvas);
  handleJuggernautAbility(enemies, zombiesData, player);
  handleThrowerAbility(enemies, player, projectiles, zombiesData);
  if (handleLinkerAbility) handleLinkerAbility(enemies, ctx, camera);
  if (handleSniperAbility) handleSniperAbility(enemies, player, projectiles);
}

// --- BULLET COLLISION ---
export function handleBulletCollisions(bullets, sfxEnabled, explosionSound, scoreObj, scoreDisplay, zombiesData, canvas, hitHurt, player, effects) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    let enemyHit = false;

    for (let j = 0; j < bullets.length; j++) {
      let b = bullets[j];
      if (!b.active) continue;

      // Handle Piercing: Check if this bullet already hit this enemy
      if (player.piercingShot && b.hitList && b.hitList.includes(e)) continue;

      if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
        let baseDmg = b.damage || 1;
        let hitDmg = baseDmg;
        let isCrit = false;

        // Crit Logic: Only affects hitDmg, NOT baseDmg
        if (player.alwaysCrit || Math.random() < player.critChance) { 
            isCrit = true; 
            hitDmg *= player.critMultiplier; 
        }
        hitDmg = Math.ceil(hitDmg);

        e.health -= hitDmg;
        e.hitFlash = 10;
        enemyHit = true;

        // EXPLOSION LOGIC: Uses baseDmg (No Crit), 30% calculation is inside triggerExplosion
        if (player.explosiveShot) {
            triggerExplosion(e.x + e.width/2, e.y + e.height/2, baseDmg, effects);
        }

        // PIERCING LOGIC
        if (player.piercingShot) {
            if (!b.hitList) b.hitList = [];
            b.hitList.push(e);
            // Don't destroy bullet
        } else {
            b.active = false; 
        }
        
        // Knockback
        const knockback = 5; 
        let kdx = b.dx || 0, kdy = b.dy || 0;
        if(kdx===0 && kdy===0) { kdx=1; }
        const klen = Math.hypot(kdx, kdy);
        e.x += (kdx/klen) * knockback;
        e.y += (kdy/klen) * knockback;
        resolveMapCollision(e);

        if (effects && effects.spawnText) {
             const tx = e.x + e.width/2; const ty = e.y; 
             const color = isCrit ? "#ff3333" : "#fff"; 
             effects.spawnText(tx, ty, isCrit ? `${hitDmg}!` : `${hitDmg}`, color, isCrit ? 20 : 12);
        }
        if (isCrit && effects && effects.shake) { effects.shake(3); }
        
        // Break loop if not piercing (bullet dead)
        if (!player.piercingShot) break; 
      }
    }

    if (enemyHit && sfxEnabled) { hitHurt.currentTime = 0; hitHurt.play().catch(()=>{}); }

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

// ... (Rest of enemy.js: handlePlayerCollisions, etc. - unchanged) ...
export function handlePlayerCollisions(player, updateHealthBar, endGame) {
  const now = Date.now();
  for (let e of enemies) {
    if (player.x < e.x + e.width && player.x + player.width > e.x && player.y < e.y + e.height && player.y + player.height > e.y) {
      if (player.immune) continue;
      if (now - player.lastHitTime >= 1000) {
        player.health -= 1;
        player.lastHitTime = now;
        updateHealthBar();
        if (player.health <= 0) { endGame(); return true; }
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
      player.health -= (p.from === "sniper" ? 2 : 1);
      updateHealthBar();
      projectiles.splice(i, 1);
      if (player.health <= 0) { endGame(); return true; }
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

function checkLineOfSight(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 40); 
    for(let i=1; i < steps; i++) {
        const t = i / steps;
        const lx = x1 + (x2 - x1) * t;
        const ly = y1 + (y2 - y1) * t;
        if (checkCollision(lx, ly, 10, 10)) return true; 
    }
    return false;
}

function shadeColor(color, percent) {
    if(color === "red") return "#cc0000";
    if(color === "blue") return "#0000cc";
    if(color.indexOf("#") === -1) return color; 
    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

function layeredCircle(ctx, r, color, pulse = 0) {
    const mainColor = color || "#666";
    const darkColor = shadeColor(mainColor, -0.3); const lightColor = shadeColor(mainColor, 0.3); 
    ctx.fillStyle = darkColor; ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r + pulse), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mainColor; ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r + pulse - 4), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lightColor; ctx.beginPath(); ctx.arc(-r/3, -r/3, Math.max(0, r/4), 0, Math.PI * 2); ctx.fill();
}

function layeredRect(ctx, w, h, color) {
    const mainColor = color || "#666";
    const darkColor = shadeColor(mainColor, -0.3); const lightColor = shadeColor(mainColor, 0.2);
    ctx.fillStyle = darkColor; ctx.fillRect(-w/2, -h/2, w, h);
    ctx.fillStyle = mainColor; ctx.fillRect(-w/2 + 3, -h/2 + 3, w - 6, h - 6);
    ctx.fillStyle = lightColor; ctx.fillRect(-w/2 + 6, -h/2 + 6, w/2, h/2);
}

function orbitRect(ctx, a, d, s, c) {
  ctx.save(); ctx.rotate(a); const dc = shadeColor(c, -0.2); ctx.fillStyle = dc; ctx.fillRect(d, -s/2, s, s);
  ctx.fillStyle = c; ctx.fillRect(d + 2, -s/2 + 2, s - 4, s - 4); ctx.restore();
}

function orbitTri(ctx, a, d, s, c) {
  ctx.save(); ctx.rotate(a); ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - s, -s / 2); ctx.lineTo(d - s, s / 2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawBasic(ctx, t, hitFlash, color) {
  const pulse = Math.sin(t * 2) * 1.5;
  const driftX = Math.sin(t * 0.7) * 2;
  const driftY = Math.cos(t * 0.9) * 2;
  ctx.translate(driftX, driftY);
  const s = 32 + pulse;
  if (hitFlash) { ctx.fillStyle = "white"; ctx.fillRect(-s/2, -s/2, s, s); } else { layeredRect(ctx, s, s, color || "#ef5350"); }
}

function drawNormal(ctx, t, hitFlash, color) {
  if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill(); } 
  else { layeredCircle(ctx, 18, color || "#66bb6a", Math.sin(t * 2) * 2); for (let i = 0; i < 3; i++) orbitRect(ctx, t + i * 2, 30, 7, "#c8e6c9"); }
}

function drawSpeed(ctx, t, hitFlash, color) {
  if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0,0,13,0,Math.PI*2); ctx.fill(); } 
  else { const c = color || "#29b6f6"; layeredCircle(ctx, 13, c, Math.sin(t * 5)); for (let i = 0; i < 4; i++) orbitTri(ctx, t * 3 + i * 1.6, 26, 10, "#b3e5fc"); }
}

function drawTank(ctx, t, hitFlash, color) {
  const c = color || "#81c784";
  if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0,0,26,0,Math.PI*2); ctx.fill(); } 
  else { layeredCircle(ctx, 26, c, 0); for (let i = 0; i < 4; i++) orbitRect(ctx, t * 0.4 + Math.sin(t + i), 40, 14, "#e8f5e9"); }
}

function drawSummoner(ctx, t, hitFlash, color) {
  const pulse = Math.sin(t * 1.5) * 2;
  const c = color || "#ab47bc";
  if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.fill(); } 
  else { layeredCircle(ctx, 20, c, pulse); ctx.strokeStyle = "#e1bee7"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 38 + pulse, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = "rgba(255, 255, 255, 0.3)"; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); for (let i = 0; i < 3; i++) orbitTri(ctx, -t + i * 2, 44, 12, "#f3e5f5"); }
}

function drawGiant(ctx, t, hitFlash, color) {
  const pulse = Math.sin(t) * 3;
  const c = color || "#ff7043";
  if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0,0,42,0,Math.PI*2); ctx.fill(); } 
  else { layeredCircle(ctx, 42, c, pulse); for (let layer = 0; layer < 2; layer++) { for (let i = 0; i < 4; i++) { orbitRect(ctx, t * (0.3 + layer * 0.15) + i * Math.PI / 2, 56 + layer * 12, 16, layer === 0 ? "#ffccbc" : "#ffab91"); } } }
}

function drawArmored(ctx, t, hitFlash, color) {
  const size = 30; const c = color || "aquamarine";
  if (hitFlash) { ctx.fillStyle = "white"; ctx.fillRect(-size/2, -size/2, size, size); } 
  else { layeredRect(ctx, size, size, c); ctx.save(); ctx.rotate(Math.sin(t) * 0.5); ctx.strokeStyle = shadeColor(c, -0.4); ctx.lineWidth = 5; ctx.strokeRect(-(size+10)/2, -(size+10)/2, size+10, size+10); ctx.restore(); }
}

function drawJuggernaut(ctx, t, hitFlash, color) {
  ctx.rotate(t * 0.5); const size = 70; const c = color || "darkslategrey";
  if (hitFlash) { ctx.fillStyle = "white"; ctx.fillRect(-size/2, -size/6, size, size/3); ctx.fillRect(-size/6, -size/2, size/3, size); } 
  else { layeredRect(ctx, size, size/3, c); layeredRect(ctx, size/3, size, c); const coreC = "#263238"; ctx.fillStyle = coreC; ctx.fillRect(-size/4, -size/4, size/2, size/2); ctx.fillStyle = "#37474f"; ctx.fillRect(-size/4 + 4, -size/4 + 4, size/2 - 8, size/2 - 8); ctx.fillStyle = "#cfd8dc"; const dot = 4; ctx.fillRect(-size/2 + 2, -size/6 + 2, dot, dot); ctx.fillRect(size/2 - 6, -size/6 + 2, dot, dot); ctx.fillRect(-size/6 + 2, -size/2 + 2, dot, dot); ctx.fillRect(-size/6 + 2, size/2 - 6, dot, dot); }
}

function drawSpitter(ctx, t, hitFlash, color, radius) {
  const coreSize = Math.max(10, radius - 2); const pulse = Math.sin(t * 8) * (radius / 6); const c = color || "red";
  if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0,0,coreSize,0,Math.PI*2); ctx.fill(); } 
  else { layeredCircle(ctx, coreSize, c, pulse); const pCount = 4; const orbitDist = radius * 1.5 - (Math.abs(Math.sin(t * 2)) * (radius / 2)); for(let i=0; i<pCount; i++) { const ang = t + (i * Math.PI * 2 / pCount); ctx.fillStyle = shadeColor(c, 0.4); ctx.beginPath(); ctx.arc(Math.cos(ang)*orbitDist, Math.sin(ang)*orbitDist, radius/5, 0, Math.PI*2); ctx.fill(); } }
}

function drawThrower(ctx, t, hitFlash, color) {
  const c = color || "burlywood";
  if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.fill(); } 
  else { layeredCircle(ctx, 20, c, 0); orbitRect(ctx, t * 2, 35, 15, "#a1887f"); }
}

function drawMinion(ctx, t, hitFlash, color) {
   ctx.rotate(Math.sin(t * 10) * 0.5); if(hitFlash) { ctx.fillStyle = "white"; } else { ctx.fillStyle = color || "gray"; }
   ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(10, 0); ctx.lineTo(0, 15); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill();
   if (!hitFlash) { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill(); }
}

function drawLinker(ctx, t, hitFlash, color) {
    ctx.rotate(t * 1.5); const s = 45; const w = 15; const c = color || "#00e676";
    if (hitFlash) { ctx.fillStyle = "white"; ctx.fillRect(-s/2, -w/2, s, w); ctx.fillRect(-w/2, -s/2, w, s); } 
    else { const dark = shadeColor(c, -0.2); const light = shadeColor(c, 0.3); ctx.fillStyle = dark; ctx.fillRect(-s/2, -w/2, s, w); ctx.fillRect(-w/2, -s/2, w, s); ctx.fillStyle = c; ctx.fillRect(-s/2+2, -w/2+2, s-4, w-4); ctx.fillRect(-w/2+2, -s/2+2, w-4, s-4); ctx.fillStyle = light; ctx.fillRect(-w/2+4, -w/2+4, w-8, w-8); }
}

function drawSniper(ctx, t, hitFlash, color, e) {
    let rotation = 0; if (e.sniperState && e.sniperState.angle) { rotation = e.sniperState.angle; } else { rotation = t; } ctx.rotate(rotation); const c = color || "#ff1744";
    if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-15, 15); ctx.lineTo(-7, 0); ctx.lineTo(-15, -15); ctx.closePath(); ctx.fill(); } 
    else { ctx.fillStyle = shadeColor(c, -0.3); ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-16, 16); ctx.lineTo(-8, 0); ctx.lineTo(-16, -16); ctx.closePath(); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-13, 13); ctx.lineTo(-6, 0); ctx.lineTo(-13, -13); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#ff5252"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill(); }
    if (!hitFlash && e.sniperState && e.sniperState.phase === 'aim') { const timeInPhase = Date.now() - e.sniperState.timer; ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255, 0, 0, 0.8)"; if (timeInPhase > 1500) { ctx.lineWidth = Math.random() > 0.5 ? 3 : 1; ctx.strokeStyle = "rgba(255, 50, 50, 1.0)"; } ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(1200, 0); ctx.stroke(); ctx.restore(); }
}

export function drawEnemies(ctx, camera = { x: 0, y: 0 }, scale = 1) {
  const t = performance.now() / 1000;
  for (let e of enemies) {
    ctx.save();
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
    else if (type === 'spitter' || type === 'spitter1') drawSpitter(ctx, t, isFlashing, c, radius);
    else if (type === 'thrower') drawThrower(ctx, t, isFlashing, c);
    else if (type === 'minion') drawMinion(ctx, t, isFlashing, c);
    else if (type === 'linker') drawLinker(ctx, t, isFlashing, c);
    else if (type === 'sniper') drawSniper(ctx, t, isFlashing, c, e);
    else drawBasic(ctx, t, isFlashing, c); 
    ctx.restore();

    if (e.maxHealth > 1) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      const barW = Math.max(30, e.width); const barH = 5; const barY = - (e.height/2 + 10); 
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-barW/2, barY, barW, barH);
      ctx.fillStyle = "#ffe066"; ctx.fillRect(-barW/2, barY, barW * (e.health / e.maxHealth), barH);
      ctx.restore();
    }
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
        ctx.rotate(t); ctx.fillStyle = "#5d4037"; ctx.beginPath(); ctx.moveTo(p.width/2, 0); ctx.lineTo(p.width*0.2, p.width*0.4); ctx.lineTo(-p.width*0.3, p.width*0.3); ctx.lineTo(-p.width/2, -p.width*0.1); ctx.lineTo(0, -p.width*0.4); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#8d6e63"; ctx.beginPath(); ctx.arc(0,0, p.width/3, 0, Math.PI*2); ctx.fill();
    } else if (isSniper) {
        ctx.fillStyle = "red"; ctx.shadowBlur = 10; ctx.shadowColor = "red"; ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height); ctx.shadowBlur = 0; ctx.fillStyle = "white"; ctx.fillRect(-p.width/4, -p.height/4, p.width/2, p.height/2);
    } else {
        ctx.fillStyle = p.color || "#a0522d"; ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
    }
    ctx.restore();
  }
}