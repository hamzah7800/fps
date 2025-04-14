class Enemy {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position;
        this.health = 100;
        this.attackCooldown = 0;
        this.mesh = this.createEnemyMesh();
        this.initAI();
    }

    createEnemyMesh() {
        const enemy = BABYLON.MeshBuilder.CreateBox("enemy", {height: 1.8, width: 0.8, depth: 0.5}, this.scene);
        enemy.position = this.position;
        enemy.material = new BABYLON.StandardMaterial("enemyMat", this.scene);
        enemy.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
        enemy.metadata = { health: this.health, reference: this };
        return enemy;
    }

    takeDamage(amount) {
        this.health -= amount;
        this.mesh.metadata.health = this.health;
        if (this.health <= 0 && !this.mesh.isDisposed()) {
            this.mesh.dispose();
            console.log("Enemy defeated!");
        }
    }

    initAI() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.mesh.isDisposed()) {
                const direction = scene.activeCamera.position.subtract(this.mesh.position).normalize();
                this.mesh.lookAt(scene.activeCamera.position);

                const distance = BABYLON.Vector3.Distance(scene.activeCamera.position, this.mesh.position);
                if (distance > 5) {
                    this.mesh.moveWithCollisions(direction.scale(0.02));
                } else if (this.attackCooldown <= 0) {
                    player.takeDamage(10);
                    this.attackCooldown = 60;
                } else {
                    this.attackCooldown--;
                }
            }
        });
    }
}
