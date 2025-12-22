/* src/scripts/enemyAbility.js */

export function handleSummonerAbility(enemies, zombiesData, canvas) {
  if (!handleSummonerAbility.summonerTimers) {
    handleSummonerAbility.summonerTimers = new Map();
  }
  const timers = handleSummonerAbility.summonerTimers;

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
  for (const e of Array.from(timers.keys())) { if (!enemies.includes(e)) timers.delete(e); }
}

export function handleJuggernautAbility(enemies, zombiesData, player) {
  for (let e of enemies) {
    if (e.type === "Juggernaut") {
      const baseSpeed = zombiesData["Juggernaut"]?.speed || 0.3;
      const chargeSpeed = baseSpeed * 7.5;
      const ex = e.x + (e.width || 100) / 2;
      const ey = e.y + (e.height || 100) / 2;
      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;
      const dist = Math.hypot(px - ex, py - ey);
      if (dist > 300) e.speed = chargeSpeed; else e.speed = baseSpeed;
    }
  }
}

export function handleSplitterDeathSplit(enemy, enemies, zombiesData, canvasWidth) {
  if (enemy.type === "Splitter") {
    const zData = zombiesData["SplitterMinion"];
    if (!zData) return;
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 10;
      const size = zData.size || 35;
      const x = enemy.x + (enemy.width || 40) / 2 + Math.cos(angle) * dist - size / 2;
      const y = enemy.y + (enemy.height || 40) / 2 + Math.sin(angle) * dist - size / 2;
      enemies.push({
        x, y, width: size, height: size,
        speed: zData.speed, health: zData.health, maxHealth: zData.health,
        color: zData.color || "red", type: "SplitterMinion"
      });
    }
  }
}

export function handleThrowerAbility(enemies, player, projectiles, zombiesData) {
  if (!handleThrowerAbility.throwerTimers) handleThrowerAbility.throwerTimers = new Map();
  const timers = handleThrowerAbility.throwerTimers;

  for (let e of enemies) {
    if (e.type === "thrower") {
      if (!timers.has(e)) timers.set(e, Date.now());
      if (Date.now() - timers.get(e) >= 3000) {
        const ex = e.x + e.width/2, ey = e.y + e.height/2;
        const px = player.x + player.width/2, py = player.y + player.height/2;
        const dx = px - ex, dy = py - ey;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          projectiles.push({
            x: ex - 9, y: ey - 5, width: 18, height: 10,
            dx: (dx/dist)*6, dy: (dy/dist)*6, color: "#a0522d", from: "thrower"
          });
        }
        timers.set(e, Date.now());
      }
    }
  }
  for (const e of Array.from(timers.keys())) { if (!enemies.includes(e)) timers.delete(e); }
}

export function handleAcidSpitterAbility(enemies, player, projectiles) {
    if (!handleAcidSpitterAbility.timers) handleAcidSpitterAbility.timers = new Map();
    const timers = handleAcidSpitterAbility.timers;
  
    for (let e of enemies) {
      if (e.type === "Spitter") {
        if (!timers.has(e)) timers.set(e, Date.now());
        
        if (Date.now() - timers.get(e) >= 2500) {
          const ex = e.x + e.width/2, ey = e.y + e.height/2;
          const px = player.x + player.width/2, py = player.y + player.height/2;
          const dx = px - ex, dy = py - ey;
          const dist = Math.hypot(dx, dy);
          
          // UPDATED: Engagement range decreased to 400 (Must get closer)
          if (dist > 0 && dist < 400) { 
            projectiles.push({
              x: ex - 6, y: ey - 6, width: 12, height: 12,
              startX: ex, startY: ey,
              dx: (dx/dist)*10, dy: (dy/dist)*10, // Slightly Faster Projectile
              targetDist: dist, 
              color: "#c6ff00", from: "acid"
            });
          }
          timers.set(e, Date.now());
        }
      }
    }
    for (const e of Array.from(timers.keys())) { if (!enemies.includes(e)) timers.delete(e); }
}

export function handleLinkerAbility(enemies, ctx, camera) {
  const range = 250; 
  for (let e of enemies) {
    if (e.type === "linker") {
       const ex = e.x + e.width/2;
       const ey = e.y + e.height/2;
       
       for(let other of enemies) {
         if (other === e || other.type === "linker") continue;
         const ox = other.x + other.width/2;
         const oy = other.y + other.height/2;
         const dist = Math.hypot(ex - ox, ey - oy);
         
         if (dist < range) {
           if (other.health < other.maxHealth && Math.random() < 0.05) {
             other.health = Math.min(other.maxHealth, other.health + 1);
           }
           if (ctx) {
             ctx.save();
             ctx.strokeStyle = "rgba(0, 255, 100, 0.4)";
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.moveTo(ex - camera.x, ey - camera.y);
             ctx.lineTo(ox - camera.x, oy - camera.y);
             ctx.stroke();
             ctx.restore();
           }
         }
       }
    }
  }
}

export function handleSniperAbility(enemies, player, projectiles) {
  for (let e of enemies) {
    if (e.type === "sniper") {
      if (!e.sniperState) {
        e.sniperState = { phase: "aim", timer: Date.now(), angle: 0 };
      }
      const state = e.sniperState;
      
      const ex = e.x + e.width/2;
      const ey = e.y + e.height/2;
      const px = player.x + player.width/2;
      const py = player.y + player.height/2;
      
      if (state.phase === "aim") {
        e.speed = 0; 
        const timeElapsed = Date.now() - state.timer;
        const totalAimTime = 2000;
        const lockTime = 1500; 

        if (timeElapsed < lockTime) {
            state.angle = Math.atan2(py - ey, px - ex);
        }

        if (timeElapsed > totalAimTime) {
          state.phase = "fire";
          state.timer = Date.now();
        }
      }
      else if (state.phase === "fire") {
          projectiles.push({
            x: ex - 5, y: ey - 5, width: 12, height: 12,
            dx: Math.cos(state.angle) * 22, 
            dy: Math.sin(state.angle) * 22,
            color: "#ff0000",
            from: "sniper"
          });
          
          state.phase = "cooldown";
          state.timer = Date.now();
      }
      else if (state.phase === "cooldown") {
          e.speed = 1.5; 
          if (Date.now() - state.timer > 2000) {
              state.phase = "aim";
              state.timer = Date.now();
          }
      }
    }
  }
}