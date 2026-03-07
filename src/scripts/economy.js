/* src/scripts/economy.js */
import { cosmeticRegistry, isUnlocked } from "./cosmetics.js"; 
import { updateAchievement } from "./achievement.js";

// Load coins from storage
export let totalCoins = parseInt(localStorage.getItem("zombieCoins")) || 0;
export let sessionCoins = 0; 

let ownedCosmetics = JSON.parse(localStorage.getItem("ownedCosmetics")) || [];

export function hasCosmetic(id) {
    let item = null;
    Object.values(cosmeticRegistry).forEach(cat => {
        const found = cat.find(i => i.id === id);
        if (found) item = found;
    });

    if (!item) return false;
    if (item.type === "free" || item.type === "achievement") return true; 

    return ownedCosmetics.includes(id);
}

export function addSessionCoins(amount) {
    sessionCoins += amount;
}

// Resets the coins collected in the CURRENT run (call this on game start)
export function resetSessionCoins() {
    sessionCoins = 0;
}

// Saves everything to permanent storage
export function saveGameEconomy() {
    if (sessionCoins > 0) {
        totalCoins += sessionCoins;
        localStorage.setItem("zombieCoins", totalCoins);
        sessionCoins = 0; 
        console.log("Coins saved! Total:", totalCoins);
    }
}

export function buyCosmetic(id) {
    let item = null;
    Object.values(cosmeticRegistry).forEach(cat => {
        const found = cat.find(i => i.id === id);
        if (found) item = found;
    });

    if (!item || item.type !== "buyable") return false;

    if (totalCoins >= item.price && !ownedCosmetics.includes(id)) {
        totalCoins -= item.price;
        ownedCosmetics.push(id);
        
        localStorage.setItem("zombieCoins", totalCoins);
        localStorage.setItem("ownedCosmetics", JSON.stringify(ownedCosmetics));

        // ACHIEVEMENT TRACKING
        updateAchievement("13", 1); // Fashion Forward
        checkCompletionistAchievement();

        return true;
    }
    return false;
}

export function checkCompletionistAchievement() {
    let ownedCount = 0;
    Object.values(cosmeticRegistry).forEach(cat => {
        cat.forEach(item => {
            const unlocked = isUnlocked(item);
            const purchased = item.type === "buyable" ? ownedCosmetics.includes(item.id) : true;
            if (unlocked && purchased) ownedCount++;
        });
    });
    updateAchievement("14", ownedCount);
}

const metaBaseCosts = { health: 250, speed: 300, damage: 500, magazine: 200, reserve: 200 };

export function getMetaUpgradeCost(type, level) {
    const base = metaBaseCosts[type] || 100;
    return Math.floor(base * Math.pow(2, level));
}

export function buyMetaUpgrade(type, player) {
    const currentLevel = player.metaUpgrades[type] || 0;
    const maxLevel = 5;
    
    if (currentLevel >= maxLevel) return false;

    const cost = getMetaUpgradeCost(type, currentLevel);

    if (totalCoins >= cost) {
        totalCoins -= cost;
        player.metaUpgrades[type] = currentLevel + 1;
        player.metaUpgrades.totalSpent = (player.metaUpgrades.totalSpent || 0) + cost;
        
        localStorage.setItem("zombieCoins", totalCoins);
        localStorage.setItem("metaUpgrades", JSON.stringify(player.metaUpgrades));

        // ACHIEVEMENT TRACKING
        updateAchievement("15", 1); // Invested
        
        let totalLevels = 0;
        ["health", "speed", "damage", "magazine", "reserve"].forEach(t => {
            totalLevels += (player.metaUpgrades[t] || 0);
        });
        updateAchievement("16", totalLevels); // Peak Performance

        return true;
    }
    return false;
}

export function refundMetaUpgrades(player) {
    // If totalSpent is missing or 0, but levels exist, calculate it as a fallback
    let spent = player.metaUpgrades.totalSpent || 0;
    if (spent === 0) {
        const types = ["health", "speed", "damage", "magazine", "reserve"];
        types.forEach(t => {
            const lvl = player.metaUpgrades[t] || 0;
            for (let i = 0; i < lvl; i++) {
                spent += getMetaUpgradeCost(t, i);
            }
        });
    }

    if (spent <= 0) return false;

    totalCoins += spent;
    player.metaUpgrades = {
        health: 0,
        speed: 0,
        damage: 0,
        magazine: 0,
        reserve: 0,
        totalSpent: 0
    };

    localStorage.setItem("zombieCoins", totalCoins);
    localStorage.setItem("metaUpgrades", JSON.stringify(player.metaUpgrades));
    return true;
}

export function getTotalCoins() {
    return totalCoins;
}

export function getCosmeticColor() {
    return localStorage.getItem("equippedBodyColor") || "cyan";
}