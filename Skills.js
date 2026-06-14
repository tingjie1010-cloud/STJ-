/* ═══════════════════════════════════════════════════════════
   skills.js — 技能樹互動邏輯
   蘋果點擊 → 掉落 → 砸機器人 → 跳轉教學頁
═══════════════════════════════════════════════════════════ */

/* ── 1. Background Canvas: basketball arcs ── */
(function () {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
  
    const TRAJS = [
      { sx: 0.08, sy: 0.88, ex: 0.92, ey: 0.72, apex: 0.24, col: 'rgba(212,175,55,0.18)' },
      { sx: 0.18, sy: 0.92, ex: 0.82, ey: 0.52, apex: 0.20, col: 'rgba(212,175,55,0.20)' },
      { sx: 0.72, sy: 0.78, ex: 0.18, ey: 0.88, apex: 0.28, col: 'rgba(212,175,55,0.14)' },
      { sx: 0.48, sy: 0.96, ex: 0.52, ey: 0.62, apex: 0.14, col: 'rgba(230,200,100,0.16)' },
    ];
  
    class Dot {
      constructor(ti, t0, spd) { this.ti = ti; this.t = t0; this.spd = spd; }
      tick() { this.t += this.spd; if (this.t > 1) this.t = 0; }
      pos() {
        const { sx, sy, ex, ey, apex } = TRAJS[this.ti];
        const x1 = sx * W, y1 = sy * H, x2 = ex * W, y2 = ey * H;
        const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - apex * H;
        const mt = 1 - this.t, t = this.t;
        return { x: mt * mt * x1 + 2 * mt * t * mx + t * t * x2, y: mt * mt * y1 + 2 * mt * t * my + t * t * y2 };
      }
      draw() {
        const { x, y } = this.pos();
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#D4AF37';
        ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(212,175,55,0.9)';
        ctx.fill(); ctx.shadowBlur = 0;
      }
    }
  
    let dots = [];
    function init() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      dots = [];
      TRAJS.forEach((_, i) => {
        dots.push(new Dot(i, Math.random() * 0.8, 0.0018 + Math.random() * 0.003));
        if (i < 2) dots.push(new Dot(i, Math.random(), 0.0022));
      });
    }
  
    function draw() {
      ctx.clearRect(0, 0, W, H);
      TRAJS.forEach(tr => {
        const x1 = tr.sx * W, y1 = tr.sy * H, x2 = tr.ex * W, y2 = tr.ey * H;
        const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - tr.apex * H;
        ctx.beginPath(); ctx.moveTo(x1, y1);
        for (let t = 0; t <= 1; t += 0.02) {
          const mt = 1 - t;
          ctx.lineTo(mt * mt * x1 + 2 * mt * t * mx + t * t * x2, mt * mt * y1 + 2 * mt * t * my + t * t * y2);
        }
        ctx.strokeStyle = tr.col; ctx.lineWidth = 1.3;
        ctx.shadowBlur = 3; ctx.shadowColor = 'rgba(212,175,55,0.4)';
        ctx.stroke(); ctx.shadowBlur = 0;
      });
      dots.forEach(d => { d.tick(); d.draw(); });
      requestAnimationFrame(draw);
    }
  
    window.addEventListener('resize', init);
    init(); draw();
  })();
  
  
  /* ── 2. Apple click → fall → hit robot → redirect ── */
  (function () {
    // Map apple id → { href, speech }
    const APPLE_DATA = {
      'apple-html':  { href: 'html.html',       label: 'HTML5',      speech: '哎喲！HTML5 砸到我了！' },
      'apple-css':   { href: 'css3.html',        label: 'CSS3',       speech: '痛！CSS3 真的很重...' },
      'apple-js':    { href: 'javascript.html',  label: 'JavaScript', speech: '啊！JavaScript 掉下來！' },
    };
  
    const robotEl   = document.getElementById('robot-ting');
    const speechEl  = document.getElementById('robot-speech');
    const starsEl   = document.getElementById('hit-stars');
    const overlay   = document.getElementById('redirect-overlay');
    const overlayLbl = document.getElementById('redirect-label');
  
    let locked = false; // prevent double-click during animation
  
    Object.entries(APPLE_DATA).forEach(([id, data]) => {
      const appleG = document.getElementById(id);
      if (!appleG) return;
  
      appleG.addEventListener('click', () => {
        if (locked) return;
        locked = true;
  
        // --- Calculate fall distance (apple SVG position → robot position) ---
        const treeSVG   = document.getElementById('treeSVG');
        const robotRect = robotEl ? robotEl.getBoundingClientRect() : null;
        const svgRect   = treeSVG  ? treeSVG.getBoundingClientRect()  : null;
  
        // Use a generous fixed fall that always clears the tree to the robot
        const fallDist = 480;
        appleG.style.setProperty('--fall-dist', fallDist + 'px');
        appleG.style.setProperty('--fall-dur', '1.0s');
  
        // Trigger apple fall
        appleG.classList.add('falling');
  
        // After fall (~0.85s) — hit robot
        setTimeout(() => {
          // Robot hit
          if (robotEl) {
            robotEl.classList.remove('hit');
            void robotEl.offsetWidth; // reflow to restart
            robotEl.classList.add('hit');
          }
  
          // Stars
          if (starsEl) {
            starsEl.classList.remove('show');
            void starsEl.offsetWidth;
            starsEl.classList.add('show');
          }
  
          // Speech bubble
          if (speechEl) {
            speechEl.textContent = data.speech;
            speechEl.classList.remove('show');
            void speechEl.offsetWidth;
            speechEl.classList.add('show');
          }
  
          // Flash overlay + redirect after 1.6s
          setTimeout(() => {
            if (overlay && overlayLbl) {
              overlayLbl.textContent = `前往 ${data.label} 教學...`;
              overlay.classList.add('active');
            }
            setTimeout(() => {
              window.location.href = data.href;
            }, 600);
          }, 1400);
  
        }, 850);
      });
    });
  })();