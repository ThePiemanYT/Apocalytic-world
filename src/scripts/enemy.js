/* src/scripts/enemy.js */
import { handleSummonerAbility, handleJuggernautAbility, handleSpitterDeathSplit, handleThrowerAbility } from "./enemyAbility.js";
import { updateAchievement } from "./achievement.js";

// Active enemies list (for logic iteration)
export let enemies = [];
// Pool of reusable enemy objects (to reduce Garbage Collection)
const enemyPool = [];

export let projectiles = [];

export function resetEnemies() {
  // Return active enemies to pool
  while(enemies.length > 0) {
    enemyPool.push(enemies.pop());
  }
  projectiles.length = 0;
}

// Get a fresh enemy object (reused or new)
function getFreeEnemy() {
  if (enemyPool.length > 0) return enemyPool.pop();
  return { x: 0, y: 0, width: 40, height: 40, speed: 0, health: 0, maxHealth: 0, color: "red", type: "basic", hitFlash: 0 };
}

export function spawnEnemy(type, zombiesData, canvasWidth, x = null, y = null, e) {
  const zData = zombiesData[type] || zombiesData["basic"];
  const enemy = getFreeEnemy();
  
  let size = zData.size || 40;
  enemy.width = size;
  enemy.height = size;
  enemy.x = x !== null ? x : Math.random() * (canvasWidth - size);
  enemy.y = y !== null ? y : 0;
  enemy.speed = zData.speed;
  enemy.health = zData.health;
  enemy.maxHealth = zData.health;
  enemy.color = zData.color || "red";
  enemy.type = type;
  enemy.hitFlash = 0;
  // Reset internal draw sizes for interpolation
  enemy._drawWidth = size;
  enemy._drawHeight = size;

  enemies.push(enemy);
}

export function updateEnemies(player, canvas, zombiesData, timeScale = 1) {
  // --- Basic AI movement toward player ---
  for (let e of enemies) {
    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    let dx = px - ex;
    let dy = py - ey;
    let dist = Math.hypot(dx, dy);

    // Move toward player (Scaled by Delta Time)
    if (dist > 0) {
      e.x += (dx / dist) * e.speed * timeScale;
      e.y += (dy / dist) * e.speed * timeScale;
    }
  }

  // --- Proper Enemy Separation (push system) ---
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
        dx /= dist;
        dy /= dist;
        const overlap = (minDist - dist) / 2;
        // Separation force also scaled slightly by timeScale to prevent jitter
        a.x += dx * overlap;
        a.y += dy * overlap;
        b.x -= dx * overlap;
        b.y -= dy * overlap;
      }
    }
  }

  // Handle special abilities
  handleSummonerAbility(enemies, zombiesData, canvas);
  handleJuggernautAbility(enemies, zombiesData, player);
  handleThrowerAbility(enemies, player, projectiles, zombiesData);
}

export function updateProjectiles(canvas, timeScale = 1) {
  // Move projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.dx * timeScale;
    p.y += p.dy * timeScale;
    
    // Remove projectiles out of bounds
    if (
      p.x < -50 || p.x > canvas.width + 50 ||
      p.y < -50 || p.y > canvas.height + 50
    ) {
      projectiles.splice(i, 1);
    }
  }
}

// Linear interpolation helper
function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function drawEnemies(ctx, camera = { x: 0, y: 0 }, scale = 1) {
  for (let e of enemies) {
    ctx.save();

    // Target size (normal or hit-expanded)
    const targetW = e.width * scale * (e.hitFlash > 0 ? 1.3 : 1);
    const targetH = e.height * scale * (e.hitFlash > 0 ? 1.3 : 1);

    // Smoothly interpolate current size towards target
    e._drawWidth = lerp(e._drawWidth || e.width * scale, targetW, 0.2);
    e._drawHeight = lerp(e._drawHeight || e.height * scale, targetH, 0.2);

    // Flash color
    const color = e.hitFlash > 0 ? "white" : e.color || "red";

    // Center adjustment
    const offsetX = (e._drawWidth - e.width * scale) / 2;
    const offsetY = (e._drawHeight - e.height * scale) / 2;

    // Draw enemy
    ctx.fillStyle = color;
    ctx.fillRect(
      e.x - camera.x - offsetX,
      e.y - camera.y - offsetY,
      e._drawWidth,
      e._drawHeight
    );

    // Draw health bar
    if (e.maxHealth > 1) {
      ctx.fillStyle = "#222";
      ctx.fillRect(
        e.x - camera.x,
        e.y - camera.y - 8,
        e.width * scale,
        6
      );
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(
        e.x - camera.x,
        e.y - camera.y - 8,
        (e.width * scale) * (e.health / e.maxHealth),
        6
      );
    }

    // Countdown hitFlash
    if (e.hitFlash > 0) e.hitFlash--;

    ctx.restore();
  }
}


