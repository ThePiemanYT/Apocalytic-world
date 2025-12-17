/* src/scripts/enemy.js */
import { handleSummonerAbility, handleJuggernautAbility, handleSpitterDeathSplit, handleThrowerAbility } from "./enemyAbility.js";
import { updateAchievement } from "./achievement.js";

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
  return { x: 0, y: 0, width: 40, height: 40, speed: 0, health: 0, maxHealth: 0, color: "red", type: "basic", hitFlash: 0 };
}

export function spawnEnemy(type, zombiesData, canvasWidth, x = null, y = null) {
  const zData = zombiesData[type] || zombiesData["basic"];
  const enemy = getFreeEnemy();
  let size = zData.size || 40;
  enemy.width = size; enemy.height = size;
  enemy.x = x !== null ? x : Math.random() * (canvasWidth - size);
  enemy.y = y !== null ? y : 0;
  enemy.speed = zData.speed;
  enemy.health = zData.health;
  enemy.maxHealth = zData.health;
  enemy.color = zData.color || "red";
  enemy.type = type;
  enemy.hitFlash = 0;
  enemy._drawWidth = size; enemy._drawHeight = size;
  enemies.push(enemy);
}

export function updateEnemies(player, canvas, zombiesData, projectilesRef, sfxEnabled, hitHurt, timeScale = 1) {
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

  // Separation (Push enemies apart)
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

  // Special Abilities
  handleSummonerAbility(enemies, zombiesData, canvas);
  handleJuggernautAbility(enemies, zombiesData, player);
  handleThrowerAbility(enemies, player, projectiles, zombiesData);
}

// Drawing Helper
function lerp(a, b, t) { return a + (b - a) * t; }

export function drawEnemies(ctx, camera = { x: 0, y: 0 }, scale = 1) {
  for (let e of enemies) {
    ctx.save();
    // Hit flash expansion effect
    const targetW = e.width * scale * (e.hitFlash > 0 ? 1.3 : 1);
    const targetH = e.height * scale * (e.hitFlash > 0 ? 1.3 : 1);
    e._drawWidth = lerp(e._drawWidth || e.width * scale, targetW, 0.2);
    e._drawHeight = lerp(e._drawHeight || e.height * scale, targetH, 0.2);

    const color = e.hitFlash > 0 ? "white" : e.color || "red";
    const offsetX = (e._drawWidth - e.width * scale) / 2;
    const offsetY = (e._drawHeight - e.height * scale) / 2;

    ctx.fillStyle = color;
    ctx.fillRect(e.x - camera.x - offsetX, e.y - camera.y - offsetY, e._drawWidth, e._drawHeight);

    // Health bar
    if (e.maxHealth > 1) {
      ctx.fillStyle = "#222";
      ctx.fillRect(e.x - camera.x, e.y - camera.y - 8, e.width * scale, 6);
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(e.x - camera.x, e.y - camera.y - 8, (e.width * scale) * (e.health / e.maxHealth), 6);
    }
    if (e.hitFlash > 0) e.hitFlash--;
    ctx.restore();
  }
}

export function drawProjectiles(ctx, camera) {
  for (let p of projectiles) {
    ctx.fillStyle = p.color || "#a0522d";
    ctx.fillRect(p.x - camera.x, p.y - camera.y, p.width, p.height);
  }
}

// --- COLLISION + DAMAGE + CRIT LOGIC ---
export function handleBulletCollisions(bullets, sfxEnabled, explosionSound, scoreObj, scoreDisplay, zombiesData, canvas, hitHurt, player, effects) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    let enemyHit = false;

    for (let j = 0; j < bullets.length; j++) {
      let b = bullets[j];
      if (!b.active) continue;

      // AABB Collision
      if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
        
        // --- Damage Calculation ---
        let dmg = b.damage || 1;
        let isCrit = false;
        
        // Check for Crit (or enforced by powerup)
        if (player.alwaysCrit || Math.random() < player.critChance) {
            isCrit = true;
            dmg *= player.critMultiplier;
        }
        dmg = Math.ceil(dmg);

        e.health -= dmg;
        b.active = false; // Destroy bullet
        e.hitFlash = 10;
        enemyHit = true;
        
        // --- Visual Effects (Juice) ---
        // 1. Knockback
        const knockback = 5; 
        let kdx = b.dx || 0, kdy = b.dy || 0;
        if(kdx===0 && kdy===0) { kdx=1; }
        const klen = Math.hypot(kdx, kdy);
        e.x += (kdx/klen) * knockback;
        e.y += (kdy/klen) * knockback;

        // 2. Floating Text
        if (effects && effects.spawnText) {
             const tx = e.x + e.width/2;
             const ty = e.y;
             const color = isCrit ? "#ff3333" : "#fff";
             const text = isCrit ? `${dmg}!` : `${dmg}`;
             const size = isCrit ? 20 : 12;
             effects.spawnText(tx, ty, text, color, size);
        }
        
        // 3. Screen Shake (Only on Crits to avoid nausea)
        if (isCrit && effects && effects.shake) {
            effects.shake(3);
        }

        break; // Bullet hit one enemy, stop checking other bullets for this loop iteration
      }
    }

    if (enemyHit && sfxEnabled) {
      hitHurt.currentTime = 0; 
      hitHurt.play().catch(()=>{});
    }

    // Death Logic
    if (e.health <= 0) {
      handleSpitterDeathSplit(e, enemies, zombiesData, canvas.width);
      const zData = zombiesData[e.type] || zombiesData["basic"];
      scoreObj.value += zData.score || 10;
      scoreDisplay.textContent = "Score: " + scoreObj.value;
      
      // Heavier shake on kill
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

    // Remove projectiles that go significantly off-screen
    if (
      p.x < -100 || 
      p.x > canvas.width + 100 || 
      p.y < -100 || 
      p.y > canvas.height + 100
    ) {
      projectiles.splice(i, 1);
    }
  }
}