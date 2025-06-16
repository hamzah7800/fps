import * as BABYLON from 'https://cdn.babylonjs.com/babylon.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.createElement('canvas');
  canvas.id = 'renderCanvas';
  document.body.appendChild(canvas);

  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);

  const camera = new BABYLON.UniversalCamera('camera1', new BABYLON.Vector3(0, 2, -10), scene);
  camera.setTarget(BABYLON.Vector3.Zero());
  camera.attachControl(canvas, true);

  const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const ground = BABYLON.MeshBuilder.CreateGround('ground1', {width: 20, height: 20}, scene);

  const box = BABYLON.MeshBuilder.CreateBox('box1', {size: 2}, scene);
  box.position.y = 1;

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
});
