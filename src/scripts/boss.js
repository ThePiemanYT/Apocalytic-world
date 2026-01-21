/* src/scripts/boss.js */
import { checkCollision } from "./map.js";
import { showBossWarning } from "./ui.js"; 
import { worldWidth, worldHeight } from "./state.js"; 

// --- HELPER: Line of Sight ---
function hasLineOfSight(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 40); 
    for(let i=1; i < steps; i++) {
        const t = i / steps;
        const lx = x1 + (x2 - x1) * t;
        const ly = y1 + (y2 - y1) * t;
        if (checkCollision(lx, ly, 10, 10)) return false; 
    }
    return true;
}

// --- BOSS FACTORY ---
export function createBoss(type, canvasWidth, canvasHeight) {
    const isSentinel = type === "Sentinel";
    const isFrost = type === "Frost-Core Construct";
    const isChrono = type === "The Chrono-Thief";
    const x = canvasWidth / 2 - 50;
    const y = -150; 

    return {
        type: type,
        isBoss: true,
        x: x, y: y,
        width: isSentinel ? 100 : (isFrost ? 110 : (isChrono ? 111 : 90)), // Small Imp -> Buffed size (111)
        height: isSentinel ? 100 : (isFrost ? 110 : (isChrono ? 111 : 90)),
        speed: isSentinel ? 0.5 : (isFrost ? 0.8 : (isChrono ? 3.5 : 2)), // Very Fast
        health: isFrost ? 315 : (isSentinel ? 750 : (isChrono ? 395 : 900)), 
        maxHealth: isFrost ? 315 : (isSentinel ? 750 : (isChrono ? 395 : 900)),
        color: isFrost ? "#e1f5fe" : (isSentinel ? "#29b6f6" : (isChrono ? "#6200ea" : "#5d4037")),
        hitFlash: 0,
        
        state: "enter", 
        stateTimer: 0,
        
        rotation: 0,
        shields: isSentinel ? [0, (Math.PI*2)/3, (Math.PI*2)*2/3] : [], 
        
        // Frost Specifics
        iceWalls: [],
        freezeCooldown: 0,

        // Chrono Specifics
        chronoCooldown: 0,
        flashActive: false,
        flashTimer: 0,
        teleportCount: 0,
        
        // Sentinel Specifics
        summonCooldown: 0,
        
        // Crusher Specifics
        chargeDir: { x: 0, y: 0 },
        stunned: false,
        phaseThroughWalls: false 
    };
}

