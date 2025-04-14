class Weapon {
    constructor(camera) {
        this.camera = camera;
        this.muzzleFlash = this.createMuzzleFlash();
    }

    createMuzzleFlash() {
        const flash = BABYLON.MeshBuilder.CreateSphere("flash", {diameter: 0.2}, this.camera.getScene());
        flash.material = new BABYLON.StandardMaterial("flashMat", this.camera.getScene());
        flash.material.emissiveColor = new BABYLON.Color3(1, 0.8, 0.3);
        flash.parent = this.camera;
        flash.position = new BABYLON.Vector3(0, 0, 2);
        flash.isVisible = false;
        return flash;
    }

    fire() {
        this.muzzleFlash.isVisible = true;
        setTimeout(() => this.muzzleFlash.isVisible = false, 100);

        const ray = this.camera.getForwardRay(500);
        const hit = this.camera.getScene().pickWithRay(ray);

        if (hit.pickedMesh && hit.pickedMesh.metadata?.reference) {
            hit.pickedMesh.metadata.reference.takeDamage(20);
            console.log("Hit enemy! Remaining health:", hit.pickedMesh.metadata.health);
        }
    }
}
