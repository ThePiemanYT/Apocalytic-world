/* src/scripts/camera.js */
import { canvas, worldWidth, worldHeight } from "./state.js";

// Export 'camera' so other files can find it
export let camera = { 
    x: 0, y: 0, 
    width: canvas.width, height: canvas.height,
    targetX: 0, targetY: 0,
    shake: { x: 0, y: 0, amount: 0, decay: 0.9 }
};

// Default to 1.2 (Normal). 
export let zoom = 1.2; 

export function updateCamera(player, shakeAmount = 0, currentZoom = null) {
  const activeZoom = currentZoom || zoom;
  // Target position: centered on player
  const targetX = player.x + player.width / 2 - (canvas.width / activeZoom) / 2;
  const targetY = player.y + player.height / 2 - (canvas.height / activeZoom) / 2;

  // LERP (Linear Interpolation) for smooth movement
  const lerpFactor = 0.1;
  camera.x += (targetX - camera.x) * lerpFactor;
  camera.y += (targetY - camera.y) * lerpFactor;

  // CLAMP to world bounds using ACTIVE zoom
  camera.x = Math.max(0, Math.min(camera.x, worldWidth - canvas.width / activeZoom));
  camera.y = Math.max(0, Math.min(camera.y, worldHeight - canvas.height / activeZoom));

  // SHAKE LOGIC (Directional/Randomized)
  if (shakeAmount > 0) {
      camera.shake.amount = shakeAmount;
  }

  if (camera.shake.amount > 0.1) {
      camera.shake.x = (Math.random() - 0.5) * camera.shake.amount;
      camera.shake.y = (Math.random() - 0.5) * camera.shake.amount;
      camera.shake.amount *= camera.shake.decay;
  } else {
      camera.shake.x = 0;
      camera.shake.y = 0;
      camera.shake.amount = 0;
  }
}

export function snapCamera(target) {
    const targetX = target.x + target.width / 2 - (canvas.width / zoom) / 2;
    const targetY = target.y + target.height / 2 - (canvas.height / zoom) / 2;
    camera.x = Math.max(0, Math.min(targetX, worldWidth - canvas.width / zoom));
    camera.y = Math.max(0, Math.min(targetY, worldHeight - canvas.height / zoom));
}

// ZOOM CONTROLS
window.addEventListener("keydown", e => {
  if (e.key === "=" || e.key === "+") {
      zoom = Math.min(zoom + 0.1, 3);
  }
  else if (e.key === "-" || e.key === "_") {
      zoom = Math.max(zoom - 0.1, 0.5);
  }
});