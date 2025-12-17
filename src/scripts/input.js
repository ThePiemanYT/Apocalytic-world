/* src/scripts/input.js */
import { Joystick } from "./joystick.js";

export const customKeys = { left: "a", right: "d", up: "w", down: "s" };

export const input = {
  move: { x: 0, y: 0 },
  aim: { x: 0, y: 0, isVector: false, active: false }, 
  isSprinting: false,
  activeDevice: 'keyboard', 
  dashPressed: false
};

const keys = {};
let mouse = { x: 0, y: 0 };
let gamepadIndex = null;
let canvasRef = null;
let handlers = {}; 

let leftStick = null;
let rightStick = null;
let mobileShootBtn = null;
let mobileDashBtn = null;

function setActiveDevice(device) {
  if (input.activeDevice !== device) {
    input.activeDevice = device;
    const showMobile = (device === 'touch');
    
    // Joystick rendering fix is handled inside .show() now
    if (leftStick) showMobile ? leftStick.show() : leftStick.hide();
    if (rightStick) showMobile ? rightStick.show() : rightStick.hide();
    
    if (mobileShootBtn) mobileShootBtn.style.display = showMobile ? "block" : "none";
    if (mobileDashBtn) mobileDashBtn.style.display = showMobile ? "block" : "none";
    
    window.dispatchEvent(new CustomEvent('device-changed', { detail: { device } }));
  }
}

export function initInput(canvas, gameHandlers) {
  canvasRef = canvas;
  handlers = gameHandlers || {};

  // --- Keyboard ---
  window.addEventListener("keydown", (e) => {
    if(e.repeat) return;
    setActiveDevice('keyboard');
    
    if (e.key.toLowerCase() === customKeys.left.toLowerCase()) keys["ArrowLeft"] = true;
    if (e.key.toLowerCase() === customKeys.right.toLowerCase()) keys["ArrowRight"] = true;
    if (e.key.toLowerCase() === customKeys.up.toLowerCase()) keys["ArrowUp"] = true;
    if (e.key.toLowerCase() === customKeys.down.toLowerCase()) keys["ArrowDown"] = true;
    if (e.key === "Shift") input.isSprinting = true;
    
    // ADDED: Dash on Space OR 'Q'
    if (e.code === "Space" || e.code === "KeyQ") input.dashPressed = true;
    
    if ((e.key === "r" || e.key === "R") && handlers.onReload) handlers.onReload();
  });

  window.addEventListener("keyup", (e) => {
    if (e.key.toLowerCase() === customKeys.left.toLowerCase()) keys["ArrowLeft"] = false;
    if (e.key.toLowerCase() === customKeys.right.toLowerCase()) keys["ArrowRight"] = false;
    if (e.key.toLowerCase() === customKeys.up.toLowerCase()) keys["ArrowUp"] = false;
    if (e.key.toLowerCase() === customKeys.down.toLowerCase()) keys["ArrowDown"] = false;
    if (e.key === "Shift") input.isSprinting = false;
    
    // ADDED: Release Dash on Space OR 'Q'
    if (e.code === "Space" || e.code === "KeyQ") input.dashPressed = false;
  });

  // --- Mouse ---
  canvas.addEventListener("mousemove", (e) => {
    if (Math.abs(e.movementX) > 1 || Math.abs(e.movementY) > 1) setActiveDevice('keyboard'); 
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
    if (e.button === 0 && handlers.onShoot) handlers.onShoot(mouse.x, mouse.y);
  });

  // --- Gamepad ---
  window.addEventListener("gamepadconnected", (e) => {
    gamepadIndex = e.gamepad.index;
    setActiveDevice('gamepad');
  });
  window.addEventListener("gamepaddisconnected", (e) => {
    if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
  });

  // --- Mobile ---
  setupJoysticks();
  setupMobileButtons();
  window.addEventListener("touchstart", () => {
    if (input.activeDevice !== 'touch') setActiveDevice('touch');
  }, { passive: true });
}

function setupJoysticks() {
  leftStick = new Joystick("stick-move", document.body, { left: "40px", bottom: "40px" });
  leftStick.onActive = () => setActiveDevice('touch');

  rightStick = new Joystick("stick-aim", document.body, { right: "40px", bottom: "110px" });
  rightStick.onActive = () => setActiveDevice('touch');
}

