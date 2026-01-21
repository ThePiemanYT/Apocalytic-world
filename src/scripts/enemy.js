/* src/scripts/enemy.js */
import { 
  handleSummonerAbility, handleJuggernautAbility, handleSplitterDeathSplit, 
  handleThrowerAbility, handleLinkerAbility, handleSniperAbility, handleAcidSpitterAbility
} from "./enemyAbility.js";
import { createBoss, updateBoss, drawBoss } from "./boss.js"; 
import { updateAchievement } from "./achievement.js";
import { addSessionCoins } from "./economy.js"; 
import { camera } from "./camera.js"; 
import { resolveMapCollision, checkCollision } from "./map.js"; 
import { getFlowDirection } from "./pathfinding.js"; 
import { takeDamage } from "./player.js";
import { updateBossBar, hideBossBar } from "./ui.js"; 
import { remotePlayers } from "./state.js"; 

export let enemies = [];
export let projectiles = [];
export let acidPools = []; 

const enemyPool = [];

export function resetEnemies() {
  while(enemies.length > 0) enemyPool.push(enemies.pop());
  projectiles.length = 0;
  acidPools.length = 0; 
  hideBossBar(); 
}

function getFreeEnemy() {
  if (enemyPool.length > 0) return enemyPool.pop();
  return { x: 0, y: 0, width: 40, height: 40, speed: 0, health: 0, maxHealth: 0, color: "red", type: "normal", hitFlash: 0 };
}

export function spawnEnemy(type, zombiesData, canvasWidth, x = null, y = null) {
  if (type === "Sentinel" || type === "Crusher" || type === "Frost-Core Construct" || type === "The Chrono-Thief") {
      const boss = createBoss(type, canvasWidth, 0); 
      enemies.push(boss);
      return;
  }

  const zData = zombiesData[type] || zombiesData["normal"] || zombiesData["basic"]; 
  const enemy = getFreeEnemy();
  
  let size = (zData && zData.size) ? zData.size : 40;
  if (type === "IceBlock") size = 45; // NEW

  const lowerType = type.toLowerCase();
  
  if (lowerType === 'juggernaut') size = 77; 
  else if (lowerType === 'splitter') size = size * 1.1; 
  
  enemy.width = size; enemy.height = size;
  enemy.x = x !== null ? x : Math.random() * (canvasWidth - size);
  enemy.y = y !== null ? y : 0;
  enemy.speed = (zData && zData.speed) ? zData.speed : (type === "IceBlock" ? 0 : 2);
  enemy.health = (zData && zData.health) ? zData.health : (type === "IceBlock" ? 25 : 4);
  enemy.maxHealth = enemy.health;
  enemy.color = (zData && zData.color) ? zData.color : (type === "IceBlock" ? "#e1f5fe" : "#66bb6a");
  enemy.type = type;
  enemy.hitFlash = 0;
  enemy.isBoss = false; 
  if (type === 'sniper') enemy.sniperState = null;

  enemies.push(enemy);
}

export function spawnAcidPool(x, y) {
    acidPools.push({ x, y, radius: 10, maxRadius: 45, timer: 300, damageTimer: 0 });
}

function updateAcidPools(player) {
    for (let i = acidPools.length - 1; i >= 0; i--) {
        let pool = acidPools[i];
        if (pool.radius < pool.maxRadius) pool.radius += 1;
        pool.timer--;
        if (pool.timer <= 0) { acidPools.splice(i, 1); continue; }
        const dist = Math.hypot((player.x + player.width/2) - pool.x, (player.y + player.height/2) - pool.y);
        if (dist < pool.radius) {
            if (pool.damageTimer <= 0) { takeDamage(1); pool.damageTimer = 30; }
        }
        if (pool.damageTimer > 0) pool.damageTimer--;
    }
}

