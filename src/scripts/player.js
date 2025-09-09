// --- Player Object ---
export let player = {
  x: 0, y: 0, width: 40, height: 40,
  baseSpeed: 6,
  maxHealth: 5, health: 5,
  magazineSize: 16, ammo: 16, reserveAmmo: 256,
  stamina: 100, maxStamina: 100,
  sprinting: false
};

// --- Stamina Bar UI (bottom left) ---
const staminaBar = document.createElement("div");
staminaBar.id = "staminaBar";
staminaBar.style.position = "absolute";
staminaBar.style.bottom = "60px";
staminaBar.style.left = "32px";
staminaBar.style.width = "200px";
staminaBar.style.height = "20px";
staminaBar.style.background = "#444";
staminaBar.style.border = "2px solid #fff";
staminaBar.style.borderRadius = "8px";
staminaBar.style.overflow = "hidden";
staminaBar.style.zIndex = 100;
document.body.appendChild(staminaBar);

const staminaFill = document.createElement("div");
staminaFill.style.height = "100%";
staminaFill.style.background = "linear-gradient(90deg, #80dfff, #4fc3f7)";
staminaFill.style.width = "100%";
staminaBar.appendChild(staminaFill);

export function updateStaminaBar() {
  staminaFill.style.width = (player.stamina / player.maxStamina * 100) + "%";
}

// --- Health Bar UI ---
export function updateHealthBar(healthBarElem) {
  const percent = Math.max(0, player.health) / player.maxHealth;
  healthBarElem.style.width = (percent * 100) + "%";
  if (percent > 0.6) healthBarElem.style.background = "linear-gradient(90deg, #4CAF50, #ffe066)";
  else if (percent > 0.3) healthBarElem.style.background = "linear-gradient(90deg, orange, #ffe066)";
  else healthBarElem.style.background = "linear-gradient(90deg, #d32f2f, #ffe066)";
}

// --- Movement & Sprint Logic ---
export function handleSprintKey(e, down) {
  if (e.key === "Shift") player.sprinting = down;
}

// --- Optimized Movement & Sprint Logic ---
export function updatePlayerMovement(keys, canvas) {
  // Sprint logic with multiplier and minimum threshold
  let speedMultiplier = 1;
  const minSprintStamina = 20;
  let canSprint = player.sprinting && player.stamina > minSprintStamina;

  if (canSprint) {
    speedMultiplier = 1.6;
    player.stamina -= 0.5;
    if (player.stamina < 0) player.stamina = 0;
  } else {
    speedMultiplier = 1;
    let moving = keys["ArrowLeft"] || keys["ArrowRight"] || keys["ArrowUp"] || keys["ArrowDown"];
    let regen = moving ? 0.15 : 0.25;
    player.stamina += regen;
    if (player.stamina > player.maxStamina) player.stamina = player.maxStamina;
    if (player.stamina < minSprintStamina) player.sprinting = false;
  }
  updateStaminaBar();

  // Movement (diagonal friendly)
  let dx = 0, dy = 0;
  if (keys["ArrowLeft"]) dx -= 1;
  if (keys["ArrowRight"]) dx += 1;
  if (keys["ArrowUp"]) dy -= 1;
  if (keys["ArrowDown"]) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    let nextX = player.x + dx * player.baseSpeed * speedMultiplier;
    let nextY = player.y + dy * player.baseSpeed * speedMultiplier;
    player.x = Math.max(0, Math.min(canvas.width - player.width, nextX));
    player.y = Math.max(0, Math.min(canvas.height - player.height, nextY));
  } else {
    // Clamp position if not moving
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
  }
}

// --- Utility ---
export function resetPlayer(canvas) {
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
  player.health = player.maxHealth;
  player.ammo = player.magazineSize;
  player.reserveAmmo = 256;
  player.stamina = player.maxStamina;
  player.sprinting = false;
  updateStaminaBar();
}
