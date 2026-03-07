/* src/scripts/cosmetics.js */
import { achievements } from "./achievement.js"; 
import { zoom } from "./camera.js"; 

export const cosmeticRegistry = {
  bodies: [
    { id: "cyan", name: "Neon Cyan", color: "cyan", type: "free" },
    { id: "red", name: "Crimson", color: "#ff1744", type: "free" },
    { id: "lime", name: "Lime", color: "#00e676", type: "free" },
    { id: "midnight", name: "Midnight", color: "#1a237e", type: "buyable", price: 50 },
    { id: "magma", name: "Magma", color: "#ff5722", type: "buyable", price: 100 },
    { id: "gold", name: "Golden", color: "#ffd700", type: "achievement", reqId: "1", hint: "Kill 50 Enemies" },
    { id: "purple", name: "Void", color: "#d500f9", type: "achievement", reqId: "6", hint: "Reach Wave 8" },
    { id: "glitch", name: "Glitch", type: "buyable", price: 300, isSkin: true },
    { id: "camo", name: "Digital Camo", type: "buyable", price: 200, isSkin: true },
    { id: "electric", name: "Electric Core", type: "buyable", price: 400, isSkin: true },
    { id: "zombie", name: "Zombie Rot", type: "achievement", reqId: "2", hint: "Kill 500 Enemies", isSkin: true },
    { id: "cyber", name: "Cyber Body", type: "buyable", price: 1000, isSkin: true },
    { id: "nebula", name: "Nebula", type: "buyable", price: 1000, isSkin: true }
  ],
  eyes: [
    { id: "normal", name: "Normal", type: "free" },
    { id: "angry", name: "Determined", type: "free" },
    { id: "scared", name: "Scared", type: "free" }, 
    { id: "bored", name: "Unimpressed", type: "buyable", price: 50 },
    { id: "uwu", name: "Kawaii", type: "buyable", price: 125 },       
    { id: "rich", name: "High Roller", type: "buyable", price: 250 }, 
    { id: "cyclops", name: "Cyclops", type: "achievement", reqId: "2", hint: "Kill 500 Enemies" },
    { id: "white", name: "Herobrine", type: "achievement", reqId: "4", hint: "Fire 1000 Bullets" },
    { id: "sunglasses", name: "Cool", type: "achievement", reqId: "8", hint: "Collect 20 Powerups" },
    { id: "pixel", name: "8-Bit", type: "buyable", price: 100 }, 
    { id: "glasses", name: "Scholar", type: "buyable", price: 75 },
    { id: "cyborg", name: "Cyborg", type: "buyable", price: 350 },
    { id: "undead", name: "Zombie Face", type: "achievement", reqId: "3", hint: "Kill 2000 Enemies" },
    { id: "diamond", name: "Diamond", type: "buyable", price: 1000 }
  ],
  hats: [
    { id: "none", name: "None", type: "free" },
    { id: "headband", name: "Headband", type: "free" },
    { id: "horns", name: "Devil Horns", type: "free" },
    { id: "ears", name: "Cat Ears", type: "free" },
    { id: "wizard", name: "Wizard Hat", type: "free" },
    { id: "cowboy", name: "Sheriff", type: "buyable", price: 150 },
    { id: "tophat", name: "Gentleman", type: "buyable", price: 250 },
    { id: "pirate", name: "Captain", type: "buyable", price: 200 }, 
    { id: "viking", name: "Viking", type: "buyable", price: 300 }, 
    { id: "propeller", name: "Propeller", type: "buyable", price: 125 },
    { id: "tv", name: "TV Head", type: "buyable", price: 400 },
    { id: "astronaut", name: "Astronaut", type: "achievement", reqId: "7", hint: "Reach Wave 15" },
    { id: "angel", name: "Angel Wings", type: "buyable", price: 1000 }
  ],
  trails: [
    { id: "none", name: "None", type: "free" },
    { id: "flame", name: "Flame", type: "buyable", price: 200 },
    { id: "matrix", name: "Binary", type: "buyable", price: 250 },
    { id: "rainbow", name: "Rainbow", type: "buyable", price: 300 },
    { id: "ghost", name: "Ghostly", type: "achievement", reqId: "1", hint: "Kill 50 Enemies" },
    { id: "laser", name: "Laser Line", type: "buyable", price: 1000 }
  ],
  indicators: [
    { id: "dot", name: "Simple Dot", type: "free" },
    { id: "cross", name: "Crosshair", type: "free" },
    { id: "arrow", name: "Stick Arrow", type: "achievement", reqId: "2", hint: "Kill 500 Enemies" },
    { id: "ring", name: "Target Ring", type: "achievement", reqId: "6", hint: "Reach Wave 8" },
    { id: "tacticalX", name: "Tactical X", type: "buyable", price: 150 },
    { id: "orbit", name: "Orbit Tri", type: "achievement", reqId: "4", hint: "Fire 1000 Bullets" },
    { id: "sniper", name: "Sniper Sight", type: "buyable", price: 200 }
  ],
  bullets: [
    { id: "default", name: "Plasma Yellow", type: "free" },
    { id: "blue", name: "Neon Blue", type: "free" },
    { id: "red", name: "Crimson Laser", type: "free" },
    { id: "green", name: "Toxic Green", type: "buyable", price: 200 },
    { id: "fire", name: "Inferno", type: "achievement", reqId: "12", hint: "Defeat 5 Bosses" },
    { id: "rainbow", name: "Prism", type: "achievement", reqId: "7", hint: "Reach Wave 15" }
  ]
};

