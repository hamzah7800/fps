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

// Player setup
const player = BABYLON.MeshBuilder.CreateBox("player", { size: 2 }, scene);
player.isVisible = false;
player.ellipsoid = new BABYLON.Vector3(1, 1, 1);
player.position.y = 2;
let playerHealth = 100;
let isDead = false;
let respawnTime = 5;
let ammoCount = 10;

// Camera
const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 2, -5), scene);
camera.attachControl(canvas, true);
camera.parent = player;
camera.speed = 0.5;
camera.angularSensibility = 2000;

// Pointer lock
canvas.addEventListener("click", () => canvas.requestPointerLock());

// Load gun
BABYLON.SceneLoader.ImportMesh("", "assets/models/", "gun.gbl", scene, (meshes) => {
    const gun = meshes[0];
    gun.parent = camera;
    gun.position = new BABYLON.Vector3(0.6, -0.6, 1.2);
    gun.scaling = new BABYLON.Vector3(2, 2, 2);
});

// HUD elements
const hud = document.createElement("div");
hud.style.position = "absolute";
hud.style.bottom = "10px";
hud.style.left = "10px";
hud.style.color = "white";
hud.style.font = "16px sans-serif";
hud.style.zIndex = "3";
document.body.appendChild(hud);

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

const deathScreen = document.createElement("div");
deathScreen.style.position = "absolute";
deathScreen.style.top = "50%";
deathScreen.style.left = "50%";
deathScreen.style.transform = "translate(-50%, -50%)";
deathScreen.style.fontSize = "36px";
deathScreen.style.color = "red";
deathScreen.style.display = "none";
deathScreen.style.zIndex = "4";
document.body.appendChild(deathScreen);

const gameDuration = 180; // seconds
let remainingTime = gameDuration;

// Ammo Pickup
const ammoBox = BABYLON.MeshBuilder.CreateSphere("ammo", { diameter: 1 }, scene);
ammoBox.position = new BABYLON.Vector3(5, 1, 5);
ammoBox.material = new BABYLON.StandardMaterial("ammoMat", scene);
ammoBox.material.emissiveColor = new BABYLON.Color3(0, 1, 0);

// Controls
let keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Shooting
window.addEventListener("click", () => {
    if (isDead || ammoCount <= 0) return;
    ammoCount--;

    const ray = new BABYLON.Ray(camera.position, camera.getForwardRay().direction, 100);
    const hit = scene.pickWithRay(ray);
    if (hit.pickedMesh && hit.pickedMesh.name.includes("enemy")) {
        hit.pickedMesh.health -= 1;
        if (hit.pickedMesh.health <= 0) {
            hit.pickedMesh.dispose();
        } else {
            updateHealthBar(hit.pickedMesh);
        }
    }
});

// Enemies
const enemies = [];
function spawnEnemy(pos) {
    const e = BABYLON.MeshBuilder.CreateSphere("enemy", { diameter: 2 }, scene);
    e.position = pos.clone();
    e.material = new BABYLON.StandardMaterial("eMat", scene);
    e.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
    e.health = 3;

    // Health bar
    const bar = new BABYLON.GUI.Rectangle();
    bar.width = "40px";
    bar.height = "6px";
    bar.color = "red";
    bar.background = "red";
    bar.alpha = 0.8;
    const plane = BABYLON.MeshBuilder.CreatePlane("hpBar", { size: 2 }, scene);
    plane.position = new BABYLON.Vector3(0, 2.5, 0);
    plane.parent = e;
    e.healthBar = bar;

    enemies.push(e);
}

spawnEnemy(new BABYLON.Vector3(10, 1, 10));
spawnEnemy(new BABYLON.Vector3(-15, 1, -20));
spawnEnemy(new BABYLON.Vector3(25, 1, -10));

// Enemy update
function updateEnemies() {
    enemies.forEach(e => {
        if (!e || e._isDisposed) return;
        const dist = BABYLON.Vector3.Distance(player.position, e.position);
        if (dist < 30) {
            const dir = player.position.subtract(e.position).normalize();
            e.moveWithCollisions(dir.scale(0.03));

            if (dist < 3 && !isDead) {
                playerHealth -= 0.5;
                if (playerHealth <= 0) {
                    dieAndRespawn();
                }
            }
        }
    });
}

// Health bar logic
function updateHealthBar(enemy) {
    if (!enemy.healthBarMesh) {
        const bar = BABYLON.MeshBuilder.CreatePlane("bar", { width: 1.5, height: 0.2 }, scene);
        bar.position.y = 2.5;
        bar.parent = enemy;
        const mat = new BABYLON.StandardMaterial("barMat", scene);
        mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        bar.material = mat;
        enemy.healthBarMesh = bar;
    }
    const scale = enemy.health / 3;
    enemy.healthBarMesh.scaling.x = scale;
}

// Movement
engine.runRenderLoop(() => {
    if (!isDead) {
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
    }

    updateEnemies();
    updateHUD();
    scene.render();
});

// Game Timer
setInterval(() => {
    if (!isDead && remainingTime > 0) remainingTime--;
    if (remainingTime <= 0) {
        deathScreen.style.display = "block";
        deathScreen.textContent = "🕹️ Game Over";
    }
}, 1000);

// Ammo Pickup
scene.registerBeforeRender(() => {
    if (BABYLON.Vector3.Distance(player.position, ammoBox.position) < 2) {
        ammoCount = 10;
    }
});

function updateHUD() {
    hud.innerHTML = `❤️ Health: ${Math.floor(playerHealth)}<br>🔫 Ammo: ${ammoCount}<br>⏳ Time: ${remainingTime}s`;
}

// Respawn
function dieAndRespawn() {
    isDead = true;
    deathScreen.style.display = "block";
    let countdown = respawnTime;
    const interval = setInterval(() => {
        deathScreen.textContent = `☠️ You Died\nRespawning in ${countdown--}...`;
        if (countdown < 0) {
            clearInterval(interval);
            playerHealth = 100;
            ammoCount = 10;
            player.position = new BABYLON.Vector3(0, 2, 0);
            isDead = false;
            deathScreen.style.display = "none";
        }
    }, 1000);
}

// UI sliders
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
