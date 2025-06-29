const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

document.getElementById("loadingScreen").style.display = "none";

const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
light.intensity = 0.9;

// Ground
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
const grassMat = new BABYLON.StandardMaterial("grassMat", scene);
grassMat.diffuseTexture = new BABYLON.Texture("assets/grass.png", scene);
ground.material = grassMat;
ground.checkCollisions = true;

// Placeholder Player (capsule + head)
const player = BABYLON.MeshBuilder.CreateCapsule("player", { height: 1.8, radius: 0.4, subdivisions: 8 }, scene);
player.position.y = 0.9;
player.checkCollisions = true;
player.ellipsoid = new BABYLON.Vector3(0.4, 0.9, 0.4);
player.ellipsoidOffset = new BABYLON.Vector3(0, 0.9, 0);

const head = BABYLON.MeshBuilder.CreateSphere("head", { diameter: 0.6 }, scene);
head.parent = player;
head.position = new BABYLON.Vector3(0, 0.9, 0);

// Camera setup
const fpCam = new BABYLON.FreeCamera("fpCam", new BABYLON.Vector3(0, 1.6, -2), scene);
fpCam.parent = player;
fpCam.position = new BABYLON.Vector3(0, 1.6, -2);
scene.activeCamera = fpCam;
fpCam.attachControl(canvas, true);
fpCam.checkCollisions = false;
fpCam.applyGravity = false;

fpCam.inputs.clear(); // remove default inputs, we'll use our own controls

// Player movement vars
let playerSpeed = 0.12;
let jumpSpeed = 0.25;
let velocityY = 0;
let gravity = -0.015;
let isGrounded = true;

// Movement input
let keys = {};
let joy = { x: 0, y: 0 };

window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

// Joystick dynamic setup
const joystickZone = document.getElementById("joystickContainer");
const nipple = nipplejs.create({
  zone: joystickZone,
  mode: "dynamic",
  color: "white",
  catchDistance: 100,
  multitouch: false,
});

nipple.on("move", (_, data) => {
  let x = data.vector.x;
  let y = data.vector.y;

  const deadzone = 0.15;
  if (Math.abs(x) < deadzone) x = 0;
  if (Math.abs(y) < deadzone) y = 0;

  joy.x = x * 1.2;
  joy.y = y * 1.2;

  joy.x = Math.max(-1, Math.min(1, joy.x));
  joy.y = Math.max(-1, Math.min(1, joy.y));
});

nipple.on("end", () => {
  joy = { x: 0, y: 0 };
});

// Shooting, reloading, jumping setup
let ammo = 10;
const maxAmmo = 10;
let reloading = false;

const shootBtn = document.getElementById("shootBtn");
const reloadBtn = document.getElementById("reloadBtn");
const jumpBtn = document.getElementById("jumpBtn");
const ammoDisplay = document.getElementById("ammoDisplay");

shootBtn.onclick = () => {
  if (ammo > 0 && !reloading) {
    ammo--;
    updateAmmoDisplay();
    shootBullet();
  }
};

reloadBtn.onclick = () => {
  if (!reloading && ammo < maxAmmo) {
    reloading = true;
    reloadBtn.disabled = true;
    reloadBtn.textContent = "Reloading...";
    setTimeout(() => {
      ammo = maxAmmo;
      reloading = false;
      reloadBtn.disabled = false;
      reloadBtn.textContent = "Reload";
      updateAmmoDisplay();
    }, 2000);
  }
};

jumpBtn.onclick = () => {
  if (isGrounded) {
    velocityY = jumpSpeed;
    isGrounded = false;
  }
};

function updateAmmoDisplay() {
  ammoDisplay.textContent = `Ammo: ${ammo} / ${maxAmmo}`;
}
updateAmmoDisplay();

// Bullets array for tracking bullets
const bullets = [];

function shootBullet() {
  // Create a small sphere as bullet
  const bullet = BABYLON.MeshBuilder.CreateSphere("bullet", { diameter: 0.1 }, scene);
  bullet.position = player.position.add(new BABYLON.Vector3(0, 1.5, 0));
  bullet.material = new BABYLON.StandardMaterial("bulletMat", scene);
  bullet.material.emissiveColor = new BABYLON.Color3(1, 0, 0);

  // Direction from camera forward
  const forward = fpCam.getForwardRay().direction.clone().normalize();
  bullets.push({ mesh: bullet, direction: forward, speed: 0.5, life: 60 });
}

// Basic bullet update
function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.mesh.position.addInPlace(b.direction.scale(b.speed));
    b.life--;
    if (b.life <= 0) {
      b.mesh.dispose();
      bullets.splice(i, 1);
    }
  }
}

// Placeholder enemies (stationary boxes)
const enemies = [];
function spawnEnemy(position) {
  const enemy = BABYLON.MeshBuilder.CreateBox("enemy", { size: 1 }, scene);
  enemy.position = position.clone();
  enemy.material = new BABYLON.StandardMaterial("enemyMat", scene);
  enemy.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
  enemy.checkCollisions = true;
  enemies.push(enemy);
}
// Spawn some enemies randomly
spawnEnemy(new BABYLON.Vector3(10, 0.5, 10));
spawnEnemy(new BABYLON.Vector3(-10, 0.5, -8));
spawnEnemy(new BABYLON.Vector3(5, 0.5, -12));

// Update enemies placeholder (could add AI later)
function updateEnemies() {
  // Placeholder: no movement for now
}

// Player movement update
function updatePlayer() {
  // Combine keyboard and joystick input for movement
  let inputX = 0,
    inputZ = 0;

  if (keys["w"] || keys["arrowup"]) inputZ += 1;
  if (keys["s"] || keys["arrowdown"]) inputZ -= 1;
  if (keys["a"] || keys["arrowleft"]) inputX -= 1;
  if (keys["d"] || keys["arrowright"]) inputX += 1;

  if (joy.x !== 0 || joy.y !== 0) {
    inputX = joy.x;
    inputZ = joy.y;
  }

  // Normalize input vector
  let length = Math.sqrt(inputX * inputX + inputZ * inputZ);
  if (length > 1) {
    inputX /= length;
    inputZ /= length;
  }

  // Movement relative to camera forward/right vectors
  const forward = fpCam.getForwardRay().direction.clone();
  forward.y = 0;
  forward.normalize();

  const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, forward).normalize();

  let moveDir = forward.scale(inputZ).add(right.scale(inputX));

  if (moveDir.length() > 0.1) {
    moveDir = moveDir.normalize();
    // Rotate player smoothly toward moveDir
    let targetAngle = Math.atan2(moveDir.x, moveDir.z);
    let currentAngle = player.rotation.y;
    let angleDiff = targetAngle - currentAngle;
    angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
    player.rotation.y += angleDiff * 0.2;

    // Move with collision
    const movement = moveDir.scale(playerSpeed);
    player.moveWithCollisions(movement);
  }

  // Gravity & jump
  velocityY += gravity;
  player.position.y += velocityY;

  if (player.position.y <= 0.9) {
    player.position.y = 0.9;
    isGrounded = true;
    velocityY = 0;
  }
}

// Game loop
engine.runRenderLoop(() => {
  updatePlayer();
  updateEnemies();
  updateBullets();
  scene.render();
});

window.addEventListener("resize", () => engine.resize());
