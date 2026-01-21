import { player, setMyId, remotePlayers, setGameRunning, bullets, spawnBullet } from "./state.js";
import { spawnFloatingText } from "./index.js";
import geckos from "./lib/geckos.js";
import { playSound } from "./audio.js";

let channel = null;
export let isHost = false;

// UI References
let onPlayerJoinCallback = null;
let onGameStartCallback = null;

export function setNetworkCallbacks(onJoin, onStart) {
    onPlayerJoinCallback = onJoin;
    onGameStartCallback = onStart;
}

// --- HOST LOGIC ---
export function initHost(onReady) {
    isHost = true;
    channel = geckos({ port: 9208 }); // Connect to local server on port 9208

    channel.onConnect(error => {
        if (error) {
            console.error(error.message);
            return;
        }

        channel.emit('claimHost');

        channel.on('hostClaimed', (data) => {
            setMyId(data.id);
            console.log('Hosting on ID:', data.id);
            if(onReady) onReady(data.id);
        });

        channel.on('error', (err) => {
            console.error("Host Error:", err);
            spawnFloatingText(player.x, player.y, "Host Error: " + err, "red", 20);
        });

        channel.on('playerJoined', ({ id }) => {
             if(onPlayerJoinCallback) onPlayerJoinCallback(id);
        });

        channel.on('playerLeft', ({ id }) => {
            console.log('Player left:', id);
            delete remotePlayers[id];
        });

        channel.on('clientInput', ({ id, data }) => {
            handleDataFromClient(data, id);
        });
        
        channel.on('playerShoot', ({ id, data }) => {
            console.log("Host received playerShoot from:", id, data);
            if (remotePlayers[id]) {
                const rp = remotePlayers[id];
                const cx = rp.x + 32 / 2;
                const cy = rp.y + 32 / 2;
                const speed = 7; 
                
                const realZoom = data.zoom || 1;
                // Safe access to camera
                const camX = (data.camera && typeof data.camera.x === 'number') ? data.camera.x : 0;
                const camY = (data.camera && typeof data.camera.y === 'number') ? data.camera.y : 0;

                const worldX = data.targetX / realZoom + camX;
                const worldY = data.targetY / realZoom + camY;
                const angle = Math.atan2(worldY - cy, worldX - cx);
                
                console.log("Spawning bullet for", id, "at", cx, cy, "angle", angle);
                spawnBullet(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed, 1, rp.cosmetics?.bulletStyle || "default", false, id);
                
                try { playSound("laserShoot", 0.5); } catch(e) {}
                if (window.onBulletFired) window.onBulletFired(1); 
            } else {
                console.warn("playerShoot received but player not found in remotePlayers:", id);
            }
        });
    });
}

export function broadcastStart() {
    if (!isHost || !channel) return;
    channel.emit('startGame');
}

export function broadcastState(gameState) {
    if (!isHost || !channel) return;
    channel.emit('state', gameState);
}

function handleDataFromClient(data, playerId) {
    // data is the object sent by client: { type: 'INPUT', ... }
    if (data.type === 'INPUT') {
        if (!remotePlayers[playerId]) {
            remotePlayers[playerId] = { 
                id: playerId, x: 0, y: 0, hp: 10, score: 0, 
                cosmetics: data.cosmetics || {}, isDead: false 
            };
            if(onPlayerJoinCallback) onPlayerJoinCallback(playerId);
        }
        remotePlayers[playerId].latestInput = data.input;
    }
}

// --- CLIENT LOGIC ---
export function joinGame(hostId, onConnected) {
    isHost = false;
    channel = geckos({ port: 9208 });

    channel.onConnect(error => {
        if (error) {
            console.error(error.message);
            return;
        }

        // Emit joinGame with the hostId (which is the roomId)
        channel.emit('joinGame', { roomId: hostId });
        setMyId(channel.id);
        
        console.log("Connected to Server!");
        
        // Send our cosmetic info immediately
        channel.emit('input', { 
            type: 'INPUT', 
            input: { x: player.x, y: player.y },
            cosmetics: player.cosmetics 
        });

        if (onConnected) onConnected();

        channel.on('gameState', (gameState) => {
             window.latestServerState = gameState;
        });

        channel.on('startGame', () => {
             if (onGameStartCallback) onGameStartCallback();
        });
        
        channel.on('hostDisconnected', () => {
             console.log("Host disconnected");
             spawnFloatingText(player.x, player.y, "Host Disconnected", "red", 20);
        });

        channel.on('error', (err) => {
             console.error("Join Error:", err);
             spawnFloatingText(player.x, player.y, "Error: " + err, "red", 20);
        });
    });
}

export function sendInputToHost(inputData) {
    if (channel) {
        channel.emit('input', { 
            type: 'INPUT', 
            input: inputData, 
            cosmetics: player.cosmetics
        });
    }
}

export function sendPlayerShoot(targetX, targetY, camera, zoom) {
    if (channel) {
        channel.emit('playerShoot', { targetX, targetY, camera, zoom });
    }
}