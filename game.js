const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Hide loading screen
document.getElementById("loadingScreen").style.display = "none";

// Lighting
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
light.intensity = 0.8;

// Ground with grass texture
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
const grassMat = new BABYLON.StandardMaterial("grassMat", scene);
grassMat.diffuseTexture = new BABYLON.Texture("assets/grass.png", scene);
ground.material = grassMat;

// Player setup
const player = BABYLON.MeshBuilder.CreateBox("player", { size: 1 }, scene);
player.position.y = 0.5;
player.checkCollisions = true;

// Cameras
const fpCam = new BABYLON.FreeCamera("fpCam", new BABYLON.Vector3(0, 2, -1), scene);
fpCam.parent = player;
fpCam.attachControl(canvas, true);
scene.activeCamera = fpCam;

// Gun sprite (2D overlay)
const gunImg = document.createElement("img");
gunImg.src = "assets/gun.png";
gunImg.style.position = "absolute";
gunImg.style.bottom = "20px";
gunImg.style.right = "20px";
gunImg.style.width = "180px";
gunImg.style.opacity = "0.8";
gunImg.style.zIndex = "2";
document.body.appendChild(gunImg);

// Player properties
let playerSpeed = 0.1;
let jumpSpeed = 0.2;
let velocityY = 0;
let gravity = -0.01;
let isGrounded = true;
let ammo = 10;
let maxAmmo = 10;
let reloading = false;

// Movement input
let keys = {};
let joy = { x: 0, y: 0 };

window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Joystick setup
const nipple = nipplejs.create({
    zone: document.getElementById("joystickContainer"),
    mode: 'static',
    position: { left: '75px', bottom: '75px' },
    color: 'white'
});
nipple.on('move', (_, data) => { joy = data.vector; });
nipple.on('end', () => { joy = { x: 0, y: 0 }; });

// UI buttons
const shootBtn = document.createElement("button");
shootBtn.textContent = "Shoot";
shootBtn.style.position = "absolute";
shootBtn.style.bottom = "20px";
shootBtn.style.left = "50%";
shootBtn.style.transform = "translateX(-50%)";
shootBtn.style.padding = "12px 20px";
shootBtn.style.fontSize = "18px";
document.body.appendChild(shootBtn);

const reloadBtn = document.createElement("button");
reloadBtn.textContent = "Reload";
reloadBtn.style.position = "absolute";
reloadBtn.style.bottom = "60px";
reloadBtn.style.left = "50%";
reloadBtn.style.transform = "translateX(-50%)";
reloadBtn.style.padding = "12px 20px";
reloadBtn.style.fontSize = "18px";
document.body.appendChild(reloadBtn);

const jumpBtn = document.createElement("button");
jumpBtn.textContent = "Jump";
jumpBtn.style.position = "absolute";
jumpBtn.style.bottom = "100px";
jumpBtn.style.left = "50%";
jumpBtn.style.transform = "translateX(-50%)";
jumpBtn.style.padding = "12px 20px";
jumpBtn.style.fontSize = "18px";
document.body.appendChild(jumpBtn);

// Ammo display
const ammoDisplay = document.createElement("div");
ammoDisplay.style.position = "absolute";
ammoDisplay.style.bottom = "130px";
ammoDisplay.style.left = "50%";
ammoDisplay.style.transform = "translateX(-50%)";
ammoDisplay.style.color = "white";
ammoDisplay.style.fontSize = "20px";
ammoDisplay.style.fontFamily = "monospace";
document.body.appendChild(ammoDisplay);

function updateAmmoDisplay() {
    ammoDisplay.textContent = reloading ? "Reloading..." : `Ammo: ${ammo} / ${maxAmmo}`;
}
updateAmmoDisplay();

// Shooting logic
shootBtn.onclick = () => {
    if (ammo > 0 && !reloading) {
        ammo--;
        shootBullet();
        updateAmmoDisplay();
    } else if (ammo <= 0) {
        console.log("Out of ammo! Reload first.");
    }
};

// Reloading logic
reloadBtn.onclick = () => {
    if (!reloading && ammo < maxAmmo) {
        reloading = true;
        updateAmmoDisplay();
        setTimeout(() => {
            ammo = maxAmmo;
            reloading = false;
            updateAmmoDisplay();
        }, 1500); // 1.5 seconds reload time
    }
};

// Jumping logic
jumpBtn.onclick = () => {
    if (isGrounded) {
        velocityY = jumpSpeed;
        isGrounded = false;
    }
};

// Bullets array
let bullets = [];

