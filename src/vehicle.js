import * as THREE from "three";
import { AssetLoader } from "./assets.js";
import { TireModel, Compound } from "./tire.js";

const clamp = (x,a,b) => Math.max(a, Math.min(b,x));

export class Vehicle {
  constructor(scene, world, input) {
    this.scene = scene;
    this.world = world;
    this.input = input;
    this.chassis = null;
    this.visual = null;
    this.wheels = [];
    this.tires = [0,1,2,3].map(() => new TireModel(Compound.MEDIUM));
    this.rpm = 5000;
    this.gear = 1;
    this.speed = 0;
    this.fuel = 1;
    this.ers = 1;
    this.steering = 0;
    this.lastPos = new THREE.Vector3();
    this.telemetryData = {};
    this.params = {
      mass: 795,
      wheelbase: 3.6,
      track: 1.6,
      cgHeight: .32,
      maxSteer: .48,
      brakeForce: 14500,
      engineForce: 9000,
      downforce: 8.5
    };
  }

  async init() {
    const rbDesc = window.RAPIER?.RigidBodyDesc;
    if (!rbDesc) throw new Error("Rapier unavailable");
    const desc = rbDesc.dynamic().setTranslation(0,1,0).setLinearDamping(.015).setAngularDamping(.2);
    this.chassis = this.world.createRigidBody(desc);
    const collider = window.RAPIER.ColliderDesc.cuboid(.75,.22,2.1)
      .setDensity(this.params.mass / 2.63);
    this.world.createCollider(collider, this.chassis);

    this.visual = AssetLoader.proceduralCar();
    this.visual.scale.setScalar(1);
    this.scene.add(this.visual);
    this.wheels = this.visual.userData.wheels;
    this.reset();
  }

  reset() {
    this.chassis.setTranslation({x:0,y:1,z:0}, true);
    this.chassis.setLinvel({x:0,y:0,z:0}, true);
    this.chassis.setAngvel({x:0,y:0,z:0}, true);
    this.chassis.setRotation({x:0,y:0,z:0,w:1}, true);
    this.fuel = 1; this.ers = 1; this.rpm = 5000; this.gear = 1;
    for (const t of this.tires) { t.tread = 1; t.surface = 84; t.carcass = 82; }
  }

  prePhysics(dt) {
    const rot = this.chassis.rotation();
    const q = new THREE.Quaternion(rot.x,rot.y,rot.z,rot.w);
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(q).normalize();
    const right = new THREE.Vector3(1,0,0).applyQuaternion(q).normalize();

    const pos = this.chassis.translation();
    const vel = this.chassis.linvel();
    const v = new THREE.Vector3(vel.x,vel.y,vel.z);
    const speed = v.length();
    const localX = v.dot(right);
    const localZ = v.dot(forward);
    this.speed = speed;

    const control = this.input.state;
    this.steering += (control.steer - this.steering) * clamp(dt*18,0,1);
    const steerAngle = this.steering * this.params.maxSteer;

    // Approximate 4-wheel suspension using raycasts. Each wheel gets a spring/damper load.
    const wheelZ = [-1.45,-1.45,1.45,1.45];
    const wheelX = [-.82,.82,-.82,.82];
    const axleLoad = this.params.mass * 9.81 / 4;
    const downforce = speed*speed*this.params.downforce;
    const frontBias = .52;
    const loads = [
      axleLoad*frontBias + downforce*.5,
      axleLoad*frontBias + downforce*.5,
      axleLoad*(1-frontBias) + downforce*.0,
      axleLoad*(1-frontBias) + downforce*.0
    ];

    for (let i=0;i<4;i++) {
      const local = new THREE.Vector3(wheelX[i],0,wheelZ[i]);
      const worldOffset = local.clone().applyQuaternion(q);
      const wp = new THREE.Vector3(pos.x,pos.y,pos.z).add(worldOffset);

      const tire = this.tires[i];
      const axleSteer = i < 2 ? steerAngle : 0;
      const wheelForward = forward.clone();
      if (axleSteer) wheelForward.applyAxisAngle(new THREE.Vector3(0,1,0), axleSteer).normalize();
      const wheelRight = new THREE.Vector3(1,0,0).applyQuaternion(q);
      if (axleSteer) wheelRight.applyAxisAngle(new THREE.Vector3(0,1,0), axleSteer).normalize();

      const wheelVx = v.dot(wheelRight);
      const wheelVz = v.dot(wheelForward);
      const wheelSpeed = Math.max(Math.abs(wheelVz), 0.5);
      const slipAngle = Math.atan2(wheelVx, wheelSpeed);
      const driven = i >= 2;
      const engine = driven ? control.throttle * this.params.engineForce : 0;
      const braking = control.brake * this.params.brakeForce;
      let slipRatio = (engine - Math.sign(wheelVz)*braking) / Math.max(loads[i],100);
      slipRatio = clamp(slipRatio, -1.5, 1.5);

      if (control.abs && braking > 0 && Math.abs(slipRatio) > .18) {
        slipRatio *= .18 / Math.abs(slipRatio);
      }
      if (control.tc && engine > 0 && Math.abs(slipRatio) > .16) {
        slipRatio *= .16 / Math.abs(slipRatio);
      }

      const force = tire.combined(slipRatio, slipAngle, loads[i], dt);
      const fx = force.Fx + engine - Math.sign(wheelVz)*braking;
      const fy = force.Fy;

      const forceWorld = wheelForward.clone().multiplyScalar(fx).add(wheelRight.clone().multiplyScalar(fy));
      const application = { x:wp.x, y:wp.y, z:wp.z };
      this.chassis.addForceAtPoint({x:forceWorld.x,y:forceWorld.y,z:forceWorld.z}, application, true);

      // Gravity/downforce and simple lateral aero damping.
      this.chassis.addForce({x:0,y:-downforce,z:0}, true);
      this.chassis.addTorque({x:0,y:0,z:0}, true);

      if (this.wheels[i]) {
        this.wheels[i].rotation.x -= wheelVz * dt / .34;
        this.wheels[i].rotation.y = axleSteer;
      }
    }

    const drag = v.clone().multiplyScalar(-0.0007 * speed);
    this.chassis.addForce({x:drag.x,y:drag.y,z:drag.z}, true);

    this.rpm = clamp(900 + Math.abs(localZ)*900 + Math.abs(localZ)*1200*Math.min(this.gear,6), 900, 15000);
    this.gear = clamp(Math.floor(Math.abs(localZ)/18)+1, 1, 8);
    this.fuel = clamp(this.fuel - control.throttle * 0.000003 * dt*250, 0, 1);
    this.ers = clamp(this.ers + (control.brake*.0005 - control.throttle*.00025)*dt*250, 0, 1);
  }

  postPhysics() {}

  render() {
    if (!this.visual) return;
    const p = this.chassis.translation();
    const r = this.chassis.rotation();
    this.visual.position.set(p.x,p.y,p.z);
    this.visual.quaternion.set(r.x,r.y,r.z,r.w);
  }

  telemetry() {
    return {
      speed:this.speed*3.6,
      rpm:this.rpm,
      gear:this.gear,
      fuel:this.fuel,
      ers:this.ers,
      tires:this.tires.map(t=>t.telemetry()),
      steer:this.steering
    };
  }
}