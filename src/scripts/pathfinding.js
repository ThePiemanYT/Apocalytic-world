/* src/scripts/pathfinding.js */
import { obstacles } from "./map.js";
import { worldWidth, worldHeight } from "./state.js";

const CELL_SIZE = 40; 
const COLS = Math.ceil(worldWidth / CELL_SIZE);
const ROWS = Math.ceil(worldHeight / CELL_SIZE);
const WALL_PADDING = 20; // Slight buffer to steer them away from walls early

let grid = [];

export function initPathfinding() {
    grid = new Array(COLS * ROWS).fill(null).map(() => ({
        distance: 65535,
        blocked: false,
        vx: 0, vy: 0
    }));

    obstacles.forEach(obs => {
        const startCol = Math.floor(Math.max(0, obs.x - WALL_PADDING) / CELL_SIZE);
        const endCol = Math.floor(Math.min(worldWidth, obs.x + obs.w + WALL_PADDING) / CELL_SIZE);
        const startRow = Math.floor(Math.max(0, obs.y - WALL_PADDING) / CELL_SIZE);
        const endRow = Math.floor(Math.min(worldHeight, obs.y + obs.h + WALL_PADDING) / CELL_SIZE);

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const index = r * COLS + c;
                if (grid[index]) grid[index].blocked = true;
            }
        }
    });
}

export function updatePathfinding(playerX, playerY) {
    // If grid is not initialized yet, stop to prevent crash
    if (!grid || grid.length === 0) return;

    for (let i = 0; i < grid.length; i++) grid[i].distance = 65535;

    const pCol = Math.floor(Math.max(0, Math.min(worldWidth - 1, playerX)) / CELL_SIZE);
    const pRow = Math.floor(Math.max(0, Math.min(worldHeight - 1, playerY)) / CELL_SIZE);
    
    if (pCol < 0 || pCol >= COLS || pRow < 0 || pRow >= ROWS) return;
    
    const startIndex = pRow * COLS + pCol;
    
    // --- FIX START: Check if cell exists before adding to queue ---
    if (!grid[startIndex]) return; 

    grid[startIndex].blocked = false; // Always let enemies enter player's cell
    grid[startIndex].distance = 0;

    const queue = [startIndex];
    // --- FIX END ---

    const neighbors = [-COLS, COLS, -1, 1]; 

    while (queue.length > 0) {
        const currentId = queue.shift();
        
        // Safety check inside loop (though the initial check fixes the main crash)
        if (!grid[currentId]) continue;

        const currentDist = grid[currentId].distance;

        for (let offset of neighbors) {
            const nextId = currentId + offset;
            if (offset === 1 && currentId % COLS === COLS - 1) continue; 
            if (offset === -1 && currentId % COLS === 0) continue;
            if (nextId < 0 || nextId >= grid.length) continue;

            const cell = grid[nextId];
            if (!cell || cell.blocked) continue; // Added !cell check

            if (cell.distance === 65535) {
                cell.distance = currentDist + 1;
                queue.push(nextId);
            }
        }
    }

    for (let i = 0; i < grid.length; i++) {
        if (grid[i].blocked) continue;
        let bestDist = grid[i].distance;
        let vx = 0, vy = 0;

        // Boundary checks added to neighbor access to prevent wrap-around errors
        if (i % COLS > 0 && grid[i-1] && grid[i-1].distance < bestDist) { vx = -1; bestDist = grid[i-1].distance; }
        if (i % COLS < COLS - 1 && grid[i+1] && grid[i+1].distance < bestDist) { vx = 1; bestDist = grid[i+1].distance; }
        if (i >= COLS && grid[i-COLS] && grid[i-COLS].distance < bestDist) { vy = -1; bestDist = grid[i-COLS].distance; }
        if (i < grid.length - COLS && grid[i+COLS] && grid[i+COLS].distance < bestDist) { vy = 1; }

        const len = Math.hypot(vx, vy);
        if (len > 0) { grid[i].vx = vx / len; grid[i].vy = vy / len; }
    }
}

export function getFlowDirection(x, y) {
    // Safety check for empty grid
    if (!grid || grid.length === 0) return { x: 0, y: 0 };

    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return { x: 0, y: 0 }; 
    
    const cell = grid[row * COLS + col];
    if (!cell || cell.blocked) {
        // Fallback: Nudge towards center if stuck inside wall buffer
        const dx = (worldWidth/2) - x;
        const dy = (worldHeight/2) - y;
        const len = Math.hypot(dx, dy) || 1;
        return { x: dx/len, y: dy/len };
    }
    return { x: cell.vx, y: cell.vy };
}