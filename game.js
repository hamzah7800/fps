const canvas = document.createElement("canvas");
canvas.id = "renderCanvas";
document.body.appendChild(canvas);

const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

// Camera setup
const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 1.8, -5), scene);
camera.attachControl(canvas, true);
camera.speed = 0.25;

// Lighting & Ground
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);
const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 100, height: 100}, scene);
ground.checkCollisions = true;

// Player & Enemies
const player = new Player(scene, camera);
const enemy1 = new Enemy(scene, new BABYLON.Vector3(0, 0.9, 10));
const enemy2 = new Enemy(scene, new BABYLON.Vector3(5, 0.9, 15));

// Input Handling
window.addEventListener("mousedown", e => {
    if (e.button === 0) player.shoot();
});

engine.runRenderLoop(() => scene.render());