function drawAcidPools(ctx, camera) {
    const t = performance.now() / 200;
    for (let pool of acidPools) {
        const cx = pool.x - camera.x; const cy = pool.y - camera.y;
        ctx.save(); ctx.translate(cx, cy);
        const pulse = Math.sin(t * 2) * 2;
        ctx.globalAlpha = 0.6; ctx.fillStyle = "#76ff03"; ctx.beginPath(); ctx.arc(0, 0, pool.radius + pulse, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.8; ctx.strokeStyle = "#32cb00"; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
    }
    ctx.globalAlpha = 1.0;
}

export function triggerExplosion(x, y, baseDamage, effects, playerRef = null) {
    const blastRadius = 100;
    const explosionDmg = Math.max(1, Math.ceil(baseDamage * 0.3));
    if (effects && effects.playExplosion) effects.playExplosion();
    if (effects && effects.spawnExplosion) {
        effects.spawnExplosion(x, y, blastRadius, "rgba(255, 69, 0, 0.4)"); 
        effects.spawnExplosion(x, y, blastRadius * 0.7, "rgba(255, 165, 0, 0.6)");
    }
    if (effects && effects.spawnText) effects.spawnText(x, y, "BOOM!", "#ff6d00", 16);
    if (effects && effects.shake) effects.shake(4);
    enemies.forEach(other => {
        if (Math.hypot(other.x + other.width/2 - x, other.y + other.height/2 - y) < blastRadius) {
            other.health -= explosionDmg; other.hitFlash = 5;
        }
    });
    if (playerRef && Math.hypot(playerRef.x + playerRef.width/2 - x, playerRef.y + playerRef.height/2 - y) < blastRadius) takeDamage(2);
}

export function updateEnemies(player, canvas, zombiesData, projectilesRef, sfxEnabled, hitHurt, timeScale = 1, ctx = null, effects = null) {
  updateAcidPools(player);

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.dx * timeScale; p.y += p.dy * timeScale;
    if (p.from === "acid") {
        if (Math.hypot(p.x - p.startX, p.y - p.startY) >= p.targetDist || checkCollision(p.x, p.y, p.width, p.height)) {
            spawnAcidPool(p.x, p.y); projectiles.splice(i, 1); continue;
        }
    } else if (checkCollision(p.x, p.y, p.width, p.height)) { projectiles.splice(i, 1); continue; }
    if (p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100) projectiles.splice(i, 1);
  }

  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;

  const allTargets = [{ x: px, y: py, active: !player.isDead }];
  if (remotePlayers) {
      Object.values(remotePlayers).forEach(rp => {
          if (!rp.isDead) allTargets.push({ x: rp.x + rp.width/2, y: rp.y + rp.height/2, active: true });
      });
  }

  const spawnMinion = (type, x, y) => {
      spawnEnemy(type, zombiesData, canvas.width, x, y);
  };

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    
    if (e.isBoss) {
        updateBoss(e, player, projectiles, enemies, effects, timeScale, spawnMinion);
        if (e.state !== "enter" && !e.phaseThroughWalls) {
            resolveMapCollision(e); 
        }
        continue; 
    }

    const ex = e.x + e.width / 2; const ey = e.y + e.height / 2;

    let closestTarget = null;
    let minDist = Infinity;

    allTargets.forEach(t => {
        if (!t.active) return;
        const d = Math.hypot(t.x - ex, t.y - ey);
        if (d < minDist) { minDist = d; closestTarget = t; }
    });

    if (!closestTarget) closestTarget = { x: px, y: py }; 
    const distToTarget = minDist;

    if (e.type === "Exploder" && distToTarget < 60) {
        triggerExplosion(ex, ey, 5, effects, player);
        e.health = 0; enemyPool.push(e); enemies.splice(i, 1); continue; 
    }

    let dirX = 0; let dirY = 0;
    if (distToTarget < 200 && !checkLineOfSight(ex, ey, closestTarget.x, closestTarget.y)) {
        dirX = (closestTarget.x - ex) / distToTarget; dirY = (closestTarget.y - ey) / distToTarget;
    } else {
        const flow = getFlowDirection(ex, ey);
        if (flow.x !== 0 || flow.y !== 0) { dirX = flow.x; dirY = flow.y; }
        else if (distToTarget > 0) { dirX = (closestTarget.x - ex) / distToTarget; dirY = (closestTarget.y - ey) / distToTarget; }
    }

    const moveStep = e.speed * timeScale;
    const nextX = e.x + dirX * moveStep; const nextY = e.y + dirY * moveStep;

    if (!checkCollision(nextX, nextY, e.width, e.height)) { e.x += dirX * moveStep; e.y += dirY * moveStep; }
    else {
        if (!checkCollision(e.x + Math.sign(dirX)*moveStep, e.y, e.width, e.height)) e.x += Math.sign(dirX)*moveStep;
        else if (!checkCollision(e.x, e.y + Math.sign(dirY)*moveStep, e.width, e.height)) e.y += Math.sign(dirY)*moveStep;
    }
    resolveMapCollision(e);
  }

  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i]; const b = enemies[j];
      if (a.isBoss || b.isBoss || a.type === "IceBlock" || b.type === "IceBlock") continue; 
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
  handleAcidSpitterAbility(enemies, player, projectiles); 
  if (handleLinkerAbility) handleLinkerAbility(enemies, ctx, camera);
  if (handleSniperAbility) handleSniperAbility(enemies, player, projectiles);
}

