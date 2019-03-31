import Stats from 'stats-js';
import GLTFLoader from 'three-gltf-loader';
import VRController from './libs/VRController';
import { promisifyLoader } from './Utils';
import WEBVR from './libs/WebVR';

import * as THREE from 'three';

import OrbitControls from "three-orbitcontrols";

export default class TestScene {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });

    const isVRSupport = 'getVRDisplays' in navigator;

    this.renderer.physicallyCorrectLights = true;
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    // this.renderer.gammaFactor = 2.2;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.toneMapping = THREE.ReinhardToneMapping;

    // this.renderer.shadowMap.enabled = true;

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const aspectRation = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspectRation, 0.1, 1000);

    if (isVRSupport) {
      this.renderer.vr.enabled = true;
      document.body.appendChild(WEBVR.createButton(this.renderer));

      this.user = new THREE.Group();
      this.user.position.set(0, 65, 0);
      this.scene.add(this.user);
      this.user.add(this.camera);

      window.addEventListener('vr controller connected', this.initVRController);
    } else {
      const controls = new OrbitControls(this.camera, this.renderer.domElement);

      this.camera.position.set(
        183.28854784443533,
        99.17413046911497,
        317.46507731208146,
      );

      controls.update();
    }

    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);

    this.scene.add(cube);

    // const light = new THREE.HemisphereLight(0x3e52b7, 0x8e3109, 0.1);
    // this.scene.add(light);

    this.loadGLTFScene();
  }

  render = () => {
    // this.animate();
    this.renderer.setAnimationLoop(() => {
      this.stats.begin();
      this.renderer.render(this.scene, this.camera);
      VRController.update();
      this.stats.end();
    });
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    this.stats.begin();
    this.renderer.render(this.scene, this.camera);
    this.stats.end();
  };

  initVRController = (e) => {
    console.log('[D] Init VR Controller');
    
    const ctrl = e.detail;
    this.scene.add(ctrl);

    ctrl.head = this.user;

    const meshColorOff = 0xDB3236;
    const meshColorOn = 0xF4C20D;
    const ctrlMaterial = new THREE.MeshStandardMaterial({
      color: meshColorOff,
    });
    const ctrlMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.05, 0.1, 6),
      ctrlMaterial,
    );
    const handleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.1, 0.03),
      ctrlMaterial,
    );

    ctrlMaterial.flatShading = true;
    ctrlMesh.rotation.x = -Math.PI / 2;
    handleMesh.position.y = -0.05;
    ctrlMesh.add(handleMesh);
    ctrl.userData.mesh = ctrlMesh;
    ctrl.add(ctrlMesh)

    ctrl.addEventListener('primary press began', (event) => {
      event.target.userData.mesh.material.color.setHex(meshColorOn);
    });

    ctrl.addEventListener('primary pressed', () => {
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      this.user.position.add(direction);
    });

    ctrl.addEventListener('primary press ended', (event) => {
      event.target.userData.mesh.material.color.setHex(meshColorOff);
    });

    ctrl.addEventListener('disconnected', () => {
      ctrl.parent.remove(ctrl);
    });
  };

  handleSceneLoad = (scene) => {
    const group = scene.scene.children[0];

    const scale = 35;
    scene.scene.scale.set(scale, scale, scale);
    scene.scene.updateMatrixWorld();

    group.children.forEach((asset) => {
      let mesh = null;
      let instances = null;

      asset.children.forEach((child) => {
        switch (child.name) {
          case 'collision': {
            break;
          }

          // case 'instances': {
          //   instances = child;
          //   break;
          // }

          case 'mesh': {
            mesh = child;

            if (instances) {
              break;
            }

            child.applyMatrix(asset.matrixWorld);

            child.castShadow = true;
            child.receiveShadow = true;

            // child.material.roughness = 0.2;
            // child.material.roughnessMap = "";
            // child.material.normalMap = "";
            // child.material.normalScale = new THREE.Vector2(2, 2);

            this.scene.add(child);
            break;
          }

          case 'light': {
            const { _color: color, _intensity: intensity } = child.geometry.attributes;

            const lightColor = new THREE.Color(...color.array);
            const lightIntensity = intensity.array[0] * 10000;
            const lightDistance = 0.0;
            const decay = 2;

            const pointLight = new THREE.PointLight(
              lightColor, lightIntensity, lightDistance, decay,
            );

            const { x, y, z } = asset.position;
            pointLight.position.set(x * scale, y * scale, z * scale);
            pointLight.castShadow = true;

            this.scene.add(pointLight);

            const sphereSize = 8;
            const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
            this.scene.add(pointLightHelper);

            break;
          }

          default:
        }
      });

      if (instances && mesh) {
        const { geometry } = instances;
        const { position, color, normal } = geometry.attributes;

        const posArray = position.array;
        const scaleArray = color.array;
        const normalArray = normal.array;

        for (let i = 0; i < position.count; i += 3) {
          const iMesh = new THREE.Mesh();

          iMesh.geometry = mesh.geometry;
          iMesh.material = mesh.material;

          iMesh.position.set(
            scale * posArray[3 * i],
            scale * posArray[3 * i + 1],
            scale * posArray[3 * i + 2],
          );
          iMesh.scale.set(
            scale * scaleArray[3 * i],
            scale * scaleArray[3 * i],
            scale * scaleArray[3 * i],
          );

          // TODO: Refactor to slightly more readable form
          iMesh.lookAt(
            new THREE.Vector3(
              iMesh.position.x + normalArray[3 * i],
              iMesh.position.y + normalArray[3 * i + 1],
              iMesh.position.z + normalArray[3 * i + 2],
            ),
          );

          iMesh.castShadow = true;

          this.scene.add(iMesh);
        }
      }
    });
  }

  handleLoadProgress = () => {
  }

  loadGLTFScene = () => {
    const gltfLoader = promisifyLoader(new GLTFLoader());
    gltfLoader.load('scene/scene.gltf')
      .then(this.handleSceneLoad, this.handleLoadProgress)
      .catch((err) => {
        throw err;
      });
  }
}
