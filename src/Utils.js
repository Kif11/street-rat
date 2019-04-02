import * as THREE from 'three';

export const DefaultCamera = () => {
  const fov = 75;
  const aspectRatio = window.innerWidth / window.innerHeight;
  const clipNear = 1;
  const clipFar = 1000;

  return new THREE.PerspectiveCamera(fov, aspectRatio, clipNear, clipFar);
};

export const MainRenderer = () => {
  const r = new THREE.WebGLRenderer({ antialias: true });

  r.physicallyCorrectLights = true;
  r.toneMapping = THREE.ReinhardToneMapping;
  r.gammaInput = true;
  r.gammaOutput = true;
  r.gammaFactor = 2.2;

  // r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;

  r.setSize(window.innerWidth, window.innerHeight);

  return r;
};
