export const powerupTypes = [
  {
    type: "ammo",
    color: "blue",
    effect: (player, updateAmmoDisplay, showPowerupMessage, updateHealthBar) => {
      player.reserveAmmo += 42;
      if (updateAmmoDisplay) updateAmmoDisplay();
      if (showPowerupMessage) showPowerupMessage("+42 Ammo");
    }
  },
  {
    type: "health",
    color: "green",
    effect: (player, _, showPowerupMessage, updateHealthBar) => {
      if (player.health < player.maxHealth) {
        player.health = Math.min(player.maxHealth, player.health + 1);
        if (updateHealthBar) updateHealthBar();
        if (showPowerupMessage) showPowerupMessage("+1 Health");
      } else {
        if (showPowerupMessage) showPowerupMessage("Health Full");
      }
    }
  },
  {
    type: "double",
    color: "yellow",
    effect: (player, _, showPowerupMessage) => {
      if (!player.doubleDamage) {
        player.doubleDamage = true;
        if (showPowerupMessage) showPowerupMessage("Double Damage!");
        setTimeout(() => (player.doubleDamage = false), 5000);
      } else {
        if (showPowerupMessage) showPowerupMessage("Already Double Damage!");
      }
    }
  }
];

export let powerups = [];

export function spawnPowerups() {
  powerups.length = 0;
  const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
  for (let i = 0; i < count; i++) {
    const pType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    powerups.push({
      x: Math.random() * (window.innerWidth - 30),
      y: Math.random() * (window.innerHeight - 30),
      width: 24,
      height: 24,
      type: pType
    });
  }
}

// Call this from your game loop (after drawing everything else)
export function drawAndHandlePowerups(ctx, player, updateAmmoDisplay, sfxEnabled, selectSound, updateHealthBar) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i];
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y < p.y + p.height &&
      player.y + player.height > p.y
    ) {
      // apply effect (pass updateHealthBar as 4th arg)
      p.type.effect(player, updateAmmoDisplay, showPowerupMessage, updateHealthBar);
      // --- Always update health bar after picking up any powerup ---
      if (updateHealthBar) updateHealthBar();
      powerups.splice(i, 1);
      if (sfxEnabled && selectSound) {
        selectSound.currentTime = 0;
        selectSound.play();
      }
    }
  }
  powerups.forEach(p => {
    ctx.fillStyle = p.type.color;
    ctx.fillRect(p.x, p.y, p.width, p.height);
  });
}

// --- Powerup message UI ---
let powerupMsgDiv = null;
function showPowerupMessage(msg) {
  if (!powerupMsgDiv) {
    powerupMsgDiv = document.createElement("div");
    powerupMsgDiv.id = "powerupMsgDiv";
    powerupMsgDiv.style.position = "fixed";
    powerupMsgDiv.style.left = "50%";
    powerupMsgDiv.style.top = "50%";
    powerupMsgDiv.style.transform = "translate(-50%, -50%)";
    powerupMsgDiv.style.fontSize = "38px";
    powerupMsgDiv.style.color = "#ffe066";
    powerupMsgDiv.style.fontFamily = "Press Start 2P, Arial, sans-serif";
    powerupMsgDiv.style.textShadow = "2px 2px 8px #222";
    powerupMsgDiv.style.zIndex = 2001;
    powerupMsgDiv.style.pointerEvents = "none";
    document.body.appendChild(powerupMsgDiv);
  }
  powerupMsgDiv.textContent = msg;
  powerupMsgDiv.style.opacity = "1";
  setTimeout(() => {
    powerupMsgDiv.style.opacity = "0";
  }, 1200);
}