export function isUnlocked(item) {
  if (item.type === "free" || item.type === "buyable") return true;
  if (item.type === "achievement") {
    const ach = achievements[item.reqId];
    return ach && (ach.progress >= ach.goal);
  }
  return false;
}

export function getBulletStyleDef(id) {
    if (id === "fire") return { type: "gradient", colors: ["#ffeb3b", "#f44336"] };
    if (id === "rainbow") return { type: "gradient", colors: ["red", "orange", "yellow", "lime", "cyan", "violet"] };
    if (id === "blue") return { type: "solid", color: "#00e5ff" };
    if (id === "red") return { type: "solid", color: "#ff1744" };
    if (id === "green") return { type: "solid", color: "#00e676" };
    return { type: "solid", color: "#ffe066" }; 
}

export function drawPlayer(ctx, player, aimInput, moveInput, camera) {
  const x = Math.round(player.x - camera.x);
  const y = Math.round(player.y - camera.y);
  const w = player.width;
  const h = player.height;
  
  if (!player._lastFaceDir) player._lastFaceDir = { x: 0, y: 0 };
  
  let moveX = 0, moveY = 0;
  if (moveInput) {
      moveX = moveInput.x;
      moveY = moveInput.y;
      if (moveX !== 0 || moveY !== 0) {
          player._lastFaceDir.x = moveX;
          player._lastFaceDir.y = moveY;
      }
  }
  const faceDir = player._lastFaceDir;

  // --- TRAIL SPAWNING ---
  const trailStyle = player.cosmetics.trailStyle || "none";
  if (trailStyle !== "none" && (moveX !== 0 || moveY !== 0)) {
      import("./index.js").then(m => {
          if (m.spawnTrailParticle) m.spawnTrailParticle(player.x + w/2, player.y + h/2, trailStyle, player.cosmetics.bodyColor);
      });
  }
  
  // LEAN & SQUISH LOGIC
  let lean = moveX * 0.15; 
  let squishX = 1.0;
  let squishY = 1.0;

  if (moveX !== 0 || moveY !== 0) {
      squishX = 0.95;
      squishY = 1.05;
  }
  if (player.dashActive) {
      squishX = 0.8;
      squishY = 1.2;
  }

  ctx.save();
  ctx.translate(x + w/2, y + h/2);
  ctx.rotate(lean);
  ctx.scale(squishX, squishY);

  const skinId = player.cosmetics.bodyColor;
  
  if (skinId === "glitch") {
      ctx.fillStyle = Math.random() > 0.8 ? "white" : (Math.random() > 0.5 ? "cyan" : "#ff1744");
      ctx.fillRect(-w/2, -h/2, w, h);
  } else if (skinId === "camo") {
      ctx.fillStyle = "#333"; ctx.fillRect(-w/2, -h/2, w, h);
      ctx.fillStyle = "#555"; ctx.fillRect(-w/2, -h/2, w/2, h/2); ctx.fillRect(0, 0, w/2, h/2);
  } else if (skinId === "electric") {
      ctx.fillStyle = "#1a237e"; ctx.fillRect(-w/2, -h/2, w, h);
      ctx.strokeStyle = "cyan"; ctx.lineWidth = 2;
      ctx.beginPath();
      for(let i=0; i<3; i++) {
          ctx.moveTo(0, 0); ctx.lineTo((Math.random()-0.5)*w, (Math.random()-0.5)*h);
      }
      ctx.stroke();
  } else if (skinId === "zombie") {
      ctx.fillStyle = "#4caf50"; ctx.fillRect(-w/2, -h/2, w, h);
      ctx.fillStyle = "#388e3c"; ctx.fillRect(-4, -4, 8, 8);
  } else if (skinId === "cyber") {
      ctx.fillStyle = "#212121"; ctx.fillRect(-w/2, -h/2, w, h);
      ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 1;
      ctx.strokeRect(-w/2 + 4, -h/2 + 4, w - 8, h - 8);
      ctx.fillStyle = "#00e5ff"; ctx.fillRect(-2, -2, 4, 4);
  } else if (skinId === "nebula") {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w/2);
      g.addColorStop(0, "#4a148c"); g.addColorStop(1, "#000");
      ctx.fillStyle = g; ctx.fillRect(-w/2, -h/2, w, h);
      ctx.fillStyle = "white"; for(let i=0; i<5; i++) ctx.fillRect((Math.random()-0.5)*w, (Math.random()-0.5)*h, 1, 1);
  } else {
      let bodyColor = player.cosmetics.bodyColor;
      const bodyItem = cosmeticRegistry.bodies.find(b => b.id === bodyColor);
      if (bodyItem) bodyColor = bodyItem.color;
      else if (bodyColor === "green") bodyColor = "#00e676"; 
      else if (!bodyColor) bodyColor = "cyan";
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-w/2, -h/2, w, h);
  }
  
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-w/2, -h/2, w, h);

  drawEyes(ctx, -w/2, -h/2, w, h, player.cosmetics.eyeStyle, aimInput, faceDir, player.x, player.y, camera, skinId);
  drawHat(ctx, -w/2, -h/2, w, h, player.cosmetics.hatStyle);

  if (player.isFrozen) {
      ctx.fillStyle = "rgba(0, 229, 255, 0.5)"; 
      ctx.fillRect(-w/2 - 2, -h/2 - 2, w + 4, h + 4); 
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(-w/2 - 2, -h/2 - 2, w + 4, h + 4);
  }
  ctx.restore();
}

