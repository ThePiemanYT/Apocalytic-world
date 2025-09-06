// Enemy management and AI for zombie apocalypse

export let enemies = [];

let summonerTimers = new Map();

export function resetEnemies() {
  enemies.length = 0;
  summonerTimers.clear();
}

export function spawnEnemy(type, zombiesData, canvasWidth, x = null, y = null) {
  const zData = zombiesData[type] || zombiesData["basic"];
  let spawnX = x !== null ? x : Math.random() * (canvasWidth - 40);
  let spawnY = y !== null ? y : 0;
  enemies.push({
    x: spawnX,
    y: spawnY,
    width: 40,
    height: 40,
    speed: zData.speed,
    health: zData.health,
    maxHealth: zData.health,
    color: zData.color || "red",
    type
  });
}

export function updateEnemies(player, canvas, zombiesData) {
  for (let e of enemies) {
    // Move toward player center
    const ex = e.x + e.width / 2;
    const ey = e.y + e.height / 2;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const dx = px - ex;
    const dy = py - ey;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;
    }
  }
  // Summoner ability: every 5s, summon 2 minions
  for (let i = 0; i < enemies.length; ++i) {
    const e = enemies[i];
    if (e.type === "summoner") {
      if (!summonerTimers.has(e)) {
        summonerTimers.set(e, Date.now());
      }
      const lastSummon = summonerTimers.get(e);
      if (Date.now() - lastSummon >= 5000) {
        // Summon 2 minions near the summoner
        for (let j = 0; j < 2; ++j) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 20;
          const minionX = e.x + e.width / 2 + Math.cos(angle) * dist - 20;
          const minionY = e.y + e.height / 2 + Math.sin(angle) * dist - 20;
          spawnEnemy("minion", zombiesData, canvas.width, minionX, minionY);
        }
        summonerTimers.set(e, Date.now());
      }
    }
  }
  // Clean up timers for dead summoners
  for (const e of Array.from(summonerTimers.keys())) {
    if (!enemies.includes(e)) summonerTimers.delete(e);
  }
}

export function drawEnemies(ctx) {
  for (let e of enemies) {
    ctx.fillStyle = e.color || "red";
    ctx.fillRect(e.x, e.y, e.width, e.height);
    // Draw enemy health bar
    if (e.maxHealth > 1) {
      ctx.fillStyle = "#222";
      ctx.fillRect(e.x, e.y - 8, e.width, 6);
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(e.x, e.y - 8, e.width * (e.health / e.maxHealth), 6);
    }
  }
}

export function handleBulletCollisions(bullets, sfxEnabled, explosionSound, scoreObj, scoreDisplay) {
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
        // Damage enemy
        e.health -= 1;
        bullets.splice(j, 1);

        if (e.health <= 0) {
          enemies.splice(i, 1);
          if (sfxEnabled) {
            explosionSound.currentTime = 0;
            explosionSound.play();
          }
          scoreObj.value += 10;
          scoreDisplay.textContent = "Score: " + scoreObj.value;
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
