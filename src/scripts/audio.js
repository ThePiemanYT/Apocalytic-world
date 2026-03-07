/* src/scripts/audio.js */

export const backgroundMusic = document.getElementById("backgroundMusic");

// Sound Effects
export const sounds = {
  select: new Audio("src/assets/sound/blipSelect.wav"),
  explosion: new Audio("src/assets/sound/explosion.wav"),
  hitHurt: new Audio("src/assets/sound/hitHurt.wav"),
  powerUp: new Audio("src/assets/sound/powerUp.wav"),
  powerProcess: new Audio("src/assets/sound/powerUp_process.wav"), 
  victory: new Audio("src/assets/sound/victory.mp3"),
  gameOver: new Audio("src/assets/sound/game-over.mp3"),
  explosionPowerup: new Audio("src/assets/sound/explosionPower.wav"),

  // --- FIX 1: SHOOT ALIASES ---
  // player.js asks for "laserShoot", but we also keep "shoot" just in case
  shoot: new Audio("src/assets/sound/laserShoot.wav"),
  laserShoot: new Audio("src/assets/sound/laserShoot.wav"),

  // --- FIX 2: DASH ALIASES ---
  // player.js asks for "Dash" (Capital), but we keep "dash" (lower) too
  dash: new Audio("src/assets/sound/Dash.wav"),
  Dash: new Audio("src/assets/sound/Dash.wav"),   
  playerDeath: new Audio("src/assets/sound/PlayerDeath.wav"),                
  
  // --- FIX 3: RELOAD ALIASES ---
  // player.js asks for "reload-gun", we keep "reload" too
  reload: new Audio("src/assets/sound/reload-gun.mp3"),
  "reload-gun": new Audio("src/assets/sound/reload-gun.mp3"),
  "game-over": new Audio("src/assets/sound/victory.mp3"),
};

// --- PRELOADER SUPPORT ---
export const totalAssets = Object.keys(sounds).length + 1; // +1 for background music
let loadedAssets = 0;
let onProgressCallback = null;

function itemLoaded() {
    loadedAssets++;
    if (onProgressCallback) onProgressCallback(loadedAssets, totalAssets);
}

export function setOnProgress(cb) { onProgressCallback = cb; }

// Pre-load sounds and track progress
Object.keys(sounds).forEach(key => {
    sounds[key].addEventListener("canplaythrough", itemLoaded, { once: true });
    sounds[key].onerror = () => {
        console.error(`Audio Error: Could not load sound '${key}'`);
        itemLoaded(); // Count as "loaded" so we don't hang
    };
    sounds[key].load();
});

if (backgroundMusic) {
    backgroundMusic.addEventListener("canplaythrough", itemLoaded, { once: true });
    backgroundMusic.onerror = itemLoaded;
    backgroundMusic.load();
}

export let musicEnabled = true;
export let sfxEnabled = true;
export let sfxVolume = 1.0;
export let musicVolume = 0.5;

// Load Settings
let sfxStored = localStorage.getItem("sfxEnabled");
if (sfxStored !== null) sfxEnabled = sfxStored === "true";
let musicStored = localStorage.getItem("musicEnabled");
if (musicStored !== null) musicEnabled = musicStored === "true";

if (localStorage.getItem("musicVolume")) musicVolume = parseFloat(localStorage.getItem("musicVolume"));
if (localStorage.getItem("sfxVolume")) sfxVolume = parseFloat(localStorage.getItem("sfxVolume"));

// Apply initial volumes
if (backgroundMusic) {
    backgroundMusic.volume = musicVolume;
}
Object.values(sounds).forEach(s => s.volume = sfxVolume);

// --- Throttling System ---
const soundLastPlayed = {};

export function playSound(name, throttleMs = 0) {
  if (!sfxEnabled) return;
  
  // Safety check: if sound doesn't exist, warn and exit (don't crash)
  if (!sounds[name]) {
      console.warn(`playSound: Sound '${name}' not found in registry. check audio.js`);
      return;
  }
  
  const now = Date.now();
  if (throttleMs > 0) {
    const last = soundLastPlayed[name] || 0;
    if (now - last < throttleMs) return; 
    soundLastPlayed[name] = now;
  }

  // Attempt play
  try {
      // Clone the node so we can play overlapping sounds (rapid fire)
      const soundClone = sounds[name].cloneNode();
      soundClone.volume = sfxVolume;
      
      const playPromise = soundClone.play();
      if (playPromise !== undefined) {
          playPromise.catch(error => {
              // Auto-play policy or missing file errors usually caught here
              // console.warn(`Audio Play Error for '${name}':`, error);
          });
      }
  } catch(e) {
      console.error("Audio Clone Error:", e);
  }
}

export function toggleMusic(enabled) {
  musicEnabled = enabled;
  localStorage.setItem("musicEnabled", enabled);
  if (!backgroundMusic) return;
  
  if (!musicEnabled) backgroundMusic.pause();
  else backgroundMusic.play().catch(() => {});
}

export function toggleSFX(enabled) {
  sfxEnabled = enabled;
  localStorage.setItem("sfxEnabled", enabled);
}

export function setMusicVolume(val) {
  musicVolume = val;
  if (backgroundMusic) backgroundMusic.volume = musicVolume;
  localStorage.setItem("musicVolume", musicVolume);
}

export function setSFXVolume(val) {
  sfxVolume = val;
  Object.values(sounds).forEach(s => s.volume = sfxVolume);
  localStorage.setItem("sfxVolume", sfxVolume);
}

window.audioManager = { sounds, playSound, toggleMusic, toggleSFX };