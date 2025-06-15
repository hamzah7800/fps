const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const statusEl = document.getElementById("status");

let socket;
let playerId;
let roomCode;

const players = {}; // Other players by id

// Create basic Babylon scene
const createScene = () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.2, 0.2, 0.3);

  const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 2, -10), scene);
  camera.setTarget(BABYLON.Vector3.Zero());
  camera.attachControl(canvas, true);

  const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

  // Ground
  const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 50, height: 50}, scene);

  // Player box
  const playerBox = BABYLON.MeshBuilder.CreateBox("playerBox", { size: 1 }, scene);
  playerBox.position.y = 0.5;

  return { scene, camera, playerBox };
};

const { scene, camera, playerBox } = createScene();

engine.runRenderLoop(() => {
  scene.render();

  if (socket && socket.readyState === WebSocket.OPEN) {
    // Send player position updates every frame (could optimize with throttling)
    const pos = playerBox.position;
    socket.send(JSON.stringify({
      type: "playerUpdate",
      payload: { x: pos.x, y: pos.y, z: pos.z }
    }));
  }
});

// Handle window resize
window.addEventListener("resize", () => {
  engine.resize();
});

// WebSocket connection & message handling
function connect() {
  socket = new WebSocket("wss://your-replit-name.username.repl.co"); // Replace this

  socket.onopen = () => {
    statusEl.textContent = "Connected! Create or join a room.";
  };

  socket.onmessage = (msg) => {
    const data = JSON.parse(msg.data);

    if (data.type === "welcome") {
      playerId = data.playerId;
    }

    else if (data.type === "roomCreated") {
      roomCode = data.roomCode;
      playerId = data.playerId;
      statusEl.textContent = `Room created: ${roomCode}`;
    }

    else if (data.type === "joinedRoom") {
      roomCode = data.roomCode;
      playerId = data.playerId;
      statusEl.textContent = `Joined room: ${roomCode}`;
    }

    else if (data.type === "playerUpdate") {
      if (!players[data.playerId]) {
        // Create box for new player
        const box = BABYLON.MeshBuilder.CreateBox("player_" + data.playerId, { size: 1 }, scene);
        box.position.y = 0.5;
        players[data.playerId] = box;
      }
      // Update position
      const pos = data.payload;
      players[data.playerId].position.set(pos.x, pos.y, pos.z);
    }

    else if (data.type === "playerJoined") {
      statusEl.textContent = `Player joined: ${data.playerId}`;
    }

    else if (data.type === "error") {
      statusEl.textContent = `Error: ${data.message}`;
    }
  };

  socket.onclose = () => {
    statusEl.textContent = "Disconnected.";
  };
}

// UI buttons
document.getElementById("createBtn").onclick = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connect();
    setTimeout(() => {
      socket.send(JSON.stringify({ type: "create" }));
    }, 500);
  } else {
    socket.send(JSON.stringify({ type: "create" }));
  }
};

document.getElementById("joinBtn").onclick = () => {
  const code = document.getElementById("joinInput").value.trim().toUpperCase();
  if (!code) {
    alert("Please enter a room code.");
    return;
  }

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connect();
    setTimeout(() => {
      socket.send(JSON.stringify({ type: "join", roomCode: code }));
    }, 500);
  } else {
    socket.send(JSON.stringify({ type: "join", roomCode: code }));
  }
};
