export const Compound = Object.freeze({
  SOFT: { name:"Soft", mu:1.28, opt:92, heatRate:1.18, wearRate:1.15 },
  MEDIUM: { name:"Medium", mu:1.22, opt:88, heatRate:1.0, wearRate:.88 },
  HARD: { name:"Hard", mu:1.16, opt:84, heatRate:.82, wearRate:.68 }
});

const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
const sign = x => x < 0 ? -1 : 1;

export class TireModel {
  constructor(compound=Compound.MEDIUM) {
    this.compound = compound;
    this.carcass = 82;
    this.surface = 84;
    this.tread = 1.0;
    this.pressure = 21.0;
    this.lastFx = 0;
    this.lastFy = 0;
  }

  magicFormula(x, B, C, D, E) {
    return D * Math.sin(C * Math.atan(B*x - E*(B*x - Math.atan(B*x))));
  }

  combined(slipRatio, slipAngle, normalLoad, dt) {
    const c = this.compound;
    const loadN = Math.max(normalLoad, 100);
    const thermalWindow = Math.exp(-Math.pow((this.surface-c.opt)/25, 2));
    const coldPenalty = clamp((this.surface-35)/45, .15, 1);
    const hotPenalty = this.surface > 115 ? clamp(1-(this.surface-115)/35, .15, 1) : 1;
    const grip = c.mu * thermalWindow * coldPenalty * hotPenalty * (0.72 + .28*this.tread);

    const kappa = clamp(slipRatio, -2, 2);
    const alpha = clamp(slipAngle, -1.5, 1.5);

    const Fx0 = this.magicFormula(kappa, 10.5, 1.9, grip*loadN, .97);
    const Fy0 = this.magicFormula(alpha, 8.8, 1.95, grip*loadN, .97);

    const combinedFactor = 1 / Math.sqrt(1 + Math.pow(Math.abs(kappa)/.16,2) + Math.pow(Math.tan(alpha)/.22,2));
    const Fx = Fx0 * combinedFactor;
    const Fy = Fy0 * combinedFactor;

    const slipWork = Math.abs(Fx*slipRatio) + Math.abs(Fy*slipAngle);
    const ambient = 28;
    const heat = c.heatRate * slipWork * 0.0000025 * dt;
    const cooling = ((this.surface - ambient) * 0.012 + (this.surface-this.carcass)*0.008) * dt;
    this.surface += heat - cooling;
    this.carcass += ((this.surface-this.carcass)*0.018 - (this.carcass-ambient)*0.002) * dt;

    const wear = c.wearRate * (Math.abs(slipRatio)*Math.abs(Fx) + Math.abs(slipAngle)*Math.abs(Fy)) * 0.0000000006 * dt;
    this.tread = clamp(this.tread - wear, .05, 1);

    this.lastFx = Fx;
    this.lastFy = Fy;
    return { Fx, Fy, Mz: -Fy * .06 };
  }

  telemetry() {
    return { surface:this.surface, carcass:this.carcass, tread:this.tread };
  }
}