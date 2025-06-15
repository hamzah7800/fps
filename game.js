
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
let scene;

async function createScene() {
  scene = new BABYLON.Scene(engine);

  const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 2, -10), scene);
  camera.attachControl(canvas, true);

  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);

  BABYLON.SceneLoader.ImportMeshAsync("", "./assets/", "gun.glb", scene).then(result => {
    const gun = result.meshes[0];
    gun.position = new BABYLON.Vector3(0.5, -0.5, 1);
    gun.parent = camera;
  });

  const gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  const shootBtn = BABYLON.GUI.Button.CreateSimpleButton("shoot", "Shoot");
  shootBtn.width = "120px";
  shootBtn.height = "40px";
  shootBtn.color = "white";
  shootBtn.background = "black";
  shootBtn.left = "40%";
  shootBtn.top = "40%";
  shootBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
  shootBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  shootBtn.onPointerUpObservable.add(() => {
    console.log("Shoot fired");
  });
  gui.addControl(shootBtn);

  return scene;
}

createScene().then(scene => {
  engine.runRenderLoop(() => {
    scene.render();
  });
});

window.addEventListener("resize", () => {
  engine.resize();
});

// Multiplayer stub
let socket = new WebSocket("https://76fde16c-7fe6-45f3-8827-b40f1bbdd3c4-00-3jg5slrdfzlh.riker.replit.dev/");

socket.onopen = () => {
  console.log("Connected to WebSocket server");
  socket.send(JSON.stringify({ type: "join", playerId: Date.now() }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received data", data);
};
