/* ═══════════════════════════════════════════════════════════
   mobile.js — 只有手機 / 不支援 WebGL 的裝置才會下載這個檔案
   內容：2D 背景弧線動畫 + 機器人拋擲動畫 + 對話泡泡輪播
   由 index.html <head> 內的偵測腳本動態注入，桌面裝置完全不會
   請求這個檔案，一個 byte 都不會下載。
═══════════════════════════════════════════════════════════ */
(function () {


    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
  
    const TRAJS = [
      { sx: 0.08, sy: 0.88, ex: 0.92, ey: 0.72, apex: 0.24, col: 'rgba(212,175,55,0.22)' },
      { sx: 0.18, sy: 0.92, ex: 0.82, ey: 0.52, apex: 0.20, col: 'rgba(212,175,55,0.26)' },
      { sx: 0.72, sy: 0.78, ex: 0.18, ey: 0.88, apex: 0.28, col: 'rgba(212,175,55,0.18)' },
      { sx: 0.48, sy: 0.96, ex: 0.52, ey: 0.62, apex: 0.14, col: 'rgba(230,200,100,0.22)' },
      { sx: 0.05, sy: 0.6,  ex: 0.55, ey: 0.8,  apex: 0.18, col: 'rgba(212,175,55,0.14)' }
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
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#D4AF37';
        ctx.shadowBlur = 16; ctx.shadowColor = 'rgba(212,175,55,0.9)';
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
        if (i < 3) dots.push(new Dot(i, Math.random(), 0.0022));
      });
    }
  
    /* 分頁不可見時暫停，省電 */
    let rafId = null;
    function draw() {
      if (document.hidden) { rafId = null; return; }
      ctx.clearRect(0, 0, W, H);
      TRAJS.forEach(tr => {
        const x1 = tr.sx * W, y1 = tr.sy * H, x2 = tr.ex * W, y2 = tr.ey * H;
        const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - tr.apex * H;
        ctx.beginPath(); ctx.moveTo(x1, y1);
        for (let t = 0; t <= 1; t += 0.018) {
          const mt = 1 - t;
          ctx.lineTo(mt * mt * x1 + 2 * mt * t * mx + t * t * x2, mt * mt * y1 + 2 * mt * t * my + t * t * y2);
        }
        ctx.strokeStyle = tr.col; ctx.lineWidth = 1.3;
        ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(212,175,55,0.4)';
        ctx.stroke(); ctx.shadowBlur = 0;
      });
      dots.forEach(d => { d.tick(); d.draw(); });
      rafId = requestAnimationFrame(draw);
    }
  
    let resizePending = false;
    window.addEventListener('resize', () => {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => { resizePending = false; init(); });
    }, { passive: true });
  
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      } else if (rafId === null) {
        draw();
      }
    });
  
    init(); draw();
  })();
  (function () {
  
  
    const arm    = document.getElementById('robot-arm-right');
    const btns   = document.querySelectorAll('.throw-btn');
    const eLines = document.querySelectorAll('.e-line');
    const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  
    if (REDUCED_MOTION) {
      // 減少動態效果：直接顯示按鈕，不跑拋擲序列
      btns.forEach(btn => {
        btn.style.transition = 'none';
        btn.style.opacity = '1';
        btn.style.transform = 'translateX(-50%) translateX(var(--tx)) translateY(var(--ty)) scale(1)';
        btn.style.pointerEvents = 'all';
      });
      return;
    }
  
    let timers = [];
    let sequenceDone = false;
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  
    function runThrowSequence() {
      clearTimers();
      timers.push(setTimeout(() => {
        if (arm) arm.classList.add('throwing');
  
        timers.push(setTimeout(() => {
          eLines.forEach(l => { l.classList.remove('burst'); });
          // 強制重新觸發動畫
          void document.body.offsetWidth;
          eLines.forEach(l => l.classList.add('burst'));
        }, 250));
  
        btns.forEach((btn, i) => {
          timers.push(setTimeout(() => btn.classList.add('thrown'), 200 + i * 260));
        });
  
        timers.push(setTimeout(() => {
          if (arm) {
            arm.classList.remove('throwing');
            arm.style.animation = 'armIdleR 4s ease-in-out 0s infinite';
          }
          sequenceDone = true;
        }, 2200));
      }, 2000));
    }
  
    /* 分頁不可見時暫停計時器；回到分頁時若序列尚未播完，重新啟動，
       避免按鈕卡在拋出前的隱藏狀態 */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTimers();
      } else if (!sequenceDone) {
        runThrowSequence();
      }
    });
  
    runThrowSequence();
  })();
  (function () {
  
    const bubble = document.getElementById('speechBubble');
    if (!bubble) return;
  
    const lines = [
      '你好，我是 Ting ⚡',
      '需要網頁開發嗎？',
      '選個方向，開始吧 →',
      'UI/UX ・ Three.js ・ Web',
    ];
    let idx = 0;
    let intervalId = null;
  
    function nextLine() {
      bubble.classList.add('fading');
      setTimeout(() => {
        idx = (idx + 1) % lines.length;
        bubble.textContent = lines[idx];
        bubble.classList.remove('fading');
      }, 280);
    }
  
    function startCarousel() {
      if (intervalId !== null) return;
      intervalId = setInterval(nextLine, 3500);
    }
    function stopCarousel() {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    }
  
    // 首次顯示（CSS 動畫 bubbleIn 約於 2.1s 開始）後，於 4s 啟動輪播
    const initTimer = setTimeout(startCarousel, 4000);
  
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopCarousel();
      } else if (idx > 0 || performance.now() > 4000) {
        // 僅在初始顯示已過後才恢復輪播，避免提前觸發
        startCarousel();
      }
    });
  
    window.addEventListener('pagehide', () => {
      clearTimeout(initTimer);
      stopCarousel();
    }, { once: true });
  })();