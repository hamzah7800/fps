
// Joystick setup using nipple.js (include library in index.html)
let joystickManager;
window.addEventListener("load", () => {
    const joystickZone = document.createElement("div");
    joystickZone.style.position = "absolute";
    joystickZone.style.left = "0";
    joystickZone.style.bottom = "0";
    joystickZone.style.width = "200px";
    joystickZone.style.height = "200px";
    joystickZone.id = "joystick";
    document.body.appendChild(joystickZone);

    joystickManager = nipplejs.create({
        zone: document.getElementById('joystick'),
        mode: 'static',
        position: { left: '100px', bottom: '100px' },
        color: 'white'
    });

    joystickManager.on("move", (evt, data) => {
        if (!data.direction) return;
        const dir = data.direction.angle;
        if (dir === "up") moveForward = true;
        if (dir === "down") moveBackward = true;
        if (dir === "left") moveLeft = true;
        if (dir === "right") moveRight = true;
    });

    joystickManager.on("end", () => {
        moveForward = moveBackward = moveLeft = moveRight = false;
    });
});

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;

function updateCameraMovement(camera) {
    if (moveForward) camera.position.z += 0.2;
    if (moveBackward) camera.position.z -= 0.2;
    if (moveLeft) camera.position.x -= 0.2;
    if (moveRight) camera.position.x += 0.2;
}
