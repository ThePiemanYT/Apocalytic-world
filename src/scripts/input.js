/* src/scripts/input.js */
import { Joystick } from "./joystick.js";

export const customKeys = { left: "a", right: "d", up: "w", down: "s" };

export const input = {
  move: { x: 0, y: 0 },
  aim: { x: 0, y: 0, isVector: false, active: false }, 
  isSprinting: false,
  activeDevice: 'keyboard', // 'keyboard', 'gamepad', 'touch'
};

const keys = {};
let mouse = { x: 0, y: 0 };
let gamepadIndex = null;
let canvasRef = null;
let handlers = {}; 

// Joysticks & Buttons
let leftStick = null;
let rightStick = null;
let mobileShootBtn = null;

// Helper to switch device and toggle UI
function setActiveDevice(device) {
  if (input.activeDevice !== device) {
    input.activeDevice = device;
    
    // Toggle Mobile UI
    const showMobile = (device === 'touch');
    if (leftStick) showMobile ? leftStick.show() : leftStick.hide();
    if (rightStick) showMobile ? rightStick.show() : rightStick.hide();
    
    if (mobileShootBtn) {
        mobileShootBtn.style.display = showMobile ? "block" : "none";
    }

    window.dispatchEvent(new CustomEvent('device-changed', { detail: { device } }));
  }
}

export function initInput(canvas, gameHandlers) {
  canvasRef = canvas;
  handlers = gameHandlers || {};

  // --- 1. Keyboard Setup ---
  window.addEventListener("keydown", (e) => {
    if(e.repeat) return;
    setActiveDevice('keyboard');
    
    if (e.key.toLowerCase() === customKeys.left.toLowerCase()) keys["ArrowLeft"] = true;
    if (e.key.toLowerCase() === customKeys.right.toLowerCase()) keys["ArrowRight"] = true;
    if (e.key.toLowerCase() === customKeys.up.toLowerCase()) keys["ArrowUp"] = true;
    if (e.key.toLowerCase() === customKeys.down.toLowerCase()) keys["ArrowDown"] = true;
    if (e.key === "Shift") input.isSprinting = true;
    
    if ((e.key === "r" || e.key === "R") && handlers.onReload) handlers.onReload();
  });

  window.addEventListener("keyup", (e) => {
    if (e.key.toLowerCase() === customKeys.left.toLowerCase()) keys["ArrowLeft"] = false;
    if (e.key.toLowerCase() === customKeys.right.toLowerCase()) keys["ArrowRight"] = false;
    if (e.key.toLowerCase() === customKeys.up.toLowerCase()) keys["ArrowUp"] = false;
    if (e.key.toLowerCase() === customKeys.down.toLowerCase()) keys["ArrowDown"] = false;
    if (e.key === "Shift") input.isSprinting = false;
  });

  // --- 2. Mouse Setup ---
  canvas.addEventListener("mousemove", (e) => {
    if (Math.abs(e.movementX) > 1 || Math.abs(e.movementY) > 1) {
      setActiveDevice('keyboard'); 
    }
    if (input.activeDevice === 'keyboard') {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      input.aim.x = mouse.x;
      input.aim.y = mouse.y;
      input.aim.isVector = false; 
      input.aim.active = true;
    }
  });

  canvas.addEventListener("mousedown", (e) => {
    setActiveDevice('keyboard');
    if (e.button === 0 && handlers.onShoot) {
      handlers.onShoot(mouse.x, mouse.y);
    }
  });

  // --- 3. Gamepad Setup ---
  window.addEventListener("gamepadconnected", (e) => {
    gamepadIndex = e.gamepad.index;
    setActiveDevice('gamepad');
    showToast("Gamepad Connected");
  });
  window.addEventListener("gamepaddisconnected", (e) => {
    if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
    showToast("Gamepad Disconnected");
  });

  // --- 4. Touch/Joystick Setup ---
  setupJoysticks();
  setupMobileButtons();
  
  window.addEventListener("touchstart", () => {
    if (input.activeDevice !== 'touch') setActiveDevice('touch');
  }, { passive: true });
}

function setupJoysticks() {
  // Left Stick: Move
  leftStick = new Joystick("stick-move", document.body, {
    left: "40px", bottom: "40px"
  });
  leftStick.onActive = () => setActiveDevice('touch');

  // Right Stick: Aim Only (No auto-fire)
  rightStick = new Joystick("stick-aim", document.body, {
    right: "40px", bottom: "110px" // Moved up slightly to make room for shoot button? Or Keep layout
  });
  rightStick.onActive = () => setActiveDevice('touch');
}

