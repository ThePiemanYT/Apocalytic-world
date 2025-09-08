// Handles special abilities for enemies (e.g., summoner)

export function handleSummonerAbility(enemies, zombiesData, canvas) {
  if (!handleSummonerAbility.summonerTimers) {
    handleSummonerAbility.summonerTimers = new Map();
  }
  const timers = handleSummonerAbility.summonerTimers;

  // Summoner ability: every 5s, summon 2 minions
  for (let i = 0; i < enemies.length; ++i) {
    const e = enemies[i];
    if (e.type === "summoner") {
      if (!timers.has(e)) {
        timers.set(e, Date.now());
      }
      const lastSummon = timers.get(e);
      if (Date.now() - lastSummon >= 5000) {
        for (let j = 0; j < 2; ++j) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 20;
          const minionSize = zombiesData["minion"]?.size || 24;
          const minionX = e.x + (e.width || 40) / 2 + Math.cos(angle) * dist - minionSize / 2;
          const minionY = e.y + (e.height || 40) / 2 + Math.sin(angle) * dist - minionSize / 2;
          enemies.push({
            x: minionX,
            y: minionY,
            width: minionSize,
            height: minionSize,
            speed: zombiesData["minion"]?.speed || 3,
            health: zombiesData["minion"]?.health || 1,
            maxHealth: zombiesData["minion"]?.health || 1,
            color: zombiesData["minion"]?.color || "gray",
            type: "minion"
          });
        }
        timers.set(e, Date.now());
      }
    }
  }
  // Clean up timers for dead summoners
  for (const e of Array.from(timers.keys())) {
    if (!enemies.includes(e)) timers.delete(e);
  }
}

export function handleJuggernautAbility(enemies, zombiesData, player) {
  for (let e of enemies) {
    if (e.type === "Juggernaut") {
      const baseSpeed = zombiesData["Juggernaut"]?.speed || 0.3;
      const chargeSpeed = baseSpeed * 7.5; // Charge speed multiplier
      const ex = e.x + (e.width || 100) / 2;
      const ey = e.y + (e.height || 100) / 2;
      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;
      const dist = Math.hypot(px - ex, py - ey);

      if (dist > 300) {
        // Far: charge/run
        e.speed = chargeSpeed;
      } else {
        // Near: normal speed
        e.speed = baseSpeed;
      }
    }
  }
}

export function handleSpitterDeathSplit(enemy, enemies, zombiesData, canvasWidth) {
  if (enemy.type === "Spitter") {
    const zData = zombiesData["Spitter1"];
    if (!zData) return;
    for (let i = 0; i < 2; i++) {
      // Spawn near the original Spitter's position
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 10;
      const size = zData.size || 35;
      const x = enemy.x + (enemy.width || 40) / 2 + Math.cos(angle) * dist - size / 2;
      const y = enemy.y + (enemy.height || 40) / 2 + Math.sin(angle) * dist - size / 2;
      enemies.push({
        x,
        y,
        width: size,
        height: size,
        speed: zData.speed,
        health: zData.health,
        maxHealth: zData.health,
        color: zData.color || "red",
        type: "Spitter1"
      });
    }
  }
}

// --- Thrower Ability ---
export function handleThrowerAbility(enemies, player, projectiles, zombiesData) {
  if (!handleThrowerAbility.throwerTimers) {
    handleThrowerAbility.throwerTimers = new Map();
  }
  const timers = handleThrowerAbility.throwerTimers;

  for (let e of enemies) {
    if (e.type === "thrower") {
      if (!timers.has(e)) {
        timers.set(e, Date.now());
      }
      const lastThrow = timers.get(e);
      if (Date.now() - lastThrow >= 3000) {
        // Throw a rectangle projectile at the player
        const ex = e.x + (e.width || 45) / 2;
        const ey = e.y + (e.height || 45) / 2;
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dx = px - ex;
        const dy = py - ey;
        const dist = Math.hypot(dx, dy);
        const speed = 6;
        const projWidth = 18;
        const projHeight = 10;
        if (dist > 0) {
          projectiles.push({
            x: ex - projWidth / 2,
            y: ey - projHeight / 2,
            width: projWidth,
            height: projHeight,
            dx: (dx / dist) * speed,
            dy: (dy / dist) * speed,
            color: "#a0522d",
            from: "thrower"
          });
        }
        timers.set(e, Date.now());
      }
    }
  }
  // Clean up timers for dead throwers
  for (const e of Array.from(timers.keys())) {
    if (!enemies.includes(e)) timers.delete(e);
  }
}