export function drawPlayerIndicator(ctx, player, aimInput, camera) {
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  let tx, ty, angle = 0;
  const clampDist = 40; 

  if (aimInput.isVector) {
    angle = Math.atan2(aimInput.y, aimInput.x);
    const dist = 40;
    tx = cx + Math.cos(angle) * dist;
    ty = cy + Math.sin(angle) * dist;
  } else {
    tx = (aimInput.x / zoom) + camera.x; 
    ty = (aimInput.y / zoom) + camera.y;
    angle = Math.atan2(ty - cy, tx - cx);
    const dist = Math.hypot(tx - cx, ty - cy);
    if (dist > clampDist) {
        tx = cx + Math.cos(angle) * clampDist;
        ty = cy + Math.sin(angle) * clampDist;
    }
  }

  const dx = tx - camera.x;
  const dy = ty - camera.y;
  
  ctx.save();
  ctx.translate(dx, dy);
  ctx.rotate(angle);
  
  let bodyColor = player.cosmetics.bodyColor;
  const bodyItem = cosmeticRegistry.bodies.find(b => b.id === bodyColor);
  if (bodyItem) bodyColor = bodyItem.color;
  else if (bodyColor === "green") bodyColor = "#00e676";
  
  const style = player.cosmetics.indicatorStyle || "dot";
  
  // DYNAMIC FEEDBACK
  let indicatorColor = bodyColor || "cyan";
  let scale = 1.0;

  if (player.ammo <= 0 && player.reserveAmmo > 0) {
      if (Math.floor(performance.now() / 150) % 2 === 0) indicatorColor = "#ff1744";
  } else if (player.ammo <= 0 && player.reserveAmmo <= 0) {
      indicatorColor = "#555";
  }

  if (player.critFeedback > 0) {
      scale = 1.0 + (player.critFeedback / 10) * 0.5;
      indicatorColor = "white"; 
  }

  ctx.fillStyle = indicatorColor; 
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.scale(scale, scale);

  if (style === "dot") {
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  } else if (style === "cross") {
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
  } else if (style === "arrow") {
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(4, -4); ctx.lineTo(10, 0); ctx.lineTo(4, 4); ctx.stroke();
  } else if (style === "ring") {
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();
  } else if (style === "tacticalX") {
      ctx.beginPath();
      for(let i=0; i<4; i++) {
          ctx.rotate(Math.PI/2);
          ctx.moveTo(4, 4); ctx.lineTo(10, 10);
      }
      ctx.stroke();
  } else if (style === "orbit") {
      const t = performance.now() * 0.01;
      for(let i=0; i<3; i++) {
          const a = t + (i * Math.PI * 2 / 3);
          ctx.beginPath(); ctx.arc(Math.cos(a)*10, Math.sin(a)*10, 2, 0, Math.PI*2); ctx.fill();
      }
  } else if (style === "sniper") {
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.moveTo(0, -16); ctx.lineTo(0, 16); ctx.stroke();
  }
  ctx.restore();
}

