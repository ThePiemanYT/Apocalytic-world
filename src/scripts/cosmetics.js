/* src/scripts/cosmetics.js */
import { achievements } from "./achievement.js"; 

export const cosmeticRegistry = {
  bodies: [
    { id: "cyan", name: "Neon Cyan", color: "cyan", type: "free" },
    { id: "red", name: "Crimson", color: "#ff1744", type: "free" },
    { id: "lime", name: "Lime", color: "#00e676", type: "free" },
    { id: "midnight", name: "Midnight", color: "#1a237e", type: "buyable", price: 50 },
    { id: "magma", name: "Magma", color: "#ff5722", type: "buyable", price: 100 },
    { id: "gold", name: "Golden", color: "#ffd700", type: "achievement", reqId: "1", hint: "Win without Powerups" },
    { id: "purple", name: "Void", color: "#d500f9", type: "achievement", reqId: "4", hint: "Reach Wave 8" }
  ],
  eyes: [
    { id: "normal", name: "Normal", type: "free" },
    { id: "angry", name: "Determined", type: "free" },
    { id: "scared", name: "Scared", type: "free" }, 
    { id: "bored", name: "Unimpressed", type: "buyable", price: 50 }, // NEW: -_-
    { id: "uwu", name: "Kawaii", type: "buyable", price: 125 },       // NEW: UwU
    { id: "rich", name: "High Roller", type: "buyable", price: 250 }, // NEW: $ $
    { id: "cyclops", name: "Cyclops", type: "achievement", reqId: "2", hint: "Kill 50 Enemies" },
    { id: "white", name: "Herobrine", type: "achievement", reqId: "3", hint: "Fire 1000 Bullets" },
    { id: "sunglasses", name: "Cool", type: "achievement", reqId: "5", hint: "Collect a Powerup" },
    { id: "pixel", name: "8-Bit", type: "buyable", price: 100 }, // NEW
    { id: "glasses", name: "Scholar", type: "buyable", price: 75 } // NEW
  ],
  hats: [
    { id: "none", name: "None", type: "free" },
    { id: "headband", name: "Headband", type: "free" },
    { id: "horns", name: "Devil Horns", type: "free" },
    { id: "ears", name: "Cat Ears", type: "free" },
    { id: "wizard", name: "Wizard Hat", type: "free" },
    { id: "cowboy", name: "Sheriff", type: "buyable", price: 150 },
    { id: "tophat", name: "Gentleman", type: "buyable", price: 250 },
    { id: "pirate", name: "Captain", type: "buyable", price: 200 }, // NEW
    { id: "viking", name: "Viking", type: "buyable", price: 300 }, // NEW
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
    { id: "green", name: "Toxic Green", type: "buyable", price: 200 },
    { id: "fire", name: "Inferno", type: "achievement", reqId: "2", hint: "Kill 50 Enemies" },
    { id: "rainbow", name: "Prism", type: "achievement", reqId: "4", hint: "Reach Wave 8" }
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
  
  if (moveInput && (moveInput.x !== 0 || moveInput.y !== 0)) {
      player._lastFaceDir.x = moveInput.x;
      player._lastFaceDir.y = moveInput.y;
  }
  const faceDir = player._lastFaceDir;
  
  let bodyColor = player.cosmetics.bodyColor;
  const bodyItem = cosmeticRegistry.bodies.find(b => b.id === bodyColor);
  if (bodyItem) {
      bodyColor = bodyItem.color;
  } else {
      if (bodyColor === "green") bodyColor = "#00e676"; 
      else if (!bodyColor) bodyColor = "cyan";
  }

  if (player.hurtTime > 0) {
        ctx.globalCompositeOperation = "source-atop"; 
        ctx.fillStyle = `rgba(255, 0, 0, 0.7)`; 
  } else {
        ctx.fillStyle = bodyColor; 
  }

  ctx.fillStyle = bodyColor;
  ctx.fillRect(x, y, w, h);
  
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  drawEyes(ctx, x, y, w, h, player.cosmetics.eyeStyle, aimInput, faceDir, player.x, player.y, camera, bodyColor);
  drawHat(ctx, x, y, w, h, player.cosmetics.hatStyle);

  // FROZEN VISUAL EFFECT
  if (player.isFrozen) {
      ctx.fillStyle = "rgba(0, 229, 255, 0.5)"; // Semi-transparent cyan
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4); // Encase player
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  }
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
  
  let bodyColor = player.cosmetics.bodyColor;
  const bodyItem = cosmeticRegistry.bodies.find(b => b.id === bodyColor);
  if (bodyItem) bodyColor = bodyItem.color;
  else if (bodyColor === "green") bodyColor = "#00e676";
  
  const style = player.cosmetics.indicatorStyle || "dot";
  ctx.fillStyle = bodyColor || "cyan"; 
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;

  if (style === "dot") {
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  } else if (style === "cross") {
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
  } else if (style === "arrow") {
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(4, -4); ctx.lineTo(10, 0); ctx.lineTo(4, 4); ctx.stroke();
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
    if (aim.isVector) { angle = Math.atan2(aim.y, aim.x); } 
    else { const mx = aim.x / 1.5 + cam.x; const my = aim.y / 1.5 + cam.y; angle = Math.atan2(my - cy, mx - cx); }
    
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
    } else if (style === "sunglasses") {
        ctx.fillStyle = "#111"; ctx.fillRect(leftEyeBaseX - 1, eyeY - 1, 8, 6); ctx.fillRect(rightEyeBaseX - 1, eyeY - 1, 8, 6);
        ctx.fillStyle = "#333"; ctx.fillRect(leftEyeBaseX + 7, eyeY + 1, 4, 2); 
        ctx.fillRect(x, eyeY + 1, (leftEyeBaseX - 1) - x, 2); ctx.fillRect(rightEyeBaseX + 7, eyeY + 1, (x + w) - (rightEyeBaseX + 7), 2);
        ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); ctx.moveTo(leftEyeBaseX, eyeY + 4); ctx.lineTo(leftEyeBaseX + 4, eyeY); ctx.stroke();
        ctx.moveTo(rightEyeBaseX, eyeY + 4); ctx.lineTo(rightEyeBaseX + 4, eyeY); ctx.stroke();
    
    // --- NEW FACES START ---
    } else if (style === "bored") { // -_-
        ctx.fillStyle = "black";
        ctx.fillRect(leftEyeBaseX, eyeY + 2, 8, 2); // Left line
        ctx.fillRect(rightEyeBaseX, eyeY + 2, 8, 2); // Right line
    
    } else if (style === "uwu") { // UwU
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        // Left U
        ctx.beginPath(); ctx.arc(leftEyeBaseX + 3, eyeY + 2, 3, 0, Math.PI, false); ctx.stroke();
        // Right U
        ctx.beginPath(); ctx.arc(rightEyeBaseX + 3, eyeY + 2, 3, 0, Math.PI, false); ctx.stroke();
        // Blush
        ctx.fillStyle = "#ff80ab";
        ctx.fillRect(leftEyeBaseX - 2, eyeY + 5, 4, 2);
        ctx.fillRect(rightEyeBaseX + 6, eyeY + 5, 4, 2);

    } else if (style === "rich") { // $ $
        ctx.fillStyle = "#00e676";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", leftEyeBaseX + 3, eyeY + 3);
        ctx.fillText("$", rightEyeBaseX + 3, eyeY + 3);
    
    } else if (style === "glasses") { // Scholar Glasses
        // 1. Lens Tint (Light blue/white)
        ctx.fillStyle = "rgba(200, 230, 255, 0.4)";
        ctx.fillRect(leftEyeBaseX - 1, eyeY - 1, 8, 8);
        ctx.fillRect(rightEyeBaseX - 1, eyeY - 1, 8, 8);

        // 2. Eyes (Behind the lenses)
        ctx.fillStyle = "black";
        ctx.fillRect(leftEyeBaseX + 2 + pxOff, eyeY + 2 + pyOff, 2, 2);
        ctx.fillRect(rightEyeBaseX + 2 + pxOff, eyeY + 2 + pyOff, 2, 2);

        // 3. Frames (Sleek grey)
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(leftEyeBaseX - 1, eyeY - 1, 8, 8);
        ctx.strokeRect(rightEyeBaseX - 1, eyeY - 1, 8, 8);
        // Bridge
        ctx.beginPath(); ctx.moveTo(leftEyeBaseX + 7, eyeY + 3); ctx.lineTo(rightEyeBaseX - 1, eyeY + 3); ctx.stroke();
        // Poles (Temples)
        ctx.beginPath(); 
        ctx.moveTo(leftEyeBaseX - 1, eyeY + 3); ctx.lineTo(x, eyeY + 3); // Left pole
        ctx.moveTo(rightEyeBaseX + 7, eyeY + 3); ctx.lineTo(x + w, eyeY + 3); // Right pole
        ctx.stroke();
        
        // 4. Glass Reflection (White streak)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftEyeBaseX + 1, eyeY); ctx.lineTo(leftEyeBaseX + 4, eyeY + 3);
        ctx.moveTo(rightEyeBaseX + 1, eyeY); ctx.lineTo(rightEyeBaseX + 4, eyeY + 3);
        ctx.stroke();

    } else if (style === "pixel") { // 8-Bit
        ctx.fillStyle = "black";
        // Left Eye Frame
        ctx.fillRect(leftEyeBaseX, eyeY, 6, 6);
        // Right Eye Frame
        ctx.fillRect(rightEyeBaseX, eyeY, 6, 6);
        
        // Tracking Pupils (White pixel)
        ctx.fillStyle = "white";
        // Clamp offsets to pixel grid
        const pixOffX = Math.round(Math.max(-2, Math.min(2, pxOff)));
        const pixOffY = Math.round(Math.max(-2, Math.min(2, pyOff)));
        
        ctx.fillRect(leftEyeBaseX + 2 + pixOffX, eyeY + 2 + pixOffY, 2, 2);
        ctx.fillRect(rightEyeBaseX + 2 + pixOffX, eyeY + 2 + pixOffY, 2, 2);

    // --- NEW FACES END ---

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
        // 1. Red Bandana Base (Connects to head)
        ctx.fillStyle = "#d32f2f"; 
        ctx.fillRect(x, topY, w, 6); // Sits on forehead
        
        // 2. The Hat Main Body (Black Tricorne)
        ctx.fillStyle = "#1a1a1a"; ctx.strokeStyle = "#ffd700"; // Gold trim
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        // Brim starts low and wide
        ctx.moveTo(x - 6, topY + 2); 
        // Curves up to the peak
        ctx.quadraticCurveTo(cx, topY - 18, x + w + 6, topY + 2);
        // Curves down to center (the tricorne dip)
        ctx.quadraticCurveTo(cx, topY - 2, x - 6, topY + 2);
        ctx.fill();
        ctx.stroke(); // Gold rim

        // 3. Skull & Crossbones (Simplified)
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.arc(cx, topY - 6, 4, 0, Math.PI*2); ctx.fill(); // Skull
        ctx.strokeStyle = "white"; ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(cx - 4, topY - 4); ctx.lineTo(cx + 4, topY - 8);
        ctx.moveTo(cx + 4, topY - 4); ctx.lineTo(cx - 4, topY - 8);
        ctx.stroke();

    } else if (style === "viking") {
        ctx.fillStyle = "#bdbdbd"; ctx.strokeStyle = "#616161";
        // Helmet bowl
        ctx.beginPath(); ctx.arc(cx, topY + 4, w/2 + 2, Math.PI, 0); ctx.fill(); ctx.stroke();
        // Horns
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