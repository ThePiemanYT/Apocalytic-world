/* =========================================================================
   Input Manager
   Handles Keyboard, Mouse, Touch (Virtual Joystick), and Gamepad (Controller)
   With Auto-Detection and Visual Aim support
   ========================================================================= */

// Configurable keys (exported so Settings UI can modify them)
export const customKeys = { left: "a", right: "d", up: "w", down: "s" };

// Current Input State
export const input = {
  // Movement vector (-1 to 1)
  move: { x: 0, y: 0 },
  // Aim Data
  aim: { 
    x: 0, 
    y: 0, 
    isVector: false, // True for Gamepad/Mobile, False for Mouse (Screen Coords)
    active: false    // True if user is actively aiming
  }, 
  // Boolean states
  isSprinting: false,
  isShooting: false,
  activeDevice: 'keyboard', // 'keyboard', 'gamepad', 'touch'
};

// Internal state
const keys = {};
let mouse = { x: 0, y: 0 };
let joystick = { x: 0, y: 0, active: false, id: null };
let aimJoystick = { x: 0, y: 0, active: false, id: null }; // Support for dual stick on mobile if needed
let gamepadIndex = null;
let canvasRef = null;
let handlers = {}; // { onShoot, onReload }

// Detect Mobile
export const isMobile = /Mobi|Android/i.test(navigator.userAgent);

/* =========================================================================
   Helper: Notify Device Change
   ========================================================================= */
function setActiveDevice(device) {
  if (input.activeDevice !== device) {
    input.activeDevice = device;
    // Dispatch event for UI to pick up
    window.dispatchEvent(new CustomEvent('device-changed', { detail: { device } }));
  }
}

/* =========================================================================
   Initialization
   ========================================================================= */
