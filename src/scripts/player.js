/* src/scripts/player.js */
import { input } from "./input.js";
import { playSound } from "./audio.js";
import { updateHUD } from "./ui.js";
import { reload } from "./reload.js";
import { 
    player, bullets, spawnBullet, getPlayerDamage, 
    isReloading, setIsReloading, setScore, 
    worldWidth, worldHeight, myId, updateLifetimeStat 
} from "./state.js";
import { spawnShell } from "./index.js"; 

function safePlaySound(name, volume = 1.0) {
    try {
        if (window.audioManager && window.audioManager.sounds && window.audioManager.sounds[name]) {
            playSound(name, volume);
        }
    } catch (e) { console.warn("Audio Error:", e); }
}

// --- 1. Damage & Hurt Logic ---
export function takeDamage(amount) {
    if (player.immune || player.isDead) return;

    // Frostbite Logic: +10% damage per stack
    const multiplier = 1 + (player.frostbiteStacks * 0.1);
    const finalDamage = amount * multiplier;

    player.health -= finalDamage;
    player.hurtTime = 15; 
    player.chromaticAberration = 10; // Trigger glitch effect
    safePlaySound("hitHurt", 0.8); 
    
    const healthBar = document.getElementById("healthFill");
    if (healthBar) {
        const percent = Math.max(0, player.health) / player.maxHealth;
        healthBar.style.width = (percent * 100) + "%";
    }
    
    if (player.health <= 0) {
        player.health = 0;
        if (!player.isDead) {
            player.isDead = true;
            player.deathTimer = 120; 
            safePlaySound("playerDeath", 1.0); 
            updateLifetimeStat("totalDeaths", 1);
        }
    }
}

// --- 2. Shooting Logic ---
export function playerShoot(targetX, targetY, camera, zoom) {
    if (!player || player.ammo <= 0 || isReloading || player.isFrozen) return;

    // Ageing Curse: 75% slower shooting speed (limit fire rate)
    const now = performance.now();
    const minDelay = player.ageingCurse ? 400 : 0; 
    if (now - (player.lastShootTime || 0) < minDelay) return;
    player.lastShootTime = now;

    player.ammo--;
    player.muzzleFlash = 3; // Trigger muzzle flash (frames)
    updateHUD();
    
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const speed = 7; 
    const realZoom = zoom || 1; 
    const worldX = targetX / realZoom + camera.x;
    const worldY = targetY / realZoom + camera.y;
    const angle = Math.atan2(worldY - cy, worldX - cx);

    const styleId = player.cosmetics?.bulletStyle || "default";

    // FIX: Pass 'myId' as the 8th argument
    const fire = (ang) => {
        spawnBullet(cx, cy, Math.cos(ang) * speed, Math.sin(ang) * speed, getPlayerDamage(), styleId, false, myId);
        spawnShell(cx, cy, ang); // Spawn shell casing
    };

    let bulletsFired = 1;
    if (player.tripleShot) {
        fire(angle - 0.25); fire(angle); fire(angle + 0.25);
        bulletsFired = 3;
    } else {
        fire(angle);
    }

    updateLifetimeStat("totalBulletsFired", bulletsFired);
    safePlaySound("laserShoot", 0.5); 
    if (window.onBulletFired) window.onBulletFired(bulletsFired);
}

// --- 3. Reload Logic ---
export function playerTryReload() {
    if (!isReloading && player.ammo < player.magazineSize && player.reserveAmmo > 0) {
        setIsReloading(true);
        safePlaySound("reload-gun"); 
        
        setTimeout(() => { 
            reload(player, updateHUD); 
            setIsReloading(false); 
        }, 3000); 
    }
}

// --- 4. Stamina UI Helper ---
let staminaBar, staminaFill;
function initStaminaBar() {
    const existingBar = document.getElementById("staminaBar");
    if (existingBar) {
        staminaBar = existingBar;
        staminaFill = staminaBar.querySelector("div");
        if (!staminaFill) {
            staminaFill = document.createElement("div");
            Object.assign(staminaFill.style, { height: "100%", background: "linear-gradient(90deg, #80dfff, #4fc3f7)", width: "100%" });
            staminaBar.appendChild(staminaFill);
        }
        return;
    }
    staminaBar = document.createElement("div");
    staminaBar.id = "staminaBar";
    Object.assign(staminaBar.style, { position: "absolute", bottom: "60px", left: "32px", width: "200px", height: "20px", background: "#444", border: "2px solid #fff", borderRadius: "8px", overflow: "hidden", zIndex: "100" });
    document.body.appendChild(staminaBar);

    staminaFill = document.createElement("div");
    Object.assign(staminaFill.style, { height: "100%", background: "linear-gradient(90deg, #80dfff, #4fc3f7)", width: "100%" });
    staminaBar.appendChild(staminaFill);
}

export function updateStaminaBar() {
    if (!staminaFill) initStaminaBar();
    if (staminaFill) staminaFill.style.width = (player.stamina / player.maxStamina * 100) + "%";
}

export function handleSprintKey(e, down) {
    if (e.key === "Shift") player.sprinting = down;
}

