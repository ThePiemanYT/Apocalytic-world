/* src/scripts/audio.js */

export const backgroundMusic = document.getElementById("backgroundMusic");

// Sound Effects
export const sounds = {
  select: new Audio("src/assets/sound/blipSelect.wav"),
  explosion: new Audio("src/assets/sound/explosion.wav"),
  shoot: new Audio("src/assets/sound/laserShoot.wav"),
  hitHurt: new Audio("src/assets/sound/hitHurt.wav"),
  powerUp: new Audio("src/assets/sound/powerUp.wav"),
  reload: new Audio("src/assets/sound/reload-gun.mp3"),
  victory: new Audio("src/assets/sound/victory.mp3"),
  gameOver: new Audio("src/assets/sound/game-over.mp3")
};

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
backgroundMusic.volume = musicVolume;
Object.values(sounds).forEach(s => s.volume = sfxVolume);

// --- Throttling System ---
const soundLastPlayed = {};

export function playSound(name, throttleMs = 0) {
  if (!sfxEnabled || !sounds[name]) return;
  
  const now = Date.now();
  // If throttled, check time difference
  if (throttleMs > 0) {
    const last = soundLastPlayed[name] || 0;
    if (now - last < throttleMs) return; // Skip sound
    soundLastPlayed[name] = now;
  }

  // Clone node allows overlapping same sounds (e.g., rapid fire)
  // unless we explicitly want to stop the previous one.
  // For high frequency sounds like shoot/explosion, we use the throttle to limit count.
  const soundClone = sounds[name].cloneNode();
  soundClone.volume = sfxVolume;
  soundClone.play().catch(() => {});
}

export function toggleMusic(enabled) {
  musicEnabled = enabled;
  localStorage.setItem("musicEnabled", enabled);
  if (!musicEnabled) backgroundMusic.pause();
  else backgroundMusic.play().catch(() => {});
}

export function toggleSFX(enabled) {
  sfxEnabled = enabled;
  localStorage.setItem("sfxEnabled", enabled);
}

export function setMusicVolume(val) {
  musicVolume = val;
  backgroundMusic.volume = musicVolume;
  localStorage.setItem("musicVolume", musicVolume);
}

export function setSFXVolume(val) {
  sfxVolume = val;
  Object.values(sounds).forEach(s => s.volume = sfxVolume);
  localStorage.setItem("sfxVolume", sfxVolume);
}

// Global Access
window.audioManager = { sounds, playSound, toggleMusic, toggleSFX };