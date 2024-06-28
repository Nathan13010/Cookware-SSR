import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as dat from 'lil-gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass.js';
import { SSRPass } from 'three/examples/jsm/postprocessing/SSRPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import { ACESFilmicToneMappingShader } from 'three/examples/jsm/shaders/ACESFilmicToneMappingShader.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';




// Base
const gui = new dat.GUI();
gui.hide();
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFFFFFF);

// Loaders
const rgbeLoader = new RGBELoader();
rgbeLoader.load("/env-metal-1.hdr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  //   scene.background = texture
});

// Models
const selects = [];
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
dracoLoader.setDecoderConfig({ type: 'js' });
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.load("/pot.glb", (gltf) => {
  const model = gltf.scene;
  model.scale.set(0.1, 0.1, 0.1);
  model.position.set(0, 0, 0);
  model.traverse((child) => {
    if (child.isMesh) {
      // child.geometry.computeVertexNormals();
      child.material.needsUpdate = true;
      selects.push(child);
    }
  });
  scene.add(model);
  updateAllMaterials();
}, undefined, (error) => {
  console.error(error);
});



// // Lights
// const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
// directionalLight.castShadow = true;
// directionalLight.shadow.mapSize.set(1024, 1024);
// directionalLight.shadow.camera.far = 15;
// directionalLight.shadow.normalBias = 0.05;
// directionalLight.position.set(0.25, 3, -2.25);
// scene.add(directionalLight);

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  effectComposer.setSize(sizes.width, sizes.height);
  effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Camera
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 15);
camera.position.set(1, 0.59, 0);
const targetPosition = new THREE.Vector3(0, 0.15, 0);
camera.lookAt(targetPosition);
scene.add(camera);



// //////////////////////////////////////////////////
// //// ON MOUSE MOVE TO GET CAMERA POSITION
// document.addEventListener('mousemove', (event) => {
//   event.preventDefault()

//   console.log(camera.position)

// }, false)

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0
controls.maxDistance = 2
controls.enableRotate = true
controls.enableZoom = true
controls.maxPolarAngle = Math.PI / 2.5

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Post processing
const renderTarget = new THREE.WebGLRenderTarget(800, 600, { samples: 2 });
const effectComposer = new EffectComposer(renderer, renderTarget);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
effectComposer.setSize(sizes.width, sizes.height);

// Render pass
const renderPass = new RenderPass(scene, camera);
effectComposer.addPass(renderPass);

// SSR pass
const ssrPass = new SSRPass({ scene, camera, width: sizes.width, height: sizes.height });
ssrPass.thickness = 0.001;
ssrPass.infiniteThick = false;

ssrPass.maxDistance = 0.1;
ssrPass.opacity = 1;
ssrPass.enabled = true;
effectComposer.addPass(ssrPass);

// GTAO pass
const gtaoPass = new GTAOPass(scene, camera, sizes.width, sizes.height);
const aoParameters = {
  radius: 0.018,
  distanceExponent: 1,
  thickness: 5,
  scale: 2,
  samples: 16,
  distanceFallOff: 1.,
  screenSpaceRadius: false,
};
const pdParameters = {
  lumaPhi: 5.,
  depthPhi: 2.,
  normalPhi: 3.,
  radius: 4.,
  radiusExponent: 1.,
  rings: 2.,
  samples: 16,
};
gtaoPass.updateGtaoMaterial(aoParameters);
gtaoPass.updatePdMaterial(pdParameters);
gtaoPass.enabled = true
effectComposer.addPass(gtaoPass);



// Dot screen pass
const dotScreenPass = new DotScreenPass();
dotScreenPass.enabled = false;
effectComposer.addPass(dotScreenPass);

// Glitch pass
const glitchPass = new GlitchPass();
glitchPass.goWild = false;
glitchPass.enabled = false;
effectComposer.addPass(glitchPass);

// RGB Shift pass
const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.enabled = false;
effectComposer.addPass(rgbShiftPass);

// RGB Shift pass
const ACESFilmicToneMapping = new ShaderPass(ACESFilmicToneMappingShader);
ACESFilmicToneMapping.enabled = true;
effectComposer.addPass(ACESFilmicToneMapping);


