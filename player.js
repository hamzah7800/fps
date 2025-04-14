class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.health = 100;
        this.weapon = new Weapon(camera);
        this.initHealthUI();
        this.isCrouched = false;
        this.initControls();
    }

    initHealthUI() {
        this.healthBar = document.getElementById("playerHealthBar");
    }

    takeDamage(amount) {
        this.health -= amount;
        this.updateHealthUI();
        if (this.health <= 0) {
            alert("You died!");
            location.reload();
        }
    }

    updateHealthUI() {
        this.healthBar.style.width = this.health + "%";
    }

    shoot() {
        this.weapon.fire();
    }

    reload() {
        this.weapon.reload();
    }

    toggleCrouch() {
        if (this.isCrouched) {
            this.camera.position.y += 0.5;
        } else {
            this.camera.position.y -= 0.5;
        }
        this.isCrouched = !this.isCrouched;
    }

    move(direction) {
        const speed = this.isCrouched ? 0.05 : 0.1; // Crouched movement is slower
        const movement = new BABYLON.Vector3(0, 0, 0);

        if (direction === "forward") movement.z += speed;
        if (direction === "backward") movement.z -= speed;
        if (direction === "left") movement.x -= speed;
        if (direction === "right") movement.x += speed;

        this.camera.position.addInPlace(movement);
    }

    initControls() {
        window.addEventListener("keydown", (event) => {
            switch (event.key.toLowerCase()) {
                case "w": this.move("forward"); break;
                case "s": this.move("backward"); break;
                case "a": this.move("left"); break;
                case "d": this.move("right"); break;
                case "enter": this.shoot(); break;
                case "r": this.reload(); break;
                case "shift": this.toggleCrouch(); break;
            }
        });
    }
}
