/* src/scripts/network.js */
import { player, setMyId, remotePlayers, setGameRunning } from "./state.js";
import { spawnFloatingText } from "./index.js";

let peer = null;
let connections = []; 
let hostConnection = null; 
export let isHost = false;

// UI References (Will be assigned in setupNetworkUI in index.js)
let onPlayerJoinCallback = null;
let onGameStartCallback = null;

export function setNetworkCallbacks(onJoin, onStart) {
    onPlayerJoinCallback = onJoin;
    onGameStartCallback = onStart;
}

// --- HOST LOGIC ---
export function initHost(onReady) {
    isHost = true;
    peer = new Peer(null, { debug: 1 });

    peer.on('open', (id) => {
        setMyId(id);
        console.log('Hosting on ID:', id);
        if(onReady) onReady(id);
    });

    peer.on('connection', (conn) => {
        if (connections.length >= 3) { 
            conn.send({ type: 'ERROR', message: 'Room Full' });
            return;
        }
        
        connections.push(conn);
        
        // Notify Lobby UI
        if(onPlayerJoinCallback) onPlayerJoinCallback(conn.peer);

        conn.on('data', (data) => handleDataFromClient(data, conn.peer));
        conn.on('close', () => {
            connections = connections.filter(c => c !== conn);
            delete remotePlayers[conn.peer];
        });
    });
}

export function broadcastStart() {
    if (!isHost) return;
    // Tell all clients to start
    connections.forEach(conn => conn.send({ type: 'START_GAME' }));
}

export function broadcastState(gameState) {
    if (!isHost) return;
    connections.forEach(conn => conn.send({ type: 'STATE', payload: gameState }));
}

function handleDataFromClient(data, playerId) {
    if (data.type === 'INPUT') {
        if (!remotePlayers[playerId]) {
            remotePlayers[playerId] = { 
                id: playerId, x: 0, y: 0, hp: 10, score: 0, 
                cosmetics: data.cosmetics || {}, isDead: false 
            };
            // Also notify UI if a player joins late or re-sends info
            if(onPlayerJoinCallback) onPlayerJoinCallback(playerId);
        }
        remotePlayers[playerId].latestInput = data.input;
    }
}

// --- CLIENT LOGIC ---
export function joinGame(hostId, onConnected) {
    isHost = false;
    peer = new Peer(null, { debug: 1 });

    peer.on('open', (id) => {
        setMyId(id);
        hostConnection = peer.connect(hostId);

        hostConnection.on('open', () => {
            console.log("Connected to Host!");
            
            // Send our cosmetic info immediately
            hostConnection.send({ 
                type: 'INPUT', 
                input: { x: player.x, y: player.y },
                cosmetics: player.cosmetics 
            });
            
            if (onConnected) onConnected();
        });

        hostConnection.on('data', (data) => {
            if (data.type === 'STATE') {
                window.latestServerState = data.payload;
            } else if (data.type === 'START_GAME') {
                if (onGameStartCallback) onGameStartCallback();
            }
        });
    });
}

export function sendInputToHost(inputData) {
    if (hostConnection && hostConnection.open) {
        hostConnection.send({ 
            type: 'INPUT', 
            input: inputData, 
            cosmetics: player.cosmetics
        });
    }
}