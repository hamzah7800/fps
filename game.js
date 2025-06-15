import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/PointerLockControls.js';

(() => {
  // Scene setup
  const container = document.getElementById('game-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 5);

  const renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Lighting
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(100, 100);
  const floorMaterial = new THREE.MeshStandardMaterial({color: 0x555555});
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Player controls
  const controls = new PointerLockControls(camera, renderer.domElement);
  container.addEventListener('click', () => {
    controls.lock();
  });

  let moveForward = false;
  let moveBackward = false;
  let moveLeft = false;
  let moveRight = false;
  let velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();

  // Movement speed and timing
  const speed = 5.0;
  const clock = new THREE.Clock();

  document.addEventListener('keydown', (event) => {
    switch(event.code) {
      case 'KeyW': moveForward = true; break;
      case 'KeyS': moveBackward = true; break;
      case 'KeyA': moveLeft = true; break;
      case 'KeyD': moveRight = true; break;
    }
  });
  document.addEventListener('keyup', (event) => {
    switch(event.code) {
      case 'KeyW': moveForward = false; break;
      case 'KeyS': moveBackward = false; break;
      case 'KeyA': moveLeft = false; break;
      case 'KeyD': moveRight = false; break;
    }
  });

  // Joystick setup (nipple.js)
  let joystickForward = 0, joystickRight = 0;
  const joystickZone = document.createElement('div');
  joystickZone.style.position = 'absolute';
  joystickZone.style.bottom = '20px';
  joystickZone.style.left = '20px';
  joystickZone.style.width = '150px';
  joystickZone.style.height = '150px';
  joystickZone.style.zIndex = '100';
  container.appendChild(joystickZone);

  const joystick = nipplejs.create({
    zone: joystickZone,
    mode: 'static',
    position: {left: '75px', bottom: '75px'},
    color: 'white',
  });

  joystick.on('move', (evt, data) => {
    const rad = data.angle.radian;
    const dist = data.distance / 75; // normalized [0-1]
    joystickForward = Math.cos(rad) * dist;
    joystickRight = Math.sin(rad) * dist;
  });

  joystick.on('end', () => {
    joystickForward = 0;
    joystickRight = 0;
  });

  // Gun system
  class Gun {
    constructor(name, damage, fireRate, ammo) {
      this.name = name;
      this.damage = damage;
      this.fireRate = fireRate;
      this.ammo = ammo;
      this.canShoot = true;
      this.lastShotTime = 0;
    }
    tryShoot(time) {
      if(this.canShoot && this.ammo > 0 && (time - this.lastShotTime) > this.fireRate) {
        this.ammo--;
        this.lastShotTime = time;
        return true;
      }
      return false;
    }
    reload() {
      this.ammo = 30;
    }
  }

  const guns = [
    new Gun('Assault Rifle', 10, 300, 30),
    new Gun('Pistol', 5, 500, 15),
    new Gun('Shotgun', 20, 1000, 8),
  ];
  let currentGunIndex = 0;
  let currentGun = guns[currentGunIndex];

  // UI: gun locker/loadout panel
  const gunLocker = document.createElement('div');
  gunLocker.id = 'gun-locker';
  container.appendChild(gunLocker);

  function updateGunLockerUI() {
    gunLocker.innerHTML = '<b>Gun Locker</b><br/>';
    guns.forEach((gun, idx) => {
      const btn = document.createElement('button');
      btn.textContent = `${gun.name} [${gun.ammo} ammo]`;
      if(idx === currentGunIndex) btn.classList.add('selected');
      btn.onclick = () => {
        currentGunIndex = idx;
        currentGun = guns[currentGunIndex];
        updateGunLockerUI();
      };
      gunLocker.appendChild(btn);
    });
  }
  updateGunLockerUI();

  // Shooting input
  window.addEventListener('mousedown', () => {
    shooting = true;
  });
  window.addEventListener('mouseup', () => {
    shooting = false;
  });

  let shooting = false;

  // Simple bullets array
  const bullets = [];

  function shootBullet() {
    const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(camera.position);
    bullet.quaternion.copy(camera.quaternion);
    bullet.userData = {velocity: new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(20)};
    scene.add(bullet);
    bullets.push(bullet);
  }

  // Animate loop
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.elapsedTime * 1000;

    if(controls.isLocked === true) {
      // Movement vector
      direction.z = Number(moveForward) - Number(moveBackward) + joystickForward;
      direction.x = Number(moveRight) - Number(moveLeft) + joystickRight;
      direction.normalize();

      velocity.x -= velocity.x * 10.0 * delta;
      velocity.z -= velocity.z * 10.0 * delta;

      velocity.x += direction.x * speed * delta;
      velocity.z += direction.z * speed * delta;

      controls.moveRight(velocity.x * delta);
      controls.moveForward(velocity.z * delta);

      // Shooting
      if(shooting) {
        if(currentGun.tryShoot(time)) {
          shootBullet();
          updateGunLockerUI();
        }
      }
    }

    // Update bullets
    for(let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.position.addScaledVector(b.userData.velocity, delta);
      // Remove bullet if too far
      if(b.position.length() > 100) {
        scene.remove(b);
        bullets.splice(i,1);
      }
    }

    renderer.render(scene, camera);
  }

  animate();

  // Responsive
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

})();
