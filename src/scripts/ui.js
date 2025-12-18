/* src/scripts/ui.js */
import { player, score, recalcPlayerStats, gameRunning, saveCosmetics } from "./state.js";
import { cosmeticRegistry, isUnlocked, drawPlayer, drawPlayerIndicator, getBulletStyleDef } from "./cosmetics.js";
import { playSound, setMusicVolume, setSFXVolume, toggleMusic, toggleSFX } from "./audio.js";

// --- References ---
const scoreDisplay = document.getElementById("score");
const healthBar = document.getElementById("healthBar");
const healthBarContainer = document.getElementById("healthBarContainer");
const waveDisplay = document.getElementById("waveDisplay");
const ammoDisplay = document.getElementById("ammoDisplay") || document.createElement("div");
const staminaBar = document.getElementById("staminaBar") || document.createElement("div");
const staminaFill = document.createElement("div");

// --- Initialization ---
export function initUI() {
  // Setup Ammo
  if (!document.getElementById("ammoDisplay")) {
    ammoDisplay.id = "ammoDisplay";
    Object.assign(ammoDisplay.style, {
      position: "absolute", bottom: "16px", right: "32px", fontSize: "20px",
      color: "#ffe066", fontFamily: "Press Start 2P", textShadow: "2px 2px 4px #222", zIndex: 100
    });
    document.body.appendChild(ammoDisplay);
  }

  // Setup Stamina
  if (!document.getElementById("staminaBar")) {
    staminaBar.id = "staminaBar";
    Object.assign(staminaBar.style, {
      position: "absolute", bottom: "60px", left: "32px", width: "200px", height: "20px",
      background: "#444", border: "2px solid #fff", borderRadius: "8px", overflow: "hidden", zIndex: 100
    });
    document.body.appendChild(staminaBar);
  }

  // --- Wardrobe Button (Top Right) ---
  if (!document.getElementById("wardrobeBtn")) {
      const btn = document.createElement("button");
      btn.id = "wardrobeBtn";
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="32" height="32" fill="white" stroke="black" stroke-width="1.5">
          <path d="M20.38 3.46L16 2l-4 6-4-6-4.38 1.46a2 2 0 00-1.08 2.57l1.2 4.2A2 2 0 005.6 11.8L8 11v10a1 1 0 001 1h6a1 1 0 001-1V11l2.4.8a2 2 0 001.86-1.57l1.2-4.2a2 2 0 00-1.08-2.57z"/>
        </svg>
      `;
      Object.assign(btn.style, {
          position: "absolute", top: "20px", right: "20px",
          background: "rgba(0,0,0,0.6)", border: "2px solid rgba(255,255,255,0.5)",
          borderRadius: "8px", cursor: "pointer", padding: "8px",
          zIndex: "10000",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.1s, background 0.2s"
      });
      
      btn.onmouseenter = () => btn.style.background = "rgba(255,255,255,0.2)";
      btn.onmouseleave = () => btn.style.background = "rgba(0,0,0,0.6)";
      btn.onclick = () => { 
          playSound("select"); 
          openWardrobe(); 
      };
      
      document.body.appendChild(btn);
  }

  staminaBar.innerHTML = ''; 
  Object.assign(staminaFill.style, { height: "100%", width: "100%", background: "linear-gradient(90deg, #80dfff, #4fc3f7)" });
  staminaBar.appendChild(staminaFill);
  
  setupSettingsListeners();
}

// --- Toggle Visibility ---
export function toggleGameUI(visible) {
    const displayVal = visible ? "block" : "none";
    if (scoreDisplay) scoreDisplay.style.display = displayVal;
    if (waveDisplay) waveDisplay.style.display = displayVal;
    if (healthBarContainer) healthBarContainer.style.display = displayVal;
    if (ammoDisplay) ammoDisplay.style.display = displayVal;
    if (staminaBar) staminaBar.style.display = displayVal;
    
    // Hide Wardrobe button when game is running
    const wBtn = document.getElementById("wardrobeBtn");
    if(wBtn) wBtn.style.display = visible ? "none" : "flex";
}

// --- Updates ---
export function updateHUD() {
  const percent = Math.max(0, player.health) / player.maxHealth;
  if(healthBar) {
      healthBar.style.width = (percent * 100) + "%";
      if (percent > 0.6) healthBar.style.background = "linear-gradient(90deg, #4CAF50, #ffe066)";
      else if (percent > 0.3) healthBar.style.background = "linear-gradient(90deg, orange, #ffe066)";
      else healthBar.style.background = "linear-gradient(90deg, #d32f2f, #ffe066)";
  }
  ammoDisplay.textContent = `Ammo: ${player.ammo} / ${player.reserveAmmo}`;
  staminaFill.style.width = (player.stamina / player.maxStamina * 100) + "%";
  if(scoreDisplay) scoreDisplay.textContent = "Score: " + score;
}
export function updateWaveUI(currentWave) {
  if (waveDisplay) waveDisplay.textContent = "Wave: " + (currentWave + 1);
}

// --- Menus & Panels ---
let panelStack = [];
let helpData = null;
let aboutData = null;

export function openPanel(id) {
  document.querySelectorAll(".menuPanel").forEach(p => { p.style.display = "none"; p.setAttribute("inert", ""); });
  const menu1 = document.getElementById("menu1");
  if (menu1) menu1.style.display = "none";
  
  const wBtn = document.getElementById("wardrobeBtn");
  if(wBtn) wBtn.style.display = "none";

  const el = document.getElementById(id);
  if (el) {
    el.style.display = "flex"; el.removeAttribute("inert");
    panelStack.push(id);
    if (id === "helpPanel") loadHelpData();
    if (id === "aboutPanel") loadAboutData();
  }
  playSound("select");
}

export function closePanel(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = "none"; el.setAttribute("inert", ""); }
  
  panelStack.pop();
  const prev = panelStack[panelStack.length - 1];

  if (prev) {
    const prevEl = document.getElementById(prev);
    if(prevEl) { prevEl.style.display = "flex"; prevEl.removeAttribute("inert"); }
  } else {
    if (!gameRunning) {
        const menu1 = document.getElementById("menu1");
        if (menu1) menu1.style.display = "flex";
        const wBtn = document.getElementById("wardrobeBtn");
        if(wBtn) wBtn.style.display = "flex";
    }
  }
  playSound("select");
}

async function loadHelpData() {
  const helpTabs = document.getElementById("helpTabs");
  const helpContent = document.getElementById("helpContent");
  if (!helpTabs) return;
  
  if (!helpData) {
    try { const res = await fetch("data/help.json"); helpData = await res.json(); } catch (e) {}
  }
  
  helpTabs.innerHTML = "";
  if(helpData) Object.keys(helpData).forEach(key => {
      const btn = document.createElement("button");
      // FIX: Use Number/Key instead of Title for Tab Button
      btn.textContent = key; 
      btn.onclick = () => { 
          const txt = helpData[key].content.replace(/\n/g, "<br>");
          // Title still shown inside content
          helpContent.innerHTML = `<h4 style="color:#ffd166">${helpData[key].title}</h4><p style="color:#ddd; font-size:13px; line-height:1.6;">${txt}</p>`; 
      };
      helpTabs.appendChild(btn);
  });
  if (helpData && Object.keys(helpData)[0]) helpTabs.firstChild.click();
}

async function loadAboutData() {
    const aboutTabs = document.getElementById("aboutTabs");
    const aboutContent = document.getElementById("aboutContent");
    if (!aboutTabs) return;
    
    if (!aboutData) {
        try { const res = await fetch("data/about.json"); aboutData = await res.json(); } catch (e) {}
    }
    
    aboutTabs.innerHTML = "";
    if(aboutData) Object.keys(aboutData).forEach(key => {
        const btn = document.createElement("button");
        // FIX: Use Number/Key instead of Title for Tab Button
        btn.textContent = key;
        btn.onclick = () => { 
            const txt = aboutData[key].content ? aboutData[key].content.replace(/\n/g, "<br>") : ""; 
            aboutContent.innerHTML = `<h4 style="color:#ffd166">${aboutData[key].title}</h4><p style="color:#ddd; font-size:13px; line-height:1.6;">${txt}</p>`; 
        };
        aboutTabs.appendChild(btn);
    });
    
    if (aboutData && Object.keys(aboutData)[0]) aboutTabs.firstChild.click();
}

// --- UPGRADE SCREEN ---
export function openUpgradeScreen(onComplete) {
  const upgradeKeys = [
    { key: "damage", label: "Damage" }, 
    { key: "health", label: "Health" },
    { key: "speed", label: "Speed" }, 
    { key: "magazine", label: "Magazine" },
    { key: "critChance", label: "Crit Chance" },
    { key: "critDamage", label: "Crit Dmg" }
  ];
  const maxPerUpgrade = 5;
  const pickLimit = 3;
  let picks = 0;

  player.upgrades = player.upgrades || {};
  upgradeKeys.forEach(u => { if (typeof player.upgrades[u.key] !== "number") player.upgrades[u.key] = 0; });

  const modal = document.createElement("div");
  modal.id = "upgrade-modal";
  Object.assign(modal.style, {
    position: "fixed", inset: "0", display: "flex", alignItems: "center",
    justifyContent: "center", background: "rgba(0,0,0,0.85)", zIndex: 9999
  });

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    width: "600px", maxWidth: "96%", background: "rgba(20,20,20,0.95)",
    borderRadius: "12px", padding: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
    border: "1px solid #444", color: "#fff", fontFamily: "Press Start 2P, sans-serif", textAlign: "center"
  });

  panel.innerHTML = `
    <div style="margin-bottom:14px;font-size:20px;color:#ffd166;text-shadow:2px 2px 0px #000;">CHOOSE UPGRADES</div>
    <div id="pick-count" style="margin-bottom:15px; color:#aaa; font-size:12px;">Picks Remaining: ${pickLimit}</div>
    <div id="upg-rows" style="display:flex;flex-direction:column;gap:12px;margin-top:10px;"></div>
  `;
  modal.appendChild(panel);
  document.body.appendChild(modal);

  const rows = panel.querySelector("#upg-rows");

  function refresh() {
      rows.innerHTML = "";
      upgradeKeys.forEach(u => {
          const row = document.createElement("div");
          Object.assign(row.style, { 
              display: "flex", alignItems:"center", justifyContent: "space-between", 
              background: "rgba(255,255,255,0.05)", padding: "10px 15px", borderRadius: "8px" 
          });
          
          const lvl = player.upgrades[u.key] || 0;
          
          // Reverted to Visual Blocks (Pips) based on context
          let blocksHTML = "<div style='display:flex;gap:4px;'>";
          for(let i=0; i<maxPerUpgrade; i++) {
              const color = i < lvl ? "#ffd166" : "rgba(255,255,255,0.1)";
              blocksHTML += `<div style="width:20px;height:12px;background:${color};border-radius:2px;"></div>`;
          }
          blocksHTML += "</div>";

          row.innerHTML = `<span style="font-size:12px;text-align:left;min-width:140px;">${u.label}</span>${blocksHTML}`;
          
          const btn = document.createElement("button");
          btn.textContent = "+";
          const isMaxed = lvl >= maxPerUpgrade;
          const canAfford = picks < pickLimit;
          
          Object.assign(btn.style, { 
              background: isMaxed || !canAfford ? "#555" : "linear-gradient(180deg,#ffd166,#ffb347)", 
              border: "none", cursor: isMaxed || !canAfford ? "default" : "pointer", 
              fontWeight: "bold", width: "32px", height: "28px", borderRadius: "4px", color: "#222",
              marginLeft: "15px"
          });
          
          btn.onclick = () => {
              if (picks >= pickLimit || lvl >= maxPerUpgrade) return;
              
              player.upgrades[u.key] = lvl + 1;
              picks++;
              playSound("select"); 
              
              recalcPlayerStats();
              if (u.key === 'health') player.health = Math.min(player.health + 2, player.maxHealth);
              if (u.key === 'magazine') player.ammo = Math.min(player.ammo + 4, player.magazineSize);
              updateHUD();
              
              refresh();
              
              if (picks >= pickLimit) { 
                  setTimeout(() => {
                      modal.remove(); 
                      if(onComplete) onComplete(); 
                  }, 300); 
              }
          };
          row.appendChild(btn);
          rows.appendChild(row);
      });
      document.getElementById("pick-count").textContent = `Picks Remaining: ${pickLimit - picks}`;
  }

  refresh();
}

// --- WARDROBE UI ---
let previewInterval = null;
export function openWardrobe() {
    let modal = document.getElementById("wardrobeModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "wardrobeModal";
        Object.assign(modal.style, {
            position: "fixed", inset: "0", background: "rgba(0,0,0,0.95)", 
            display: "none", flexDirection: "row", alignItems: "center", justifyContent: "center",
            gap: "40px", zIndex: "10001", fontFamily: "'Press Start 2P', sans-serif", color: "white"
        });
        modal.innerHTML = `
            <div style="display:flex; flex-direction:column; alignItems:center; gap:15px; background:rgba(255,255,255,0.05); padding:20px; border-radius:12px;">
                <h3 style="color:#ffe066; margin:0;">PREVIEW</h3>
                <canvas id="wardrobeCanvas" width="400" height="400" style="width:200px; height:200px; background:#222; border:4px solid #444; border-radius:8px; image-rendering:pixelated;"></canvas>
                <small style="color:#aaa; font-size:10px;">Move & Aim to Test</small>
            </div>
            <div style="display:flex; flex-direction:column; width: 450px; max-width:90%;">
                <h2 style="color: #ffe066; margin-bottom: 20px; text-align:center;">WARDROBE</h2>
                <div id="wardrobeGrid" style="display: flex; flex-direction:column; gap: 12px;"></div>
                <button id="closeWardrobeBtn" style="margin-top: 25px; padding: 15px; background:#4CAF50; border:none; color:white; cursor:pointer;">Save & Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById("closeWardrobeBtn").onclick = () => {
            modal.style.display = "none";
            document.getElementById("menu").style.display = "flex";
            const wBtn = document.getElementById("wardrobeBtn"); if(wBtn) wBtn.style.display = "flex";
            if(previewInterval) { clearInterval(previewInterval); previewInterval = null; }
            saveCosmetics(); playSound("select");
        };
    }
    
    document.getElementById("menu").style.display = "none";
    const wBtn = document.getElementById("wardrobeBtn"); if(wBtn) wBtn.style.display = "none";
    const grid = document.getElementById("wardrobeGrid"); grid.innerHTML = ""; 
    
    const categories = [
        { key: "bodies", label: "Body Color", stateKey: "bodyColor" },
        { key: "hats", label: "Hat Style", stateKey: "hatStyle" },
        { key: "eyes", label: "Eye Style", stateKey: "eyeStyle" },
        { key: "indicators", label: "Aim Style", stateKey: "indicatorStyle" },
        { key: "bullets", label: "Bullet Style", stateKey: "bulletStyle" }
    ];
    
    categories.forEach(cat => {
        const row = document.createElement("div");
        Object.assign(row.style, { display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.1)", padding: "12px", borderRadius: "8px" });
        const label = document.createElement("div"); label.textContent = cat.label; label.style.color = "cyan"; label.style.fontSize = "12px";
        const controls = document.createElement("div"); Object.assign(controls.style, { display: "flex", gap: "10px", alignItems: "center" });
        const disp = document.createElement("div"); disp.style.width = "140px"; disp.style.textAlign = "center"; disp.textContent = "..."; disp.style.fontSize = "12px";
        const prev = document.createElement("button"); prev.textContent = "<"; const next = document.createElement("button"); next.textContent = ">";
        [prev, next].forEach(b => { b.style.cursor="pointer"; b.style.padding="5px 10px"; b.style.background="#444"; b.style.color="white"; b.style.border="none"; });
        
        let items = cosmeticRegistry[cat.key] || [];
        let curId = player.cosmetics[cat.stateKey];
        let idx = items.findIndex(i => i.id === curId);
        if(idx === -1) idx = 0;
        
        const update = () => {
            if(!items.length) return;
            const item = items[idx];
            const un = isUnlocked(item);
            if(un) {
                disp.textContent = item.name; disp.style.color = "white"; player.cosmetics[cat.stateKey] = item.id;
            } else {
                disp.textContent = "Locked"; disp.style.color = "#888";
            }
            let hint = row.querySelector(".hint-tooltip");
            if(!hint) { hint = document.createElement("div"); hint.className = "hint-tooltip"; Object.assign(hint.style, { position:"absolute", right:"20px", fontSize:"10px", color:"#ff5252", marginTop:"35px" }); row.appendChild(hint); }
            hint.textContent = un ? "" : `Req: ${item.hint || "Unknown"}`;
        };
        update();
        prev.onclick = () => { idx = (idx - 1 + items.length) % items.length; update(); playSound("select"); };
        next.onclick = () => { idx = (idx + 1) % items.length; update(); playSound("select"); };
        controls.append(prev, disp, next); row.append(label, controls); grid.append(row);
    });

    modal.style.display = "flex";
    startPreview();
}

function startPreview() {
    const cvs = document.getElementById("wardrobeCanvas"); if(!cvs) return;
    const pCtx = cvs.getContext("2d");
    const w = cvs.width; const h = cvs.height; const ZOOM = 3.5;
    if(previewInterval) clearInterval(previewInterval);
    let t = 0;
    previewInterval = setInterval(() => {
        t += 0.05; pCtx.clearRect(0, 0, w, h);
        pCtx.save();
        pCtx.translate(w/2, h/2); pCtx.scale(ZOOM, ZOOM);
        
        const mockPlayer = { ...player, x: -16, y: -16, width: 32, height: 32 };
        const mockCam = { x: 0, y: 0 };
        const aim = { x: Math.cos(t) * 60, y: Math.sin(t) * 60, isVector: true };
        const move = { x: Math.sin(t * 2) * 0.5, y: Math.cos(t) * 0.2 }; 
        
        pCtx.fillStyle = "#2a2a2a"; pCtx.fillRect(-50, -50, 100, 100); 
        drawPlayer(pCtx, mockPlayer, aim, move, mockCam);
        drawPlayerIndicator(pCtx, mockPlayer, aim, mockCam);
        
        const bStyle = getBulletStyleDef(player.cosmetics.bulletStyle);
        const bx = 30, by = 0;
        if(bStyle.type === "gradient") {
            const grad = pCtx.createLinearGradient(bx - 4, by - 4, bx + 4, by + 4);
            bStyle.colors.forEach((c, i) => grad.addColorStop(i / (bStyle.colors.length - 1), c));
            pCtx.fillStyle = grad;
        } else {
            pCtx.fillStyle = bStyle.color;
        }
        pCtx.globalAlpha = 0.6; pCtx.beginPath(); pCtx.arc(bx, by, 6, 0, Math.PI*2); pCtx.fill();
        pCtx.globalAlpha = 1.0; pCtx.fillStyle = "white"; pCtx.beginPath(); pCtx.arc(bx, by, 3, 0, Math.PI*2); pCtx.fill();

        pCtx.restore();
    }, 1000/60);
}

function setupSettingsListeners() {
    const mSlider = document.getElementById("musicSlider");
    const sSlider = document.getElementById("sfxSlider");
    const mToggle = document.getElementById("musicToggle"); 
    const sToggle = document.getElementById("sfxToggle"); 
    if (mSlider) mSlider.addEventListener("input", (e) => setMusicVolume(e.target.value / 100));
    if (sSlider) sSlider.addEventListener("input", (e) => setSFXVolume(e.target.value / 100));
    if (mToggle) mToggle.addEventListener("change", (e) => toggleMusic(e.target.checked));
    if (sToggle) sToggle.addEventListener("change", (e) => toggleSFX(e.target.checked));
}

window.openPanel = openPanel;
window.closePanel = closePanel;