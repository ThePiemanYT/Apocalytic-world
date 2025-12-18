/* src/scripts/cosmetics.js */
import { achievements } from "./achievement.js"; 

export const cosmeticRegistry = {
  bodies: [
    { id: "cyan", name: "Neon Cyan", color: "cyan", type: "free" },
    { id: "red", name: "Crimson", color: "#ff1744", type: "free" },
    { id: "green", name: "Lime", color: "#00e676", type: "free" },
    { id: "gold", name: "Golden", color: "#ffd700", type: "achievement", reqId: "1", hint: "Win without Powerups" },
    { id: "purple", name: "Void", color: "#d500f9", type: "achievement", reqId: "4", hint: "Reach Wave 8" }
  ],
  eyes: [
    { id: "normal", name: "Normal", type: "free" },
    { id: "angry", name: "Determined", type: "free" },
    { id: "scared", name: "Scared", type: "free" }, 
    { id: "cyclops", name: "Cyclops", type: "achievement", reqId: "2", hint: "Kill 50 Enemies" },
    { id: "white", name: "Herobrine", type: "achievement", reqId: "3", hint: "Fire 1000 Bullets" },
    { id: "sunglasses", name: "Cool", type: "achievement", reqId: "5", hint: "Collect a Powerup" }
  ],
  hats: [
    { id: "none", name: "None", type: "free" },
    { id: "headband", name: "Headband", type: "free" },
    { id: "horns", name: "Devil Horns", type: "free" },
    { id: "ears", name: "Cat Ears", type: "free" },
    { id: "wizard", name: "Wizard Hat", type: "free" },
    { id: "helmet", name: "Helmet", type: "achievement", reqId: "4", hint: "Reach Wave 8" },
    { id: "crown", name: "King", type: "achievement", reqId: "1", hint: "Win without Powerups" },
    { id: "halo", name: "Angel", type: "achievement", reqId: "1", hint: "Win without Powerups" }
  ],
  indicators: [
    { id: "dot", name: "Simple Dot", type: "free" },
    { id: "cross", name: "Crosshair", type: "free" },
    { id: "arrow", name: "Stick Arrow", type: "achievement", reqId: "2", hint: "Kill 50 Enemies" }
  ],
  bullets: [
    { id: "default", name: "Plasma Yellow", type: "free" },
    { id: "blue", name: "Neon Blue", type: "free" },
    { id: "red", name: "Crimson Laser", type: "free" },
    { id: "fire", name: "Inferno", type: "achievement", reqId: "2", hint: "Kill 50 Enemies" },
    { id: "rainbow", name: "Prism", type: "achievement", reqId: "4", hint: "Reach Wave 8" }
  ]
};

export function isUnlocked(item) {
  if (item.type === "free") return true;
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
    return { type: "solid", color: "#ffe066" }; 
}

export function drawPlayer(ctx, player, aimInput, moveInput, camera) {
  const x = Math.round(player.x - camera.x);
  const y = Math.round(player.y - camera.y);
  const w = player.width;
  const h = player.height;
  
  if (!player._lastFaceDir) player._lastFaceDir = { x: 0, y: 0 };
  
  if (moveInput && (moveInput.x !== 0 || moveInput.y !== 0)) {
      player._lastFaceDir.x = moveInput.x;
      player._lastFaceDir.y = moveInput.y;
  }
  const faceDir = player._lastFaceDir;

  // Draw Body
  ctx.fillStyle = player.cosmetics.bodyColor || "cyan";
  ctx.fillRect(x, y, w, h);
  
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  drawEyes(ctx, x, y, w, h, player.cosmetics.eyeStyle, aimInput, faceDir, player.x, player.y, camera, player.cosmetics.bodyColor);
  drawHat(ctx, x, y, w, h, player.cosmetics.hatStyle);
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
    tx = aimInput.x / 1.5 + camera.x; 
    ty = aimInput.y / 1.5 + camera.y;
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
  
  const style = player.cosmetics.indicatorStyle || "dot";
  ctx.fillStyle = player.cosmetics.bodyColor || "cyan"; 
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;

  if (style === "dot") {
      ctx.beginPath(); 
      ctx.arc(0, 0, 4, 0, Math.PI*2); 
      ctx.fill(); 
      ctx.stroke();
  } else if (style === "cross") {
      ctx.beginPath(); 
      ctx.moveTo(-6, 0); ctx.lineTo(6, 0); 
      ctx.moveTo(0, -6); ctx.lineTo(0, 6); 
      ctx.stroke();
  } else if (style === "arrow") {
      // Stick Arrow "->"
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Shaft
      ctx.moveTo(-10, 0); 
      ctx.lineTo(10, 0);
      // Arrow Head
      ctx.moveTo(4, -4);
      ctx.lineTo(10, 0);
      ctx.lineTo(4, 4);
      ctx.stroke();
  }
  ctx.restore();
}

