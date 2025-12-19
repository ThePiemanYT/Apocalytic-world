/* src/scripts/player.js */
import { input } from "./input.js";
import { playSound } from "./audio.js";

// --- Player Object ---
export let player = {
  x: 0, y: 0, width: 40, height: 40,
  baseSpeed: 4,
  maxHealth: 5, health: 5,
  magazineSize: 40, ammo: 40, reserveAmmo: 1000,
  stamina: 100, maxStamina: 100,
  sprinting: false,
  
  // Dash State
  dashCooldown: 0,
  dashTime: 0,

  // --- Upgrade stats ---
  upgrades: {
    damage: 0,    // +1 damage per level
    health: 0,    // +2 max health per level
    speed: 0,     // +0.5 speed per level
    recoil: 0,    // reduces recoil when hit
    knockback: 0  // increases bullet knockback on enemies
  }
};

// --- Stamina Bar UI (bottom left) ---
const staminaBar = document.createElement("div");
staminaBar.id = "staminaBar";
Object.assign(staminaBar.style, {
  position: "absolute", bottom: "60px", left: "32px",
  width: "200px", height: "20px", background: "#444",
  border: "2px solid #fff", borderRadius: "8px",
  overflow: "hidden", zIndex: "100"
});
document.body.appendChild(staminaBar);

const staminaFill = document.createElement("div");
Object.assign(staminaFill.style, {
  height: "100%", background: "linear-gradient(90deg, #80dfff, #4fc3f7)", width: "100%"
});
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
  let speedMultiplier = 1;

  // 1. Dash Logic (High priority)
  if (player.dashTime > 0) {
      speedMultiplier = 3.5; // Burst speed
      player.dashTime--;
  } else {
      // Cooldown Tick
      if (player.dashCooldown > 0) player.dashCooldown--;

      // Check Dash Input
      const DASH_COST = 25;
      const DASH_COOLDOWN_FRAMES = 45; // ~0.75s
      const DASH_DURATION = 10;        // ~0.16s

      if (input.dashPressed && player.dashCooldown <= 0 && player.stamina >= DASH_COST) {
          player.dashTime = DASH_DURATION;
          player.dashCooldown = DASH_COOLDOWN_FRAMES;
          player.stamina -= DASH_COST;
          playSound("dash"); // <--- PLAY DASH SOUND
          updateStaminaBar();
      } 
      // 2. Sprint Logic (Low priority)
      else {
          const minSprintStamina = 20;
          let canSprint = player.sprinting && player.stamina > minSprintStamina;

          if (canSprint) {
              speedMultiplier = 1.6;
              player.stamina -= 0.5;
              if (player.stamina < 0) player.stamina = 0;
          } else {
              let moving = keys["ArrowLeft"] || keys["ArrowRight"] || keys["ArrowUp"] || keys["ArrowDown"];
              let regen = moving ? 0.15 : 0.25;
              player.stamina += regen;
              if (player.stamina > player.maxStamina) player.stamina = player.maxStamina;
              if (player.stamina < minSprintStamina) player.sprinting = false;
          }
      }
  }
  updateStaminaBar();

  // Movement (diagonal friendly)
  let dx = 0, dy = 0;
  // Combine Input (Keys + Virtual Joystick from Input module)
  if (keys["ArrowLeft"] || input.move.x < -0.1) dx -= 1;
  if (keys["ArrowRight"] || input.move.x > 0.1) dx += 1;
  if (keys["ArrowUp"] || input.move.y < -0.1) dy -= 1;
  if (keys["ArrowDown"] || input.move.y > 0.1) dy += 1;

  // Use Analog input if available (smoother 360 movement)
  if (Math.abs(input.move.x) > 0.1 || Math.abs(input.move.y) > 0.1) {
      dx = input.move.x;
      dy = input.move.y;
  }

  // Normalize if using keyboard (prevents faster diagonal speed)
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (keys["ArrowLeft"] || keys["ArrowRight"])) {
     const len = Math.hypot(dx, dy);
     if (len > 0) { dx /= len; dy /= len; }
  }

  if (dx !== 0 || dy !== 0) {
    let nextX = player.x + dx * player.baseSpeed * speedMultiplier;
    let nextY = player.y + dy * player.baseSpeed * speedMultiplier;
    player.x = Math.max(0, Math.min(canvas.width - player.width, nextX));
    player.y = Math.max(0, Math.min(canvas.height - player.height, nextY));
  }
}

// --- Utility ---
export function resetPlayer(canvas) {
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
  player.health = player.maxHealth;
  player.ammo = player.magazineSize;
  player.reserveAmmo = 1000;
  player.stamina = player.maxStamina;
  player.sprinting = false;
  player.dashCooldown = 0;
  player.dashTime = 0;
  updateStaminaBar();
}