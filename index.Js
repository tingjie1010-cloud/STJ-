/* ═══════════════════════════════════════════════════════════
   BACKGROUND CANVAS — basketball arcs + glow dots
═══════════════════════════════════════════════════════════ */
(function() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let W, H;
  
    const TRAJS = [
      { sx:0.08, sy:0.88, ex:0.92, ey:0.72, apex:0.24, col:'rgba(212,175,55,0.22)' },
      { sx:0.18, sy:0.92, ex:0.82, ey:0.52, apex:0.20, col:'rgba(212,175,55,0.26)' },
      { sx:0.72, sy:0.78, ex:0.18, ey:0.88, apex:0.28, col:'rgba(212,175,55,0.18)' },
      { sx:0.48, sy:0.96, ex:0.52, ey:0.62, apex:0.14, col:'rgba(230,200,100,0.22)' },
      { sx:0.05, sy:0.6,  ex:0.55, ey:0.8,  apex:0.18, col:'rgba(212,175,55,0.14)' }
    ];
  
    class Dot {
      constructor(ti, t0, spd) { this.ti=ti; this.t=t0; this.spd=spd; }
      tick() { this.t += this.spd; if(this.t>1) this.t=0; }
      pos() {
        const {sx,sy,ex,ey,apex} = TRAJS[this.ti];
        const x1=sx*W, y1=sy*H, x2=ex*W, y2=ey*H;
        const mx=(x1+x2)/2, my=Math.min(y1,y2)-apex*H;
        const mt=1-this.t, t=this.t;
        return { x:mt*mt*x1+2*mt*t*mx+t*t*x2, y:mt*mt*y1+2*mt*t*my+t*t*y2 };
      }
      draw() {
        const {x,y}=this.pos();
        ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2);
        ctx.fillStyle='#D4AF37';
        ctx.shadowBlur=16; ctx.shadowColor='rgba(212,175,55,0.9)';
        ctx.fill(); ctx.shadowBlur=0;
      }
    }
  
    let dots=[];
    function init() {
      W=canvas.width=window.innerWidth;
      H=canvas.height=window.innerHeight;
      dots=[];
      TRAJS.forEach((_,i)=>{
        dots.push(new Dot(i,Math.random()*0.8,0.0018+Math.random()*0.003));
        if(i<3) dots.push(new Dot(i,Math.random(),0.0022));
      });
    }
  
    function draw() {
      ctx.clearRect(0,0,W,H);
      TRAJS.forEach(tr=>{
        const x1=tr.sx*W, y1=tr.sy*H, x2=tr.ex*W, y2=tr.ey*H;
        const mx=(x1+x2)/2, my=Math.min(y1,y2)-tr.apex*H;
        ctx.beginPath(); ctx.moveTo(x1,y1);
        for(let t=0;t<=1;t+=0.018){
          const mt=1-t;
          ctx.lineTo(mt*mt*x1+2*mt*t*mx+t*t*x2, mt*mt*y1+2*mt*t*my+t*t*y2);
        }
        ctx.strokeStyle=tr.col;
        ctx.lineWidth=1.3;
        ctx.shadowBlur=4; ctx.shadowColor='rgba(212,175,55,0.4)';
        ctx.stroke(); ctx.shadowBlur=0;
      });
      dots.forEach(d=>{ d.tick(); d.draw(); });
      requestAnimationFrame(draw);
    }
    window.addEventListener('resize',init);
    init(); draw();
  })();
  
  /* ═══════════════════════════════════════════════════════════
     THROW SEQUENCE (桌面版飛擲動畫)
  ═══════════════════════════════════════════════════════════ */
  (function() {
    const arm     = document.getElementById('robot-arm-right');
    const btns    = document.querySelectorAll('.throw-btn');
    const eLines  = document.querySelectorAll('.e-line');
  
    setTimeout(() => {
      if(arm) arm.classList.add('throwing');
      setTimeout(() => {
        eLines.forEach(l => l.classList.add('burst'));
      }, 250);
      btns.forEach((btn, i) => {
        setTimeout(() => btn.classList.add('thrown'), 200 + i*260);
      });
      setTimeout(() => {
        if(arm) {
          arm.classList.remove('throwing');
          arm.style.animation = 'armIdleR 4s ease-in-out 0s infinite';
        }
      }, 2200);
    }, 2000);
  })();

  /* ═══════════════════════════════════════════════════════════
     手機版漢堡選單互動
  ═══════════════════════════════════════════════════════════ */
  (function() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    if (hamburgerBtn && hamburgerMenu) {
      hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hamburgerBtn.classList.toggle('active');
        hamburgerMenu.classList.toggle('active');
      });
      document.addEventListener('click', (e) => {
        if (!hamburgerBtn.contains(e.target) && !hamburgerMenu.contains(e.target)) {
          hamburgerBtn.classList.remove('active');
          hamburgerMenu.classList.remove('active');
        }
      });
    }
  })();