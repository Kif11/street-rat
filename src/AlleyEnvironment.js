import * as THREE from 'three';
import ParallaxCorrectPhysicalMaterial from './shaders/ParallaxCorrectPhysicalMaterial';

import { GLTFLoader } from './Loaders';

export default class AlleyEnvironment {
  constructor(scene, worldGrid) {
    this.scene = scene;
    this.worldGrid = worldGrid;
    this.modelPath = 'assets/scene/scene.gltf';

    // this.cubeCamera = new THREE.CubeCamera(1, 1000, 128);
    // this.cubeCamera.renderTarget.texture.generateMipmaps = true;
    // this.cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;
    // // this.cubeCamera.renderTarget.texture.magFilter = THREE.LinearFilter;
    // this.cubeCamera.renderTarget.texture.mapping = THREE.CubeReflectionMapping;
    // this.scene.add(this.cubeCamera);
  }

  load() {
    return GLTFLoader()
      .load(this.modelPath)
      .then(this._handleModelLoad, this.handleLoadProgress)
      .catch((err) => {
        throw err;
      });
  }

  _handleModelLoad = model => new Promise((resolve, reject) => {
    try {
      resolve(this._processModel(model));
    } catch (err) {
      reject(err);
    }
  });

  _processModel(model) {
    const group = model.scene.children[0];

    const scale = 40;
    model.scene.scale.set(scale, scale, scale);
    model.scene.updateMatrixWorld();

    group.children.forEach((asset) => {
      let mesh = null;
      let instances = null;
      let collision = null;
      asset.children.forEach((child) => {
        switch (child.name) {
          case 'collision': {
            collision = child;
            break;
          }

          case 'mesh': {
            mesh = child;
            break;
          }

          case 'light': {
            const {
              _color: color,
              _intensity: intensity,
            } = child.geometry.attributes;

            const lightColor = new THREE.Color(...color.array);
            const lightIntensity = intensity.array[0] * 20000;
            const lightDistance = 0.0;
            const decay = 2;

            const pointLight = new THREE.PointLight(
              lightColor,
              lightIntensity,
              lightDistance,
              decay,
            );

            const { x, y, z } = asset.position;
            pointLight.position.set(x * scale, y * scale, z * scale);
            pointLight.castShadow = true;

            this.scene.add(pointLight);

            break;
          }

          case 'instances': {
            instances = child;
            break;
          }
          default:
        }
      });

      if (instances && mesh) {
        const { position, color, normal } = instances.geometry.attributes;

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
          iMesh.receiveShadow = true;
          this.scene.add(iMesh);

          const iMeshCollision = new THREE.Mesh();
          iMeshCollision.geometry = collision.geometry;
          iMeshCollision.material.visible = false;
          iMeshCollision.position.copy(iMesh.position);
          iMeshCollision.scale.copy(iMesh.scale);
          iMeshCollision.quaternion.copy(iMesh.quaternion);
          iMeshCollision.updateMatrixWorld();
          this.scene.add(iMeshCollision);
          this.worldGrid.fillGridForBufferMesh(iMeshCollision, this.scene);
        }
      } else if (mesh && collision) {
        mesh.applyMatrix(asset.matrixWorld);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.setMaterial(asset.name, mesh);

        collision.applyMatrix(asset.matrixWorld);
        collision.material.visible = false;
        this.scene.add(collision);
        this.worldGrid.fillGridForBufferMesh(collision, this.scene);
      }
    });

    return model;
  }

  handleLoadProgress = () => {};

  setMaterial = (name, mesh) => {
    switch (name) {
      case 'road_01': {
        mesh.geometry.computeBoundingBox();
        // mesh.material.envMap = this.cubeCamera.renderTarget.texture;
        mesh.material.roughness = 0.0;
        // this.cubeCamera.position.set(59, 0, 0);
        mesh.material.onBeforeCompile = this.setBoxProjectedMaterial;
        mesh.material.defines.PARALLAX_CORRECT = '';

        // this.envMapController = new EnvMapController(
        //   [mesh], this.cubeCamera, this.renderer, this.scene,
        // );
        // this.envMapController.update();
        break;
      }
      default:
        break;
    }
  };

  setBoxProjectedMaterial = (shader) => {
    shader.uniforms.cubeMapSize = {
      type: 'v3',
      value: new THREE.Vector3(250, 900, 830),
    };
    shader.uniforms.cubeMapPos = {
      type: 'v3',
      value: new THREE.Vector3(59, 0, 0),
    };
    shader.uniforms.flipEnvMap = { value: true };
    shader.vertexShader = ParallaxCorrectPhysicalMaterial.vertexShader;
    shader.fragmentShader = ParallaxCorrectPhysicalMaterial.fragmentShader;
  };

  update = () => {
    // if (this.envMapController) {
    //   // this.envMapController.update()
    // }
  };
}
