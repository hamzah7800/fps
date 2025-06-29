const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

let sensitivity = 1;
let playerSpeed = 0.1;
let maxHealth = 100;
let playerHealth = maxHealth;
let ammoMax = 12;
let ammo = ammoMax;
let isReloading = false;
const reloadTime = 2000; // ms
let canShoot = true;
let shootCooldown = 300; // ms between shots

// Hide loading screen once ready
scene.executeWhenReady(() => {
  document.getElementById("loadingScreen").style.display = "none";
});

// LIGHT
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// GROUND
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
const grassMat = new BABYLON.StandardMaterial("grassMat", scene);
grassMat.diffuseTexture = new BABYLON.Texture("assets/grass.png", scene);
ground.material = grassMat;

// PLAYER
const player = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
player.position.y = 0.5;
player.isVisible = false; // hide player box (use camera for view)

// CAMERAS
const fpCam = new BABYLON.FreeCamera("fpCam", new BABYLON.Vector3(0, 2, 0), scene);
fpCam.attachControl(canvas, true);
fpCam.minZ = 0.1;
fpCam.parent = player;
scene.activeCamera = fpCam;

// POINTER LOCK
canvas.addEventListener("click", () => {
  canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
  if (canvas.requestPointerLock) {
    canvas.requestPointerLock();
  }
});
document.addEventListener("pointerlockchange", () => {
  const plElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
  if (!plElement) {
    // pointer unlocked, pause input maybe
  }
});

// MOVEMENT
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// JOYSTICK SETUP
let joy = { x: 0, y: 0 };
const joystick = nipplejs.create({
  zone: document.getElementById("joystickContainer"),
  mode: "static",
  position: { left: "75px", bottom: "75px" },
  color: "white"
});
joystick.on("move", (_, data) => {
  joy = data.vector;
});
joystick.on("end", () => {
  joy = { x: 0, y: 0 };
});

// MOVEMENT VECTOR
let moveVec = new BABYLON.Vector3();

function updateMovementVector() {
  // WASD keys control
  let forward = 0, right = 0;
  if (keys["w"] || keys["arrowup"]) forward += 1;
  if (keys["s"] || keys["arrowdown"]) forward -= 1;
  if (keys["a"] || keys["arrowleft"]) right -= 1;
  if (keys["d"] || keys["arrowright"]) right += 1;

  // Combine joystick input
  forward += joy.y;
  right += joy.x;

  // Clamp to max 1 or -1
  forward = Math.max(-1, Math.min(1, forward));
  right = Math.max(-1, Math.min(1, right));

  // Calculate move vector relative to camera forward/right
  let camForward = fpCam.getForwardRay().direction;
  camForward.y = 0;
  camForward.normalize();

  let camRight = BABYLON.Vector3.Cross(camForward, BABYLON.Axis.Y).normalize();

  moveVec = camForward.scale(forward * playerSpeed).add(camRight.scale(right * playerSpeed));
}

// LOAD GUN MODEL & ATTACH TO CAMERA
let gunMesh = null;
BABYLON.SceneLoader.ImportMesh("", "assets/models/", "gun.gbl", scene, (meshes) => {
  gunMesh = meshes[0];
  gunMesh.scaling.scaleInPlace(0.5);
  gunMesh.parent = fpCam;
  gunMesh.position = new BABYLON.Vector3(0.5, -0.7, 1);
  gunMesh.rotation = new BABYLON.Vector3(0, Math.PI, 0);
});

// HUD
const hud = document.createElement("div");
hud.style.position = "absolute";
hud.style.bottom = "20px";
hud.style.left = "20px";
hud.style.color = "white";
hud.style.fontFamily = "monospace";
hud.style.fontSize = "16px";
hud.style.zIndex = "15";
document.body.appendChild(hud);

const reloadText = document.getElementById("reloadText");

// HEALTH & RESPAWN
let isDead = false;
let respawnTime = 5; // seconds
let respawnTimer = 0;

// BULLETS
const bullets = [];
const bulletSpeed = 1.5;
const bulletSize = 0.1;