// --- 5. Movement Logic ---
export function updatePlayerMovement(keys, canvas, timeScale = 1) {
    if (!player) return;
    if (player.hurtTime > 0) player.hurtTime--;

    // --- Record History for Chrono-Thief (Time Skip) ---
    if (!player.positionHistory) player.positionHistory = [];
    player.positionHistory.push({ x: player.x, y: player.y });
    if (player.positionHistory.length > 180) { // Keep ~3 seconds at 60fps
        player.positionHistory.shift();
    }

    // --- Ageing Curse Timer ---
    if (player.ageingCurse) {
        player.ageingTimer -= timeScale;
        if (player.ageingTimer <= 0) player.ageingCurse = false;
    }

    // --- FROZEN LOGIC (Deep Freeze) ---
    if (player.isFrozen) {
        player.freezeTimer -= timeScale;
        if (player.freezeTimer <= 0) {
            player.isFrozen = false;
        } else {
            // Player cannot move while frozen
            updateStaminaBar();
            return;
        }
    }

    let speedMultiplier = 1;

    // --- SLIDING LOGIC (Flash Freeze) ---
    if (player.isSliding) {
        player.slideTimer -= timeScale;
        if (player.slideTimer <= 0) {
            player.isSliding = false;
        } else {
            // Uncontrollable slide
            let moveSpeed = (player.speed || 5);
            // Sliding is faster than walking but uncontrollable
            let nextX = player.x + player.slideDir.x * moveSpeed * 1.5 * timeScale;
            let nextY = player.y + player.slideDir.y * moveSpeed * 1.5 * timeScale;
            
            player.x = Math.max(0, Math.min(worldWidth - player.width, nextX));
            player.y = Math.max(0, Math.min(worldHeight - player.height, nextY));
            
            updateStaminaBar();
            return; // Skip normal movement
        }
    }

    // Dash
    if (player.dashTime > 0) {
        speedMultiplier = 3.5; 
        player.dashTime--;
        player.dashActive = true; 
    } else {
        if (player.ageingCurse) speedMultiplier *= 0.5; // Ageing Curse Penalty

        player.dashActive = false;
        if (player.dashCooldown > 0) player.dashCooldown--;

        const DASH_COST = 25;
        const DASH_COOLDOWN_FRAMES = 45; 
        const DASH_DURATION = 10;        

        if (input.dashPressed && player.dashCooldown <= 0 && player.stamina >= DASH_COST) {
            player.dashTime = DASH_DURATION;
            player.dashCooldown = DASH_COOLDOWN_FRAMES;
            player.stamina -= DASH_COST;
            player.dashActive = true; 
            safePlaySound("Dash"); 
            updateStaminaBar();
        } 
        else {
            const minSprintStamina = 20;
            let canSprint = player.sprinting && player.stamina > minSprintStamina;
            if (canSprint) {
                speedMultiplier = 1.6;
                player.stamina -= 0.5 * timeScale; 
                if (player.stamina < 0) player.stamina = 0;
            } else {
                let moving = keys["ArrowLeft"] || keys["ArrowRight"] || keys["ArrowUp"] || keys["ArrowDown"] || Math.abs(input.move.x) > 0.1 || Math.abs(input.move.y) > 0.1;
                let regen = moving ? 0.15 : 0.25;
                player.stamina += regen * timeScale;
                if (player.stamina > player.maxStamina) player.stamina = player.maxStamina;
                if (player.stamina < minSprintStamina) player.sprinting = false;
            }
        }
    }
    updateStaminaBar();

    let dx = 0, dy = 0;
    if (keys["ArrowLeft"]) dx -= 1;
    if (keys["ArrowRight"]) dx += 1;
    if (keys["ArrowUp"]) dy -= 1;
    if (keys["ArrowDown"]) dy += 1;

    if (Math.abs(input.move.x) > 0.1 || Math.abs(input.move.y) > 0.1) {
        dx = input.move.x;
        dy = input.move.y;
    }

    if ((keys["ArrowLeft"] || keys["ArrowRight"] || keys["ArrowUp"] || keys["ArrowDown"]) && (dx !== 0 || dy !== 0)) {
       const len = Math.hypot(dx, dy);
       if (len > 0) { dx /= len; dy /= len; }
    }

    if (dx !== 0 || dy !== 0) {
        let moveSpeed = (player.speed || 5); 
        let nextX = player.x + dx * moveSpeed * speedMultiplier * timeScale;
        let nextY = player.y + dy * moveSpeed * speedMultiplier * timeScale;
        
        player.x = Math.max(0, Math.min(worldWidth - player.width, nextX));
        player.y = Math.max(0, Math.min(worldHeight - player.height, nextY));
    }
}

export function resetPlayer(canvas) {
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 20;
  player.health = player.maxHealth;
  player.ammo = player.magazineSize;
  player.reserveAmmo = 1250;
  player.stamina = player.maxStamina;
  player.sprinting = false;
  player.dashCooldown = 0;
  player.dashTime = 0;
  player.dashActive = false;
  player.isDead = false;
  player.deathTimer = 0; 
  player.hurtTime = 0;
  updateStaminaBar();
}