import * as THREE from "three";

export class Track {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.make();
  }

  make() {
    const asphalt = new THREE.MeshStandardMaterial({color:0x252a30,roughness:1});
    const grass = new THREE.MeshStandardMaterial({color:0x253624,roughness:1});
    const road = new THREE.Mesh(new THREE.PlaneGeometry(180,180), grass);
    road.rotation.x = -Math.PI/2;
    this.group.add(road);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-38,0,-12),
      new THREE.Vector3(-18,0,-38),
      new THREE.Vector3(20,0,-35),
      new THREE.Vector3(40,0,-8),
      new THREE.Vector3(32,0,25),
      new THREE.Vector3(0,0,38),
      new THREE.Vector3(-34,0,22),
      new THREE.Vector3(-42,0,0)
    ], true);

    const points = curve.getPoints(240);
    const width = 10;
    const verts=[], indices=[];
    for (let i=0;i<points.length;i++) {
      const p=points[i], next=points[(i+1)%points.length];
      const tangent=next.clone().sub(p).normalize();
      const side=new THREE.Vector3(-tangent.z,0,tangent.x).multiplyScalar(width/2);
      verts.push(p.x,0.02,p.z, p.x+side.x,0.02,p.z+side.z, p.x-side.x,0.02,p.z-side.z);
    }
    for (let i=0;i<points.length;i++) {
      const a=i*3,b=((i+1)%points.length)*3;
      indices.push(a,b,a+1, a,b+2,b);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,asphalt);
    this.group.add(mesh);

    // Simple static collider approximated by a large floor.
    if (window.RAPIER) {
      const d=window.RAPIER.ColliderDesc.cuboid(90,.05,90).setTranslation(0,-.08,0);
      this.world.createCollider(d);
    }

    const lineMat=new THREE.MeshBasicMaterial({color:0xffffff});
    const lineGeom=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,.04,p.z)));
    this.group.add(new THREE.LineLoop(lineGeom,lineMat));
  }

  update() {}
}