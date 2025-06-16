const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};

function generateRoomCode() {
  return crypto.randomBytes(2).toString('hex').toUpperCase();
}

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', (ws) => {
  ws.playerId = crypto.randomBytes(4).toString('hex');
  ws.roomCode = null;

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    if (data.type === 'createRoom') {
      let code;
      do {
        code = generateRoomCode();
      } while (rooms[code]);

      rooms[code] = { players: {} };
      ws.roomCode = code;
      rooms[code].players[ws.playerId] = ws;

      ws.send(JSON.stringify({ type: 'roomCreated', roomCode: code, playerId: ws.playerId }));
      console.log(`Room created: ${code} by player ${ws.playerId}`);
    } else if (data.type === 'joinRoom') {
      const code = data.roomCode;
      if (!rooms[code]) {
        ws.send(JSON.stringify({ type: 'joinFailed', message: 'Room not found' }));
        return;
      }

      ws.roomCode = code;
      rooms[code].players[ws.playerId] = ws;

      ws.send(JSON.stringify({ type: 'joinSuccess', roomCode: code, playerId: ws.playerId }));
      console.log(`Player ${ws.playerId} joined room ${code}`);

      broadcastRoom(code, {
        type: 'playerJoined',
        playerId: ws.playerId,
      }, ws);
    } else if (data.type === 'playerUpdate') {
      if (!ws.roomCode) return;

      const room = rooms[ws.roomCode];
      if (!room) return;

      broadcastRoom(ws.roomCode, {
        type: 'playerUpdate',
        playerId: ws.playerId,
        position: data.position,
        rotation: data.rotation,
      }, ws);
    }
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;

    const room = rooms[ws.roomCode];
    if (!room) return;

    delete room.players[ws.playerId];
    console.log(`Player ${ws.playerId} left room ${ws.roomCode}`);

    broadcastRoom(ws.roomCode, {
      type: 'playerLeft',
      playerId: ws.playerId,
    }, ws);

    if (Object.keys(room.players).length === 0) {
      delete rooms[ws.roomCode];
      console.log(`Room ${ws.roomCode} deleted (empty)`);
    }
  });
});

function broadcastRoom(roomCode, message, exceptWs = null) {
  const room = rooms[roomCode];
  if (!room) return;

  const data = JSON.stringify(message);
  for (const playerId in room.players) {
    const client = room.players[playerId];
    if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
