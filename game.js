const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const statusEl = document.getElementById("status");
const loadingScreen = document.getElementById("loadingScreen");
const settingsIcon = document.getElementById("settingsIcon");
const settingsPanel = document.getElementById("settingsPanel");
const toggleViewCheckbox = document.getElementById("toggleView");
const resolutionScaleInput = document.getElementById("resolutionScale");
const sensitivityInput = document.getElementById("sensitivity");
const joystickContainer = document.getElementById("joystickContainer");

let socket;
let playerId;
let roomCode;
const players = {};

let moveVector = new BABYLON.Vector3.Zero();

let playerSpeed = 0.1;
let mouseSensitivity = 1;

let firstPerson = true;

// Create scene and cameras
const createScene = () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.2, 0.2, 0.3);

  const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

  const playerBox = BABYLON.MeshBuilder.CreateBox("playerBox", { size: 1 }, scene);
  playerBox.position.y = 0.5;

  // Cameras
  const fpCamera = new BABYLON.FreeCamera("fpCamera", new BABYLON.Vector3(0, 2, -1), scene);
  fpCamera.parent = playerBox;
  fpCamera.attachControl(canvas, true);
  fpCamera.rotation = new BABYLON.Vector3(0, 0, 0);

  const tpCamera = new BABYLON.ArcRotateCamera("tpCamera", Math.PI / 2, Math.PI / 4, 6, playerBox.position, scene);
  tpCamera.attachControl(canvas, true);
  tpCamera.lowerRadiusLimit = 3;
  tpCamera.upperRadiusLimit = 10;
  tpCamera.wheelPrecision = 50;

  return { scene, playerBox, fpCamera, tpCamera };
};

const { scene, playerBox, fpCamera, tpCamera } = createScene();

let currentCamera = firstPerson ? fpCamera : tpCamera;
scene.activeCamera = currentCamera;

engine.runRenderLoop(() => {
  scene.render();

  // Move player box
  playerBox.moveWithCollisions(moveVector);

  // Send position update
  if (socket && socket.readyState === WebSocket.OPEN) {
    const pos = playerBox.position;
    socket.send(JSON.stringify({
      type: "playerUpdate",
      payload: { x: pos.x, y: pos.y, z: pos.z }
    }));
  }
});

window.addEventListener("resize", () => {
  engine.resize();
});

// WebSocket connection & message handling
function connect() {
  socket = new WebSocket("wss://your-replit-name.username.repl.co"); // Replace your server URL

  socket.onopen = () => {
    statusEl.textContent = "Connected! Create or join a room.";
    loadingScreen.style.display = "none";
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
      const pos = data.payload;
      players[data.playerId].position.set(pos.x, pos.y, pos.z);
    }

    else if (data.type === "playerJoined") {
      statusEl.textContent = `Player ${data.playerId} joined room`;
    }

    else if (data.type === "playerLeft") {
      if (players[data.playerId]) {
        players[data.playerId].dispose();
        delete players[data.playerId];
      }
      statusEl.textContent = `Player ${data.playerId} left room`;
    }
  };

  socket.onclose = () => {
    statusEl.textContent = "Disconnected.";
    loadingScreen.style.display = "flex";
  };

  socket.onerror = (err) => {
    console.error(err);
    statusEl.textContent = "Error connecting to server.";
    loadingScreen.style.display = "flex";
  };
}

document.getElementById("createBtn").onclick = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connect();
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "createRoom" }));
    };
  } else {
    socket.send(JSON.stringify({ type: "createRoom" }));
  }
};

document.getElementById("joinBtn").onclick = () => {
  const code = document.getElementById("joinInput").value.trim().toUpperCase();
  if (!code) {
    alert("Enter a valid room code.");
    return;
  }
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connect();
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "joinRoom", roomCode: code }));
    };
  } else {
    socket.send(JSON.stringify({ type: "joinRoom", roomCode: code }));
  }
};

// Joystick controls setup
const joystick = nipplejs.create({
  zone: joystickContainer,
  mode: 'static',
  position: { left: '75px', bottom: '75px' },
  color: 'white',
  size: 120,
});

let joystickVector = { x: 0, y: 0 };

joystick.on('move', (evt, data) => {
  if (data && data.vector) {
    joystickVector = data.vector;
    updateMovement();
  }
});

joystick.on('end', () => {
  joystickVector = { x: 0, y: 0 };
  updateMovement();
});

function updateMovement() {
  // Convert joystick vector to movement in 3D space based on camera direction
  let forward = scene.activeCamera.getForwardRay().direction;
  forward.y = 0;
  forward.normalize();

  let right = BABYLON.Vector3.Cross(forward, BABYLON.Axis.Y).normalize();

  moveVector = forward.scale(joystickVector.y * playerSpeed)
    .add(right.scale(joystickVector.x * playerSpeed));
}

// Keyboard controls for desktop
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  updateMovementFromKeys();
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
  updateMovementFromKeys();
});

function updateMovementFromKeys() {
  let x = 0, y = 0;

  if (keys['w'] || keys['arrowup']) y += 1;
  if (keys['s'] || keys['arrowdown']) y -= 1;
  if (keys['a'] || keys['arrowleft']) x -= 1;
  if (keys['d'] || keys['arrowright']) x += 1;

  if (x === 0 && y === 0) {
    moveVector = BABYLON.Vector3.Zero();
    return;
  }

  let forward = scene.activeCamera.getForwardRay().direction;
  forward.y = 0;
  forward.normalize();

  let right = BABYLON.Vector3.Cross(forward, BABYLON.Axis.Y).normalize();

  moveVector = forward.scale(y * playerSpeed)
    .add(right.scale(x * playerSpeed));
}

// Settings toggle
settingsIcon.onclick = () => {
  settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
};

toggleViewCheckbox.onchange = (e) => {
  firstPerson = e.target.checked;
  currentCamera.detachControl(canvas);
  currentCamera = firstPerson ? fpCamera : tpCamera;
  scene.activeCamera = currentCamera;
  currentCamera.attachControl(canvas, true);
};

resolutionScaleInput.oninput = (e) => {
  const scale = parseFloat(e.target.value);
  engine.setHardwareScalingLevel(1 / scale);
};

sensitivityInput.oninput = (e) => {
  mouseSensitivity = parseFloat(e.target.value);
};

// Start connection automatically for testing
connect();