function spawnBullet() {
  if (ammo <= 0 || isReloading || !canShoot) return;
  ammo--;
  updateHUD();

  const bullet = BABYLON.MeshBuilder.CreateSphere("bullet", { diameter: bulletSize }, scene);
  bullet.position = fpCam.position.add(fpCam.getForwardRay().direction.scale(1));
  bullet.material = new BABYLON.StandardMaterial("bulletMat", scene);
  bullet.material.emissiveColor = new BABYLON.Color3(1, 0.8, 0);
  bullet.forward = fpCam.getForwardRay().direction.clone();

  bullets.push(bullet);

  canShoot = false;
  setTimeout(() => {
    canShoot = true;
  }, shootCooldown);
}

function reload() {
  if (isReloading || ammo === ammoMax) return;
  isReloading = true;
  reloadText.style.display = "block";
  setTimeout(() => {
    ammo = ammoMax;
    isReloading = false;
    reloadText.style.display = "none";
    updateHUD();
  }, reloadTime);
}

// ENEMIES (Simple cube enemies)
const enemies = [];
const enemySize = 1;
const enemySpeed = 0.02;
const enemyDamage = 20;

function spawnEnemy() {
  const enemy = BABYLON.MeshBuilder.CreateBox("enemy", { size: enemySize }, scene);
  enemy.position = new BABYLON.Vector3(
    (Math.random() - 0.5) * 40,
    enemySize / 2,
    (Math.random() - 0.5) * 40
  );
  enemy.health = 50;
  enemies.push(enemy);
}

for (let i = 0; i < 5; i++) spawnEnemy();

function updateEnemies() {
  enemies.forEach((enemy, i) => {
    if (!enemy || enemy.isDisposed()) return;

    // Move towards player
    const dir = player.position.subtract(enemy.position).normalize();
    enemy.position.addInPlace(dir.scale(enemySpeed));

    // Simple collision damage if close
    if (BABYLON.Vector3.Distance(enemy.position, player.position) < 1.5 && !isDead) {
      playerHealth -= enemyDamage * 0.01;
      if (playerHealth <= 0) {
        playerHealth = 0;
        die();
      }
      updateHUD();
    }

    // Remove dead enemies
    if (enemy.health <= 0) {
      enemy.dispose();
      enemies.splice(i, 1);
      // Respawn enemy after delay
      setTimeout(spawnEnemy, 5000);
    }
  });
}

function die() {
  if (isDead) return;
  isDead = true;
  respawnTimer = respawnTime;
  hud.innerHTML = `You died. Respawning in ${respawnTimer.toFixed(1)}s`;
}

function respawn() {
  isDead = false;
  playerHealth = maxHealth;
  ammo = ammoMax;
  player.position = new BABYLON.Vector3(0, 0.5, 0);
  updateHUD();
}

// HUD Update
function updateHUD() {
  hud.innerHTML = `
    Health: ${Math.round(playerHealth)}<br>
    Ammo: ${ammo} / ${ammoMax}
  `;
}

// SETTINGS PANEL
document.getElementById("settingsIcon").onclick = () => {
  const panel = document.getElementById("settingsPanel");
  panel.style.display = panel.style.display === "block" ? "none" : "block";
};

document.getElementById("resolutionScale").oninput = (e) => {
  engine.setHardwareScalingLevel(1 / parseFloat(e.target.value));
};

document.getElementById("sensitivity").oninput = (e) => {
  sensitivity = parseFloat(e.target.value);
};

// INPUT FOR SHOOTING AND RELOADING
window.addEventListener("mousedown", (e) => {
  if (e.button === 0) spawnBullet(); // left click shoots
});
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") reload();
});

// GAME LOOP
engine.runRenderLoop(() => {
  if (!isDead) {
    updateMovementVector();
    player.moveWithCollisions(moveVec);
  } else {
    respawnTimer -= engine.getDeltaTime() / 1000;
    hud.innerHTML = `You died. Respawning in ${respawnTimer.toFixed(1)}s`;
    if (respawnTimer <= 0) {
      respawn();
    }
  }

  // Move bullets and detect hits
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.addInPlace(b.forward.scale(bulletSpeed));

    // Remove bullet if too far
    if (BABYLON.Vector3.Distance(b.position, player.position) > 50) {
      b.dispose();
      bullets.splice(i, 1);
      continue;
    }

    // Check collision with enemies
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (enemy && BABYLON.Vector3.Distance(b.position, enemy.position) < enemySize / 1.5) {
        enemy.health -= 25;
        b.dispose();
        bullets.splice(i, 1);
        break;
      }
    }
  }

  updateEnemies();

  scene.render();
});

window.addEventListener("resize", () => engine.resize());

// Initialize HUD
updateHUD();
