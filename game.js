const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

document.getElementById("loadingScreen").style.display = "none";

// Lighting
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// Ground
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseTexture = new BABYLON.Texture("assets/grass.png", scene);
ground.material = groundMat;

// Player
const player = BABYLON.MeshBuilder.CreateBox("player", { size: 2 }, scene);
player.isVisible = false;
player.ellipsoid = new BABYLON.Vector3(1, 1, 1);
player.position.y = 2;

// Camera
const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 2, -5), scene);
camera.attachControl(canvas, true);
camera.parent = player;
camera.speed = 0.5;
camera.angularSensibility = 2000;

// Pointer lock
canvas.addEventListener("click", () => canvas.requestPointerLock());

// Load gun model
BABYLON.SceneLoader.ImportMesh("", "assets/models/", "gun.gbl", scene, (meshes) => {
    const gun = meshes[0];
    gun.parent = camera;
    gun.position = new BABYLON.Vector3(0.6, -0.6, 1.2);
    gun.scaling = new BABYLON.Vector3(2, 2, 2);
});

// Crosshair
const crosshair = document.createElement("div");
crosshair.style.position = "absolute";
crosshair.style.left = "50%";
crosshair.style.top = "50%";
crosshair.style.transform = "translate(-50%, -50%)";
crosshair.style.width = "8px";
crosshair.style.height = "8px";
crosshair.style.border = "2px solid white";
crosshair.style.borderRadius = "50%";
crosshair.style.zIndex = "3";
document.body.appendChild(crosshair);

// Controls
let keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Movement
engine.runRenderLoop(() => {
    let dir = new BABYLON.Vector3();
    if (keys['w']) dir.z += 1;
    if (keys['s']) dir.z -= 1;
    if (keys['a']) dir.x -= 1;
    if (keys['d']) dir.x += 1;

    dir.normalize();
    const forward = camera.getForwardRay().direction;
    const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, forward).normalize();
    const move = forward.scale(dir.z).add(right.scale(dir.x)).scale(0.15);
    player.moveWithCollisions(move);

    updateEnemies();
    scene.render();
});

// Environment – Crates & Cover
const crateMat = new BABYLON.StandardMaterial("crateMat", scene);
crateMat.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0);

for (let i = 0; i < 5; i++) {
    const crate = BABYLON.MeshBuilder.CreateBox("crate" + i, { size: 2 }, scene);
    crate.position = new BABYLON.Vector3(10 + i * 5, 1, 5);
    crate.material = crateMat;
    crate.checkCollisions = true;
}

// Sniper Tower
for (let i = 0; i < 3; i++) {
    const tower = BABYLON.MeshBuilder.CreateBox("tower" + i, { width: 2, height: 2, depth: 2 }, scene);
    tower.position = new BABYLON.Vector3(30, 1 + i * 2, 30);
    tower.material = crateMat;
}

// Ammo pickup
const ammo = BABYLON.MeshBuilder.CreateSphere("ammo", { diameter: 1 }, scene);
ammo.position = new BABYLON.Vector3(0, 1, 20);
ammo.material = new BABYLON.StandardMaterial("ammoMat", scene);
ammo.material.emissiveColor = new BABYLON.Color3(0, 1, 0);

// Shooting
let ammoCount = 10;
window.addEventListener("click", () => {
    if (ammoCount <= 0) return;
    ammoCount--;

    const ray = new BABYLON.Ray(camera.position, camera.getForwardRay().direction, 100);
    const hit = scene.pickWithRay(ray);
    if (hit.pickedMesh && hit.pickedMesh.name.includes("enemy")) {
        hit.pickedMesh.dispose();
    }
});

// Pickup ammo
scene.registerBeforeRender(() => {
    if (BABYLON.Vector3.Distance(player.position, ammo.position) < 2) {
        ammoCount = 10;
    }
});

// Enemies
const enemies = [];
function spawnEnemy(pos) {
    const e = BABYLON.MeshBuilder.CreateSphere("enemy", { diameter: 2 }, scene);
    e.position = pos;
    e.material = new BABYLON.StandardMaterial("eMat", scene);
    e.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
    enemies.push(e);
}

spawnEnemy(new BABYLON.Vector3(20, 1, 10));
spawnEnemy(new BABYLON.Vector3(-15, 1, -10));
spawnEnemy(new BABYLON.Vector3(30, 1, -20));

function updateEnemies() {
    enemies.forEach(e => {
        if (!e || e._isDisposed) return;
        const dir = player.position.subtract(e.position).normalize();
        e.moveWithCollisions(dir.scale(0.05));
    });
}

// UI
document.getElementById("settingsIcon").onclick = () => {
    const panel = document.getElementById("settingsPanel");
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
};

document.getElementById("resolutionScale").oninput = e => {
    engine.setHardwareScalingLevel(1 / parseFloat(e.target.value));
};

document.getElementById("sensitivity").oninput = e => {
    camera.angularSensibility = 2000 / parseFloat(e.target.value);
};

window.addEventListener("resize", () => engine.resize());
