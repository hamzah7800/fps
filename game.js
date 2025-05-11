const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Camera and Controls
const camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 2, -10), scene);
camera.attachControl(canvas, true);
camera.fov = 0.7; // Default Field of View

// Light
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// Green Ground
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
ground.checkCollisions = true;

const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new BABYLON.Color3(0, 0.8, 0);
ground.material = groundMat;

// Gun Model (Box as a placeholder)
const gun = BABYLON.MeshBuilder.CreateBox("gun", { size: 0.5 }, scene);
gun.position = new BABYLON.Vector3(0, -0.5, 1); // Position it in front of the camera
gun.parent = camera; // Attach to the camera so it moves with it

// Weapon Class
class Weapon {
  constructor(name, damage, rateOfFire) {
    this.name = name;
    this.damage = damage; // Base damage
    this.rateOfFire = rateOfFire; // How fast the gun shoots (in seconds)
    this.lastShotTime = 0; // Timer to control rate of fire
  }

  shoot(currentTime) {
    if (currentTime - this.lastShotTime >= this.rateOfFire) {
      this.lastShotTime = currentTime;
      return true; // Can shoot
    }
    return false; // Cannot shoot yet
  }
}

// Create a new weapon (Example: AR with moderate damage and rate of fire)
let currentWeapon = new Weapon("Assault Rifle", 25, 0.5); // 0.5 second rate of fire

// Shoot function with headshot detection
const shoot = (currentTime) => {
  if (currentWeapon.shoot(currentTime)) {
    const ray = camera.getForwardRay();
    const hit = scene.pickWithRay(ray);
    if (hit.pickedMesh && hit.pickedMesh.name.startsWith("enemy")) {
      const enemy = hit.pickedMesh;
      const enemyTop = enemy.position.y + enemy.scaling.y / 2;

      // Headshot detection
      if (hit.pickedPoint.y >= enemyTop - 0.5) {
        enemy.health -= currentWeapon.damage * 2; // Double damage for headshots
        console.log("Headshot! Enemy Health: " + enemy.health);
      } else {
        enemy.health -= currentWeapon.damage; // Regular damage
        console.log("Hit! Enemy Health: " + enemy.health);
      }

      if (enemy.health <= 0) {
        console.log("Enemy destroyed!");
        enemy.dispose(); // Destroy enemy if health reaches 0
      }
    }
  }
};

// Enemies with Health System and Patrol/Chase Logic
const spawnEnemy = (x, z) => {
  const enemy = BABYLON.MeshBuilder.CreateBox("enemy", { size: 2 }, scene);
  enemy.position = new BABYLON.Vector3(x, 1, z);
  const mat = new BABYLON.StandardMaterial("enemyMat", scene);
  mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
  enemy.material = mat;
  enemy.health = 100; // Set initial health
  enemy.behavior = "patrol"; // Start patrolling

  // Patrol points
  enemy.patrolPoints = [
    new BABYLON.Vector3(x, 1, z),
    new BABYLON.Vector3(x + 10, 1, z)
  ];
  enemy.patrolIndex = 0;
  enemy.patrolSpeed = 0.05;
  
  enemy.update = () => {
    if (enemy.behavior === "patrol") {
      // Patrol between points
      enemy.position = BABYLON.Vector3.Lerp(enemy.position, enemy.patrolPoints[enemy.patrolIndex], enemy.patrolSpeed);
      if (BABYLON.Vector3.Distance(enemy.position, enemy.patrolPoints[enemy.patrolIndex]) < 0.1) {
        enemy.patrolIndex = (enemy.patrolIndex + 1) % 2; // Switch patrol point
      }
    } else if (enemy.behavior === "chase") {
      // Chase player
      enemy.position = BABYLON.Vector3.Lerp(enemy.position, camera.position, enemy.patrolSpeed);
    }
  };

  return enemy;
};

// Spawn enemies
let enemies = [];
enemies.push(spawnEnemy(5, 5));
enemies.push(spawnEnemy(-5, 10));
enemies.push(spawnEnemy(0, 15));

// AI Behavior: Chase player when within range
const checkEnemyBehavior = () => {
  enemies.forEach((enemy) => {
    const distance = BABYLON.Vector3.Distance(enemy.position, camera.position);
    if (distance < 15) {
      enemy.behavior = "chase"; // Start chasing if within range
    } else {
      enemy.behavior = "patrol"; // Go back to patrolling
    }
  });
};

// Joystick movement (touchscreen controls)
let moveSpeed = 0.1;
let moveDirection = new BABYLON.Vector3(0, 0, 0);
let touchStart = null;

const touchMoveHandler = (e) => {
  // Calculate touch movement
  if (touchStart) {
    let deltaX = e.changedTouches[0].pageX - touchStart.x;
    let deltaY = e.changedTouches[0].pageY - touchStart.y;
    moveDirection = new BABYLON.Vector3(deltaX * 0.1, 0, deltaY * 0.1); // Scale the movement
  }
};

canvas.addEventListener("touchstart", (e) => {
  touchStart = { x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
});

canvas.addEventListener("touchmove", touchMoveHandler);
canvas.addEventListener("touchend", () => {
  moveDirection = new BABYLON.Vector3(0, 0, 0); // Stop movement when no touch
  touchStart = null;
});

// Looking around with touchscreen
let lastTouchX = 0;
let lastTouchY = 0;

canvas.addEventListener("touchmove", (e) => {
  let deltaX = e.changedTouches[0].pageX - lastTouchX;
  let deltaY = e.changedTouches[0].pageY - lastTouchY;

  camera.rotation.y += deltaX * 0.002; // Rotate camera left/right
  camera.rotation.x -= deltaY * 0.002; // Rotate camera up/down

  lastTouchX = e.changedTouches[0].pageX;
  lastTouchY = e.changedTouches[0].pageY;
});

// ADS (Aim Down Sights)
let isADS = false;
const zoomIn = () => {
  camera.fov = 0.4; // Zoom in (Field of View)
  gun.position.z = 0.5; // Move gun closer to camera
  isADS = true;
};
const zoomOut = () => {
  camera.fov = 0.7; // Zoom out (Field of View)
  gun.position.z = 1; // Reset gun position
  isADS = false;
};

// Toggle ADS on Q
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyQ") zoomIn();
});
window.addEventListener("keyup", (e) => {
  if (e.code === "KeyQ") zoomOut();
});

// Touchscreen Shoot Button
const shootButton = document.createElement("button");
shootButton.innerText = "Shoot";
shootButton.style.position = "absolute";
shootButton.style.bottom = "20px";
shootButton.style.right = "20px";
shootButton.style.padding = "10px 20px";
shootButton.style.fontSize = "16px";
shootButton.style.backgroundColor = "#f00";
shootButton.style.color = "#fff";
shootButton.style.border = "none";
shootButton.style.borderRadius = "5px";
shootButton.style.cursor = "pointer";
document.body.appendChild(shootButton);

// Trigger shoot on button press
shootButton.addEventListener("click", () => {
  const currentTime = performance.now();
  shoot(currentTime);
});

// Update camera and movement
engine.runRenderLoop(() => {
  camera.position.addInPlace(moveDirection); // Move camera based on touchscreen joystick
  enemies.forEach(enemy => enemy.update()); // Update enemy behavior
  checkEnemyBehavior(); // Check if enemies should chase or patrol
  scene.render();
});

window.addEventListener("resize", () => engine.resize());