// Gamma correction pass
const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
effectComposer.addPass(gammaCorrectionPass);

// Antialias pass
if (renderer.getPixelRatio() === 1 && !renderer.capabilities.isWebGL2) {
  const smaaPass = new SMAAPass();
  effectComposer.addPass(smaaPass);
}

// GUI
const folder = gui.addFolder('SSR VALUES');
folder.add(ssrPass, 'thickness').min(0).max(0.1).step(0.0001);
folder.add(ssrPass, 'opacity').min(0).max(1).step(0.1);
folder.add(ssrPass, 'infiniteThick');
folder.add(ssrPass, 'bouncing');
folder.add(ssrPass, 'maxDistance').min(0).max(.5).step(.001)
folder.add(ssrPass, 'blur');

const folder2 = gui.addFolder('GTAO VALUES');
folder2.add(gtaoPass, 'blendIntensity').min(0).max(1).step(0.01);
folder2.add(aoParameters, 'radius').min(0.01).max(1).step(0.01).onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
folder2.add(aoParameters, 'distanceExponent').min(1).max(4).step(0.01).onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
folder2.add(aoParameters, 'thickness').min(0.01).max(20).step(0.01).onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
folder2.add(aoParameters, 'distanceFallOff').min(0).max(1).step(0.01).onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
folder2.add(aoParameters, 'scale').min(1).max(10.0).step(0.01).onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
folder2.add(aoParameters, 'samples').min(2).max(32).step(1).onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
folder2.add(aoParameters, 'screenSpaceRadius').onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
folder2.add(pdParameters, 'lumaPhi').min(0).max(20).step(0.01).onChange(() => gtaoPass.updatePdMaterial(pdParameters));
folder2.add(pdParameters, 'depthPhi').min(0.01).max(20).step(0.01).onChange(() => gtaoPass.updatePdMaterial(pdParameters));
folder2.add(pdParameters, 'normalPhi').min(0.01).max(20).step(0.01).onChange(() => gtaoPass.updatePdMaterial(pdParameters));
folder2.add(pdParameters, 'radius').min(0).max(32).step(1).onChange(() => gtaoPass.updatePdMaterial(pdParameters));
folder2.add(pdParameters, 'radiusExponent').min(0.1).max(4.).step(0.1).onChange(() => gtaoPass.updatePdMaterial(pdParameters));
folder2.add(pdParameters, 'rings').min(1).max(16).step(0.125).onChange(() => gtaoPass.updatePdMaterial(pdParameters));
folder2.add(pdParameters, 'samples').min(2).max(32).step(1).onChange(() => gtaoPass.updatePdMaterial(pdParameters));


const adaptivePixelRatio = () => {
  const basePixelRatio = window.devicePixelRatio;
  const lowPixelRatio = 0.7;
  const delayBeforeRestore = 2000; // 1 second in milliseconds

  let restoreTimeout = null;

  const setPixelRatio = (ratio) => {
    renderer.setPixelRatio(ratio);
    effectComposer.setPixelRatio(ratio);
  };

  const handleStart = () => {
    clearTimeout(restoreTimeout); // Clear any existing timeout
    setPixelRatio(basePixelRatio * lowPixelRatio);
  };

  const handleEnd = () => {
    clearTimeout(restoreTimeout); // Clear any existing timeout
    restoreTimeout = setTimeout(() => {
      setPixelRatio(basePixelRatio);
    }, delayBeforeRestore);
  };

  controls.addEventListener('start', handleStart);
  controls.addEventListener('end', handleEnd);

  return () => {
    controls.removeEventListener('start', handleStart);
    controls.removeEventListener('end', handleEnd);
    clearTimeout(restoreTimeout); // Clear timeout when removing the event listeners
  };
};

adaptivePixelRatio();


// Animate
const clock = new THREE.Clock();
const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  controls.update();
  camera.lookAt(targetPosition);
  effectComposer.render();
  window.requestAnimationFrame(tick);
};

tick();

// Function to update all materials
const updateAllMaterials = () => {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.material.envMapIntensity = 3.5;
      child.material.needsUpdate = true;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
};