export function initInput(canvas, gameHandlers) {
  canvasRef = canvas;
  handlers = gameHandlers || {};

  // --- Keyboard Listeners ---
  window.addEventListener("keydown", (e) => {
    // Ignore key repeats to prevent spamming detection
    if(e.repeat) return;
    setActiveDevice('keyboard');
    
    if (e.key.toLowerCase() === customKeys.left.toLowerCase()) keys["ArrowLeft"] = true;
    if (e.key.toLowerCase() === customKeys.right.toLowerCase()) keys["ArrowRight"] = true;
    if (e.key.toLowerCase() === customKeys.up.toLowerCase()) keys["ArrowUp"] = true;
    if (e.key.toLowerCase() === customKeys.down.toLowerCase()) keys["ArrowDown"] = true;
    
    if (e.key === "Shift") input.isSprinting = true;

    // Reload
    if ((e.key === "r" || e.key === "R") && handlers.onReload) {
      handlers.onReload();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key.toLowerCase() === customKeys.left.toLowerCase()) keys["ArrowLeft"] = false;
    if (e.key.toLowerCase() === customKeys.right.toLowerCase()) keys["ArrowRight"] = false;
    if (e.key.toLowerCase() === customKeys.up.toLowerCase()) keys["ArrowUp"] = false;
    if (e.key.toLowerCase() === customKeys.down.toLowerCase()) keys["ArrowDown"] = false;
    
    if (e.key === "Shift") input.isSprinting = false;
  });

  // --- Mouse Listeners ---
  canvas.addEventListener("mousemove", (e) => {
    // Only switch to mouse if actual movement occurs (prevents jitters)
    if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
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

  // --- Gamepad Events ---
  window.addEventListener("gamepadconnected", (e) => {
    console.log("Gamepad connected:", e.gamepad.id);
    gamepadIndex = e.gamepad.index;
    setActiveDevice('gamepad');
    showToast("Gamepad Connected");
  });

  window.addEventListener("gamepaddisconnected", (e) => {
    if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
    setActiveDevice('keyboard');
    showToast("Gamepad Disconnected");
  });

  // --- Mobile Joystick Setup ---
  if (isMobile) {
    setupJoystick();
    // Mobile is usually 'touch', but let's wait for interaction to set it
  }
}

/* =========================================================================
   Update Loop (Call this every frame in game loop)
   ========================================================================= */
export function updateInput(playerX, playerY, cameraX, cameraY, zoom) {
  // 1. Reset movement
  input.move.x = 0;
  input.move.y = 0;

  // 2. Poll Gamepad (Highest Priority if active)
  if (gamepadIndex !== null) {
    const gp = navigator.getGamepads()[gamepadIndex];
    if (gp) {
      handleGamepadInput(gp, playerX, playerY, cameraX, cameraY, zoom);
    }
  }

  // 3. Mobile Joystick
  // If gamepad isn't giving input, check touch
  if (input.activeDevice !== 'gamepad' || (Math.abs(input.move.x) < 0.1 && Math.abs(input.move.y) < 0.1)) {
    if (joystick.active) {
      setActiveDevice('touch');
      input.move.x = joystick.x;
      input.move.y = joystick.y;
      
      // Mobile "Look" - usually the right side of screen or a second joystick
      // For now, let's assume if moving, we aim in movement direction OR keep last aim
      // Ideally you'd have a second joystick for shooting
      input.aim.isVector = true;
      if (Math.abs(input.move.x) > 0.1 || Math.abs(input.move.y) > 0.1) {
         input.aim.x = input.move.x;
         input.aim.y = input.move.y;
         input.aim.active = true;
      }
    } 
  }

  // 4. Keyboard Fallback
  // If no gamepad/touch movement, use keyboard
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

/* =========================================================================
   Gamepad Logic
   ========================================================================= */
let lastButtonState = {}; 

function handleGamepadInput(gp, px, py, cx, cy, zoom) {
  const DEADZONE = 0.2;

  // --- Movement (Left Stick: Axes 0, 1) ---
  let lx = gp.axes[0];
  let ly = gp.axes[1];

  if (Math.abs(lx) < DEADZONE) lx = 0;
  if (Math.abs(ly) < DEADZONE) ly = 0;

  if (lx !== 0 || ly !== 0) {
    setActiveDevice('gamepad');
    input.move.x = lx;
    input.move.y = ly;
  }

  // --- Aiming (Right Stick: Axes 2, 3) ---
  let rx = gp.axes[2];
  let ry = gp.axes[3];

  if (Math.abs(rx) > DEADZONE || Math.abs(ry) > DEADZONE) {
    setActiveDevice('gamepad');
    input.aim.isVector = true;
    input.aim.active = true;
    input.aim.x = rx;
    input.aim.y = ry;
  } else if (input.activeDevice === 'gamepad') {
    // Keep looking in last direction if stick released, don't snap to 0
    // (Optional: or set active=false to hide cursor)
  }

  // --- Actions ---
  // Sprint (L3 or Left Trigger)
  if (gp.buttons[10].pressed || gp.buttons[6].value > 0.5) {
     input.isSprinting = true;
     setActiveDevice('gamepad');
  } else {
     input.isSprinting = false;
  }

  // Shoot (Right Trigger > 0.5 or A Button)
  const isShootingNow = gp.buttons[7].value > 0.5 || gp.buttons[0].pressed;
  
  if (isShootingNow && !lastButtonState.shoot) {
    setActiveDevice('gamepad');
    // Calculate target 
    if (input.aim.isVector && input.aim.active) {
      // Create a virtual target point at a distance
      const range = 250;
      // We pass relative coords to onShoot, index.js handles camera
      // Actually index.js shootBullet expects SCREEN coords or uses logic
      // We will calculate a "Screen" position relative to center of canvas
      const targetX = (input.aim.x * range) + (canvasRef.width / 2); 
      const targetY = (input.aim.y * range) + (canvasRef.height / 2);
      
      if (handlers.onShoot) handlers.onShoot(targetX, targetY);
    } else {
      // Fallback: Shoot forward if no aim input
      // ...
    }
  }
  lastButtonState.shoot = isShootingNow;

  // Reload (X Button / Square -> Index 2)
  if (gp.buttons[2].pressed && !lastButtonState.reload) {
    setActiveDevice('gamepad');
    if (handlers.onReload) handlers.onReload();
  }
  lastButtonState.reload = gp.buttons[2].pressed;
}

/* =========================================================================
   Mobile Joystick UI & Logic
   ========================================================================= */
function setupJoystick() {
  // Movement Joystick (Left)
  const joystickContainer = document.createElement("div");
  joystickContainer.id = "joystickContainer";
  Object.assign(joystickContainer.style, {
    position: "absolute", bottom: "40px", left: "40px", width: "120px", height: "120px",
    background: "rgba(255,255,255,0.1)", borderRadius: "50%", zIndex: "100",
    border: "2px solid rgba(255,255,255,0.3)", touchAction: "none"
  });
  document.body.appendChild(joystickContainer);

  const stick = document.createElement("div");
  Object.assign(stick.style, {
    position: "absolute", width: "50px", height: "50px", background: "rgba(255, 255, 255, 0.8)",
    borderRadius: "50%", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
    pointerEvents: "none", boxShadow: "0 0 10px rgba(0,0,0,0.5)"
  });
  joystickContainer.appendChild(stick);

  let startX = 0, startY = 0;
  const maxDist = 35; 

  joystickContainer.addEventListener("touchstart", e => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystick.id = touch.identifier;
    joystick.active = true;
    startX = touch.clientX;
    startY = touch.clientY;
    setActiveDevice('touch');
  });

  joystickContainer.addEventListener("touchmove", e => {
    e.preventDefault();
    if (!joystick.active) return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystick.id) {
        const touch = e.changedTouches[i];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        
        const stickX = Math.cos(angle) * clampedDist;
        const stickY = Math.sin(angle) * clampedDist;
        stick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

        joystick.x = Math.cos(angle) * (clampedDist / maxDist);
        joystick.y = Math.sin(angle) * (clampedDist / maxDist);
      }
    }
  });

  const endDrag = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystick.id) {
        joystick.active = false;
        joystick.id = null;
        joystick.x = 0;
        joystick.y = 0;
        stick.style.transform = `translate(-50%, -50%)`;
      }
    }
  };

  joystickContainer.addEventListener("touchend", endDrag);
  joystickContainer.addEventListener("touchcancel", endDrag);
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