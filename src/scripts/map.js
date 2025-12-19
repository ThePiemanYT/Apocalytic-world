/* src/scripts/map.js */
import { worldWidth, worldHeight } from "./state.js";

// --- 1. MAP DATA (Sector Zero Layout) ---
export const obstacles = [
    // BOUNDARIES
    { x: -100, y: -100, w: worldWidth + 200, h: 100, type: "wall" },
    { x: -100, y: worldHeight, w: worldWidth + 200, h: 100, type: "wall" },
    { x: -100, y: 0, w: 100, h: worldHeight, type: "wall" },
    { x: worldWidth, y: 0, w: 100, h: worldHeight, type: "wall" },

    // ZONE A: THE PIT
    { x: 600, y: 400, w: 200, h: 400, type: "wall" },
    { x: 2200, y: 400, w: 200, h: 400, type: "wall" },

    // ZONE B: CENTRAL PLATFORM
    { x: 1200, y: 1200, w: 60, h: 60, type: "cover" },
    { x: 1740, y: 1200, w: 60, h: 60, type: "cover" },
    { x: 1200, y: 1740, w: 60, h: 60, type: "cover" },
    { x: 1740, y: 1740, w: 60, h: 60, type: "cover" },
    { x: 1400, y: 1400, w: 200, h: 200, type: "wall" },

    // ZONE D: THE FIELD
    { x: 400, y: 2200, w: 100, h: 300, type: "wall" },
    { x: 800, y: 2500, w: 300, h: 100, type: "wall" },
    { x: 2500, y: 2200, w: 100, h: 300, type: "wall" },
    { x: 1900, y: 2500, w: 300, h: 100, type: "wall" },
    { x: 1000, y: 2100, w: 300, h: 60, type: "cover" },
    { x: 1700, y: 2100, w: 300, h: 60, type: "cover" }
];

// --- 2. PRERENDER SYSTEM ---
let mapCache = null;

function prerenderMap() {
    mapCache = document.createElement('canvas');
    mapCache.width = worldWidth;
    mapCache.height = worldHeight;
    const mCtx = mapCache.getContext('2d');

    // A. Draw Floor
    mCtx.fillStyle = "#121212"; 
    mCtx.fillRect(0, 0, worldWidth, worldHeight);

    // B. Draw Grid
    mCtx.strokeStyle = "rgba(0, 255, 255, 0.05)";
    mCtx.lineWidth = 2;
    mCtx.beginPath();
    for (let x = 0; x <= worldWidth; x += 100) {
        mCtx.moveTo(x, 0); mCtx.lineTo(x, worldHeight);
    }
    for (let y = 0; y <= worldHeight; y += 100) {
        mCtx.moveTo(0, y); mCtx.lineTo(worldWidth, y);
    }
    mCtx.stroke();

    // C. Draw Obstacles
    obstacles.forEach(obs => {
        mCtx.fillStyle = "rgba(0,0,0,0.5)";
        mCtx.fillRect(obs.x + 10, obs.y + 10, obs.w, obs.h);

        if (obs.type === "wall") mCtx.fillStyle = "#1a1a2e"; 
        else mCtx.fillStyle = "#263238"; 
        mCtx.fillRect(obs.x, obs.y, obs.w, obs.h);

        mCtx.shadowBlur = 15;
        if (obs.type === "wall") {
            mCtx.shadowColor = "#00e5ff"; 
            mCtx.strokeStyle = "#00e5ff";
        } else {
            mCtx.shadowColor = "#ffea00"; 
            mCtx.strokeStyle = "#ffea00";
        }
        mCtx.lineWidth = 2;
        mCtx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        mCtx.shadowBlur = 0; 
    });
}

// --- 3. DRAWING FUNCTION ---
export function drawMap(ctx, camera) {
    if (!mapCache) prerenderMap();
    // Simply draw the whole map offset by camera. 
    // Since this is called inside ctx.scale(), it matches player coordinates.
    const drawX = Math.floor(-camera.x);
    const drawY = Math.floor(-camera.y);
    ctx.drawImage(mapCache, drawX, drawY);
}

// --- 4. COLLISION LOGIC ---
export function checkCollision(x, y, w, h) {
    for (const obs of obstacles) {
        if (x < obs.x + obs.w && x + w > obs.x &&
            y < obs.y + obs.h && y + h > obs.y) {
            return true;
        }
    }
    return false;
}

export function resolveMapCollision(player) {
    for (const obs of obstacles) {
        if (player.x < obs.x + obs.w && player.x + player.width > obs.x &&
            player.y < obs.y + obs.h && player.y + player.height > obs.y) {
            
            const overlapX = Math.min((player.x + player.width) - obs.x, (obs.x + obs.w) - player.x);
            const overlapY = Math.min((player.y + player.height) - obs.y, (obs.y + obs.h) - player.y);

            if (overlapX < overlapY) {
                if (player.x < obs.x) player.x -= overlapX;
                else player.x += overlapX;
            } else {
                if (player.y < obs.y) player.y -= overlapY;
                else player.y += overlapY;
            }
        }
    }
}