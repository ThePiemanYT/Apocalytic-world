let achievements = {};

// Load from JSON + restore saved progress
async function loadAchievements() {
  try {
    const res = await fetch("data/achievement.json");
    if (!res.ok) throw new Error("Failed to load achievements.json");

    achievements = await res.json();

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
    document.querySelector(".achievementsList").innerHTML =
      `<p style="color:red">Failed to load achievements.</p>`;
  }
}

// Save progress to localStorage
function saveAchievements() {
  localStorage.setItem("achievements", JSON.stringify(achievements));
}

function renderAchievements() {
  const container = document.querySelector(".achievementsList");
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
function updateAchievement(id, amount = 1) {
  if (!achievements[id]) return;
  achievements[id].progress = Math.min(
    achievements[id].progress + amount,
    achievements[id].goal
  );
  saveAchievements();
  renderAchievements();
}

// Reset all achievements (for debugging)
function resetAchievements() {
  Object.keys(achievements).forEach(id => {
    achievements[id].progress = 0;
  });
  saveAchievements();
  renderAchievements();
}

// Hook loader when Achievements panel opens
const _openPanel = window.openPanel;
window.openPanel = function (id) {
  _openPanel(id);
  if (id === "achievementsPanel") {
    loadAchievements();
  }
};

// ✅ Export functions for index.js
export { loadAchievements, updateAchievement, resetAchievements };