// --- MAIN UPDATE LOOP ---
export function updateBoss(boss, player, projectiles, enemies, effects, timeScale, spawnMinion) {
    boss.stateTimer++;
    const cx = boss.x + boss.width/2;
    const cy = boss.y + boss.height/2;
    const px = player.x + player.width/2;
    const py = player.y + player.height/2;

    // --- SHARED: ENTER PHASE ---
    if (boss.state === "enter") {
        boss.y += 2 * timeScale;
        if (boss.y >= 100) {
            boss.state = "idle";
            boss.stateTimer = 0;
            if (typeof showBossWarning === "function") {
                showBossWarning(boss.type.toUpperCase());
            }
        }
        return;
    }

    // =========================================
    // BOSS 1: THE SENTINEL
    // =========================================
    if (boss.type === "Sentinel") {
        boss.rotation += 0.02 * timeScale;
        if (boss.summonCooldown > 0) boss.summonCooldown -= timeScale;
        
        // 1. Idle / Decide
        if (boss.state === "idle") {
            const ang = Math.atan2(py - cy, px - cx);
            boss.x += Math.cos(ang) * boss.speed * timeScale;
            boss.y += Math.sin(ang) * boss.speed * timeScale;

            if (boss.stateTimer > 100) { 
                const hpPercent = boss.health / boss.maxHealth;
                const rand = Math.random();
                
                if (hpPercent < 0.5 && boss.summonCooldown <= 0) {
                    boss.state = "summon";
                } else if (rand < 0.4) {
                    boss.state = "spiral";
                } else if (rand < 0.7) {
                    boss.state = "laser";
                } else {
                    boss.state = "teleport";
                }
                boss.stateTimer = 0;
            }
        }
        
        // 2. Spiral Attack
        else if (boss.state === "spiral") {
            boss.rotation += 0.1 * timeScale;
            if (boss.stateTimer % 8 === 0) {
                const count = 8;
                for(let i=0; i<count; i++) {
                    const fireAng = boss.rotation + (i * (Math.PI * 2 / count));
                    projectiles.push({
                        x: cx, y: cy, width: 14, height: 14,
                        dx: Math.cos(fireAng) * 7, dy: Math.sin(fireAng) * 7,
                        color: "#ff4081", from: "boss"
                    });
                }
            }
            if (boss.stateTimer > 120) { boss.state = "idle"; boss.stateTimer = 0; }
        }
        
        // 3. Laser Railgun
        else if (boss.state === "laser") {
            if (boss.stateTimer < 50) {
                boss.targetAngle = Math.atan2(py - cy, px - cx);
            } else if (boss.stateTimer === 50) {
                projectiles.push({
                    x: cx, y: cy, width: 50, height: 50, 
                    dx: Math.cos(boss.targetAngle) * 18, 
                    dy: Math.sin(boss.targetAngle) * 18,
                    color: "red", from: "boss_sniper"
                });
                if(effects && effects.shake) effects.shake(12);
            }
            if (boss.stateTimer > 90) { boss.state = "idle"; boss.stateTimer = 0; }
        }
        
        // 4. Teleport
        else if (boss.state === "teleport") {
            boss.rotation += 0.5; 
            if (boss.stateTimer === 1 && effects && effects.spawnText) {
                effects.spawnText(cx, cy - 60, "PHASE SHIFT", "#00e5ff", 20);
            }

            if (boss.stateTimer > 40) {
                if (effects && effects.spawnExplosion) effects.spawnExplosion(cx, cy, 80, "#29b6f6"); 

                const angle = Math.random() * Math.PI * 2;
                const dist = 350; 
                let nx = px + Math.cos(angle) * dist - boss.width/2;
                let ny = py + Math.sin(angle) * dist - boss.height/2;
                nx = Math.max(100, Math.min(worldWidth - 200, nx));
                ny = Math.max(100, Math.min(worldHeight - 200, ny));

                boss.x = nx; boss.y = ny;
                boss.state = "spiral"; 
                boss.stateTimer = 0;
                
                if (effects && effects.playExplosion) effects.playExplosion();
            }
        }

        // 5. Summon Minions
        else if (boss.state === "summon") {
            boss.rotation -= 0.2; 
            if (boss.stateTimer === 1 && effects) {
                effects.spawnText(cx, cy - 80, "ELITE REINFORCEMENTS!", "#d500f9", 24);
                effects.shake(5);
            }

            if (boss.stateTimer === 60) {
                const count = Math.floor(Math.random() * 3) + 3; 
                const types = ['Splitter', 'Spitter', 'giant', 'tank', 'normal', 'speed'];
                
                for(let i=0; i<count; i++) {
                    const angle = (i * (Math.PI*2)/count) + Math.random();
                    const dist = 80;
                    const type = types[Math.floor(Math.random() * types.length)];
                    
                    if (spawnMinion) {
                        spawnMinion(type, cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist);
                    }
                    
                    if (effects && effects.spawnExplosion) 
                        effects.spawnExplosion(cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist, 40, "purple");
                }
                boss.summonCooldown = 600; 
                boss.state = "idle";
                boss.stateTimer = 0;
            }
        }
    }

    // =========================================
    // BOSS 3: THE FROST-CORE CONSTRUCT
    // =========================================
    else if (boss.type === "Frost-Core Construct") {
        boss.rotation += 0.01 * timeScale;
        if (boss.freezeCooldown > 0) boss.freezeCooldown -= timeScale;

        // 1. Idle / Follow
        if (boss.state === "idle") {
            const ang = Math.atan2(py - cy, px - cx);
            boss.x += Math.cos(ang) * boss.speed * timeScale;
            boss.y += Math.sin(ang) * boss.speed * timeScale;

            if (boss.stateTimer > 180) {
                const hpPercent = boss.health / boss.maxHealth;
                const rand = Math.random();
                
                // Below 35% HP, Flash Freeze is favored (60% chance if available)
                if (hpPercent < 0.35) {
                     if (rand < 0.6 && boss.freezeCooldown <= 0) boss.state = "flash_freeze";
                     else if (rand < 0.8) boss.state = "glacial_wall";
                     else boss.state = "frost_bolt";
                } 
                // Normal phase
                else {
                    if (rand < 0.4 && boss.freezeCooldown <= 0) boss.state = "flash_freeze";
                    else if (rand < 0.6) boss.state = "glacial_wall";
                    else boss.state = "frost_bolt";
                }
                boss.stateTimer = 0;
            }
        }

        // 2. Frost Bolt (Brittle Touch)
        else if (boss.state === "frost_bolt") {
            // Buff: Shoot more often (every 13 frames instead of 20 -> ~50% more projectiles)
            if (boss.stateTimer % 13 === 0) {
                const ang = Math.atan2(py - cy, px - cx);
                projectiles.push({
                    x: cx, y: cy, width: 16, height: 16,
                    dx: Math.cos(ang) * 6, dy: Math.sin(ang) * 6,
                    color: "#b3e5fc", from: "frost_boss"
                });
            }
            if (boss.stateTimer > 80) { boss.state = "idle"; boss.stateTimer = 0; }
        }

        // 3. Deep Freeze (Freezes Player in Place)
        else if (boss.state === "glacial_wall") { // Keeping state name for logic flow
            if (boss.stateTimer === 1) {
                if (effects && effects.spawnText) effects.spawnText(cx, cy - 60, "DEEP FREEZE", "#00b0ff", 20);
                if (effects && effects.shake) effects.shake(5);
            }
            
            // Channel for 1 second (60 frames) then freeze
            if (boss.stateTimer === 60) {
                 if (effects && effects.spawnExplosion) effects.spawnExplosion(px, py, 60, "#81d4fa");
                 if (effects && effects.spawnText) effects.spawnText(px, py - 40, "FROZEN!", "#00e5ff", 24);
                 
                 // Apply Freeze Status to Player
                 player.isFrozen = true;
                 player.freezeTimer = 150; // 2.5 seconds at 60fps
            }

            if (boss.stateTimer > 80) { boss.state = "idle"; boss.stateTimer = 0; }
        }

        // 4. Flash Freeze
        else if (boss.state === "flash_freeze") {
            if (boss.stateTimer < 40) {
                // Charging effect
                boss.rotation += 0.2;
            } else if (boss.stateTimer === 40) {
                if (effects && effects.shake) effects.shake(15);
                
                // BUFFED: Huge area of effect (1200 radius)
                if (effects && effects.spawnExplosion) effects.spawnExplosion(cx, cy, 1200, "rgba(179, 229, 252, 0.3)");
                
                // Check if player is moving
                const isMoving = Math.abs(player.x - (player._lastX || player.x)) > 0.1 || Math.abs(player.y - (player._lastY || player.y)) > 0.1;
                const dist = Math.hypot(px - cx, py - cy);
                
                // Logic check: Must be moving AND within the huge range
                if (isMoving && dist < 1200) {
                    player.isSliding = true;
                    player.slideTimer = 90; 
                    const ang = Math.atan2(py - cy, px - cx);
                    player.slideDir = { x: Math.cos(ang), y: Math.sin(ang) };
                    if (effects && effects.spawnText) effects.spawnText(px, py - 40, "FLASH FREEZE!", "#00e5ff", 24);
                }
                boss.freezeCooldown = 400;
            }
            if (boss.stateTimer > 80) { boss.state = "idle"; boss.stateTimer = 0; }
        }
        
        // Update player last position for movement check
        player._lastX = player.x;
        player._lastY = player.y;
    }

    // =========================================
    // BOSS 4: THE CHRONO-THIEF
    // =========================================
    else if (boss.type === "The Chrono-Thief") {
        boss.rotation = Math.sin(performance.now()/200) * 0.2;
        if (boss.chronoCooldown > 0) boss.chronoCooldown -= timeScale;

        // 1. Idle / Skittish Movement
        if (boss.state === "idle") {
            const speed = boss.flashActive ? boss.speed * 3 : boss.speed;
            const targetX = px + Math.cos(performance.now()/500) * 150;
            const targetY = py + Math.sin(performance.now()/500) * 150;
            const ang = Math.atan2(targetY - cy, targetX - cx);
            
            boss.x += Math.cos(ang) * speed * timeScale;
            boss.y += Math.sin(ang) * speed * timeScale;

            if (boss.flashActive) {
                boss.flashTimer -= timeScale;
                if (boss.flashTimer <= 0) boss.flashActive = false;
                // Create afterimages
                if (effects && effects.spawnExplosion && Math.random() < 0.3) 
                    effects.spawnExplosion(cx, cy, 30, "rgba(98, 0, 234, 0.3)");
            }

            if (boss.stateTimer > 120) {
                const rand = Math.random();
                const hpPercent = boss.health / boss.maxHealth;

                if (boss.chronoCooldown <= 0) {
                    if (hpPercent < 0.3) {
                        // ENRAGED PHASE: Aggressing Time (55%), others 15% each
                        if (rand < 0.15) boss.state = "time_skip";
                        else if (rand < 0.30) boss.state = "ageing_curse";
                        else if (rand < 0.45) boss.state = "flash_forward";
                        else boss.state = "aggressing_time"; // 55% Chance
                    } else {
                        // NORMAL PHASE: Aggressing Time (10%), others 30% each
                        if (rand < 0.3) boss.state = "time_skip";
                        else if (rand < 0.6) boss.state = "ageing_curse";
                        else if (rand < 0.9) boss.state = "flash_forward";
                        else boss.state = "aggressing_time";
                    }
                } else {
                    // If cooldown active, chance to aggress if Enraged
                    if (hpPercent < 0.3 && Math.random() < 0.4) boss.state = "aggressing_time";
                    else if (Math.random() < 0.15) boss.state = "aggressing_time";
                }
                boss.stateTimer = 0;
            }
        }

        // 2. Time Skip (Rewind Player)
        else if (boss.state === "time_skip") {
            if (boss.stateTimer === 1) {
                 if (effects && effects.spawnText) effects.spawnText(cx, cy - 60, "TIME REWIND!", "#b388ff", 20);
                 if (effects && effects.spawnExplosion) effects.spawnExplosion(px, py, 60, "#651fff");
            }
            if (boss.stateTimer === 30) {
                 // Rewind 3 seconds (180 frames)
                 if (player.positionHistory && player.positionHistory.length > 0) {
                     const oldPos = player.positionHistory[0]; // Oldest entry
                     player.x = oldPos.x;
                     player.y = oldPos.y;
                     if (effects && effects.spawnText) effects.spawnText(player.x, player.y, "REWOUND!", "#ea80fc", 24);
                     if (effects && effects.playExplosion) effects.playExplosion();
                 }
                 boss.chronoCooldown = 300;
            }
            if (boss.stateTimer > 60) { boss.state = "idle"; boss.stateTimer = 0; }
        }

        // 3. Flash Forward (Speed Boost)
        else if (boss.state === "flash_forward") {
            if (boss.stateTimer === 1) {
                if (effects && effects.spawnText) effects.spawnText(cx, cy - 60, "FLASH FORWARD", "#ffff00", 20);
                boss.flashActive = true;
                boss.flashTimer = 180; // 3 seconds
            }
            if (boss.stateTimer > 20) { boss.state = "idle"; boss.stateTimer = 0; }
        }

        // 4. Ageing Curse (Slow Player)
        else if (boss.state === "ageing_curse") {
             if (boss.stateTimer === 1) {
                 if (effects && effects.spawnText) effects.spawnText(cx, cy - 60, "WITHER!", "#6200ea", 20);
             }
             if (boss.stateTimer === 40) {
                 player.ageingCurse = true;
                 player.ageingTimer = 300; // 5 seconds
                 if (effects && effects.spawnExplosion) effects.spawnExplosion(px, py, 100, "rgba(50, 50, 50, 0.8)");
                 if (effects && effects.spawnText) effects.spawnText(px, py - 40, "CURSED", "gray", 24);
                 boss.chronoCooldown = 400;
             }
             if (boss.stateTimer > 60) { boss.state = "idle"; boss.stateTimer = 0; }
        }

        // 5. Aggressing Time (Random Teleports)
        else if (boss.state === "aggressing_time") {
             if (boss.stateTimer === 1) {
                 if (effects && effects.spawnText) effects.spawnText(cx, cy - 60, "CHAOS!", "#ff1744", 20);
                 boss.teleportCount = 0;
             }
             
             // NERFED: Adjusted duration to ~3.5s (7 teleports * 30 frames)
             if (boss.stateTimer % 30 === 0 && boss.teleportCount < 7) {
                 // Teleport Boss
                 const angle = Math.random() * Math.PI * 2;
                 const dist = 350 + Math.random() * 150; // BUFFED: Farther range (350-500)
                 
                 let nx = px + Math.cos(angle) * dist - boss.width/2;
                 let ny = py + Math.sin(angle) * dist - boss.height/2;
                 
                 // Clamp to world bounds
                 boss.x = Math.max(100, Math.min(worldWidth - 200, nx));
                 boss.y = Math.max(100, Math.min(worldHeight - 200, ny));

                 if (effects && effects.spawnExplosion) effects.spawnExplosion(boss.x + boss.width/2, boss.y + boss.height/2, 50, "#6200ea");
                 
                 // Shoot Projectile at Player
                 const fireAng = Math.atan2(py - (boss.y + boss.height/2), px - (boss.x + boss.width/2));
                 projectiles.push({
                    x: boss.x + boss.width/2, y: boss.y + boss.height/2, width: 20, height: 20,
                    dx: Math.cos(fireAng) * 10, dy: Math.sin(fireAng) * 10,
                    color: "#7c4dff", from: "boss"
                 });

                 boss.teleportCount++;
             }

             if (boss.teleportCount >= 7) { boss.state = "idle"; boss.stateTimer = 0; }
        }
    }

    // =========================================
    // BOSS 2: THE CRUSHER
    // =========================================
    else if (boss.type === "Crusher") {
        const hpPercent = boss.health / boss.maxHealth;
        const isEnraged = hpPercent < 0.4;

        // 1. Idle / Tracking
        if (boss.state === "idle") {
            boss.phaseThroughWalls = false; // Reset ghost mode
            
            const ang = Math.atan2(py - cy, px - cx);
            const moveSpeed = isEnraged ? 4.0 : 2.5;
            
            boss.x += Math.cos(ang) * moveSpeed * timeScale;
            boss.y += Math.sin(ang) * moveSpeed * timeScale;
            boss.rotation = ang;

            const chargeTime = isEnraged ? 80 : 150;
            
            if (boss.stateTimer > chargeTime) {
                if (hasLineOfSight(cx, cy, px, py) || (isEnraged && Math.random() < 0.3)) {
                    boss.state = "charge_warmup";
                    boss.stateTimer = 0;
                }
            }
        }
        
        // 2. Charge Warmup
        else if (boss.state === "charge_warmup") {
            boss.hitFlash = (Math.floor(boss.stateTimer / 5) % 2) * 10; 
            
            if (boss.stateTimer === 1) {
                const ang = Math.atan2(py - cy, px - cx);
                boss.chargeDir = { x: Math.cos(ang), y: Math.sin(ang) };
                boss.rotation = ang;
                
                boss.phaseThroughWalls = false;
                if (isEnraged && Math.random() < 0.5) {
                    boss.phaseThroughWalls = true;
                    if(effects && effects.spawnText) effects.spawnText(cx, cy - 60, "GHOST CHARGE!", "gray", 20);
                }
            }
            
            const warmupTime = isEnraged ? 40 : 60;
            if (boss.stateTimer > warmupTime) {
                boss.state = "charging";
                boss.stateTimer = 0;
            }
        }
        
        // 3. Charging
        else if (boss.state === "charging") {
            const speed = isEnraged ? 16 : 12;
            
            const nextX = boss.x + boss.chargeDir.x * speed * timeScale;
            const nextY = boss.y + boss.chargeDir.y * speed * timeScale;
            
            const hitMapObject = checkCollision(nextX, nextY, boss.width, boss.height);
            const hitWorldBorder = 
                nextX <= 0 || 
                nextX + boss.width >= worldWidth || 
                nextY <= 0 || 
                nextY + boss.height >= worldHeight;

            const hitWall = (boss.phaseThroughWalls ? false : hitMapObject) || hitWorldBorder;
            
            if (hitWall) {
                // HIT WALL -> STUN
                boss.state = "stunned";
                boss.stateTimer = 0;
                
                if(effects && effects.spawnExplosion) {
                    effects.spawnExplosion(cx, cy, 120, "white");
                    effects.shake(8);
                }

                for(let k=0; k<6; k++) {
                    const da = (k / 6) * Math.PI * 2;
                    projectiles.push({
                        x: cx, y: cy, width: 12, height: 12,
                        dx: Math.cos(da) * 5, dy: Math.sin(da) * 5,
                        color: "#8d6e63", from: "boss_debris"
                    });
                }
                
                boss.x -= boss.chargeDir.x * 20;
                boss.y -= boss.chargeDir.y * 20;

            } else if (boss.stateTimer > 100) { 
                // MISSED -> INSTANT RECHARGE
                boss.state = "charge_warmup"; 
                boss.stateTimer = 0;
                if(effects && effects.spawnText) effects.spawnText(cx, cy, "MISSED!", "yellow", 16);
            } else {
                boss.x = nextX;
                boss.y = nextY;
            }
            
            if (boss.stateTimer % 5 === 0 && effects && effects.shake) effects.shake(isEnraged ? 4 : 2);
        }
        
        // 4. Stunned
        else if (boss.state === "stunned") {
            boss.phaseThroughWalls = false; 
            const stunDuration = isEnraged ? 90 : 180;
            if (boss.stateTimer > stunDuration) { 
                boss.state = "idle";
                boss.stateTimer = 0;
            }
        }
    }
}