// --- FIX IS IN THIS FUNCTION ---
export function handleBulletCollisions(bullets, sfxEnabled, explosionSound, scoreObj, scoreDisplay, zombiesData, canvas, hitHurt, player, effects) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    let damageReduction = 1.0;
    if (e.type === "Crusher" && e.state !== "stunned") damageReduction = 0.2; 

    for (let j = 0; j < bullets.length; j++) {
      let b = bullets[j];
      if (!b.active) continue;
      if (player.piercingShot && b.hitList && b.hitList.includes(e)) continue;

      if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
        let baseDmg = b.damage || 1;
        let hitDmg = baseDmg;
        let isCrit = false;
        if (player.alwaysCrit || Math.random() < player.critChance) { isCrit = true; hitDmg *= player.critMultiplier; }
        
        hitDmg = Math.max(1, Math.ceil(hitDmg * damageReduction));
        e.health -= hitDmg;
        e.hitFlash = 10;

        if (player.explosiveShot) triggerExplosion(e.x + e.width/2, e.y + e.height/2, baseDmg, effects, player);
        if (player.piercingShot) { if (!b.hitList) b.hitList = []; b.hitList.push(e); } else { b.active = false; }
        
        if (!e.isBoss && e.type !== "IceBlock") {
            const knockback = 5; 
            let kdx = b.dx || 0, kdy = b.dy || 0;
            if(kdx===0 && kdy===0) kdx=1;
            const klen = Math.hypot(kdx, kdy);
            e.x += (kdx/klen) * knockback; e.y += (kdy/klen) * knockback;
            resolveMapCollision(e);
        }

        if (effects && effects.spawnText) {
             const color = isCrit ? "#ff3333" : (damageReduction < 1 ? "#aaa" : "#fff"); 
             effects.spawnText(e.x + e.width/2, e.y, isCrit ? `${hitDmg}!` : `${hitDmg}`, color, isCrit ? 20 : 12);
        }
        if (isCrit && effects && effects.shake) effects.shake(3);
        if (!player.piercingShot) break; 
      }
    }

    if (e.health <= 0) {
      if (e.type === "Exploder") triggerExplosion(e.x + e.width/2, e.y + e.height/2, 5, effects, player);
      handleSplitterDeathSplit(e, enemies, zombiesData, canvas.width); 

      if (e.isBoss) {
          addSessionCoins(500); 
          if(effects) {
              effects.spawnText(e.x, e.y, "+500 COINS!", "gold", 30);
              effects.spawnExplosion(e.x, e.y, 200, "white");
              effects.shake(10);
          }
      }

      const zData = zombiesData[e.type] || zombiesData["normal"] || zombiesData["basic"];
      scoreObj.value += (zData && zData.score) ? zData.score : 10;
      scoreDisplay.textContent = "Score: " + scoreObj.value;
      
      if (!e.isBoss) enemyPool.push(e);
      enemies.splice(i, 1);
      updateAchievement("2", 1);
      
      // FIXED LINE BELOW: Changed '!e.type' to 'e.type !=='
      if (sfxEnabled && e.type !== "Exploder") { 
          explosionSound.currentTime = 0; 
          explosionSound.play().catch(()=>{}); 
      }
    }
  }
}