// Create bullet and shoot forward
function shootBullet() {
    const bullet = BABYLON.MeshBuilder.CreateSphere("bullet", { diameter: 0.1 }, scene);
    bullet.position = player.position.add(fpCam.getForwardRay().direction.scale(1.5));
    bullet.direction = fpCam.getForwardRay().direction.clone();
    bullet.speed = 0.5;
    bullet.lifetime = 100; // frames
    bullet.isFromPlayer = true;
    bullets.push(bullet);
}

// Update bullet positions & check collisions
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.addInPlace(bullet.direction.scale(bullet.speed));
        bullet.lifetime--;

        // Check bullet-enemy collisions
        for (let enemy of enemies) {
            if (enemy.isAlive && bullet.intersectsMesh(enemy, false)) {
                enemy.health -= 25;
                bullet.dispose();
                bullets.splice(i, 1);
                if (enemy.health <= 0) {
                    enemy.isAlive = false;
                    enemy.dispose();
                }
                break;
            }
        }

        // Remove expired bullets
        if (bullet.lifetime <= 0) {
            bullet.dispose();
            bullets.splice(i, 1);
        }
    }
}

// Movement and physics update
function updatePlayer() {
    // Combine keyboard and joystick input for movement vector
    let inputX = 0, inputZ = 0;

    // Keyboard
    if (keys['w'] || keys['arrowup']) inputZ += 1;
    if (keys['s'] || keys['arrowdown']) inputZ -= 1;
    if (keys['a'] || keys['arrowleft']) inputX -= 1;
    if (keys['d'] || keys['arrowright']) inputX += 1;

    // Joystick (overrides keyboard if active)
    if (joy.x !== 0 || joy.y !== 0) {
        inputX = joy.x;
        inputZ = joy.y;
    }

    // Normalize input
    let length = Math.sqrt(inputX * inputX + inputZ * inputZ);
    if (length > 1) {
        inputX /= length;
        inputZ /= length;
    }

    // Move player forward relative to camera
    let forward = fpCam.getForwardRay().direction;
    forward.y = 0; // prevent vertical movement
    forward.normalize();

    let right = BABYLON.Vector3.Cross(forward, BABYLON.Axis.Y).normalize();

    let move = forward.scale(inputZ * playerSpeed).add(right.scale(inputX * playerSpeed));

    player.moveWithCollisions(move);

    // Gravity & Jump
    velocityY += gravity;
    player.position.y += velocityY;

    // Ground collision check
    if (player.position.y <= 0.5) {
        player.position.y = 0.5;
        isGrounded = true;
        velocityY = 0;
    }
}

// AI enemies array
let enemies = [];

// Create simple AI enemy
function createEnemy(pos) {
    const enemy = BABYLON.MeshBuilder.CreateBox("enemy", { size: 1 }, scene);
    enemy.position = pos.clone();
    enemy.material = new BABYLON.StandardMaterial("enemyMat", scene);
    enemy.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
    enemy.speed = 0.05;
    enemy.health = 100;
    enemy.isAlive = true;
    enemies.push(enemy);
}

// Basic AI update: move toward player if close enough, else wander
function updateEnemies() {
    enemies.forEach(enemy => {
        if (!enemy.isAlive) return;

        let directionToPlayer = player.position.subtract(enemy.position);
        let dist = directionToPlayer.length();

        if (dist < 10) {
            // Move toward player
            directionToPlayer.normalize();
            enemy.moveWithCollisions(directionToPlayer.scale(enemy.speed));
            // Optional: enemy attack logic here
        } else {
            // Wander randomly
            if (!enemy.wanderTarget || enemy.position.subtract(enemy.wanderTarget).length() < 0.5) {
                enemy.wanderTarget = new BABYLON.Vector3(
                    (Math.random() - 0.5) * 40,
                    0.5,
                    (Math.random() - 0.5) * 40
                );
            }
            let wanderDir = enemy.wanderTarget.subtract(enemy.position).normalize();
            enemy.moveWithCollisions(wanderDir.scale(enemy.speed * 0.5));
        }
    });
}

// Create some enemies
createEnemy(new BABYLON.Vector3(5, 0.5, 5));
createEnemy(new BABYLON.Vector3(-5, 0.5, -5));
createEnemy(new BABYLON.Vector3(0, 0.5, 8));

// Main game loop
engine.runRenderLoop(() => {
    updatePlayer();
    updateEnemies();
    updateBullets();

    scene.render();
});

// Resize
window.addEventListener("resize", () => engine.resize());
