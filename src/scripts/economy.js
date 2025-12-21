/* src/scripts/economy.js */
import { cosmeticRegistry } from "./cosmetics.js"; 

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
        return true;
    }
    return false;
}

export function getCosmeticColor() {
    return localStorage.getItem("equippedBodyColor") || "cyan";
}