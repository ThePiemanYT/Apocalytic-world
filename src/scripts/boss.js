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
    const x = canvasWidth / 2 - 50;
    const y = -150; 

    return {
        type: type,
        isBoss: true,
        x: x, y: y,
        width: isSentinel ? 100 : 90,
        height: isSentinel ? 100 : 90,
        speed: isSentinel ? 0.5 : 2, 
        // BUFFED HEALTH (2x from previous)
        health: isSentinel ? 750 : 900, 
        maxHealth: isSentinel ? 750 : 900,
        color: isSentinel ? "#29b6f6" : "#5d4037",
        hitFlash: 0,
        
        state: "enter", 
        stateTimer: 0,
        
        rotation: 0,
        shields: [0, (Math.PI*2)/3, (Math.PI*2)*2/3], 
        
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
    
    ctx.restore();
}