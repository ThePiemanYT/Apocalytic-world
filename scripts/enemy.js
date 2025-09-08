import { handleSummonerAbility, handleJuggernautAbility, handleSpitterDeathSplit, handleThrowerAbility } from "./enemyAbility.js";

// Enemy management and AI for zombie apocalypse

export let enemies = [];
export let projectiles = [];

export function resetEnemies() {
  enemies.length = 0;
  projectiles.length = 0;
  // No need to clear timers here, handled in enemyAbility.js
}

export function spawnEnemy(type, zombiesData, canvasWidth, x = null, y = null) {
  const zData = zombiesData[type] || zombiesData["basic"];
  let size = zData.size || 40;
  let spawnX = x !== null ? x : Math.random() * (canvasWidth - size);
  let spawnY = y !== null ? y : 0;
  enemies.push({
    x: spawnX,
    y: spawnY,
    width: size,
    height: size,
    speed: zData.speed,
    health: zData.health,
    maxHealth: zData.health,
    color: zData.color || "red",
    type
  });
}

export function updateEnemies(player, canvas, zombiesData) {
  // --- Basic AI movement toward player ---
  for (let e of enemies) {
    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    let dx = px - ex;
    let dy = py - ey;
    let dist = Math.hypot(dx, dy);

    // Move toward player
    if (dist > 0) {
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;
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

export function updateProjectiles(canvas) {
  // Move projectiles
  for (let p of projectiles) {
    p.x += p.dx;
    p.y += p.dy;
  }
  // Remove projectiles out of bounds
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (
      p.x < -50 || p.x > canvas.width + 50 ||
      p.y < -50 || p.y > canvas.height + 50
    ) {
      projectiles.splice(i, 1);
    }
  }
}

export function drawEnemies(ctx, camera = { x: 0, y: 0 }, scale = 1) {
  for (let e of enemies) {
    ctx.fillStyle = e.color || "red";
    ctx.fillRect(
      e.x - camera.x,
      e.y - camera.y,
      e.width * scale,
      e.height * scale
    );
    // Draw enemy health bar
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
  }
}

export function drawProjectiles(ctx, camera = { x: 0, y: 0 }) {
  for (let p of projectiles) {
    ctx.fillStyle = p.color || "#a0522d";
    ctx.fillRect(p.x - camera.x, p.y - camera.y, p.width, p.height);
  }
}

export function handleBulletCollisions(bullets, sfxEnabled, explosionSound, scoreObj, scoreDisplay, zombiesData, canvas) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    for (let j = bullets.length - 1; j >= 0; j--) {
      let b = bullets[j];
      if (
        b.x < e.x + e.width &&
        b.x + b.width > e.x &&
        b.y < e.y + e.height &&
        b.y + b.height > e.y
      ) {
        // Damage enemy (use bullet damage for double damage)
        e.health -= b.damage || 1;
        bullets.splice(j, 1);

        if (e.health <= 0) {
          // Spitter split ability
          handleSpitterDeathSplit(e, enemies, zombiesData, canvas.width);

          // Award score based on enemy type
          const zData = zombiesData[e.type] || zombiesData["basic"];
          scoreObj.value += zData.score || 10;
          scoreDisplay.textContent = "Score: " + scoreObj.value;

          enemies.splice(i, 1);
          if (sfxEnabled) {
            explosionSound.currentTime = 0;
            explosionSound.play();
          }
        }
        break;
      }
    }
  }
}

export function handlePlayerCollisions(player, updateHealthBar, endGame) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    if (
      player.x < e.x + e.width &&
      player.x + player.width > e.x &&
      player.y < e.y + e.height &&
      player.y + player.height > e.y
    ) {
      // Damage player
      player.health -= 1;
      updateHealthBar();
      enemies.splice(i, 1);
      if (player.health <= 0) {
        endGame();
        return true;
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
      // Damage player
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