// --- RENDERING ---
export function drawBoss(ctx, boss, camera) { 
    const cx = boss.x + boss.width/2 - camera.x;
    const cy = boss.y + boss.height/2 - camera.y;
    
    ctx.save();
    ctx.translate(cx, cy);
    
    if (boss.type === "Sentinel") {
        if (boss.state === "teleport" || boss.state === "summon") {
            ctx.rotate(boss.rotation + Math.random()); 
            if (boss.state === "teleport") ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        } else {
            ctx.rotate(boss.rotation);
        }
        
        ctx.fillStyle = boss.hitFlash > 0 ? "white" : "#212121";
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.lineTo(Math.cos(a) * 50, Math.sin(a) * 50);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = boss.state === "summon" ? "#d500f9" : "#29b6f6";
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.fillStyle = boss.state === "laser" ? "red" : (boss.state === "summon" ? "#e040fb" : "#00e5ff");
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
        
        boss.shields.forEach(ang => {
            const sx = Math.cos(ang) * 70;
            const sy = Math.sin(ang) * 70;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(ang + Math.PI/2);
            ctx.fillStyle = "rgba(41, 182, 246, 0.5)";
            ctx.fillRect(-20, -5, 40, 10);
            ctx.strokeStyle = "white";
            ctx.strokeRect(-20, -5, 40, 10);
            ctx.restore();
        });
        
        if (boss.state === "laser" && boss.stateTimer < 50) {
            ctx.rotate(-boss.rotation); 
            ctx.rotate(boss.targetAngle);
            ctx.strokeStyle = `rgba(255, 0, 0, ${boss.stateTimer/50})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1000, 0); ctx.stroke();
        }
    }
    
    else if (boss.type === "Crusher") {
        ctx.rotate(boss.rotation);
        
        // If Phasing, make transparent
        if (boss.phaseThroughWalls) ctx.globalAlpha = 0.5;

        const isEnraged = (boss.health / boss.maxHealth) < 0.4;
        const shake = boss.state === "charge_warmup" ? (Math.random() - 0.5) * (isEnraged ? 10 : 5) : 0;
        
        ctx.fillStyle = boss.hitFlash > 0 ? "white" : (isEnraged ? "#3e2723" : "#5d4037");
        ctx.fillRect(-45 + shake, -45, 90, 90);
        
        ctx.fillStyle = isEnraged ? "#ff3d00" : "#3e2723"; 
        ctx.fillRect(20 + shake, -45, 25, 90); 
        
        ctx.fillStyle = "#bdbdbd";
        ctx.beginPath(); ctx.moveTo(45 + shake, -30); ctx.lineTo(65 + shake, -30); ctx.lineTo(45 + shake, -10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(45 + shake, 30); ctx.lineTo(65 + shake, 30); ctx.lineTo(45 + shake, 10); ctx.fill();
        
        ctx.fillStyle = boss.state === "stunned" ? "#00e676" : "#ff5252"; 
        ctx.beginPath(); ctx.arc(-20 + shake, 0, 10, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = isEnraged ? "yellow" : "red"; 
        ctx.fillRect(0 + shake, -20, 10, 10);
        ctx.fillRect(0 + shake, 10, 10, 10);
    }

    else if (boss.type === "Frost-Core Construct") {
        ctx.rotate(boss.rotation);
        
        // 1. Mist Aura
        const time = performance.now();
        ctx.globalAlpha = 0.3 + Math.sin(time/500) * 0.1;
        ctx.fillStyle = "#e1f5fe";
        for(let i=0; i<4; i++) {
            ctx.rotate(Math.PI/2);
            ctx.fillRect(-60, -60, 120, 120);
        }
        ctx.globalAlpha = 1.0;

        // 2. Armor Suit (Ancient Plate)
        ctx.fillStyle = boss.hitFlash > 0 ? "white" : "#455a64";
        // Torso
        ctx.fillRect(-35, -40, 70, 80);
        // Shoulders
        ctx.fillStyle = "#263238";
        ctx.fillRect(-50, -45, 30, 30);
        ctx.fillRect(20, -45, 30, 30);
        
        // 3. Ice Core (Glow)
        const corePulse = Math.sin(time / 200) * 5;
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 15 + corePulse;
        ctx.fillStyle = "#81d4fa";
        ctx.beginPath();
        ctx.arc(0, 0, 15 + corePulse/2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 4. Face Slit (Blue Light)
        ctx.fillStyle = "#00b0ff";
        ctx.fillRect(-15, -25, 30, 4);
        
        // 5. Frost Spikes
        ctx.fillStyle = "white";
        for(let i=0; i<4; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI/2 + time/1000);
            ctx.beginPath();
            ctx.moveTo(40, 0);
            ctx.lineTo(60, -5);
            ctx.lineTo(60, 5);
            ctx.fill();
            ctx.restore();
        }
    }

    else if (boss.type === "The Chrono-Thief") {
        ctx.rotate(boss.rotation);
        const time = performance.now();
        const hpPercent = boss.health / boss.maxHealth;
        const isEnraged = hpPercent < 0.3;

        // 1. Cosmic/Void Aura
        const auraPulse = Math.sin(time/200) * 5;
        ctx.shadowColor = isEnraged ? "#d50000" : "#6200ea"; // Red if enraged
        ctx.shadowBlur = (isEnraged ? 25 : 15) + auraPulse;
        
        if (boss.flashActive) {
            ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 + Math.sin(time/50)*0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI*2); ctx.stroke();
        }

        // 2. Imp Body (Small, dark purple -> Dark Red when enraged)
        const shake = isEnraged ? (Math.random() - 0.5) * 3 : 0;
        ctx.translate(shake, shake);

        ctx.fillStyle = boss.hitFlash > 0 ? "white" : (isEnraged ? "#210000" : "#311b92");
        ctx.beginPath();
        ctx.moveTo(0, -30); // Head top
        ctx.lineTo(20, 0); // Right side
        ctx.lineTo(10, 30); // Right leg
        ctx.lineTo(-10, 30); // Left leg
        ctx.lineTo(-20, 0); // Left side
        ctx.closePath();
        ctx.fill();
        
        // 3. Glowing Eyes (Time Eyes -> Angry Red)
        ctx.fillStyle = isEnraged ? "#ff1744" : "#00e676"; 
        ctx.fillRect(-10, -15, 6, 6);
        ctx.fillRect(4, -15, 6, 6);
        
        // 4. Bag of Seconds (Sack on back)
        ctx.fillStyle = "#5d4037";
        ctx.beginPath(); ctx.arc(15, -10, 12, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#d7ccc8"; ctx.lineWidth = 2; ctx.stroke();
        // Leaking "Seconds" (Particles)
        if (time % 100 < 20 || isEnraged) {
            ctx.fillStyle = isEnraged ? "#ff3d00" : "#ffd700"; // Red particles if enraged
            ctx.fillRect(20 + Math.random()*10, -10 + Math.random()*10, 3, 3);
        }

        // 5. Clock Hands on Chest
        ctx.strokeStyle = isEnraged ? "red" : "gold";
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(0, 5); 
        ctx.lineTo(0, -5); // Hour hand
        ctx.moveTo(0, 5);
        const handAng = time / (isEnraged ? 20 : 100); // Faster clock if enraged
        ctx.lineTo(Math.cos(handAng)*8, 5 + Math.sin(handAng)*8); // Fast Minute hand
        ctx.stroke();

        ctx.shadowBlur = 0;
    }
    
    ctx.restore();
}