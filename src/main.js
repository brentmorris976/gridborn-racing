import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { AssetLoader } from "./assets.js";
import { InputManager } from "./input.js";
import { Vehicle } from "./vehicle.js";
import { Track } from "./track.js";
import { HUD } from "./hud.js";
import "./style.css";

// GitHub Pages and custom-domain deployment both serve the app from a
// potentially nested path, so register the service worker relative to the page.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

const PHYSICS_HZ = 250;
const DT = 1 / PHYSICS_HZ;
const MAX_FRAME = 0.1;
const MAX_STEPS = 32;

class Game {
  constructor() {
    this.canvas = document.querySelector("#game");
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: "high-performance",
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080b10);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1500);
    this.camera.position.set(0, 3.5, 8);

    this.clock = new THREE.Clock();
    this.accumulator = 0;
    this.last = performance.now();
    this.running = false;
    this.paused = false;

    this.input = new InputManager();
    this.hud = new HUD();
    this.assetLoader = new AssetLoader();
    this.vehicle = null;
    this.track = null;
    this.physics = null;
    this.lastPhysicsTime = performance.now();

    window.addEventListener("resize", () => this.resize(), { passive:true });
    document.querySelector("#bootStart").addEventListener("click", () => this.startRace());
    document.querySelector("#pause").addEventListener("click", () => this.paused = !this.paused);
    document.querySelector("#gyroCalibrate").addEventListener("click", () => this.input.calibrateGyro());

    document.querySelectorAll("[data-action]").forEach(el => {
      el.addEventListener("click", () => {
        const a = el.dataset.action;
        if (a === "race") this.startRace();
        if (a === "menu") this.show("menu");
        if (a === "settings") this.show("settings");
        if (a === "back") this.show("menu");
        if (a === "garage") alert("Garage placeholder: add car variants in /public/assets.");
      });
    });

    this.setupLighting();
    this.resize();
  }

  setupLighting() {
    this.scene.add(new THREE.HemisphereLight(0xa9c7ff, 0x202020, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(80, 120, 50);
    this.scene.add(sun);
  }

  async init() {
    this.show("boot");
    try {
      await RAPIER.init();
      window.RAPIER = RAPIER;
      this.physics = new RAPIER.World({ x:0, y:-9.81, z:0 });
      this.physics.timestep = DT;
      this.track = new Track(this.scene, this.physics);
      this.vehicle = new Vehicle(this.scene, this.physics, this.input);
      await this.vehicle.init();
      this.input.init();
      document.querySelector("#bootStatus").textContent = "Ready";
      document.querySelector("#bootStart").disabled = false;
    } catch (err) {
      console.error(err);
      document.querySelector("#bootStatus").textContent = "Initialization failed — see console.";
    }
  }

  show(id) {
    ["boot","menu","settings","raceSummary"].forEach(x => document.querySelector("#"+x)?.classList.add("hidden"));
    if (id) document.querySelector("#"+id)?.classList.remove("hidden");
    if (id === "menu") document.querySelector("#hud").classList.add("hidden");
  }

  startRace() {
    if (!this.vehicle || !this.track) return;
    this.show(null);
    document.querySelector("#hud").classList.remove("hidden");
    this.running = true;
    this.paused = false;
    this.vehicle.reset();
    this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
  }

  frame(now) {
    if (!this.running) return;
    const realDt = Math.min((now - this.last) / 1000, MAX_FRAME);
    this.last = now;

    if (!this.paused) {
      this.accumulator += realDt;
      let steps = 0;
      while (this.accumulator >= DT && steps < MAX_STEPS) {
        this.input.sample(DT);
        this.vehicle.prePhysics(DT);
        this.physics.step();
        this.vehicle.postPhysics(DT);
        this.track.update(DT);
        this.accumulator -= DT;
        steps++;
      }
      if (steps === MAX_STEPS) this.accumulator = 0;
    }

    const alpha = this.accumulator / DT;
    this.vehicle.render(alpha);
    this.hud.update(this.vehicle.telemetry());
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(t => this.frame(t));
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
}

const game = new Game();
game.init();