export function handlePlayerCollisions(player, updateHealthBar, endGame) {
  const now = Date.now();
  
  // 1. Local Player
  for (let e of enemies) {
    if (e.type === "IceBlock") continue;
    if (player.x < e.x + e.width && player.x + player.width > e.x && player.y < e.y + e.height && player.y + player.height > e.y) {
      if (player.immune) continue;
      let dmg = 1;
      if (e.type === "Exploder") dmg = 2; 
      if (e.isBoss) dmg = 3; 
      if (now - player.lastHitTime >= 1000) {
        takeDamage(dmg);
        player.lastHitTime = now;
        if (player.isDead) { endGame(); return true; }
      }
    }
  }

  // 2. Remote Players (Host Only Logic)
  if (remotePlayers) {
      Object.values(remotePlayers).forEach(rp => {
          if (rp.isDead) return;
          for (let e of enemies) {
             // Simple AABB
             if (rp.x < e.x + e.width && rp.x + 32 > e.x && rp.y < e.y + e.height && rp.y + 32 > e.y) {
                 // Check debounce/immunity if we tracked it for remote players
                 // For now, let's just apply damage periodically or per frame if we don't track time
                 // We need a lastHitTime on rp
                 if (!rp.lastHitTime) rp.lastHitTime = 0;
                 if (now - rp.lastHitTime >= 1000) {
                     let dmg = 1;
                     if (e.type === "Exploder") dmg = 2;
                     if (e.isBoss) dmg = 3;
                     
                     rp.hp = (rp.hp || 10) - dmg;
                     rp.lastHitTime = now;
                     
                     // We don't have a direct way to notify client of damage except via state sync
                     // The client will see updated HP in next broadcast
                     if (rp.hp <= 0) {
                         rp.hp = 0;
                         rp.isDead = true;
                         // Ideally notify client they died
                     }
                 }
             }
          }
      });
  }

  return false;
}

export function handleProjectilePlayerCollision(player, updateHealthBar, endGame) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.from === "acid") continue; 

    // Local Player
    if (player.x < p.x + p.width && player.x + player.width > p.x && player.y < p.y + p.height && player.y + player.height > p.y) {
      if (player.immune) { projectiles.splice(i, 1); continue; }
      
      let dmg = (p.from === "boss_sniper" ? 4 : (p.from === "sniper" ? 2 : 1));
      
      // Brittle Touch Logic
      if (p.from === "frost_boss") {
          player.frostbiteStacks = (player.frostbiteStacks || 0) + 1;
          dmg = 1; // Base damage for frost bolt
      }

      takeDamage(dmg);
      projectiles.splice(i, 1);
      if (player.isDead) { endGame(); return true; }
      continue; // Projectile gone
    }
    
    // Remote Players
    if (remotePlayers) {
        let hitRemote = false;
        const rps = Object.values(remotePlayers);
        for(let rp of rps) {
            if (rp.isDead) continue;
            if (rp.x < p.x + p.width && rp.x + 32 > p.x && rp.y < p.y + p.height && rp.y + 32 > p.y) {
                 const dmg = (p.from === "boss_sniper" ? 4 : (p.from === "sniper" ? 2 : 1));
                 rp.hp = (rp.hp || 10) - dmg;
                 if (rp.hp <= 0) { rp.hp = 0; rp.isDead = true; }
                 hitRemote = true;
                 break; // Hit one player per projectile usually
            }
        }
        if (hitRemote) {
            projectiles.splice(i, 1);
            continue;
        }
    }
  }
  return false;
}

