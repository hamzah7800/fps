const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Hide loading screen
document.getElementById("loadingScreen").style.display = "none";

// Light
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// Ground with grass texture
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
const grassMat = new BABYLON.StandardMaterial("grassMat", scene);
grassMat.diffuseTexture = new BABYLON.Texture("assets/grass.png", scene);
ground.material = grassMat;

// Player (placeholder box)
const player = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
player.position.y = 0.5;

// Cameras
const fpCam = new BABYLON.FreeCamera("fpCam", new BABYLON.Vector3(0, 2, -1), scene);
fpCam.parent = player;
const tpCam = new BABYLON.ArcRotateCamera("tpCam", Math.PI / 2, Math.PI / 4, 6, player.position, scene);
let activeCam = fpCam;
scene.activeCamera = activeCam;
scene.activeCamera.attachControl(canvas, true);

// Movement variables
let keys = {}, joy = { x: 0, y: 0 }, playerSpeed = 0.1, moveVec = new BABYLON.Vector3();

// Jump & gravity
let velocityY = 0, gravity = -0.02, isGrounded = true, jumpSpeed = 0.4;

// Joystick sensitivity & aim assist toggle
let joystickSensitivity = 1.0;
let aimAssistEnabled = true;

// Bullets array
const bullets = [];

// Ammo management
const maxAmmo = 12;
let ammo = maxAmmo;
let reloading = false;

// Setup UI elements
const reloadBtn = document.createElement("button");
reloadBtn.textContent = "Reload";
reloadBtn.style.position = "absolute";
reloadBtn.style.top = "10px";
reloadBtn.style.left = "10px";
reloadBtn.style.zIndex = "2";
document.body.appendChild(reloadBtn);

const ammoDisplay = document.createElement("div");
ammoDisplay.style.position = "absolute";
ammoDisplay.style.top = "40px";
ammoDisplay.style.left = "10px";
ammoDisplay.style.color = "white";
ammoDisplay.style.zIndex = "2";
ammoDisplay.textContent = `Ammo: ${ammo}/${maxAmmo}`;
document.body.appendChild(ammoDisplay);

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

function updateAmmoDisplay() {
  ammoDisplay.textContent = `Ammo: ${ammo}/${maxAmmo}`;
}

