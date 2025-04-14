const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

let players = {};

server.on('connection', (socket) => {
    console.log("Player connected");

    socket.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === "move") {
            players[data.id] = data.position;
        }
        
        // Broadcast all players' positions
        server.clients.forEach(client => {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "update", players }));
            }
        });
    });

    socket.on('close', () => {
        console.log("Player disconnected");
    });
});
