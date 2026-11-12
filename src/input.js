export class InputManager {
  constructor() {
    this.state = {
      steer:0, throttle:0, brake:0,
      abs:true, tc:true, gyro:false
    };
    this.zeroRoll = 0;
    this.roll = 0;
    this.sensitivity = 1;
    this.touch = { left:false, right:false, throttle:false, brake:false };
  }

  init() {
    const control = document.querySelector("#control");
    control?.addEventListener("change", e => {
      this.state.gyro = e.target.value === "Gyro";
      if (this.state.gyro) this.enableGyro();
    });

    document.querySelector("#abs")?.addEventListener("change", e => this.state.abs = e.target.checked);
    document.querySelector("#tc")?.addEventListener("change", e => this.state.tc = e.target.checked);
    document.querySelector("#sensitivity")?.addEventListener("input", e => this.sensitivity = +e.target.value);

    this.bindHold("#steerLeft", "left");
    this.bindHold("#steerRight", "right");
    this.bindHold("#throttle", "throttle");
    this.bindHold("#brake", "brake");

    window.addEventListener("deviceorientation", e => {
      if (typeof e.gamma === "number") {
        const target = (e.gamma - this.zeroRoll) / 35;
        this.roll += (target - this.roll) * .12;
      }
    }, {passive:true});
  }

  bindHold(selector, key) {
    const el = document.querySelector(selector);
    if (!el) return;
    const down = e => { e.preventDefault(); this.touch[key] = true; };
    const up = e => { e.preventDefault(); this.touch[key] = false; };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  }

  async enableGyro() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          this.state.gyro = false;
          return;
        }
      }
      this.calibrateGyro();
    } catch {
      this.state.gyro = false;
    }
  }

  calibrateGyro() {
    this.zeroRoll = 0;
    this.roll = 0;
    // Next orientation sample establishes zero.
    const once = e => {
      if (typeof e.gamma === "number") {
        this.zeroRoll = e.gamma;
        window.removeEventListener("deviceorientation", once);
      }
    };
    window.addEventListener("deviceorientation", once, {passive:true});
  }

  sample() {
    let steer = 0;
    if (this.state.gyro) {
      steer = Math.max(-1, Math.min(1, this.roll * this.sensitivity));
    } else {
      steer = (this.touch.right ? 1 : 0) - (this.touch.left ? 1 : 0);
    }
    this.state.steer = steer;
    this.state.throttle = this.touch.throttle ? 1 : 0;
    this.state.brake = this.touch.brake ? 1 : 0;
  }
}