// Shoot bullet - spawn lower and faster
function shootBullet() {
  if (ammo <= 0 || reloading) return;
  ammo--;
  updateAmmoDisplay();

  const bullet = BABYLON.MeshBuilder.CreateSphere("bullet", { diameter: 0.1 }, scene);
  bullet.position = player.position.add(new BABYLON.Vector3(0, 1.3, 0)); // spawn at gun height
  bullet.material = new BABYLON.StandardMaterial("bulletMat", scene);
  bullet.material.emissiveColor = new BABYLON.Color3(1, 0, 0);

  const forward = fpCam.getForwardRay().direction.normalize();
  bullet.metadata = {
    velocity: forward.scale(2.5),
    lastPosition: bullet.position.clone(),
  };

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

// Spawn enemies randomly
for (let i = 0; i < 8; i++) {
  const x = (Math.random() - 0.5) * 40;
  const z = (Math.random() - 0.5) * 40;
  spawnEnemy(new BABYLON.Vector3(x, 0.4, z));
}

// Enemy slight movement for harder target
function moveEnemies() {
  enemies.forEach((enemy, i) => {
    const t = performance.now() * 0.001 + i * 100;
    enemy.position.x += 0.005 * Math.sin(t * 1.5);
    enemy.position.z += 0.005 * Math.cos(t * 1.2);
  });
}

// Bullet collision detection with raycast for accuracy
function checkBulletCollisions() {
  for (let b = bullets.length - 1; b >= 0; b--) {
    const bullet = bullets[b];
    const lastPos = bullet.metadata.lastPosition.clone();
    bullet.position.addInPlace(bullet.metadata.velocity);
    bullet.metadata.lastPosition = bullet.position.clone();

    const ray = new BABYLON.Ray(lastPos, bullet.position.subtract(lastPos).normalize(), BABYLON.Vector3.Distance(bullet.position, lastPos));

    let hitEnemyIndex = -1;
    for (let e = 0; e < enemies.length; e++) {
      const enemy = enemies[e];
      const intersect = ray.intersectsMesh(enemy, false);
      if (intersect.hit) {
        hitEnemyIndex = e;
        break;
      }
    }

    if (hitEnemyIndex !== -1) {
      const enemy = enemies[hitEnemyIndex];
      enemy.metadata.health--;
      if (enemy.metadata.health <= 0) {
        enemy.dispose();
        enemies.splice(hitEnemyIndex, 1);
      }
      bullet.dispose();
      bullets.splice(b, 1);
      continue;
    }

    if (BABYLON.Vector3.Distance(bullet.position, player.position) > 50) {
      bullet.dispose();
      bullets.splice(b, 1);
    }
  }
}

// Aim assist towards closest enemy
function applyAimAssist() {
  if (!aimAssistEnabled || enemies.length === 0) return;

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

  const toEnemy = closestEnemy.position.subtract(fpCam.position).normalize();
  const desiredYaw = Math.atan2(toEnemy.x, toEnemy.z);
  const desiredPitch = Math.asin(toEnemy.y);

  let yaw = fpCam.rotation.y;
  let pitch = fpCam.rotation.x;

  const lerpFactor = 0.1;

  function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  let yawDiff = normalizeAngle(desiredYaw - yaw);
  let pitchDiff = normalizeAngle(desiredPitch - pitch);

  yaw += yawDiff * lerpFactor;
  pitch += pitchDiff * lerpFactor;

  pitch = Math.min(Math.max(pitch, -Math.PI / 2), Math.PI / 2);

  fpCam.rotation.y = yaw;
  fpCam.rotation.x = pitch;
}

// Joystick & controls
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

const nipple = nipplejs.create({
  zone: document.getElementById("joystickContainer"),
  mode: 'static',
  position: { left: '75px', bottom: '75px' },
  color: 'white'
});

nipple.on('move', (_, data) => {
  joy = { x: data.vector.x * joystickSensitivity, y: data.vector.y * joystickSensitivity };
});
nipple.on('end', () => {
  joy = { x: 0, y: 0 };
});

// Settings toggle panel and controls
document.getElementById("settingsIcon").onclick = () => {
  const panel = document.getElementById("settingsPanel");
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
};

document.getElementById("resolutionScale").oninput = e => {
  engine.setHardwareScalingLevel(1 / parseFloat(e.target.value));
};

document.getElementById("sensitivity").oninput = e => {
  joystickSensitivity = parseFloat(e.target.value);
};

document.getElementById("toggleView").onchange = e => {
  scene.activeCamera.detachControl();
  activeCam = e.target.checked ? fpCam : tpCam;
  scene.activeCamera = activeCam;
  activeCam.attachControl(canvas, true);
};

document.getElementById("aimAssistToggle").onchange = e => {
  aimAssistEnabled = e.target.checked;
};

// PS4 gamepad support
let gamepad = null;
window.addEventListener("gamepadconnected", e => {
  console.log("Gamepad connected:", e.gamepad);
  gamepad = e.gamepad;
});
window.addEventListener("gamepaddisconnected", e => {
  if (gamepad && gamepad.index === e.gamepad.index) {
    gamepad = null;
  }
});

// Update movement vector and apply inputs
function updateMov() {
  // Use keyboard keys
  joy.x = 0; joy.y = 0;
  if (keys['w'] || keys['arrowup']) joy.y = 1;
  if (keys['s'] || keys['arrowdown']) joy.y = -1;
  if (keys['a'] || keys['arrowleft']) joy.x = -1;
  if (keys['d'] || keys['arrowright']) joy.x = 1;
  joy.x *= joystickSensitivity;
  joy.y *= joystickSensitivity;
}

// Main loop updates
scene.onBeforeRenderObservable.add(() => {
  // Update movement from keys/gamepad/joystick
  updateMov();

  // Gamepad input handling
  if (gamepad) {
    const gp = navigator.getGamepads()[gamepad.index];
    if (gp) {
      joy.x = gp.axes[0] * joystickSensitivity;
      joy.y = -gp.axes[1] * joystickSensitivity;

      const lookX = gp.axes[2];
      const lookY = gp.axes[3];
      const lookSensitivity = 0.03;
      fpCam.rotation.y += lookX * lookSensitivity;
      fpCam.rotation.x += lookY * lookSensitivity;
      fpCam.rotation.x = Math.min(Math.max(fpCam.rotation.x, -Math.PI / 2), Math.PI / 2);

      // Buttons: shoot (7 = R2), reload (4 = L1), jump (0 = X)
      if (gp.buttons[7].pressed) shootBullet();
      if (gp.buttons[4].pressed && !reloading && ammo < maxAmmo) {
        reloadBtn.onclick();
      }
      if (gp.buttons[0].pressed && isGrounded) {
        velocityY = jumpSpeed;
        isGrounded = false;
      }
    }
  }

  // Player rotation by joystick
  if (joy.x !== 0 || joy.y !== 0) {
    const angle = Math.atan2(joy.x, joy.y);
    player.rotation.y = angle;
    const forwardMove = new BABYLON.Vector3(Math.sin(angle), 0, Math.cos(angle)).scale(playerSpeed);
    player.moveWithCollisions(forwardMove);
  }

  // Gravity & jump physics
  velocityY += gravity;
  player.position.y += velocityY;
  if (player.position.y <= 0.5) {
    player.position.y = 0.5;
    velocityY = 0;
    isGrounded = true;
  }

  // Update camera target for third person
  tpCam.target = player.position;

  // Bullets and enemies
  checkBulletCollisions();
  moveEnemies();
  applyAimAssist();
});

canvas.addEventListener("click", () => shootBullet());

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});


window.addEventListener("resize", () => {
  engine.resize();
});