function setupMobileButtons() {
    mobileShootBtn = document.createElement("div");
    mobileShootBtn.id = "mobileShootBtn";
    // Create a big circular button near the aim stick
    Object.assign(mobileShootBtn.style, {
        position: "absolute", bottom: "40px", right: "40px",
        width: "70px", height: "70px", borderRadius: "50%",
        backgroundColor: "rgba(255, 50, 50, 0.5)", border: "2px solid rgba(255, 255, 255, 0.4)",
        display: "none", touchAction: "none", zIndex: "1001",
        backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\"white\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l4-4 4 4h-3v4h-2z\"/></svg>')",
        backgroundSize: "50%", backgroundPosition: "center", backgroundRepeat: "no-repeat"
    });
    
    // Add interactions
    mobileShootBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        setActiveDevice('touch');
        mobileShootBtn.style.backgroundColor = "rgba(255, 50, 50, 0.8)";
        
        if (handlers.onShoot) {
             const range = 250;
             // If aiming with stick, use stick dir, else shoot forward/center
             let tx = 0, ty = 0;
             if (input.aim.active && input.aim.isVector) {
                 tx = (input.aim.x * range) + (canvasRef.width / 2);
                 ty = (input.aim.y * range) + (canvasRef.height / 2);
             } else {
                 // Default to shooting where player is facing or straight right? 
                 // For now, center of screen + slight offset
                 tx = (canvasRef.width / 2) + 50; 
                 ty = (canvasRef.height / 2);
             }
             handlers.onShoot(tx, ty);
        }
    });

    mobileShootBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        mobileShootBtn.style.backgroundColor = "rgba(255, 50, 50, 0.5)";
    });

    document.body.appendChild(mobileShootBtn);
}


export function updateInput(playerX, playerY, cameraX, cameraY, zoom) {
  // Reset Move
  input.move.x = 0;
  input.move.y = 0;

  // --- Priority 1: Gamepad ---
  if (gamepadIndex !== null) {
    const gp = navigator.getGamepads()[gamepadIndex];
    if (gp) {
      handleGamepadInput(gp, canvasRef, handlers, zoom);
      return; 
    }
  }

  // --- Priority 2: Touch (Joysticks) ---
  if (input.activeDevice === 'touch') {
    // Movement
    if (Math.abs(leftStick.x) > 0.05 || Math.abs(leftStick.y) > 0.05) {
      input.move.x = leftStick.x;
      input.move.y = leftStick.y;
    }

    // Aiming (Right Stick)
    if (Math.abs(rightStick.x) > 0.1 || Math.abs(rightStick.y) > 0.1) {
      input.aim.isVector = true;
      input.aim.active = true;
      input.aim.x = rightStick.x;
      input.aim.y = rightStick.y;
    }
    return;
  }

  // --- Priority 3: Keyboard ---
  if (input.activeDevice === 'keyboard') {
    let kx = 0, ky = 0;
    if (keys["ArrowLeft"]) kx -= 1;
    if (keys["ArrowRight"]) kx += 1;
    if (keys["ArrowUp"]) ky -= 1;
    if (keys["ArrowDown"]) ky += 1;

    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky);
      input.move.x = kx / len;
      input.move.y = ky / len;
    }
  }
}

// Gamepad Logic
let lastGpState = { shoot: false, reload: false };

function handleGamepadInput(gp, canvas, handlers, zoom) {
  const DEADZONE = 0.2;

  // Move
  let lx = gp.axes[0], ly = gp.axes[1];
  if (Math.abs(lx) > DEADZONE || Math.abs(ly) > DEADZONE) {
    setActiveDevice('gamepad');
    input.move.x = lx;
    input.move.y = ly;
  }

  // Aim
  let rx = gp.axes[2], ry = gp.axes[3];
  if (Math.abs(rx) > DEADZONE || Math.abs(ry) > DEADZONE) {
    setActiveDevice('gamepad');
    input.aim.isVector = true;
    input.aim.active = true;
    input.aim.x = rx;
    input.aim.y = ry;
  }

  // Shoot (Explicit Button Press ONLY)
  // R2 (Button 7) OR A (Button 0)
  const isShootingBtn = (gp.buttons[7] && gp.buttons[7].value > 0.5) || (gp.buttons[0] && gp.buttons[0].pressed);
  
  // Single fire check
  if (isShootingBtn && !lastGpState.shoot) {
     if (handlers.onShoot) {
        const range = 250;
        const targetX = (input.aim.x * range) + (canvas.width / 2);
        const targetY = (input.aim.y * range) + (canvas.height / 2);
        handlers.onShoot(targetX, targetY);
     }
  }
  lastGpState.shoot = isShootingBtn;

  // Reload (X/Square)
  if (gp.buttons[2] && gp.buttons[2].pressed && !lastGpState.reload) {
    handlers.onReload && handlers.onReload();
  }
  lastGpState.reload = (gp.buttons[2] && gp.buttons[2].pressed);
}

function showToast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
    background: "#333", color: "#fff", padding: "8px 16px", borderRadius: "4px",
    zIndex: 9999, fontFamily: "sans-serif", fontSize: "14px", border: "1px solid #ffe066"
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}