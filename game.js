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

// Settings UI Elements
const settingsIcon = document.getElementById("settingsIcon");
const settingsPanel = document.getElementById("settingsPanel");
const joystickSensitivityControl = document.getElementById("joystickSensitivity");
const aimAssistToggle = document.getElementById("aimAssistToggle");

settingsIcon.onclick = () => {
  settingsPanel.style.display = settingsPanel.style.display === "block" ? "none" : "block";
};

let joystickSensitivity = parseFloat(joystickSensitivityControl.value);
let aimAssistEnabled = aimAssistToggle.checked;

joystickSensitivityControl.oninput = () => {
  joystickSensitivity = parseFloat(joystickSensitivityControl.value);
};

aimAssistToggle.onchange = () => {
  aimAssistEnabled = aimAssistToggle.checked;
};

// Keyboard input
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

  joy.x = x * joystickSensitivity;
  joy.y = y * joystickSensitivity;

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

  // Bullet velocity vector based on camera direction
  const forward = fpCam.getForwardRay().direction.normalize();
  bullet.metadata = { velocity: forward.scale(1.5) };

  bullets.push(bullet);
}

// Enemies setup
const enemies = [];

function spawnEnemy(position) {
  const enemy = BABYLON.MeshBuilder.CreateBox("enemy", { size: 0.8 }, scene);
  enemy.position = position.clone();
  enemy.material = new BABYLON.StandardMaterial("enemyMat", scene);
  enemy.material.diffuseColor = new BABYLON.Color3(0.7, 0, 0);
  enemy.metadata = { health: 3 };
  enemies.push(enemy);
}

// Spawn some enemies at random positions
for (let i = 0; i < 8; i++) {
  const x = (Math.random() - 0.5) * 40;
  const z = (Math.random() - 0.5) * 40;
  spawnEnemy(new BABYLON.Vector3(x, 0.4, z));
}

// Make enemies move slightly to make them harder to hit
function moveEnemies() {
  enemies.forEach((enemy, i) => {
    const t = performance.now() * 0.001 + i * 100;
    enemy.position.x += 0.005 * Math.sin(t * 1.5);
    enemy.position.z += 0.005 * Math.cos(t * 1.2);
  });
}

// Check bullet collisions with enemies
function checkBulletCollisions() {
  for (let b = bullets.length - 1; b >= 0; b--) {
    const bullet = bullets[b];
    bullet.position.addInPlace(bullet.metadata.velocity);

    // Remove bullet if too far
    if (BABYLON.Vector3.Distance(bullet.position, player.position) > 50) {
      bullet.dispose();
      bullets.splice(b, 1);
      continue;
    }

    // Check collision with enemies
    for (let e = enemies.length - 1; e >= 0; e--) {
      const enemy = enemies[e];
      if (enemy.intersectsPoint(bullet.position)) {
        enemy.metadata.health--;
        if (enemy.metadata.health <= 0) {
          enemy.dispose();
          enemies.splice(e, 1);
        }
        bullet.dispose();
        bullets.splice(b, 1);
        break;
      }
    }
  }
}

