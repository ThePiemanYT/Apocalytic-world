/* src/scripts/camera.js */
import { canvas, worldWidth, worldHeight } from "./state.js";

// Export 'camera' so other files can find it
export let camera = { x: 0, y: 0, width: canvas.width, height: canvas.height };

// Default to 1.0 (Normal). 
// If this is too small, press '+' in game. If too big, press '-'.
export let zoom = 1.2; 

export function updateCamera(player) {
  // Center camera on player
  camera.x = Math.round(player.x + player.width / 2 - canvas.width / (2 * zoom));
  camera.y = Math.round(player.y + player.height / 2 - canvas.height / (2 * zoom));
  
  // Clamp to world bounds
  camera.x = Math.max(0, Math.min(camera.x, worldWidth - canvas.width / zoom));
  camera.y = Math.max(0, Math.min(camera.y, worldHeight - canvas.height / zoom));
}

// ZOOM CONTROLS
window.addEventListener("keydown", e => {
  if (e.key === "=" || e.key === "+") {
      zoom = Math.min(zoom + 0.1, 3);
      console.log("Zoom:", zoom);
  }
  else if (e.key === "-" || e.key === "_") {
      zoom = Math.max(zoom - 0.1, 0.5);
      console.log("Zoom:", zoom);
  }
});