function drawEyes(ctx, x, y, w, h, style, aim, moveDir, px, py, cam, bodyColor) {
    const cx = px + w/2;
    const cy = py + h/2;
    let shiftX = 0, shiftY = 0;
    if (moveDir) {
        shiftX = Math.max(-2, Math.min(2, moveDir.x * 2)); 
        shiftY = Math.max(-2, Math.min(2, moveDir.y * 2));
    }
    let angle = 0;
    if (aim.isVector) { 
        angle = Math.atan2(aim.y, aim.x); 
    } else { 
        const mx = (aim.x / zoom) + cam.x; 
        const my = (aim.y / zoom) + cam.y; 
        angle = Math.atan2(my - cy, mx - cx); 
    }
    
    const eyeY = y + 11 + shiftY; 
    const leftEyeBaseX = x + 8 + shiftX;
    const rightEyeBaseX = x + 18 + shiftX;
    const eyeSize = 6;
    
    let trackDist = 1.5; 
    if (style === 'angry') trackDist = 1.0; 
    let pxOff = Math.cos(angle) * trackDist;
    let pyOff = Math.sin(angle) * trackDist;

    if (style === "scared") { const shake = (Math.random() - 0.5) * 2; pxOff += shake; pyOff += shake; }

    if (style === "cyclops") {
        const cyclopsX = x + 10 + shiftX; 
        ctx.fillStyle = "white"; ctx.fillRect(cyclopsX, eyeY - 2, 12, 12);
        ctx.fillStyle = "black"; ctx.fillRect(cyclopsX + 4 + pxOff, eyeY + 2 + pyOff, 4, 4);
    } else if (style === "cyborg") {
        ctx.fillStyle = "white"; ctx.fillRect(leftEyeBaseX, eyeY, 6, 6);
        ctx.fillStyle = "black"; ctx.fillRect(leftEyeBaseX + 2 + pxOff, eyeY + 2 + pyOff, 2, 2);
        ctx.fillStyle = "#ff1744"; ctx.fillRect(rightEyeBaseX - 1, eyeY - 1, 8, 8);
        ctx.fillStyle = "white"; ctx.fillRect(rightEyeBaseX + 2 + pxOff, eyeY + 2 + pyOff, 2, 2);
        ctx.strokeStyle = "rgba(255, 23, 68, 0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(rightEyeBaseX - 1, eyeY + 3 + Math.sin(performance.now()*0.01)*3); ctx.lineTo(rightEyeBaseX + 7, eyeY + 3 + Math.sin(performance.now()*0.01)*3); ctx.stroke();
    } else if (style === "undead") {
        ctx.fillStyle = "#ffeb3b"; ctx.fillRect(leftEyeBaseX, eyeY, 6, 6); ctx.fillRect(rightEyeBaseX, eyeY, 6, 6);
        ctx.fillStyle = "black"; ctx.fillRect(leftEyeBaseX + 2, eyeY + 2, 2, 2); ctx.fillRect(rightEyeBaseX + 2, eyeY + 2, 2, 2);
        ctx.strokeStyle = "black"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 8, y + 24); ctx.lineTo(x + 24, y + 24); ctx.stroke();
        for(let i=0; i<5; i++) { ctx.moveTo(x + 10 + i*3.5, y + 22); ctx.lineTo(x + 10 + i*3.5, y + 22); ctx.stroke(); }
    } else if (style === "diamond") {
        ctx.fillStyle = "#b2ebf2"; ctx.beginPath();
        ctx.moveTo(leftEyeBaseX + 3, eyeY); ctx.lineTo(leftEyeBaseX + 6, eyeY + 3); ctx.lineTo(leftEyeBaseX + 3, eyeY + 6); ctx.lineTo(leftEyeBaseX, eyeY + 3); ctx.closePath(); ctx.fill();
        ctx.moveTo(rightEyeBaseX + 3, eyeY); ctx.lineTo(rightEyeBaseX + 6, eyeY + 3); ctx.lineTo(rightEyeBaseX + 3, eyeY + 6); ctx.lineTo(rightEyeBaseX, eyeY + 3); ctx.closePath(); ctx.fill();
    } else if (style === "sunglasses") {
        ctx.fillStyle = "#111"; ctx.fillRect(leftEyeBaseX - 1, eyeY - 1, 8, 6); ctx.fillRect(rightEyeBaseX - 1, eyeY - 1, 8, 6);
        ctx.fillStyle = "#333"; ctx.fillRect(leftEyeBaseX + 7, eyeY + 1, 4, 2); 
        ctx.fillRect(x, eyeY + 1, (leftEyeBaseX - 1) - x, 2); ctx.fillRect(rightEyeBaseX + 7, eyeY + 1, (x + w) - (rightEyeBaseX + 7), 2);
        ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); ctx.moveTo(leftEyeBaseX, eyeY + 4); ctx.lineTo(leftEyeBaseX + 4, eyeY); ctx.stroke();
        ctx.moveTo(rightEyeBaseX, eyeY + 4); ctx.lineTo(rightEyeBaseX + 4, eyeY); ctx.stroke();
    } else if (style === "bored") {
        ctx.fillStyle = "black";
        ctx.fillRect(leftEyeBaseX, eyeY + 2, 8, 2); ctx.fillRect(rightEyeBaseX, eyeY + 2, 8, 2);
    } else if (style === "uwu") {
        ctx.strokeStyle = "black"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(leftEyeBaseX + 3, eyeY + 2, 3, 0, Math.PI, false); ctx.stroke();
        ctx.beginPath(); ctx.arc(rightEyeBaseX + 3, eyeY + 2, 3, 0, Math.PI, false); ctx.stroke();
        ctx.fillStyle = "#ff80ab"; ctx.fillRect(leftEyeBaseX - 2, eyeY + 5, 4, 2); ctx.fillRect(rightEyeBaseX + 6, eyeY + 5, 4, 2);
    } else if (style === "rich") {
        ctx.fillStyle = "#00e676"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("$", leftEyeBaseX + 3, eyeY + 3); ctx.fillText("$", rightEyeBaseX + 3, eyeY + 3);
    } else if (style === "glasses") {
        ctx.fillStyle = "rgba(200, 230, 255, 0.4)"; ctx.fillRect(leftEyeBaseX - 1, eyeY - 1, 8, 8); ctx.fillRect(rightEyeBaseX - 1, eyeY - 1, 8, 8);
        ctx.fillStyle = "black"; ctx.fillRect(leftEyeBaseX + 2 + pxOff, eyeY + 2 + pyOff, 2, 2); ctx.fillRect(rightEyeBaseX + 2 + pxOff, eyeY + 2 + pyOff, 2, 2);
        ctx.strokeStyle = "#444"; ctx.lineWidth = 1.5; ctx.strokeRect(leftEyeBaseX - 1, eyeY - 1, 8, 8); ctx.strokeRect(rightEyeBaseX - 1, eyeY - 1, 8, 8);
        ctx.beginPath(); ctx.moveTo(leftEyeBaseX + 7, eyeY + 3); ctx.lineTo(rightEyeBaseX - 1, eyeY + 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(leftEyeBaseX - 1, eyeY + 3); ctx.lineTo(x, eyeY + 3); ctx.moveTo(rightEyeBaseX + 7, eyeY + 3); ctx.lineTo(x + w, eyeY + 3); ctx.stroke();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(leftEyeBaseX + 1, eyeY); ctx.lineTo(leftEyeBaseX + 4, eyeY + 3); ctx.moveTo(rightEyeBaseX + 1, eyeY); ctx.lineTo(rightEyeBaseX + 4, eyeY + 3); ctx.stroke();
    } else if (style === "pixel") {
        ctx.fillStyle = "black"; ctx.fillRect(leftEyeBaseX, eyeY, 6, 6); ctx.fillRect(rightEyeBaseX, eyeY, 6, 6);
        ctx.fillStyle = "white";
        const pixOffX = Math.round(Math.max(-2, Math.min(2, pxOff)));
        const pixOffY = Math.round(Math.max(-2, Math.min(2, pyOff)));
        ctx.fillRect(leftEyeBaseX + 2 + pixOffX, eyeY + 2 + pixOffY, 2, 2); ctx.fillRect(rightEyeBaseX + 2 + pixOffX, eyeY + 2 + pixOffY, 2, 2);
    } else if (style === "white") {
        ctx.fillStyle = "white"; ctx.fillRect(leftEyeBaseX, eyeY, eyeSize, eyeSize); ctx.fillRect(rightEyeBaseX, eyeY, eyeSize, eyeSize);
    } else {
        ctx.fillStyle = "white"; ctx.fillRect(leftEyeBaseX, eyeY, eyeSize, eyeSize); ctx.fillRect(rightEyeBaseX, eyeY, eyeSize, eyeSize);
        ctx.fillStyle = "black";
        const pSize = style === "scared" ? 1 : 2; const pOff = style === "scared" ? 2.5 : 2; 
        ctx.fillRect(leftEyeBaseX + pOff + pxOff, eyeY + pOff + pyOff, pSize, pSize);
        ctx.fillRect(rightEyeBaseX + pOff + pxOff, eyeY + pOff + pyOff, pSize, pSize);
        if (style === "angry") {
            ctx.fillStyle = bodyColor || "cyan"; 
            ctx.beginPath(); ctx.moveTo(leftEyeBaseX, eyeY); ctx.lineTo(leftEyeBaseX + eyeSize, eyeY + 3); ctx.lineTo(leftEyeBaseX + eyeSize, eyeY); ctx.fill();
            ctx.beginPath(); ctx.moveTo(rightEyeBaseX, eyeY); ctx.lineTo(rightEyeBaseX, eyeY + 3); ctx.lineTo(rightEyeBaseX + eyeSize, eyeY); ctx.fill();
        }
    }
}

