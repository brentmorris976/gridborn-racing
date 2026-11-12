export class HUD {
  constructor() {
    this.map = document.querySelector("#trackMap");
    this.ctx = this.map?.getContext("2d");
  }

  update(t) {
    if (!t) return;
    document.querySelector("#speed").textContent = Math.round(t.speed);
    document.querySelector("#rpm").textContent = Math.round(t.rpm);
    document.querySelector("#gear").textContent = t.gear;
    document.querySelector("#rpmBar").style.width = `${Math.min(100,t.rpm/15000*100)}%`;
    document.querySelector("#ersBar").style.width = `${t.ers*100}%`;
    document.querySelector("#fuelBar").style.width = `${t.fuel*100}%`;

    const ids=["tFL","tFR","tRL","tRR"];
    t.tires.forEach((x,i)=>{
      const el=document.querySelector("#"+ids[i]);
      const temp=x.surface;
      const normalized=Math.max(0,Math.min(1,(temp-40)/80));
      el.style.background=`hsl(${Math.max(0,120-normalized*120)}, 80%, 35%)`;
      el.title=`Surface ${temp.toFixed(0)}°C | Tread ${(x.tread*100).toFixed(0)}%`;
    });

    if (this.ctx) {
      const c=this.ctx,w=this.map.width,h=this.map.height;
      c.clearRect(0,0,w,h);
      c.strokeStyle="#52606d";c.lineWidth=5;
      c.beginPath();
      c.ellipse(w/2,h/2,w*.38,h*.32,0,0,Math.PI*2);
      c.stroke();
      c.fillStyle="#d9ff4a";
      c.beginPath();c.arc(w/2,h*.18,4,0,Math.PI*2);c.fill();
    }
  }
}