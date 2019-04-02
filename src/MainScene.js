import * as THREE from 'three';
import OrbitControls from 'three-orbitcontrols';
import Stats from 'stats-js';
import AlleyEnvironment from './AlleyEnvironment';
import HeroMoverNN from './HeroMover';
import RatRig from './RatRig';
import SparseWorldGrid from './SparseWorldGrid';
import Log from './Logger';
import { ORBIT_CONTROLS, DEBUG } from './Env';
import { DefaultCamera, MainRenderer } from './Utils';

class MainScene {
  init() {
    this.renderer = MainRenderer();

    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.mainCam = DefaultCamera();

    if (DEBUG) {
      this.stats = Stats();
      document.body.appendChild(this.stats.dom);
    }

    if (ORBIT_CONTROLS) {
      const controls = new OrbitControls(
        this.mainCam,
        this.renderer.domElement,
      );

      this.mainCam.position.set(
        183.28854784443533,
        99.17413046911497,
        317.46507731208146,
      );

      controls.update();
    } else {
      this.sideCamera = DefaultCamera();
      this.mainCam.add(this.sideCamera);
      this.scene.add(this.mainCam);
    }

    const worldGrid = new SparseWorldGrid(20);

    const alleyEnv = new AlleyEnvironment(this.scene, worldGrid);
    const ratRig = new RatRig(this.scene);

    const loadPromises = [alleyEnv.load(), ratRig.load()];

    Promise.all(loadPromises).then(([alleyModel, ratModel]) => {
      Log.debug('Alley is loaded', alleyModel);
      Log.debug('Rat is loaded', ratModel);

      this.heroMover = new HeroMoverNN(
        ratModel,
        ratRig.getIks(),
        ratRig.getBonePoints(),
        worldGrid,
        this.mainCam,
        this.scene,
      );

      this._render();
    });
  }

  _render() {
    this.renderer.setAnimationLoop(() => {
      if (DEBUG) {
        this.stats.begin();
      }

      this.renderer.render(this.scene, this.mainCam);
      if (!ORBIT_CONTROLS) {
        this.heroMover.update();
      }

      if (DEBUG) {
        this.stats.end();
      }
    });
  }
}

export default MainScene;