// Aim assist - smoothly rotate camera toward closest enemy
function applyAimAssist() {
  if (!aimAssistEnabled || enemies.length === 0) return;

  // Find closest enemy to center of screen (player forward)
  const forward = fpCam.getForwardRay().direction;
  let closestEnemy = null;
  let closestAngle = Infinity;

  enemies.forEach((enemy) => {
    const dirToEnemy = enemy.position.subtract(fpCam.position).normalize();
    const angle = Math.acos(BABYLON.Vector3.Dot(forward, dirToEnemy));
    if (angle < closestAngle) {
      closestAngle = angle;
      closestEnemy = enemy;
    }
  });

  if (!closestEnemy) return;

  // Calculate desired yaw and pitch for camera to look at enemy
  const toEnemy = closestEnemy.position.subtract(fpCam.position).normalize();
  const desiredYaw = Math.atan2(toEnemy.x, toEnemy.z);
  const desiredPitch = Math.asin(toEnemy.y);

  // Current camera rotation
  let yaw = fpCam.rotation.y;
  let pitch = fpCam.rotation.x;

  // Interpolate rotation toward enemy target (slowly for smoothness)
  const lerpFactor = 0.1;

  // Normalize angle difference to [-PI, PI]
  function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  let yawDiff = normalizeAngle(desiredYaw - yaw);
  let pitchDiff = normalizeAngle(desiredPitch - pitch);

  yaw += yawDiff * lerpFactor;
  pitch += pitchDiff * lerpFactor;

  // Clamp pitch to avoid flipping
  pitch = Math.min(Math.max(pitch, -Math.PI / 2), Math.PI / 2);

  fpCam.rotation.y = yaw;
  fpCam.rotation.x = pitch;
}

// Gamepad (PS4) support
let gamepad = null;
window.addEventListener("gamepadconnected", (e) => {
  console.log("Gamepad connected:", e.gamepad);
  gamepad = e.gamepad;
});
window.addEventListener("gamepaddisconnected", (e) => {
  console.log("Gamepad disconnected:", e.gamepad);
  if (gamepad && gamepad.index === e.gamepad.index) {
    gamepad = null;
  }
});

// Player update loop
scene.onBeforeRenderObservable.add(() => {
  // Update gamepad states
  if (gamepad) {
    const gp = navigator.getGamepads()[gamepad.index];
    if (gp) {
      // Left stick for movement (axes 0,1)
      joy.x = gp.axes[0] * joystickSensitivity;
      joy.y = -gp.axes[1] * joystickSensitivity; // invert Y for natural feel

      // Right stick for looking (axes 2,3)
      let lookX = gp.axes[2];
      let lookY = gp.axes[3];

      const lookSensitivity = 0.03;
      fpCam.rotation.y += lookX * lookSensitivity;
      fpCam.rotation.x += lookY * lookSensitivity;

      fpCam.rotation.x = Math.min(Math.max(fpCam.rotation.x, -Math.PI / 2), Math.PI / 2);

      // Buttons for shooting (R2 typically button 7)
      if (gp.buttons[7]?.pressed && ammo > 0 && !reloading) {
        ammo--;
        updateAmmoDisplay();
        shootBullet();
      }

      // Button for reload (Square is button 2)
      if (gp.buttons[2]?.pressed && !reloading && ammo < maxAmmo) {
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

      // Button for jump (Cross is button 0)
      if (gp.buttons[0]?.pressed && isGrounded) {
        velocityY = jumpSpeed;
        isGrounded = false;
      }
    }
  }

  // Movement vector (with sensitivity)
  const forwardVec = new BABYLON.Vector3(
    Math.sin(fpCam.rotation.y),
    0,
    Math.cos(fpCam.rotation.y)
  );

  const rightVec = new BABYLON.Vector3(
    Math.sin(fpCam.rotation.y + Math.PI / 2),
    0,
    Math.cos(fpCam.rotation.y + Math.PI / 2)
  );

  let move = forwardVec.scale(joy.y).add(rightVec.scale(joy.x));
  if (move.length() > 1) move = move.normalize();

  player.moveWithCollisions(move.scale(playerSpeed));

  // Gravity & Jump
  velocityY += gravity;
  player.position.y += velocityY;

  if (player.position.y <= 0.9) {
    player.position.y = 0.9;
    velocityY = 0;
    isGrounded = true;
  }

  // Shoot with keyboard mouse controls (optional here)
  // (Can add mouse click handlers if desired)

  // Apply aim assist
  applyAimAssist();

  // Move enemies a bit to be harder targets
  moveEnemies();

  // Bullet updates and collision check
  checkBulletCollisions();

  // Ammo display update handled on events only
});

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
