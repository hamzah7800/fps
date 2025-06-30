import * as BABYLON from "https://cdn.babylonjs.com/babylon.js";
import "https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js";

const canvas = document.getElementById("gameCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

// Camera
const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 2, -5), scene);
camera.attachControl(canvas, true);
camera.speed = 0.1;

// Light
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// Ground
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseTexture = new BABYLON.Texture("assets/textures/grass.jpg", scene);
ground.material = groundMat;

// Variables
let playerMesh = null;
let gunMesh = null;
let animGroups = [];
let canDash = true;
let canShoot = true;

// Load Player + Gun
async function loadModels() {
    const playerRes = await BABYLON.SceneLoader.ImportMeshAsync("", "assets/", "player.glb", scene);
    playerMesh = playerRes.meshes[0];
    animGroups = playerRes.animationGroups;

    const gunRes = await BABYLON.SceneLoader.ImportMeshAsync("", "assets/", "gun.glb", scene);
    gunMesh = gunRes.meshes[0];
    gunMesh.parent = camera;

    gunMesh.position = new BABYLON.Vector3(0.2, -0.2, 0.5);
}

// Controls
const inputMap = {};
scene.actionManager = new BABYLON.ActionManager(scene);
scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnKeyDownTrigger, (evt) => {
        inputMap[evt.sourceEvent.key] = true;
    }
));
scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnKeyUpTrigger, (evt) => {
        inputMap[evt.sourceEvent.key] = false;
    }
));

// Game loop
scene.onBeforeRenderObservable.add(() => {
    let speed = 0.1;
    if (inputMap["w"]) camera.position.z += speed;
    if (inputMap["s"]) camera.position.z -= speed;
    if (inputMap["a"]) camera.position.x -= speed;
    if (inputMap["d"]) camera.position.x += speed;

    // Dash
    if (inputMap["Shift"] && canDash) {
        speed = 1;
        canDash = false;
        setTimeout(() => canDash = true, 1000);
    }

    // Shoot
    if (inputMap["Enter"] && canShoot) {
        console.log("Pew!");
        canShoot = false;
        // Add muzzle flash / sound here if you'd like
        setTimeout(() => canShoot = true, 300);
    }

    // Reload
    if (inputMap["r"]) {
        console.log("Reloading...");
        // Add reload animation trigger here
    }
});

// Start
loadModels();

// Render
engine.runRenderLoop(() => {
    scene.render();
});

// Resize
window.addEventListener("resize", () => {
    engine.resize();
});
