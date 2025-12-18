/* src/scripts/cosmetics.js */
import { achievements } from "./achievement.js"; 

// --- Registry of All Cosmetics ---
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
    { id: "cyclops", name: "Cyclops", type: "achievement", reqId: "2", hint: "Kill 50 Enemies" },
    { id: "white", name: "Herobrine", type: "achievement", reqId: "3", hint: "Fire 1000 Bullets" },
    { id: "sunglasses", name: "Cool", type: "achievement", reqId: "5", hint: "Collect a Powerup" }
  ],
  hats: [
    { id: "none", name: "None", type: "free" },
    { id: "headband", name: "Headband", type: "free" },
    { id: "helmet", name: "Helmet", type: "achievement", reqId: "4", hint: "Reach Wave 8" },
    { id: "crown", name: "King", type: "achievement", reqId: "1", hint: "Win without Powerups" },
    { id: "halo", name: "Angel", type: "achievement", reqId: "1", hint: "Win without Powerups" }
  ],
  indicators: [
    { id: "dot", name: "Simple Dot", type: "free" },
    { id: "cross", name: "Crosshair", type: "free" },
    { id: "arrow", name: "Arrow", type: "achievement", reqId: "2", hint: "Kill 50 Enemies" }
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

export function drawPlayer(ctx, player, aimInput, camera) {
  const x = Math.round(player.x - camera.x);
  const y = Math.round(player.y - camera.y);
  const w = player.width;
  const h = player.height;
  
  // 1. Body
  ctx.fillStyle = player.cosmetics.bodyColor || "cyan";
  ctx.fillRect(x, y, w, h);
  
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // 2. Eyes
  drawEyes(ctx, x, y, w, h, player.cosmetics.eyeStyle, aimInput, player.x, player.y, camera, player.cosmetics.bodyColor);

  // 3. Hat
  drawHat(ctx, x, y, w, h, player.cosmetics.hatStyle);
}

export function drawPlayerIndicator(ctx, player, aimInput, camera) {
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  let tx, ty, angle = 0;

  if (aimInput.isVector) {
    angle = Math.atan2(aimInput.y, aimInput.x);
    const dist = 80;
    tx = cx + Math.cos(angle) * dist;
    ty = cy + Math.sin(angle) * dist;
  } else {
    tx = aimInput.x / 1.5 + camera.x; 
    ty = aimInput.y / 1.5 + camera.y;
    angle = Math.atan2(ty - cy, tx - cx);
    const dist = Math.hypot(tx - cx, ty - cy);
    if (dist > 150) {
        tx = cx + Math.cos(angle) * 150;
        ty = cy + Math.sin(angle) * 150;
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
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  } else if (style === "cross") {
      ctx.beginPath(); 
      ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
      ctx.moveTo(0, -6); ctx.lineTo(0, 6);
      ctx.stroke();
  } else if (style === "arrow") {
      ctx.beginPath();
      ctx.moveTo(6, 0); ctx.lineTo(-4, 4); ctx.lineTo(-4, -4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawEyes(ctx, x, y, w, h, style, aim, px, py, cam, bodyColor) {
    const cx = px + w/2;
    const cy = py + h/2;
    let angle = 0;
    
    if (aim.isVector) {
        angle = Math.atan2(aim.y, aim.x);
    } else {
        const mx = aim.x / 1.5 + cam.x; 
        const my = aim.y / 1.5 + cam.y;
        angle = Math.atan2(my - cy, mx - cx);
    }
    
    const eyeOffsetX = 8;
    const eyeOffsetY = -2;
    const eyeSize = 6;
    
    const leftEyeX = x + w/2 - eyeOffsetX;
    const leftEyeY = y + h/2 + eyeOffsetY;
    const rightEyeX = x + w/2 + eyeOffsetX;
    const rightEyeY = y + h/2 + eyeOffsetY;
    
    // Pupil Offset (Clamped to stay inside)
    const trackDist = 1.5; 
    const pxOff = Math.cos(angle) * trackDist;
    const pyOff = Math.sin(angle) * trackDist;

    if (style === "cyclops") {
        ctx.fillStyle = "white";
        ctx.fillRect(x + w/2 - 6, y + h/2 - 6, 12, 12);
        ctx.fillStyle = "black";
        ctx.fillRect(x + w/2 - 2 + pxOff, y + h/2 - 2 + pyOff, 4, 4);
    } else if (style === "sunglasses") {
        ctx.fillStyle = "black";
        ctx.fillRect(leftEyeX - 2, leftEyeY - 2, 24, 8); 
        ctx.fillStyle = "#333";
        ctx.fillRect(leftEyeX, leftEyeY, 8, 6);
        ctx.fillRect(rightEyeX - 2, rightEyeY, 8, 6);
    } else if (style === "white") {
        ctx.fillStyle = "white";
        ctx.fillRect(leftEyeX, leftEyeY, eyeSize, eyeSize);
        ctx.fillRect(rightEyeX, rightEyeY, eyeSize, eyeSize);
    } else {
        // Standard Whites
        ctx.fillStyle = "white";
        ctx.fillRect(leftEyeX, leftEyeY, eyeSize, eyeSize);
        ctx.fillRect(rightEyeX, rightEyeY, eyeSize, eyeSize);

        // Draw Pupils
        ctx.fillStyle = "black";
        ctx.fillRect(leftEyeX + 2 + pxOff, leftEyeY + 2 + pyOff, 2, 2);
        ctx.fillRect(rightEyeX + 2 + pxOff, rightEyeY + 2 + pyOff, 2, 2);
        
        // Angry Eyelids (Drawn ON TOP to cut off the pupil)
        if (style === "angry") {
            ctx.fillStyle = bodyColor || "cyan"; // Same as body to look like skin
            
            // Left Eye Lid (Angled down-right)
            ctx.beginPath();
            ctx.moveTo(leftEyeX, leftEyeY); 
            ctx.lineTo(leftEyeX + eyeSize, leftEyeY); 
            ctx.lineTo(leftEyeX, leftEyeY + 4); 
            ctx.fill();
            
            // Right Eye Lid (Angled down-left)
            ctx.beginPath();
            ctx.moveTo(rightEyeX, rightEyeY); 
            ctx.lineTo(rightEyeX + eyeSize, rightEyeY); 
            ctx.lineTo(rightEyeX + eyeSize, rightEyeY + 4); 
            ctx.fill();
        }
    }
}

function drawHat(ctx, x, y, w, h, style) {
    const cx = x + w/2;
    const topY = y;
    ctx.fillStyle = "#eee"; 
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;

    if (style === "headband") {
        ctx.fillStyle = "red";
        ctx.fillRect(x, y + 4, w, 4);
        ctx.fillRect(x + w, y + 4, 4, 4); // Knot
    } else if (style === "helmet") {
        ctx.fillStyle = "#556b2f"; 
        ctx.beginPath();
        ctx.arc(cx, topY + 5, w/2 + 2, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
    } else if (style === "crown") {
        ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, topY - 10);
        ctx.lineTo(x + w/4, topY - 5);
        ctx.lineTo(cx, topY - 12);
        ctx.lineTo(x + w*0.75, topY - 5);
        ctx.lineTo(x + w, topY - 10);
        ctx.lineTo(x + w, topY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else if (style === "halo") {
        ctx.strokeStyle = "gold";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, topY - 12, 12, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}