function drawEyes(ctx, x, y, w, h, style, aim, moveDir, px, py, cam, bodyColor) {
    const cx = px + w/2;
    const cy = py + h/2;
    
    // Persistent Face Shift
    let shiftX = 0, shiftY = 0;
    if (moveDir) {
        shiftX = Math.max(-2, Math.min(2, moveDir.x * 2)); 
        shiftY = Math.max(-2, Math.min(2, moveDir.y * 2));
    }

    // Look Angle
    let angle = 0;
    if (aim.isVector) { 
        angle = Math.atan2(aim.y, aim.x); 
    } else { 
        const mx = aim.x / 1.5 + cam.x; 
        const my = aim.y / 1.5 + cam.y; 
        angle = Math.atan2(my - cy, mx - cx); 
    }
    
    const eyeY = y + 11 + shiftY; // 11px down
    const leftEyeBaseX = x + 8 + shiftX;
    const rightEyeBaseX = x + 18 + shiftX;
    const eyeSize = 6;
    
    let trackDist = 1.5; 
    if (style === 'angry') trackDist = 1.0; 
    
    let pxOff = Math.cos(angle) * trackDist;
    let pyOff = Math.sin(angle) * trackDist;

    if (style === "scared") { 
        const shake = (Math.random() - 0.5) * 2; 
        pxOff += shake; 
        pyOff += shake; 
    }

    if (style === "cyclops") {
        const cyclopsX = x + 10 + shiftX; 
        ctx.fillStyle = "white"; 
        ctx.fillRect(cyclopsX, eyeY - 2, 12, 12);
        ctx.fillStyle = "black"; 
        ctx.fillRect(cyclopsX + 4 + pxOff, eyeY + 2 + pyOff, 4, 4);
        
    } else if (style === "sunglasses") {
        ctx.fillStyle = "#111"; 
        ctx.fillRect(leftEyeBaseX - 1, eyeY - 1, 8, 6);
        ctx.fillRect(rightEyeBaseX - 1, eyeY - 1, 8, 6);
        
        ctx.fillStyle = "#333";
        ctx.fillRect(leftEyeBaseX + 7, eyeY + 1, 4, 2); // Bridge
        
        // Arms
        ctx.fillRect(x, eyeY + 1, (leftEyeBaseX - 1) - x, 2);
        ctx.fillRect(rightEyeBaseX + 7, eyeY + 1, (x + w) - (rightEyeBaseX + 7), 2);
        
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath(); 
        ctx.moveTo(leftEyeBaseX, eyeY + 4); ctx.lineTo(leftEyeBaseX + 4, eyeY); ctx.stroke();
        ctx.moveTo(rightEyeBaseX, eyeY + 4); ctx.lineTo(rightEyeBaseX + 4, eyeY); ctx.stroke();
        
    } else if (style === "white") {
        ctx.fillStyle = "white"; 
        ctx.fillRect(leftEyeBaseX, eyeY, eyeSize, eyeSize); 
        ctx.fillRect(rightEyeBaseX, eyeY, eyeSize, eyeSize);
        
    } else {
        // Normal Eyes
        ctx.fillStyle = "white"; 
        ctx.fillRect(leftEyeBaseX, eyeY, eyeSize, eyeSize); 
        ctx.fillRect(rightEyeBaseX, eyeY, eyeSize, eyeSize);
        
        ctx.fillStyle = "black";
        const pSize = style === "scared" ? 1 : 2; 
        const pOff = style === "scared" ? 2.5 : 2; 
        
        ctx.fillRect(leftEyeBaseX + pOff + pxOff, eyeY + pOff + pyOff, pSize, pSize);
        ctx.fillRect(rightEyeBaseX + pOff + pxOff, eyeY + pOff + pyOff, pSize, pSize);
        
        if (style === "angry") {
            ctx.fillStyle = bodyColor || "cyan"; 
            ctx.beginPath(); 
            ctx.moveTo(leftEyeBaseX, eyeY); 
            ctx.lineTo(leftEyeBaseX + eyeSize, eyeY + 3); 
            ctx.lineTo(leftEyeBaseX + eyeSize, eyeY); 
            ctx.fill();
            
            ctx.beginPath(); 
            ctx.moveTo(rightEyeBaseX, eyeY); 
            ctx.lineTo(rightEyeBaseX, eyeY + 3); 
            ctx.lineTo(rightEyeBaseX + eyeSize, eyeY); 
            ctx.fill();
        }
    }
}