export function updateProjectiles(canvas, timeScale = 1) { /* Logic inside updateEnemies */ }

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
    if(color.indexOf("rgba") !== -1) return color;
    if(color === "red") return "#cc0000";
    if(color === "blue") return "#0000cc";
    if(color.indexOf("#") === -1) return color; 
    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

function layeredCircle(ctx, r, color, pulse = 0) {
    const mainColor = color || "#666";
    ctx.fillStyle = mainColor; ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r + pulse), 0, Math.PI * 2); ctx.fill();
}

function layeredRect(ctx, w, h, color) {
    const mainColor = color || "#666";
    ctx.fillStyle = mainColor; ctx.fillRect(-w/2, -h/2, w, h);
}

function orbitRect(ctx, a, d, s, c) {
  ctx.save(); ctx.rotate(a); ctx.fillStyle = c; ctx.fillRect(d, -s/2, s, s); ctx.restore();
}

function orbitTri(ctx, a, d, s, c) {
  ctx.save(); ctx.rotate(a); ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - s, -s / 2); ctx.lineTo(d - s, s / 2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawBasic(ctx, t, hitFlash, color) {
  const pulse = Math.sin(t * 2) * 1.5;
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
  const size = 44; 
  const c = color || "#546e7a"; // Steel Blue Grey
  
  if (hitFlash) { 
      ctx.fillStyle = "white"; 
      ctx.fillRect(-size/2, -size/2, size, size); 
  } else {
      // 1. Heavy Base Chassis (Dark Metal)
      ctx.fillStyle = "#263238";
      ctx.fillRect(-size/2, -size/2, size, size);
      
      // 2. Shoulder/Corner Armor Pads
      ctx.fillStyle = "#37474f";
      const padSize = 14;
      // Top-Left & Top-Right
      ctx.fillRect(-size/2 - 2, -size/2 - 2, padSize, padSize);
      ctx.fillRect(size/2 - padSize + 2, -size/2 - 2, padSize, padSize);
      // Bottom-Left & Bottom-Right
      ctx.fillRect(-size/2 - 2, size/2 - padSize + 2, padSize, padSize);
      ctx.fillRect(size/2 - padSize + 2, size/2 - padSize + 2, padSize, padSize);

      // 3. Central Plating (Hexagonal-ish hint)
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-10, -18); ctx.lineTo(10, -18);
      ctx.lineTo(18, 0); ctx.lineTo(10, 18);
      ctx.lineTo(-10, 18); ctx.lineTo(-18, 0);
      ctx.closePath();
      ctx.fill();
      
      // 4. Glowing Power Core
      const pulse = Math.sin(t * 5) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(0, 229, 255, ${0.6 + pulse * 0.4})`; // Cyan glow
      ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      
      // 5. Visor / Optics
      ctx.fillStyle = "#cfd8dc";
      ctx.fillRect(-12, -8, 24, 3);
  }
}

function drawJuggernaut(ctx, t, hitFlash, color) {
  ctx.rotate(t * 0.5); const size = 70; const c = color || "darkslategrey";
  if (hitFlash) { ctx.fillStyle = "white"; ctx.fillRect(-size/2, -size/6, size, size/3); ctx.fillRect(-size/6, -size/2, size/3, size); } 
  else { layeredRect(ctx, size, size/3, c); layeredRect(ctx, size/3, size, c); const coreC = "#263238"; ctx.fillStyle = coreC; ctx.fillRect(-size/4, -size/4, size/2, size/2); ctx.fillStyle = "#37474f"; ctx.fillRect(-size/4 + 4, -size/4 + 4, size/2 - 8, size/2 - 8); ctx.fillStyle = "#cfd8dc"; const dot = 4; ctx.fillRect(-size/2 + 2, -size/6 + 2, dot, dot); ctx.fillRect(size/2 - 6, -size/6 + 2, dot, dot); ctx.fillRect(-size/6 + 2, -size/2 + 2, dot, dot); ctx.fillRect(-size/6 + 2, size/2 - 6, dot, dot); }
}

function drawSplitter(ctx, t, hitFlash, color, radius) {
  const coreSize = Math.max(10, radius - 2); const pulse = Math.sin(t * 8) * (radius / 6); const c = color || "#d32f2f";
  if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0,0,coreSize,0,Math.PI*2); ctx.fill(); } 
  else { layeredCircle(ctx, coreSize, c, pulse); const pCount = 3; const orbitDist = radius * 1.5; for(let i=0; i<pCount; i++) { const ang = t + (i * Math.PI * 2 / pCount); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(Math.cos(ang)*orbitDist, Math.sin(ang)*orbitDist, radius/4, 0, Math.PI*2); ctx.fill(); } }
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
    else { ctx.fillStyle = c; ctx.fillRect(-s/2, -w/2, s, w); ctx.fillRect(-w/2, -s/2, w, s); ctx.fillStyle = "#b9f6ca"; ctx.fillRect(-s/2+4, -w/2+4, s-8, w-8); ctx.fillRect(-w/2+4, -s/2+4, w-8, s-8); }
}

function drawSniper(ctx, t, hitFlash, color, e) {
    let rotation = 0; if (e.sniperState && e.sniperState.angle) { rotation = e.sniperState.angle; } else { rotation = t; } ctx.rotate(rotation); const c = color || "#ff1744";
    if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-15, 15); ctx.lineTo(-7, 0); ctx.lineTo(-15, -15); ctx.closePath(); ctx.fill(); } 
    else { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-13, 13); ctx.lineTo(-6, 0); ctx.lineTo(-13, -13); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#ff5252"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill(); }
    if (!hitFlash && e.sniperState && e.sniperState.phase === 'aim') { const timeInPhase = Date.now() - e.sniperState.timer; ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255, 0, 0, 0.8)"; if (timeInPhase > 1500) { ctx.lineWidth = Math.random() > 0.5 ? 3 : 1; ctx.strokeStyle = "rgba(255, 50, 50, 1.0)"; } ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(1200, 0); ctx.stroke(); ctx.restore(); }
}

function drawAcidSpitter(ctx, t, hitFlash, color, radius) {
    const size = radius; 
    const c = color || "#c6ff00";
    if (hitFlash) { 
        ctx.fillStyle = "white"; 
        ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size/2, size); ctx.lineTo(-size/2, -size); ctx.closePath(); ctx.fill();
    } else { 
        // 1. Orbiting Toxic Particles
        const orbCount = 3; const orbDist = size + 10 + Math.sin(t * 3) * 3; ctx.fillStyle = "#76ff03"; 
        for(let i=0; i<orbCount; i++) {
            const ang = (t * 4) + (i * Math.PI * 2 / orbCount);
            ctx.beginPath(); ctx.arc(Math.cos(ang)*orbDist, Math.sin(ang)*orbDist, 5, 0, Math.PI*2); ctx.fill();
        }
        // 2. Rotating Triangle Body
        ctx.save(); ctx.rotate(t); ctx.fillStyle = c; ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const angle = (i * 2 * Math.PI / 3); ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
        }
        ctx.closePath(); ctx.fill();
        // 3. Inner Pulsing Core
        const corePulse = 1 + Math.sin(t * 8) * 0.2; ctx.scale(corePulse, corePulse); ctx.fillStyle = "#76ff03"; ctx.beginPath(); ctx.arc(0, 0, size/3, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }
}

function drawExploder(ctx, t, hitFlash, color) {
    const pulse = 1 + Math.abs(Math.sin(t * 15)) * 0.15; const size = 18 * pulse; const c = color || "#ff6d00";
    if (hitFlash) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0,0,size,0,Math.PI*2); ctx.fill(); } else { 
        ctx.shadowBlur = 15; ctx.shadowColor = "#d50000"; ctx.fillStyle = c; ctx.beginPath();
        const spikes = 12; for(let i=0; i<spikes; i++) {
            const angle = (i / spikes) * Math.PI * 2; const r = (i % 2 === 0) ? size : size * 0.8; ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; 
        const flash = Math.floor(t * 12) % 2 === 0; ctx.fillStyle = flash ? "white" : "red"; ctx.beginPath(); ctx.arc(0, 0, size * 0.4, 0, Math.PI*2); ctx.fill();
    }
}

function drawStalker(ctx, t, hitFlash, color) {
    if (hitFlash) { ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill(); } else {
        ctx.strokeStyle = "rgba(150, 150, 150, 0.5)"; ctx.lineWidth = 2;
        for(let i=0; i<4; i++) {
            const angle = (t * 1.5) + (i * Math.PI / 2);
            const kx = Math.cos(angle) * 22; const ky = Math.sin(angle) * 22;
            const fx = Math.cos(angle + 0.3) * 32; const fy = Math.sin(angle + 0.3) * 32;
            ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
            ctx.fillStyle = "rgba(200, 200, 200, 0.6)"; ctx.fillRect(fx-2, fy-2, 4, 4);
        }
        ctx.fillStyle = color || "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill(); 
        const eyePulse = 0.6 + Math.abs(Math.sin(t * 3)) * 0.4;
        ctx.fillStyle = `rgba(255, 0, 0, ${eyePulse})`; ctx.shadowColor = "red"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(-6, -4, 3, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(6, -4, 3, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    }
}

export function drawEnemies(ctx, camera = { x: 0, y: 0 }, scale = 1) {
  drawAcidPools(ctx, camera); 

  const t = performance.now() / 1000;
  let bossFound = false;

  for (let e of enemies) {
    if (e.isBoss) {
        drawBoss(ctx, e, camera); 
        updateBossBar(e); 
        bossFound = true;
    } else {
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
        else if (type === 'splitter' || type === 'splitterminion') drawSplitter(ctx, t, isFlashing, c, radius);
        else if (type === 'thrower') drawThrower(ctx, t, isFlashing, c);
        else if (type === 'minion') drawMinion(ctx, t, isFlashing, c);
        else if (type === 'linker') drawLinker(ctx, t, isFlashing, c);
        else if (type === 'sniper') drawSniper(ctx, t, isFlashing, c, e);
        else if (type === 'spitter') drawAcidSpitter(ctx, t, isFlashing, c, radius);
        else if (type === 'exploder') drawExploder(ctx, t, isFlashing, c);
        else if (type === 'stalker') drawStalker(ctx, t, isFlashing, c);
        else if (type === 'iceblock') {
            // Draw a crystalline ice wall segment
            ctx.fillStyle = isFlashing ? "white" : "#81d4fa";
            // Main block
            ctx.fillRect(-22, -22, 44, 44);
            
            // Inner detail for depth
            ctx.fillStyle = "#4fc3f7";
            ctx.fillRect(-15, -15, 30, 30);
            
            // Reflection/Highlight
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            ctx.beginPath();
            ctx.moveTo(-22, -22);
            ctx.lineTo(0, -22);
            ctx.lineTo(-22, 0);
            ctx.fill();

            // Border
            ctx.strokeStyle = "#0288d1";
            ctx.lineWidth = 2;
            ctx.strokeRect(-22, -22, 44, 44);
        }
        else drawBasic(ctx, t, isFlashing, c); 
        ctx.restore();
    }

    if (e.maxHealth > 1 && !e.isBoss && e.type !== "IceBlock") {
      const cx = e.x - camera.x + e.width/2;
      const cy = e.y - camera.y + e.height/2;
      ctx.save();
      ctx.translate(cx, cy);
      const barW = Math.max(30, e.width); const barH = 5; const barY = - (e.height/2 + 10); 
      
      if (e.type.toLowerCase() === 'stalker') {
          ctx.fillStyle = "rgba(0,0,0,0.1)"; ctx.fillRect(-barW/2, barY, barW, barH); 
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)"; ctx.fillRect(-barW/2, barY, barW * (e.health / e.maxHealth), barH); 
      } else {
          ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-barW/2, barY, barW, barH);
          ctx.fillStyle = "#ffe066"; ctx.fillRect(-barW/2, barY, barW * (e.health / e.maxHealth), barH);
      }
      ctx.restore();
    }
  }

  if (!bossFound) hideBossBar();
}

export function resolveEnemyBlocking(player) {
    for (const e of enemies) {
        if (e.type === "IceBlock") {
            if (player.x < e.x + e.width && player.x + player.width > e.x &&
                player.y < e.y + e.height && player.y + player.height > e.y) {
                
                const overlapX = Math.min((player.x + player.width) - e.x, (e.x + e.width) - player.x);
                const overlapY = Math.min((player.y + player.height) - e.y, (e.y + e.height) - player.y);

                if (overlapX < overlapY) {
                    if (player.x < e.x) player.x -= overlapX;
                    else player.x += overlapX;
                } else {
                    if (player.y < e.y) player.y -= overlapY;
                    else player.y += overlapY;
                }
            }
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
    const isAcid = (p.from === "acid");
    
    if (isRock) {
        ctx.rotate(t); ctx.fillStyle = "#5d4037"; ctx.beginPath(); ctx.moveTo(p.width/2, 0); ctx.lineTo(p.width*0.2, p.width*0.4); ctx.lineTo(-p.width*0.3, p.width*0.3); ctx.lineTo(-p.width/2, -p.width*0.1); ctx.lineTo(0, -p.width*0.4); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#8d6e63"; ctx.beginPath(); ctx.arc(0,0, p.width/3, 0, Math.PI*2); ctx.fill();
    } else if (isSniper) {
        ctx.fillStyle = "red"; ctx.shadowBlur = 10; ctx.shadowColor = "red"; ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height); ctx.shadowBlur = 10; ctx.fillStyle = "white"; ctx.fillRect(-p.width/4, -p.height/4, p.width/2, p.height/2);
    } else if (isAcid) {
        ctx.rotate(t * 2); 
        ctx.fillStyle = "#c6ff00"; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill(); 
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(2, -2, 2, 0, Math.PI*2); ctx.fill();
    } else {
        ctx.fillStyle = p.color || "#a0522d"; ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
    }
    ctx.restore();
  }
}

export function handleWhirlwind(player, enemies, effects) {
    if (!player.whirlwind) return;
    const range = 90; // Increased from 85
    const force = 28; // Increased from 20 (40% stronger)

    enemies.forEach(e => {
        if (e.isBoss) return;
        const dist = Math.hypot(e.x + e.width/2 - (player.x + player.width/2), e.y + e.height/2 - (player.y + player.height/2));
        if (dist < range) {
             if (e.whirlwindCooldown > 0) { e.whirlwindCooldown--; return; }

             const dmg = 2 + Math.floor(Math.random() * 3);
             e.health -= dmg;
             e.hitFlash = 10;
             e.whirlwindCooldown = 30; 

             const angle = Math.atan2(e.y - player.y, e.x - player.x);
             e.x += Math.cos(angle) * force;
             e.y += Math.sin(angle) * force;
             resolveMapCollision(e);

             if (effects && effects.spawnText) effects.spawnText(e.x + e.width/2, e.y, dmg, "#81d4fa", 16);
        } else {
             if (e.whirlwindCooldown > 0) e.whirlwindCooldown--;
        }
    });
}