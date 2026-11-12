import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  constructor() {
    this.gltf = new GLTFLoader();
  }

  async loadGLB(url) {
    try {
      const gltf = await this.gltf.loadAsync(url);
      return gltf.scene;
    } catch (e) {
      console.warn("Asset load failed:", url, e);
      return null;
    }
  }

  static proceduralCar() {
    const root = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color:0xc9d1d9, metalness:.75, roughness:.3 });
    const black = new THREE.MeshStandardMaterial({ color:0x090b0d, roughness:.7 });
    const red = new THREE.MeshStandardMaterial({ color:0x9f1729, metalness:.35, roughness:.35 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5,.22,4.2), bodyMat);
    chassis.position.y = .45;
    root.add(chassis);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(.65,1.8,12), bodyMat);
    nose.rotation.x = Math.PI/2;
    nose.position.set(0,.48,-2.3);
    root.add(nose);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(.75,.32,1.15), black);
    cockpit.position.set(0,.72,.2);
    root.add(cockpit);

    const frontWing = new THREE.Mesh(new THREE.BoxGeometry(2.15,.08,.35), red);
    frontWing.position.set(0,.3,-3.05);
    root.add(frontWing);

    const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.8,.12,.35), red);
    rearWing.position.set(0,1.1,1.9);
    root.add(rearWing);

    const wheels = [];
    for (const [x,z] of [[-.82,-1.5],[.82,-1.5],[-.82,1.45],[.82,1.45]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.22,16), black);
      w.rotation.z = Math.PI/2;
      w.position.set(x,.34,z);
      root.add(w);
      wheels.push(w);
    }
    root.userData.wheels = wheels;
    return root;
  }
}