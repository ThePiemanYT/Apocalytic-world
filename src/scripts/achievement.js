/* src/scripts/achievement.js */
export let achievements = {}; // EXPORTED NOW

// Load from JSON + restore saved progress
export async function loadAchievements() {
  try {
    const res = await fetch("data/achievement.json");
    if (!res.ok) throw new Error("Failed to load achievements.json");

    const data = await res.json();
    // Merge into the exported object instead of replacing it to keep references alive
    Object.assign(achievements, data);

    // Restore saved progress
    const saved = JSON.parse(localStorage.getItem("achievements") || "{}");
    for (const id in saved) {
      if (achievements[id]) {
        achievements[id].progress = saved[id].progress || 0;
      }
    }

    renderAchievements();
  } catch (err) {
    console.error("Error loading achievements:", err);
    const list = document.querySelector(".achievementsList");
    if(list) list.innerHTML = `<p style="color:red">Failed to load achievements.</p>`;
  }
}

// Save progress to localStorage
function saveAchievements() {
  localStorage.setItem("achievements", JSON.stringify(achievements));
}

function renderAchievements() {
  const container = document.querySelector(".achievementsList");
  if (!container) return;
  
  container.innerHTML = "";

  Object.keys(achievements).forEach(id => {
    const a = achievements[id];
    const completed = a.progress >= a.goal;

    const box = document.createElement("div");
    box.className = "achievementBox";
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; font-size:14px; color:${completed ? "#4CAF50" : "#ffe066"};">
          ${a.name}
        </h3>
        <span style="font-size:12px; color:#aaa;">
          ${completed ? "✔ Completed" : `${a.progress}/${a.goal}`}
        </span>
      </div>
      <p style="margin:4px 0 0 0; font-size:12px; color:#ccc;">${a.description}</p>
    `;
    container.appendChild(box);
  });
}

// Update achievement progress
export function updateAchievement(id, amount = 1) {
  if (!achievements[id]) return;
  
  // If it's a "high score" type (like Wave), overwrite if higher. Else add.
  if (id === "4") { // Wave Reached
      if (amount > achievements[id].progress) {
          achievements[id].progress = amount;
          saveAchievements();
      }
  } else {
      // Accumulative (Kills, Bullets)
      if (achievements[id].progress < achievements[id].goal) {
          achievements[id].progress = Math.min(achievements[id].progress + amount, achievements[id].goal);
          saveAchievements();
      }
  }
  renderAchievements();
}

// Reset all achievements (for debugging)
export function resetAchievements() {
  Object.keys(achievements).forEach(id => {
    achievements[id].progress = 0;
  });
  saveAchievements();
  renderAchievements();
}

// Hook loader when Achievements panel opens
if (window.openPanel) {
    const _openPanel = window.openPanel;
    window.openPanel = function (id) {
      _openPanel(id);
      if (id === "achievementsPanel") {
        loadAchievements();
      }
    };
}