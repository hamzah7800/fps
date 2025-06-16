const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const loadScreen = document.getElementById("loadingScreen");
const settingsIcon = document.getElementById("settingsIcon");
const settingsPanel = document.getElementById("settingsPanel");
const toggleView = document.getElementById("toggleView");
const resScale = document.getElementById("resolutionScale");
const sensSlider = document.getElementById("sensitivity");
const joyDiv = document.getElementById("joystickContainer");

let playerSpeed=0.1,sensitivity=1, firstPerson=true, moveVec=new BABYLON.Vector3(),joy={x:0,y:0};

const scene = new BABYLON.Scene(engine), light = new BABYLON.HemisphericLight("h",new BABYLON.Vector3(0,1,0), scene);
const ground = BABYLON.MeshBuilder.CreateGround("g",{width:50,height:50}, scene);
const player = BABYLON.MeshBuilder.CreateBox("p",{size:1},scene); player.position.y=0.5;

const fpCam = new BABYLON.FreeCamera("fp",new BABYLON.Vector3(0,2,-1),scene);
fpCam.parent=player; fpCam.attachControl(canvas,true);
const tpCam = new BABYLON.ArcRotateCamera("tp",Math.PI/2,Math.PI/4,6,player.position,scene);
tpCam.attachControl(canvas,true);
let activeCam=fpCam;scene.activeCamera=activeCam;

const updateMov=()=>{
  const fwd = scene.activeCamera.getForwardRay().direction.clone().normalize().scale(joy.y*playerSpeed),
        rt = BABYLON.Vector3.Cross(fwd.normalize(),BABYLON.Axis.Y).scale(joy.x*playerSpeed);
  moveVec.copyFrom(fwd.add(rt));
};
const joyObj = nipplejs.create({zone:joyDiv,mode:'static',position:{left:'75px',bottom:'75px'},color:'white'});
joyObj.on('move',(_,d)=>(joy=d.vector,updateMov()));
joyObj.on('end',()=>(joy={x:0,y:0},updateMov()));

let keys={};
window.addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);
window.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
engine.runRenderLoop(()=>{
  if(keys['w']||keys['arrowup'])joy.y=1;
  if(keys['s']||keys['arrowdown'])joy.y=-1;
  if(keys['a']||keys['arrowleft'])joy.x=-1;
  if(keys['d']||keys['arrowright'])joy.x=1;
  if(!keys['w']&&!keys['a']&&!keys['s']&&!keys['d'])joy={x:0,y:0};
  updateMov();
  player.moveWithCollisions(moveVec);
  scene.render();
});

window.addEventListener("resize",()=>engine.resize());

settingsIcon.onclick = ()=>settingsPanel.style.display = settingsPanel.style.display==='block'?'none':'block';
toggleView.onchange = ()=>{ firstPerson=toggleView.checked; scene.activeCamera.detachControl(); activeCam = firstPerson?fpCam:tpCam; scene.activeCamera=activeCam; activeCam.attachControl(canvas,true); };
resScale.oninput = ()=>engine.setHardwareScalingLevel(1/parseFloat(resScale.value));
sensSlider.oninput = ()=>sensitivity=parseFloat(sensSlider.value);

loadScreen.style.display='none';