function drawHat(ctx, x, y, w, h, style) {
    const cx = x + w/2;
    const topY = y;
    ctx.lineWidth = 2;

    if (style === "headband") {
        ctx.fillStyle = "white"; 
        ctx.fillRect(x, y + 6, w, 4);
        
        ctx.fillStyle = "#ddd"; 
        ctx.fillRect(x + w - 2, y + 6, 4, 4); // Knot
        
        // RESTORED: Tails
        ctx.strokeStyle = "white";
        ctx.beginPath();
        ctx.moveTo(x + w + 2, y + 8);
        ctx.quadraticCurveTo(x + w + 6, y + 6, x + w + 10, y + 10);
        ctx.moveTo(x + w + 2, y + 8);
        ctx.quadraticCurveTo(x + w + 6, y + 10, x + w + 10, y + 4);
        ctx.stroke();

    } else if (style === "horns") { 
        ctx.fillStyle = "#d32f2f"; 
        ctx.strokeStyle = "#b71c1c";
        
        // Left Horn
        ctx.beginPath();
        ctx.moveTo(x + 4, topY); 
        ctx.quadraticCurveTo(x - 6, topY - 10, x - 2, topY - 16); 
        ctx.quadraticCurveTo(x + 8, topY - 8, x + 10, topY); 
        ctx.fill(); ctx.stroke();

        // Right Horn
        ctx.beginPath();
        ctx.moveTo(x + w - 4, topY);
        ctx.quadraticCurveTo(x + w + 6, topY - 10, x + w + 2, topY - 16); 
        ctx.quadraticCurveTo(x + w - 8, topY - 8, x + w - 10, topY);
        ctx.fill(); ctx.stroke();

    } else if (style === "ears") { 
        ctx.fillStyle = "#212121"; 
        ctx.strokeStyle = "#000";
        
        // Left Ear
        ctx.beginPath(); 
        ctx.moveTo(x + 2, topY); 
        ctx.lineTo(x + 2, topY - 12); 
        ctx.lineTo(x + 12, topY); 
        ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = "#f48fb1"; 
        ctx.beginPath(); 
        ctx.moveTo(x + 4, topY - 2); 
        ctx.lineTo(x + 4, topY - 8); 
        ctx.lineTo(x + 9, topY - 2); 
        ctx.fill();

        // Right Ear
        ctx.fillStyle = "#212121";
        ctx.beginPath(); 
        ctx.moveTo(x + w - 2, topY); 
        ctx.lineTo(x + w - 2, topY - 12); 
        ctx.lineTo(x + w - 12, topY); 
        ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = "#f48fb1"; 
        ctx.beginPath(); 
        ctx.moveTo(x + w - 4, topY - 2); 
        ctx.lineTo(x + w - 4, topY - 8); 
        ctx.lineTo(x + w - 9, topY - 2); 
        ctx.fill();

    } else if (style === "wizard") {
        ctx.fillStyle = "#7b1fa2"; // Purple
        ctx.strokeStyle = "#4a148c"; 
        
        // Cone
        ctx.beginPath();
        ctx.moveTo(x, topY); 
        ctx.quadraticCurveTo(cx - 5, topY - 25, cx + 10, topY - 35); 
        ctx.quadraticCurveTo(cx + 5, topY - 25, x + w, topY);
        ctx.fill(); ctx.stroke();
        
        // Band
        ctx.fillStyle = "#fbc02d"; 
        ctx.fillRect(x + 2, topY - 6, w - 4, 6);
        
        // Brim
        ctx.fillStyle = "#7b1fa2";
        ctx.beginPath();
        ctx.moveTo(x - 6, topY);
        ctx.lineTo(x + w + 6, topY);
        ctx.lineTo(x + w + 4, topY + 4);
        ctx.lineTo(x - 4, topY + 4);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

    } else if (style === "helmet") {
        ctx.fillStyle = "#556b2f"; 
        ctx.strokeStyle = "#3e4f22";
        ctx.beginPath(); 
        ctx.arc(cx, topY + 6, w/2 + 1, Math.PI, 0); 
        ctx.fill(); ctx.stroke();
        
        ctx.beginPath(); 
        ctx.moveTo(x - 2, topY + 6); 
        ctx.lineTo(x + w + 2, topY + 6); 
        ctx.lineWidth = 3; ctx.stroke();
        
        ctx.fillStyle = "rgba(255,255,255,0.2)"; 
        ctx.beginPath(); 
        ctx.arc(cx - 6, topY - 2, 4, 0, Math.PI*2); 
        ctx.fill();

    } else if (style === "crown") {
        ctx.fillStyle = "gold"; 
        ctx.strokeStyle = "#b8860b";
        ctx.beginPath();
        ctx.moveTo(x, topY); 
        ctx.lineTo(x, topY - 10); 
        ctx.lineTo(x + w/4, topY - 5);
        ctx.lineTo(cx, topY - 12); 
        ctx.lineTo(x + w*0.75, topY - 5); 
        ctx.lineTo(x + w, topY - 10);
        ctx.lineTo(x + w, topY); 
        ctx.closePath(); 
        ctx.fill(); ctx.stroke();
        
    } else if (style === "halo") {
        ctx.strokeStyle = "gold"; 
        ctx.lineWidth = 3;
        ctx.beginPath(); 
        ctx.ellipse(cx, topY - 12, 12, 4, 0, 0, Math.PI * 2); 
        ctx.stroke();
    }
}