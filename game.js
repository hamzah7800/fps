const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Loading screen hide
document.getElementById("loadingScreen").style.display = "none";

// Light
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// Ground with grass texture
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
const grassMat = new BABYLON.StandardMaterial("grassMat", scene);
grassMat.diffuseTexture = new BABYLON.Texture("assets/grass.png", scene);
ground.material = grassMat;

// Player
const player = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
player.position.y = 0.5;

// Cameras
const fpCam = new BABYLON.FreeCamera("fpCam", new BABYLON.Vector3(0, 2, -1), scene);
fpCam.parent = player;
const tpCam = new BABYLON.ArcRotateCamera("tpCam", Math.PI / 2, Math.PI / 4, 6, player.position, scene);
let activeCam = fpCam;
scene.activeCamera = activeCam;
scene.activeCamera.attachControl(canvas, true);

// Movement
let keys = {}, joy = { x: 0, y: 0 }, moveVec = new BABYLON.Vector3(), playerSpeed = 0.1;

window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

const updateMov = () => {
    const fwd = scene.activeCamera.getForwardRay().direction.normalize().scale(joy.y * playerSpeed);
    const rt = BABYLON.Vector3.Cross(fwd.normalize(), BABYLON.Axis.Y).scale(joy.x * playerSpeed);
    moveVec.copyFrom(fwd.add(rt));
};

const nipple = nipplejs.create({
    zone: document.getElementById("joystickContainer"),
    mode: 'static',
    position: { left: '75px', bottom: '75px' },
    color: 'white'
});

nipple.on('move', (_, data) => { joy = data.vector; updateMov(); });
nipple.on('end', () => { joy = { x: 0, y: 0 }; updateMov(); });

// Game loop
engine.runRenderLoop(() => {
    if (keys['w'] || keys['arrowup']) joy.y = 1;
    if (keys['s'] || keys['arrowdown']) joy.y = -1;
    if (keys['a'] || keys['arrowleft']) joy.x = -1;
    if (keys['d'] || keys['arrowright']) joy.x = 1;
    if (!keys['w'] && !keys['a'] && !keys['s'] && !keys['d']) joy = { x: 0, y: 0 };
    updateMov();
    player.moveWithCollisions(moveVec);
    scene.render();
});

// Resize
window.addEventListener("resize", () => engine.resize());

// UI: settings
document.getElementById("settingsIcon").onclick = () => {
    const panel = document.getElementById("settingsPanel");
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
};

document.getElementById("toggleView").onchange = e => {
    scene.activeCamera.detachControl();
    activeCam = e.target.checked ? fpCam : tpCam;
    scene.activeCamera = activeCam;
    activeCam.attachControl(canvas, true);
};

document.getElementById("resolutionScale").oninput = e => {
    engine.setHardwareScalingLevel(1 / parseFloat(e.target.value));
};

document.getElementById("sensitivity").oninput = e => {
    sensitivity = parseFloat(e.target.value);
};

// HUD gun overlay
const gunImg = document.createElement("img");
gunImg.src = "assets/gun.png";
gunImg.style.position = "absolute";
gunImg.style.bottom = "20px";
gunImg.style.right = "20px";
gunImg.style.width = "180px";
gunImg.style.opacity = "0.8";
gunImg.style.zIndex = "2";
document.body.appendChild(gunImg);