function drawHat(ctx, x, y, w, h, style) {
    const cx = x + w/2;
    const topY = y;
    ctx.lineWidth = 2;

    if (style === "headband") {
        ctx.fillStyle = "white"; ctx.fillRect(x, y + 6, w, 4);
        ctx.fillStyle = "#ddd"; ctx.fillRect(x + w - 2, y + 6, 4, 4); 
        ctx.strokeStyle = "white"; ctx.beginPath(); ctx.moveTo(x + w + 2, y + 8); ctx.quadraticCurveTo(x + w + 6, y + 6, x + w + 10, y + 10); ctx.moveTo(x + w + 2, y + 8); ctx.quadraticCurveTo(x + w + 6, y + 10, x + w + 10, y + 4); ctx.stroke();
    } else if (style === "propeller") {
        ctx.fillStyle = "#fbc02d"; ctx.fillRect(cx - 2, topY - 6, 4, 6);
        ctx.save(); ctx.translate(cx, topY - 6); ctx.rotate(performance.now() * 0.01);
        ctx.fillStyle = "#d32f2f"; ctx.fillRect(-12, -2, 24, 4); ctx.restore();
    } else if (style === "tv") {
        ctx.fillStyle = "#333"; ctx.fillRect(x - 2, topY - 10, w + 4, 16);
        ctx.fillStyle = "#aaa"; ctx.fillRect(x + 2, topY - 8, w - 4, 12);
        for(let i=0; i<5; i++) { ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#444"; ctx.fillRect(x + 4 + Math.random()*(w-12), topY - 6 + Math.random()*8, 4, 2); }
    } else if (style === "astronaut") {
        ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(cx, topY + 8, w/2 + 4, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "rgba(0, 191, 255, 0.4)"; ctx.beginPath(); ctx.arc(cx, topY + 6, w/2, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = "#ddd"; ctx.lineWidth = 2; ctx.stroke();
    } else if (style === "angel") {
        ctx.fillStyle = "white"; ctx.strokeStyle = "#eee";
        ctx.beginPath(); ctx.moveTo(x - 4, topY + 10); ctx.quadraticCurveTo(x - 20, topY - 10, x - 30, topY + 5); ctx.quadraticCurveTo(x - 20, topY + 20, x - 4, topY + 15); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w + 4, topY + 10); ctx.quadraticCurveTo(x + w + 20, topY - 10, x + w + 30, topY + 5); ctx.quadraticCurveTo(x + w + 20, topY + 20, x + w + 4, topY + 15); ctx.fill(); ctx.stroke();
    } else if (style === "horns") { 
        ctx.fillStyle = "#d32f2f"; ctx.strokeStyle = "#b71c1c";
        ctx.beginPath(); ctx.moveTo(x + 4, topY); ctx.quadraticCurveTo(x - 6, topY - 10, x - 2, topY - 16); ctx.quadraticCurveTo(x + 8, topY - 8, x + 10, topY); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w - 4, topY); ctx.quadraticCurveTo(x + w + 6, topY - 10, x + w + 2, topY - 16); ctx.quadraticCurveTo(x + w - 8, topY - 8, x + w - 10, topY); ctx.fill(); ctx.stroke();
    } else if (style === "ears") { 
        ctx.fillStyle = "#212121"; ctx.strokeStyle = "#000";
        ctx.beginPath(); ctx.moveTo(x + 2, topY); ctx.lineTo(x + 2, topY - 12); ctx.lineTo(x + 12, topY); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#f48fb1"; ctx.beginPath(); ctx.moveTo(x + 4, topY - 2); ctx.lineTo(x + 4, topY - 8); ctx.lineTo(x + 9, topY - 2); ctx.fill();
        ctx.fillStyle = "#212121"; ctx.beginPath(); ctx.moveTo(x + w - 2, topY); ctx.lineTo(x + w - 2, topY - 12); ctx.lineTo(x + w - 12, topY); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#f48fb1"; ctx.beginPath(); ctx.moveTo(x + w - 4, topY - 2); ctx.lineTo(x + w - 4, topY - 8); ctx.lineTo(x + w - 9, topY - 2); ctx.fill();
    } else if (style === "wizard") {
        ctx.fillStyle = "#7b1fa2"; ctx.strokeStyle = "#4a148c"; 
        ctx.beginPath(); ctx.moveTo(x, topY); ctx.quadraticCurveTo(cx - 5, topY - 25, cx + 10, topY - 35); ctx.quadraticCurveTo(cx + 5, topY - 25, x + w, topY); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fbc02d"; ctx.fillRect(x + 2, topY - 6, w - 4, 6);
        ctx.fillStyle = "#7b1fa2"; ctx.beginPath(); ctx.moveTo(x - 6, topY); ctx.lineTo(x + w + 6, topY); ctx.lineTo(x + w + 4, topY + 4); ctx.lineTo(x - 4, topY + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (style === "cowboy") { 
        ctx.fillStyle = "#8d6e63"; ctx.strokeStyle = "#5d4037";
        ctx.beginPath(); ctx.moveTo(x - 6, topY + 2); ctx.lineTo(x + w + 6, topY + 2); ctx.lineTo(x + w + 6, topY - 2); ctx.lineTo(x + w, topY - 2); ctx.lineTo(x + w, topY - 10); ctx.lineTo(x + 4, topY - 12); ctx.lineTo(x, topY - 10); ctx.lineTo(x, topY - 2); ctx.lineTo(x - 6, topY - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#3e2723"; ctx.fillRect(x, topY - 4, w, 2);
    } else if (style === "tophat") { 
        ctx.fillStyle = "#222"; ctx.strokeStyle = "black";
        ctx.fillRect(x + 2, topY - 14, w - 4, 14); ctx.strokeRect(x + 2, topY - 14, w - 4, 14);
        ctx.fillRect(x - 4, topY - 2, w + 8, 4); ctx.strokeRect(x - 4, topY - 2, w + 8, 4);
        ctx.fillStyle = "#d32f2f"; ctx.fillRect(x + 2, topY - 4, w - 4, 2);
    } else if (style === "pirate") {
        ctx.fillStyle = "#d32f2f"; ctx.fillRect(x, topY, w, 6);
        ctx.fillStyle = "#1a1a1a"; ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 6, topY + 2); ctx.quadraticCurveTo(cx, topY - 18, x + w + 6, topY + 2); ctx.quadraticCurveTo(cx, topY - 2, x - 6, topY + 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(cx, topY - 6, 4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 4, topY - 4); ctx.lineTo(cx + 4, topY - 8); ctx.moveTo(cx + 4, topY - 4); ctx.lineTo(cx - 4, topY - 8); ctx.stroke();
    } else if (style === "viking") {
        ctx.fillStyle = "#bdbdbd"; ctx.strokeStyle = "#616161";
        ctx.beginPath(); ctx.arc(cx, topY + 4, w/2 + 2, Math.PI, 0); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff8e1"; ctx.strokeStyle = "#f57f17";
        ctx.beginPath(); ctx.moveTo(x, topY); ctx.quadraticCurveTo(x - 8, topY - 8, x - 4, topY - 16); ctx.lineTo(x + 2, topY - 4); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w, topY); ctx.quadraticCurveTo(x + w + 8, topY - 8, x + w + 4, topY - 16); ctx.lineTo(x + w - 2, topY - 4); ctx.fill(); ctx.stroke();
    } else if (style === "helmet") {
        ctx.fillStyle = "#556b2f"; ctx.strokeStyle = "#3e4f22";
        ctx.beginPath(); ctx.arc(cx, topY + 6, w/2 + 1, Math.PI, 0); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 2, topY + 6); ctx.lineTo(x + w + 2, topY + 6); ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.beginPath(); ctx.arc(cx - 6, topY - 2, 4, 0, Math.PI*2); ctx.fill();
    } else if (style === "crown") {
        ctx.fillStyle = "gold"; ctx.strokeStyle = "#b8860b";
        ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, topY - 10); ctx.lineTo(x + w/4, topY - 5); ctx.lineTo(cx, topY - 12); ctx.lineTo(x + w*0.75, topY - 5); ctx.lineTo(x + w, topY - 10); ctx.lineTo(x + w, topY); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (style === "halo") {
        ctx.strokeStyle = "gold"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, topY - 12, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
    }
}