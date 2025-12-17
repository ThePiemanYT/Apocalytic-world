/* src/scripts/ui.js */
import { player, score, recalcPlayerStats, gameRunning } from "./state.js";
import { playSound, setMusicVolume, setSFXVolume, toggleMusic, toggleSFX } from "./audio.js";

// --- References ---
const scoreDisplay = document.getElementById("score");
const healthBar = document.getElementById("healthBar");
const healthBarContainer = document.getElementById("healthBarContainer");
const waveDisplay = document.getElementById("waveDisplay");
// We create these dynamically if they don't exist
const ammoDisplay = document.getElementById("ammoDisplay") || document.createElement("div");
const staminaBar = document.getElementById("staminaBar") || document.createElement("div");
const staminaFill = document.createElement("div");
const powerupHUD = document.createElement("div");

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
  staminaBar.innerHTML = ''; 
  Object.assign(staminaFill.style, { height: "100%", width: "100%", background: "linear-gradient(90deg, #80dfff, #4fc3f7)" });
  staminaBar.appendChild(staminaFill);
  
  setupSettingsListeners();
}

// --- Toggle Visibility (Menu vs Game) ---
export function toggleGameUI(visible) {
    const displayVal = visible ? "block" : "none";
    
    if (scoreDisplay) scoreDisplay.style.display = displayVal;
    if (waveDisplay) waveDisplay.style.display = displayVal;
    if (healthBarContainer) healthBarContainer.style.display = displayVal;
    
    if (ammoDisplay) ammoDisplay.style.display = displayVal;
    if (staminaBar) staminaBar.style.display = displayVal;
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
    }
  }
  playSound("select");
}

// --- Data Fetching ---
async function loadHelpData() {
  const helpTabs = document.getElementById("helpTabs");
  const helpContent = document.getElementById("helpContent");
  if (!helpTabs) return;
  if (!helpData) {
    try {
        const res = await fetch("data/help.json");
        helpData = await res.json();
    } catch (e) {
        if(helpContent) helpContent.innerHTML = "<p>Error loading help data.</p>";
        return;
    }
  }
  helpTabs.innerHTML = "";
  Object.keys(helpData).forEach(key => {
      const btn = document.createElement("button");
      btn.textContent = key;
      btn.onclick = () => {
          helpContent.innerHTML = `<h4 style="color:#ffd166">${helpData[key].title}</h4><p style="color:#ddd; font-size:13px; line-height:1.6;">${helpData[key].content}</p>`;
      };
      helpTabs.appendChild(btn);
  });
  if (Object.keys(helpData)[0]) helpTabs.firstChild.click();
}

async function loadAboutData() {
    const aboutTabs = document.getElementById("aboutTabs");
    const aboutContent = document.getElementById("aboutContent");
    if (!aboutTabs) return;
    if (!aboutData) {
        try {
            const res = await fetch("data/about.json");
            aboutData = await res.json();
        } catch (e) {
            if(aboutContent) aboutContent.innerHTML = "<p>Error loading credits.</p>";
            return;
        }
    }
    aboutTabs.innerHTML = "";
    Object.keys(aboutData).forEach(key => {
        const btn = document.createElement("button");
        btn.textContent = key === "1" ? "Overview" : (aboutData[key].title || key);
        if(aboutData[key].title === "Overview") btn.textContent = "Game";
        
        btn.onclick = () => {
            const txt = aboutData[key].content ? aboutData[key].content.replace(/\n/g, "<br>") : "";
            aboutContent.innerHTML = `<h4 style="color:#ffd166">${aboutData[key].title}</h4><p style="color:#ddd; font-size:13px; line-height:1.6;">${txt}</p>`;
        };
        aboutTabs.appendChild(btn);
    });
    if (Object.keys(aboutData)[0]) aboutTabs.firstChild.click();
}

// --- Upgrade Screen ---
export function openUpgradeScreen(onComplete) {
  const upgradeKeys = [
    { key: "damage", label: "Damage" }, 
    { key: "health", label: "Health" },
    { key: "speed", label: "Speed" }, 
    { key: "magazine", label: "Magazine" },
    // NEW: Replaced Knockback with Crit Stats
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
    justifyContent: "center", background: "rgba(0,0,0,0.55)", zIndex: 9999
  });

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    width: "600px", maxWidth: "96%", background: "rgba(20,20,20,0.85)",
    borderRadius: "12px", padding: "18px", boxShadow: "0 10px 28px rgba(0,0,0,0.7)",
    color: "#fff", fontFamily: "Press Start 2P, sans-serif", textAlign: "center"
  });

  panel.innerHTML = `
    <div style="margin-bottom:14px;font-size:18px;color:#ffd166">Upgrades</div>
    <div id="pick-count">Picked: 0 / ${pickLimit}</div>
    <div id="upg-rows" style="display:flex;flex-direction:column;gap:12px;margin-top:15px;"></div>
  `;
  modal.appendChild(panel);
  document.body.appendChild(modal);

  const rows = panel.querySelector("#upg-rows");

  function refresh() {
      rows.innerHTML = "";
      upgradeKeys.forEach(u => {
          const row = document.createElement("div");
          Object.assign(row.style, { display: "flex", alignItems:"center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "8px" });
          
          const lvl = player.upgrades[u.key] || 0;
          let blocksHTML = "<div style='display:flex;gap:4px;'>";
          for(let i=0; i<maxPerUpgrade; i++) {
              const color = i < lvl ? "#ffd166" : "rgba(255,255,255,0.08)";
              blocksHTML += `<div style="width:20px;height:14px;background:${color};border:1px solid rgba(255,255,255,0.1);border-radius:2px;"></div>`;
          }
          blocksHTML += "</div>";

          row.innerHTML = `<span style="font-size:12px;text-align:left;min-width:120px;">${u.label}</span>${blocksHTML}`;
          
          const btn = document.createElement("button");
          btn.textContent = "+";
          Object.assign(btn.style, { 
              background: "linear-gradient(180deg,#ffd166,#ffb347)", 
              border: "none", cursor: "pointer", fontWeight: "bold",
              width: "30px", height: "24px", borderRadius: "4px", color: "#222"
          });
          
          btn.onclick = () => {
              if (picks >= pickLimit || lvl >= maxPerUpgrade) return;
              player.upgrades[u.key] = lvl + 1;
              picks++;
              applyUpgradeLogic(u.key);
              refresh();
              if (picks >= pickLimit) { 
                  modal.remove(); 
                  if(onComplete) onComplete(); 
              }
          };
          row.appendChild(btn);
          rows.appendChild(row);
      });
      document.getElementById("pick-count").textContent = `Picked: ${picks} / ${pickLimit}`;
  }

  refresh();
}

function applyUpgradeLogic(key) {
    recalcPlayerStats();
    if (key === 'health') {
        player.health = Math.min(player.health + 2, player.maxHealth);
    } else if (key === 'magazine') {
        player.ammo = Math.min(player.ammo + 4, player.magazineSize);
    }
    updateHUD();
}

// --- Setup Listeners ---
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

// Global Exports
window.openPanel = openPanel;
window.closePanel = closePanel;