function setupMobileButtons() {
    // SHOOT BTN
    mobileShootBtn = document.createElement("div");
    mobileShootBtn.id = "mobileShootBtn";
    Object.assign(mobileShootBtn.style, {
        position: "absolute", bottom: "40px", right: "40px",
        width: "70px", height: "70px", borderRadius: "50%",
        backgroundColor: "rgba(255, 50, 50, 0.5)", border: "2px solid rgba(255, 255, 255, 0.4)",
        display: "none", touchAction: "none", zIndex: "1001",
        backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\"white\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l4-4 4 4h-3v4h-2z\"/></svg>')",
        backgroundSize: "50%", backgroundPosition: "center", backgroundRepeat: "no-repeat"
    });
    
    mobileShootBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        setActiveDevice('touch');
        mobileShootBtn.style.backgroundColor = "rgba(255, 50, 50, 0.8)";
        if (handlers.onShoot) {
             const range = 250;
             let tx = (canvasRef.width / 2) + 50, ty = (canvasRef.height / 2);
             if (input.aim.active && input.aim.isVector) {
                 tx = (input.aim.x * range) + (canvasRef.width / 2);
                 ty = (input.aim.y * range) + (canvasRef.height / 2);
             }
             handlers.onShoot(tx, ty);
        }
    });
    mobileShootBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        mobileShootBtn.style.backgroundColor = "rgba(255, 50, 50, 0.5)";
    });
    document.body.appendChild(mobileShootBtn);

    // DASH BTN
    mobileDashBtn = document.createElement("div");
    mobileDashBtn.id = "mobileDashBtn";
    Object.assign(mobileDashBtn.style, {
        position: "absolute", bottom: "120px", right: "130px",
        width: "50px", height: "50px", borderRadius: "50%",
        backgroundColor: "rgba(50, 200, 255, 0.5)", border: "2px solid rgba(255, 255, 255, 0.4)",
        display: "none", touchAction: "none", zIndex: "1001",
        backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\"white\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z\"/></svg>')",
        backgroundSize: "60%", backgroundPosition: "center", backgroundRepeat: "no-repeat"
    });

    mobileDashBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        input.dashPressed = true;
        mobileDashBtn.style.backgroundColor = "rgba(50, 200, 255, 0.8)";
    });
    mobileDashBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        input.dashPressed = false;
        mobileDashBtn.style.backgroundColor = "rgba(50, 200, 255, 0.5)";
    });
    document.body.appendChild(mobileDashBtn);
}

export function updateInput(playerX, playerY, cameraX, cameraY, zoom) {
  input.move.x = 0;
  input.move.y = 0;

  // 1. Gamepad
  if (gamepadIndex !== null) {
    const gp = navigator.getGamepads()[gamepadIndex];
    if (gp) { handleGamepadInput(gp, canvasRef, handlers, zoom); return; }
  }

  // 2. Touch
  if (input.activeDevice === 'touch') {
    if (Math.abs(leftStick.x) > 0.05 || Math.abs(leftStick.y) > 0.05) {
      input.move.x = leftStick.x;
      input.move.y = leftStick.y;
    }
    if (Math.abs(rightStick.x) > 0.1 || Math.abs(rightStick.y) > 0.1) {
      input.aim.isVector = true;
      input.aim.active = true;
      input.aim.x = rightStick.x;
      input.aim.y = rightStick.y;
    }
    return;
  }

  // 3. Keyboard
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

let lastGpState = { shoot: false, reload: false, dash: false };

function handleGamepadInput(gp, canvas, handlers, zoom) {
  const DEADZONE = 0.2;
  let lx = gp.axes[0], ly = gp.axes[1];
  if (Math.abs(lx) > DEADZONE || Math.abs(ly) > DEADZONE) {
    setActiveDevice('gamepad');
    input.move.x = lx;
    input.move.y = ly;
  }
  let rx = gp.axes[2], ry = gp.axes[3];
  if (Math.abs(rx) > DEADZONE || Math.abs(ry) > DEADZONE) {
    setActiveDevice('gamepad');
    input.aim.isVector = true;
    input.aim.active = true;
    input.aim.x = rx;
    input.aim.y = ry;
  }

  // Actions
  const isShootingBtn = (gp.buttons[7] && gp.buttons[7].value > 0.5) || (gp.buttons[0] && gp.buttons[0].pressed);
  if (isShootingBtn && !lastGpState.shoot) {
     if (handlers.onShoot) {
        const range = 250;
        const targetX = (input.aim.x * range) + (canvas.width / 2);
        const targetY = (input.aim.y * range) + (canvas.height / 2);
        handlers.onShoot(targetX, targetY);
     }
  }
  lastGpState.shoot = isShootingBtn;

  if (gp.buttons[2] && gp.buttons[2].pressed && !lastGpState.reload) {
    handlers.onReload && handlers.onReload();
  }
  lastGpState.reload = (gp.buttons[2] && gp.buttons[2].pressed);
  
  // ADDED: Dash on B (1), LB (4), or LT (6)
  const isDash = (gp.buttons[1] && gp.buttons[1].pressed) 
              || (gp.buttons[4] && gp.buttons[4].pressed)
              || (gp.buttons[6] && gp.buttons[6].value > 0.1); // LT
  input.dashPressed = isDash;
}