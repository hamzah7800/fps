const canvas = document.getElementById("gameCanvas");
const engine = new BABYLON.Engine(canvas, true);
let scene, camera, player, lobbyUI;

const createScene = () => {
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3.Black();

  // Camera
  camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 2, -10), scene);
  camera.attachControl(canvas, true);
  camera.applyGravity = true;
  camera.checkCollisions = true;

  // Light
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

  // Ground
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
  ground.checkCollisions = true;

  // Simple Player Mesh
  player = BABYLON.MeshBuilder.CreateBox("player", { height: 2, width: 1, depth: 1 }, scene);
  player.position.y = 1;
  player.isVisible = false;

  // Input
  scene.onKeyboardObservable.add((kbInfo) => {
    if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
      switch (kbInfo.event.key) {
        case "f": // Shoot
          console.log("Pew!");
          break;
        case "l": // Toggle Fullscreen
          if (!document.fullscreenElement) {
            canvas.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
      }
    }
  });

  return scene;
};

// UI: Lobby Menu
const createLobbyUI = () => {
  const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  const title = new BABYLON.GUI.TextBlock();
  title.text = "Afterblast Lobby";
  title.color = "white";
  title.fontSize = 40;
  title.top = "-40px";
  title.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  advancedTexture.addControl(title);

  const playButton = BABYLON.GUI.Button.CreateSimpleButton("playBtn", "Play");
  playButton.width = "200px";
  playButton.height = "60px";
  playButton.color = "white";
  playButton.cornerRadius = 10;
  playButton.background = "green";
  playButton.top = "40px";
  playButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  playButton.onPointerUpObservable.add(() => {
    advancedTexture.dispose();
    startGame();
  });
  advancedTexture.addControl(playButton);

  lobbyUI = advancedTexture;
};

const startGame = () => {
  player.isVisible = true;
  camera.lockedTarget = player;

  scene.registerBeforeRender(() => {
    const speed = 0.15;
    if (scene.activeCamera && scene.activeCamera === camera) {
      const inputMap = scene.actionManager ? scene.actionManager.inputMap : {};
      if (inputMap["w"]) player.moveWithCollisions(new BABYLON.Vector3(0, 0, speed * -1));
      if (inputMap["s"]) player.moveWithCollisions(new BABYLON.Vector3(0, 0, speed));
      if (inputMap["a"]) player.moveWithCollisions(new BABYLON.Vector3(speed * -1, 0, 0));
      if (inputMap["d"]) player.moveWithCollisions(new BABYLON.Vector3(speed, 0, 0));
    }
  });
};

scene = createScene();
createLobbyUI();
engine.runRenderLoop(() => {
  scene.render();
});
window.addEventListener("resize", () => {
  engine.resize();
});
