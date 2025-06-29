const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Show loading screen until scene is ready
document.getElementById("loadingScreen").style.display = "none";

// Light
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// Ground
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseTexture = new BABYLON.Texture("assets/grass.png", scene);
ground.material = groundMat;

// Player and camera setup
const player = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
player.isVisible = false; // Hide the box
player.position.y = 1.8;

const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 1.8, -5), scene);
camera.attachControl(canvas, true);
camera.parent = player;
camera.speed = 0.5;

// Pointer lock
canvas.addEventListener("click", () => canvas.requestPointerLock());

// Load 3D gun model
BABYLON.SceneLoader.ImportMesh("", "assets/models/", "gun.gbl", scene, (meshes) => {
    const gun = meshes[0];
    gun.parent = camera;
    gun.position = new BABYLON.Vector3(0.5, -0.5, 1);
    gun.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
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

// Shoot on click
window.addEventListener("mousedown", () => {
    const origin = camera.position.clone();
    const forward = camera.getForwardRay().direction;
    const ray = new BABYLON.Ray(origin, forward, 100);

    const hit = scene.pickWithRay(ray);
    if (hit.hit) {
        // Flash or effect
        const impact = BABYLON.MeshBuilder.CreateSphere("impact", { diameter: 0.2 }, scene);
        impact.position = hit.pickedPoint;
        impact.material = new BABYLON.StandardMaterial("impactMat", scene);
        impact.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
        setTimeout(() => impact.dispose(), 300);
    }
});

// Player movement
let keys = {};
window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

engine.runRenderLoop(() => {
    let dir = new BABYLON.Vector3();
    if (keys["w"]) dir.z += 1;
    if (keys["s"]) dir.z -= 1;
    if (keys["a"]) dir.x -= 1;
    if (keys["d"]) dir.x += 1;

    dir.normalize();
    const forward = camera.getForwardRay().direction;
    const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, forward).normalize();
    const move = forward.scale(dir.z).add(right.scale(dir.x)).scale(0.1);
    player.moveWithCollisions(move);

    scene.render();
});

// UI Settings
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
camera.angularSensibility = 2000; // Default

// Resize
window.addEventListener("resize", () => engine.resize());