export function drawProjectiles(ctx, camera = { x: 0, y: 0 }) {
  for (let p of projectiles) {
    ctx.fillStyle = p.color || "#a0522d";
    ctx.fillRect(p.x - camera.x, p.y - camera.y, p.width, p.height);
  }
}

function onEnemyDefeated() {
  updateAchievement("2", 1); // BloodThirsty
}

export function handleBulletCollisions(bullets, sfxEnabled, explosionSound, scoreObj, scoreDisplay, zombiesData, canvas, hitHurt, player) {
  // Use reverse loop for safe removal (enemies)
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    let enemyHit = false;

    // Iterate through bullets pool
    // Note: bullets is now a fixed array, so we don't splice it. We set .active = false.
    for (let j = 0; j < bullets.length; j++) {
      let b = bullets[j];
      if (!b.active) continue;

      if (
        b.x < e.x + e.width &&
        b.x + b.width > e.x &&
        b.y < e.y + e.height &&
        b.y + b.height > e.y
      ) {
        // Damage enemy
        e.health -= b.damage || 1;
        
        // Deactivate bullet (return to pool)
        b.active = false;

        e.hitFlash = 10;
        enemyHit = true;

        // Apply knockback
        const baseKnockback = 8;
        const knockbackBoost = 1 + (player.upgrades.knockback || 0) * 0.2;
        const knockbackResist = e.knockbackResist || 0;
        const finalKnockback = baseKnockback * knockbackBoost * (1 - knockbackResist);

        let kdx = b.dx || 0;
        let kdy = b.dy || 0;
        if (Math.hypot(kdx, kdy) === 0) {
          kdx = (e.x + e.width/2) - (b.x + 4);
          kdy = (e.y + e.height/2) - (b.y + 4);
        }
        const klen = Math.hypot(kdx, kdy) || 1;
        e.x += (kdx / klen) * finalKnockback;
        e.y += (kdy / klen) * finalKnockback;

        // Break inner loop (one bullet hits one enemy)
        // If penetrating bullets are added later, remove this break
        break; 
      }
    }

    if (enemyHit && sfxEnabled) {
      // Use throttled sound helper if available, else direct play
      // Assuming index.js passes the sound object, but we should use the audio manager directly if possible for throttling
      // But preserving existing signature:
      hitHurt.currentTime = 0;
      hitHurt.play().catch(()=>{}); 
    }

    if (e.health <= 0) {
      handleSpitterDeathSplit(e, enemies, zombiesData, canvas.width);
      
      const zData = zombiesData[e.type] || zombiesData["basic"];
      scoreObj.value += zData.score || 10;
      scoreDisplay.textContent = "Score: " + scoreObj.value;

      // Remove from active list and send to pool
      enemyPool.push(e);
      enemies.splice(i, 1);
      
      onEnemyDefeated();
      if (sfxEnabled) {
        // Throttled explosion would be better here, handled in index.js call or wrapper
        explosionSound.currentTime = 0;
        explosionSound.play().catch(()=>{});
      }
    }
  }
}

export function handlePlayerCollisions(player, updateHealthBar, endGame) {
  const now = Date.now();
  for (let e of enemies) {
    if (
      player.x < e.x + e.width &&
      player.x + player.width > e.x &&
      player.y < e.y + e.height &&
      player.y + player.height > e.y
    ) {
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
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y < p.y + p.height &&
      player.y + player.height > p.y
    ) {
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