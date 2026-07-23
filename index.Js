/* ═══════════════════════════════════════════════════════════
   裝置偵測 & 模式切換（最優先執行，避免 FOUC / 資源浪費）
   - 手機 (< 1024px)：完全不載入 three.js，執行機器人 + 拋擲動畫
     + 2D 背景弧線，省電不發燙。
   - 桌面 (>= 1024px) 且支援 WebGL：動態載入 three.js，
     進入 3D 個人空間 + WASD 自由走動，隱藏機器人。
   - 桌面但不支援 WebGL：退回機器人 + 拋擲動畫（與手機相同）。
═══════════════════════════════════════════════════════════ */
const HAS_WEBGL = (function () {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
})();

const MOBILE_BREAKPOINT = 1024;
const IS_MOBILE = window.innerWidth < MOBILE_BREAKPOINT;
const USE_3D    = !IS_MOBILE && HAS_WEBGL;

// 立即在 <html> 標記模式，CSS 依此決定顯示/隱藏，避免閃爍與無用渲染。
document.documentElement.classList.add(USE_3D ? 'is-desktop' : 'is-mobile');

// #region agent log
fetch('http://127.0.0.1:7601/ingest/e604be3b-d853-415c-a576-91302f009b10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1814ed'},body:JSON.stringify({sessionId:'1814ed',location:'index.Js:22',message:'mode init',data:{HAS_WEBGL,IS_MOBILE,USE_3D,innerWidth:window.innerWidth,htmlClass:document.documentElement.className},timestamp:Date.now(),hypothesisId:'A-B'})}).catch(()=>{});
// #endregion

/* ═══════════════════════════════════════════════════════════
   2D 背景 CANVAS — 弧線軌跡 + 光點
   手機版：主視覺背景，常駐繪製。
   桌面 3D 模式：被 three-canvas 完全遮蓋，不啟動繪製迴圈，
   省去白白運行的 rAF。
═══════════════════════════════════════════════════════════ */
(function () {
  // #region agent log
  fetch('http://127.0.0.1:7601/ingest/e604be3b-d853-415c-a576-91302f009b10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1814ed'},body:JSON.stringify({sessionId:'1814ed',location:'index.Js:bg-canvas',message:'bg canvas IIFE',data:{skipped:USE_3D,USE_3D},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (USE_3D) return; // 桌面 3D 模式下這層永遠被蓋住，直接跳過整個迴圈

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

/* ═══════════════════════════════════════════════════════════
   機器人拋擲動畫（手機版主導覽 — 桌面 3D 模式不執行）
═══════════════════════════════════════════════════════════ */
(function () {
  // #region agent log
  fetch('http://127.0.0.1:7601/ingest/e604be3b-d853-415c-a576-91302f009b10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1814ed'},body:JSON.stringify({sessionId:'1814ed',location:'index.Js:throw',message:'throw sequence IIFE',data:{skipped:USE_3D,btnCount:document.querySelectorAll('.throw-btn').length},timestamp:Date.now(),hypothesisId:'C-E'})}).catch(()=>{});
  // #endregion
  if (USE_3D) return;

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
        // #region agent log
        const thrownCount = Array.from(btns).filter(b => b.classList.contains('thrown')).length;
        fetch('http://127.0.0.1:7601/ingest/e604be3b-d853-415c-a576-91302f009b10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1814ed'},body:JSON.stringify({sessionId:'1814ed',location:'index.Js:throw-done',message:'throw sequence done',data:{sequenceDone,thrownCount,totalBtns:btns.length},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
        // #endregion
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

/* ═══════════════════════════════════════════════════════════
   漢堡選單互動（手機 / 桌面共用）
   - btn 為原生 <button>，瀏覽器已原生處理 Enter/Space → click，
     這裡只需額外處理 Escape 鍵關閉選單，避免重複觸發 toggleMenu。
═══════════════════════════════════════════════════════════ */
(function () {
  const btn  = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('hamburgerMenu');
  if (!btn || !menu) return;
  function toggleMenu(open) {
    btn.classList.toggle('active', open);
    menu.classList.toggle('active', open);
    btn.setAttribute('aria-expanded', String(open));
  }
  btn.addEventListener('click', e => {
    e.stopPropagation();
    toggleMenu(!btn.classList.contains('active'));
  });
  btn.addEventListener('keydown', e => {
    if (e.key === 'Escape') toggleMenu(false);
  });
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      toggleMenu(false);
    }
  });
})();

/* ═══════════════════════════════════════════════════════════
   Speech Bubble 輪播（手機版機器人對話）
   - 改用 CSS class 切換（visible/fading），避免直接覆寫 inline style
   - 分頁不可見時暫停 interval，回到分頁時不補播
═══════════════════════════════════════════════════════════ */
(function () {
  if (USE_3D) return;
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

/* ═══════════════════════════════════════════════════════════
   桌面版：動態載入 three.js → 啟動 3D 個人空間 + WASD 自由走動
   - 手機完全不會執行到這裡（USE_3D 為 false，整段提前返回）
   - three.js 僅在桌面下載/解析/執行，避免手機消耗額外流量與電力
═══════════════════════════════════════════════════════════ */
(function () {
  if (!USE_3D) return;

  const THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const FALLBACK_FLAG = 'ting_3d_fallback';

  // Bloom 後製特效（讓金色光點/邊框產生真實的發光暈染，是「震撼感」的關鍵）
  // 刻意跟核心 three.js 分開處理：這幾個 addon 載入失敗完全不影響 3D 場景本身，
  // 只是少了發光效果而已，絕不會因此掉回手機版。
  const POSTFX_BASE = 'https://unpkg.com/three@0.128.0/examples/js/';
  const POSTFX_FILES = [
    'postprocessing/EffectComposer.js',
    'postprocessing/RenderPass.js',
    'postprocessing/ShaderPass.js',
    'shaders/CopyShader.js',
    'shaders/LuminosityHighPassShader.js',
    'postprocessing/UnrealBloomPass.js'
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  loadScript(THREE_SRC)
    .then(() => Promise.allSettled(POSTFX_FILES.map(f => loadScript(POSTFX_BASE + f))))
    .then(() => {
      try {
        initDesktop3D();
      } catch (err) {
        console.error('[3D scene] 場景初始化失敗，已切換為簡化版面：', err);
        const loading3D = document.getElementById('loading3D');
        if (loading3D) loading3D.classList.add('is-hidden');
        document.documentElement.classList.remove('is-desktop');
        document.documentElement.classList.add('is-mobile');
      }
    })
    .catch(() => {
      // three.js 載入失敗（離線或 CDN 被擋）：退回機器人 + 拋擲動畫
      // 用 sessionStorage 旗標防止 CDN 持續無法載入時造成無限重整迴圈
      let alreadyTried = false;
      try { alreadyTried = sessionStorage.getItem(FALLBACK_FLAG) === '1'; } catch (e) { /* 隱私模式等情況忽略 */ }

      // #region agent log
      fetch('http://127.0.0.1:7601/ingest/e604be3b-d853-415c-a576-91302f009b10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1814ed'},body:JSON.stringify({sessionId:'1814ed',location:'index.Js:3d-fallback',message:'three.js load failed',data:{alreadyTried,USE_3D,htmlClass:document.documentElement.className,mobileHeroDisplay:document.getElementById('mobileHero')?getComputedStyle(document.getElementById('mobileHero')).display:'missing'},timestamp:Date.now(),hypothesisId:'C-D'})}).catch(()=>{});
      // #endregion

      if (alreadyTried) {
        // 重整過一次仍失敗：不再重整，直接靜態切換到手機版樣式並提示
        document.documentElement.classList.remove('is-desktop');
        document.documentElement.classList.add('is-mobile');
        console.error('[3D scene] three.js 無法載入，已切換為簡化版面（不再自動重整）');
        return;
      }

      try { sessionStorage.setItem(FALLBACK_FLAG, '1'); } catch (e) { /* 忽略 */ }
      document.documentElement.classList.remove('is-desktop');
      document.documentElement.classList.add('is-mobile');
      location.reload();
    });

  function initDesktop3D() {
    'use strict';

    /* ── DOM refs ── */
    const threeCanvas   = document.getElementById('three-canvas');
    const modal         = document.getElementById('roomModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalClose    = document.getElementById('modalClose');
    const modalIcon     = document.getElementById('modalIcon');
    const modalTitle    = document.getElementById('modalTitle');
    const modalDesc     = document.getElementById('modalDesc');
    const modalLink     = document.getElementById('modalLink');
    const sceneLabel    = document.getElementById('sceneLabel');
    const wasdHint      = document.getElementById('wasdHint');

    if (!threeCanvas || !modal) {
      console.error('[3D scene] 必要的 DOM 元素缺失，已中止初始化');
      return;
    }

    // 成功進入 3D 初始化，清除 fallback 旗標，避免影響下次造訪
    try { sessionStorage.removeItem(FALLBACK_FLAG); } catch (e) { /* 忽略 */ }

    /* rafId 提前宣告於函式頂部，供下方 webglcontextlost 等較早綁定的
       事件處理器安全參照（避免暫時性死區疑慮，並利於閱讀） */
    let rafId = null;

    /* ── Tooltip ── */
    const tooltip = document.createElement('div');
    tooltip.id = 'scene-tooltip';
    document.body.appendChild(tooltip);

    /* ══════════════════════════════════════════════
       WEBGL CONTEXT LOST / RESTORED — 自動重建場景
    ══════════════════════════════════════════════ */
    threeCanvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }, false);
    threeCanvas.addEventListener('webglcontextrestored', () => {
      location.reload();
    }, false);

    /* ══════════════════════════════════════════════
       RENDERER
    ══════════════════════════════════════════════ */
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    const MAX_DPR = Math.min(window.devicePixelRatio, 2);
    let currentDPR = MAX_DPR;
    renderer.setPixelRatio(currentDPR);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    /* ══════════════════════════════════════════════
       SCENE & CAMERA — far=50（霧效遠距剔除）
    ══════════════════════════════════════════════ */
    const scene  = new THREE.Scene();
    scene.background = new THREE.Color(0x02020A);
    scene.fog = new THREE.FogExp2(0x02020A, 0.018);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);

    /* ══════════════════════════════════════════════
       BLOOM 後製 — 金色邊框/光點會產生真實暈染發光。
       若 addon 沒載入成功（例如 CDN 被擋），composer 保持 null，
       renderFrame() 會自動退回 renderer.render()，畫面仍正常，
       只是少了發光效果，絕不會整個場景壞掉。
    ══════════════════════════════════════════════ */
    let composer   = null;
    let bloomPass  = null;
    const bloomAvailable = typeof THREE.EffectComposer === 'function' &&
                            typeof THREE.RenderPass    === 'function' &&
                            typeof THREE.UnrealBloomPass === 'function';
    function setupBloom() {
      if (!bloomAvailable) return;
      try {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.55,  // strength — 發光強度，數值越大越夢幻，建議 0.4–0.9 之間微調
          0.35,  // radius   — 光暈擴散半徑
          0.32   // threshold — 只有夠亮的金色/白色高光才會發光，避免整個畫面糊掉
        );
        composer.addPass(bloomPass);
      } catch (err) {
        console.warn('[3D scene] Bloom 後製初始化失敗，改用一般渲染：', err);
        composer = null;
      }
    }
    function renderFrame() {
      if (composer) composer.render();
      else renderer.render(scene, camera);
    }

    const camActual  = { pos: new THREE.Vector3(0, 22, 32), look: new THREE.Vector3(0, 0, 0) };
    const camDesired = { pos: new THREE.Vector3(0, 5.4, 34.5), look: new THREE.Vector3(0, 1.6, 24.5) };

    /* 開場運鏡：從高空斜角掃入，最終落在角色背後的第三人稱跟隨點 */
    const INTRO_FROM      = new THREE.Vector3(10, 14, 30);
    const INTRO_TO        = new THREE.Vector3(0, 5.4, 34.5);
    const INTRO_LOOK_FROM = new THREE.Vector3(0, 3, 10);
    const INTRO_LOOK_TO   = new THREE.Vector3(0, 1.6, 24.5);
    let introProgress = 0;
    const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let introActive   = !REDUCED_MOTION;
    camActual.pos.copy(REDUCED_MOTION ? INTRO_TO : INTRO_FROM);
    camActual.look.copy(REDUCED_MOTION ? INTRO_LOOK_TO : INTRO_LOOK_FROM);

    let currentState  = REDUCED_MOTION ? 'FREE_ROAM' : 'INTRO';
    let zoomTarget    = null;
    let zoomProgress  = 0;
    let zoomFrom      = null;

    const velocity = new THREE.Vector2(0, 0);

    const orbit = { active: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0.3 };
    const ORBIT_SPEED = 0.007;
    const PITCH_MIN   = -0.15;
    const PITCH_MAX   = 1.0;

    const CAM_SMOOTH_POS  = 20;
    const CAM_SMOOTH_LOOK = 14;

    /* ══════════════════════════════════════════════
       LIGHTS — 僅主光源投影，次要光源不投射陰影；
       512x512 陰影貼圖 + bias，搭配 PCFSoftShadowMap 柔化邊緣
    ══════════════════════════════════════════════ */
    scene.add(new THREE.AmbientLight(0xffeeff, 0.28));

    const dirLight = new THREE.DirectionalLight(0xfff5cc, 0.5);
    dirLight.position.set(5, 18, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = dirLight.shadow.mapSize.height = 1024;
    Object.assign(dirLight.shadow.camera, { near: 0.5, far: 70, left: -36, right: 36, top: 36, bottom: -36 });
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    function makeSpot(color, intensity, x, y, z, angle, penumbra, decay) {
      const s = new THREE.SpotLight(color, intensity);
      s.position.set(x, y, z);
      s.angle = angle; s.penumbra = penumbra; s.decay = decay; s.distance = 45;
      s.castShadow = false;
      s.target.position.set(0, 0, 0);
      scene.add(s); scene.add(s.target);
      return s;
    }
    makeSpot(0xFF88CC, 1.4, 10, 20, 10, Math.PI / 5, 0.5, 1.2);
    makeSpot(0x44AAFF, 1.1, -12, 16, 6, Math.PI / 6, 0.5, 1.4);

    /* 彩虹漫射點光 — 3 顆靜態位置，僅強度脈動，不移動（省 shadow/lighting pass） */
    const rainbowColors = [0xFF3366, 0xFF8800, 0xFFEE00, 0x33FF88, 0x00BBFF, 0xBB44FF];
    const rainbowLights = [
      new THREE.PointLight(0xFF4488, 1.1, 28),
      new THREE.PointLight(0x44DDFF, 1.1, 28),
      new THREE.PointLight(0xAAFF44, 0.9, 28)
    ];
    rainbowLights[0].position.set(-20, 9,  -4);
    rainbowLights[1].position.set( 20, 9,  -4);
    rainbowLights[2].position.set(  0, 12, -24);
    rainbowLights.forEach(l => scene.add(l));

    const pointLight = new THREE.PointLight(0xD4AF37, 0.5, 30);
    pointLight.position.set(0, 8, 0);
    scene.add(pointLight);

    /* ══════════════════════════════════════════════
       ROOM ENVIRONMENT
    ══════════════════════════════════════════════ */
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x060610, metalness: 0.1, roughness: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    /* 地平線光暈（遠處淡金色微光） */
    const horizonGlow = new THREE.Mesh(
      new THREE.SphereGeometry(70, 32, 16),
      new THREE.MeshBasicMaterial({
        color: 0xD4AF37,
        transparent: true,
        opacity: 0.04,
        side: THREE.BackSide,
        depthWrite: false
      })
    );
    horizonGlow.position.y = -15;
    scene.add(horizonGlow);

    /* ══════════════════════════════════════════════
       PARTICLE SYSTEM — 精簡為 90 顆，金/白/淡橙混色
    ══════════════════════════════════════════════ */
    const tickables = [];

    (function buildParticles() {
      const COUNT = 140;
      const positions = new Float32Array(COUNT * 3);
      const colors    = new Float32Array(COUNT * 3);
      const speeds    = new Float32Array(COUNT);
      const offsets   = new Float32Array(COUNT);
      /* 彩虹全光譜調色盤 */
      const palette = [
        [1.0,0.20,0.40],[1.0,0.55,0.10],[1.0,0.93,0.10],
        [0.20,1.0,0.53],[0.10,0.73,1.0],[0.73,0.27,1.0],
        [1.0,0.40,0.80],[0.40,1.0,0.90],[0.831,0.686,0.216]
      ];

      for (let i = 0; i < COUNT; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 26;
        positions[i * 3 + 1] = Math.random() * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 26;
        speeds[i]  = 0.004 + Math.random() * 0.008;
        offsets[i] = Math.random() * Math.PI * 2;
        const c = palette[i % palette.length];
        colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.13, transparent: true, opacity: 0.75,
        sizeAttenuation: true, depthWrite: false, vertexColors: true
      });

      const particles = new THREE.Points(geo, mat);
      scene.add(particles);

      particles.userData.tick = function (t) {
        const pos = geo.attributes.position.array;
        for (let i = 0; i < COUNT; i++) {
          pos[i * 3 + 1] += speeds[i];
          pos[i * 3]     += Math.sin(t * 0.4 + offsets[i]) * 0.0022;
          pos[i * 3 + 2] += Math.cos(t * 0.3 + offsets[i] * 1.3) * 0.001;
          if (pos[i * 3 + 1] > 10.5) {
            pos[i * 3 + 1] = 0;
            pos[i * 3]     = (Math.random() - 0.5) * 26;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 26;
          }
        }
        geo.attributes.position.needsUpdate = true;
      };
      tickables.push(particles);
    })();

    /* 彩虹燈光動畫 — 僅脈動強度 + 每 10 幀換色（不移動位置，省 GPU lighting pass） */
    const _rainbowLights = rainbowLights;
    const _rlPalette = [
      [0xFF4488, 0x44DDFF, 0xAAFF44],
      [0xFF8800, 0xBB44FF, 0x00FFCC],
      [0xFFEE00, 0xFF44AA, 0x44AAFF]
    ];
    let _rlPhase = 0, _rlFrame = 0;
    tickables.push({ userData: { tick: function(t) {
      _rlFrame++;
      if (_rlFrame % 10 === 0) {
        _rlPhase = (_rlPhase + 1) % _rlPalette.length;
        _rlPalette[_rlPhase].forEach((col, i) => _rlPalette[_rlPhase] && (_rainbowLights[i].color.setHex(col)));
      }
      _rainbowLights[0].intensity = 0.8 + 0.3 * Math.sin(t * 0.9);
      _rainbowLights[1].intensity = 0.8 + 0.3 * Math.sin(t * 0.9 + 2.1);
      _rainbowLights[2].intensity = 0.7 + 0.25 * Math.sin(t * 0.9 + 4.2);
    }}});

    /* ══════════════════════════════════════════════
       奇幻生物系統 — 鯨魚 / 鳥群 / 水母精靈
    ══════════════════════════════════════════════ */
    (function buildCreatures() {

      /* ── 輔助：HSL 轉 0xRRGGBB ── */
      function hslToHex(h, s, l) {
        const a = s * Math.min(l, 1 - l);
        const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
        const r = Math.round(f(0) * 255), g = Math.round(f(8) * 255), b = Math.round(f(4) * 255);
        return (r << 16) | (g << 8) | b;
      }

      /* ━━━━ 1. 太空鯨魚 × 2 ━━━━
         低聚低頂點幾何，空中緩慢游弋，帶彩虹乳光。 */
      function buildWhale(hue, startAngle, orbitR, orbitY, orbitSpeed) {
        const g = new THREE.Group();

        /* 身體 — 拉伸球體 */
        const bodyGeo = new THREE.SphereGeometry(1, 7, 5);
        /* 手動把頂點拉伸成鯨魚流線型 */
        const bPos = bodyGeo.attributes.position;
        for (let i = 0; i < bPos.count; i++) {
          const x = bPos.getX(i), y = bPos.getY(i), z = bPos.getZ(i);
          bPos.setXYZ(i, x * 2.8, y * 0.85, z * 1.2);
        }
        bPos.needsUpdate = true;
        bodyGeo.computeVertexNormals();
        const bodyMat = new THREE.MeshStandardMaterial({
          color: hslToHex(hue, 0.7, 0.28),
          emissive: hslToHex(hue, 1.0, 0.18),
          emissiveIntensity: 0.6,
          metalness: 0.2, roughness: 0.55,
          transparent: true, opacity: 0.92
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        g.add(body);

        /* 尾鰭 */
        const tailMat = new THREE.MeshStandardMaterial({
          color: hslToHex((hue + 30) % 360, 0.8, 0.35),
          emissive: hslToHex(hue, 1.0, 0.2),
          emissiveIntensity: 0.8, transparent: true, opacity: 0.8, side: THREE.DoubleSide
        });
        [-1, 1].forEach(side => {
          const fluke = new THREE.Mesh(
            new THREE.ConeGeometry(0.55, 1.1, 4),
            tailMat
          );
          fluke.rotation.z = side * 0.62;
          fluke.position.set(-2.8, side * 0.35, 0);
          fluke.rotation.x = Math.PI / 2;
          g.add(fluke);
        });

        /* 胸鰭 */
        [-1, 1].forEach(side => {
          const fin = new THREE.Mesh(
            new THREE.ConeGeometry(0.3, 1.3, 4),
            new THREE.MeshStandardMaterial({
              color: hslToHex((hue + 60) % 360, 0.75, 0.32),
              emissive: hslToHex(hue, 1, 0.15), emissiveIntensity: 0.5,
              transparent: true, opacity: 0.75, side: THREE.DoubleSide
            })
          );
          fin.position.set(0.4, 0, side * 0.95);
          fin.rotation.z = side * 1.2;
          g.add(fin);
        });

        /* 乳光光暈 */
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(1.45, 8, 6),
          new THREE.MeshBasicMaterial({
            color: hslToHex(hue, 1.0, 0.6),
            transparent: true, opacity: 0.07,
            side: THREE.BackSide, depthWrite: false
          })
        );
        glow.scale.set(2.9, 1, 1.3);
        g.add(glow);

        /* 微粒尾跡（6 個小球沿身後隨機飄散） */
        const trailMat = new THREE.MeshBasicMaterial({
          color: hslToHex(hue, 1, 0.7), transparent: true, opacity: 0.55, depthWrite: false
        });
        const trails = [];
        for (let i = 0; i < 4; i++) {
          const t = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), trailMat.clone());
          t.userData.offset = i * 0.5 + Math.random() * 0.3;
          g.add(t); trails.push(t);
        }

        scene.add(g);

        /* 快取尾鰭網格，避免每幀 forEach + type check */
        const tailMeshes = g.children.filter(c => c.isMesh && c.geometry && c.geometry.type === 'ConeGeometry');

        /* 動畫狀態 */
        const state = { angle: startAngle, r: orbitR, y: orbitY, speed: orbitSpeed, hue, bodyMat, glow, trails, tailMeshes, g };
        tickables.push({ userData: { tick: function(t) {
          state.angle += state.speed * 0.016;
          g.position.x = Math.cos(state.angle) * state.r;
          g.position.z = Math.sin(state.angle) * state.r;
          g.position.y = state.y + Math.sin(t * 0.35 + state.angle) * 2.2;

          /* 面朝運動方向 */
          g.rotation.y = -state.angle - Math.PI / 2;
          /* 輕微俯仰 */
          g.rotation.z = Math.sin(t * 0.5 + state.angle) * 0.12;

          /* 尾巴搖擺 — 直接用快取引用 */
          const tailSwing = Math.sin(t * 1.8) * 0.22;
          state.tailMeshes.forEach(c => { c.rotation.y = tailSwing; });

          /* 尾跡粒子 */
          state.trails.forEach((tr, i) => {
            const o = tr.userData.offset;
            tr.position.set(
              -2.5 - i * 0.35 + Math.sin(t * 2.1 + o) * 0.25,
              Math.sin(t * 1.5 + o) * 0.35,
              Math.cos(t * 1.3 + o) * 0.2
            );
            tr.material.opacity = 0.5 * (1 - i / 6);
          });

          /* 발광 강도 맥동만 (색상 변경 없음 → shader 재컴파일 방지) */
          state.bodyMat.emissiveIntensity = 0.5 + 0.3 * Math.sin(t * 1.2 + state.angle);
        }}});
        return g;
      }

      buildWhale(210, 0,         22, 13, 0.22);
      buildWhale(300, Math.PI,   17, 16, 0.17);

      /* ━━━━ 2. 彩虹鳥群 × 6（V 字隊形） ━━━━ */
      function buildBird(hue) {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
          color: hslToHex(hue, 0.85, 0.45),
          emissive: hslToHex(hue, 1, 0.28),
          emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.1,
          transparent: true, opacity: 0.88
        });
        /* 身體 */
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), mat);
        body.scale.set(2.2, 0.7, 0.85);
        g.add(body);
        /* 翅膀 — 左右各一片三角形 */
        [-1, 1].forEach(side => {
          const wg = new THREE.BufferGeometry();
          wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            0,0,0, side*0.7, 0.08, -0.15, side*0.35, 0, 0.25
          ]), 3));
          wg.computeVertexNormals();
          const wing = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({
            color: hslToHex((hue + 40) % 360, 0.9, 0.55),
            emissive: hslToHex(hue, 1, 0.3), emissiveIntensity: 0.7,
            side: THREE.DoubleSide, transparent: true, opacity: 0.82
          }));
          wing.userData.side = side;
          g.add(wing);
        });
        return { g, mat, hue };
      }

      const flock = [];
      const BIRD_COUNT = 4;
      const FLOCK_HUE_START = 0;
      for (let i = 0; i < BIRD_COUNT; i++) {
        const hue = (FLOCK_HUE_START + i * 60) % 360;
        const birdObj = buildBird(hue);
        /* V 字偏移：奇數左、偶數右 */
        const side = i % 2 === 0 ? 1 : -1;
        const row  = Math.floor(i / 2) + 1;
        birdObj.vOffset = new THREE.Vector3(side * row * 1.6, -row * 0.5, row * 1.4);
        scene.add(birdObj.g);
        flock.push(birdObj);
      }

      /* 鳥群統一沿大圓軌道飛行 */
      let flockAngle = 1.2;
      const FLOCK_R = 18;
      const FLOCK_Y = 11;
      tickables.push({ userData: { tick: function(t) {
        flockAngle += 0.0032;
        const leaderX = Math.cos(flockAngle) * FLOCK_R;
        const leaderZ = Math.sin(flockAngle) * FLOCK_R;
        const leaderY = FLOCK_Y + Math.sin(t * 0.4) * 1.8;
        const fwdYaw  = flockAngle + Math.PI / 2;

        flock.forEach((b, i) => {
          const vo = b.vOffset;
          /* 旋轉偏移到飛行方向坐標系 */
          const ox = vo.x * Math.cos(fwdYaw) - vo.z * Math.sin(fwdYaw);
          const oz = vo.x * Math.sin(fwdYaw) + vo.z * Math.cos(fwdYaw);
          b.g.position.set(leaderX + ox, leaderY + vo.y, leaderZ + oz);
          b.g.rotation.y = -fwdYaw;

          /* 拍翅動畫 */
          b.g.children.forEach(c => {
            if (c.userData.side !== undefined) {
              c.rotation.z = c.userData.side * (0.3 + 0.28 * Math.sin(t * 4.5 + i * 0.9));
            }
          });

          /* emissive 強度脈動（不換色，避免 shader 重編） */
          b.mat.emissiveIntensity = 0.7 + 0.3 * Math.sin(t * 1.5 + i);
        });
      }}});

      /* ━━━━ 3. 水母精靈 × 3（空中漂浮） ━━━━ */
      function buildJellyfish(hue, x, z, yBase) {
        const g = new THREE.Group();

        /* 傘狀帽 */
        const capMat = new THREE.MeshStandardMaterial({
          color: hslToHex(hue, 0.9, 0.38),
          emissive: hslToHex(hue, 1, 0.3),
          emissiveIntensity: 1.2,
          transparent: true, opacity: 0.65,
          side: THREE.DoubleSide, depthWrite: false
        });
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 7, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
          capMat
        );
        cap.rotation.x = Math.PI;
        g.add(cap);

        /* 外層光暈 */
        const glowMat = new THREE.MeshBasicMaterial({
          color: hslToHex(hue, 1, 0.65),
          transparent: true, opacity: 0.12,
          side: THREE.BackSide, depthWrite: false
        });
        const capGlow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6, 0, Math.PI*2, 0, Math.PI*0.6), glowMat);
        capGlow.rotation.x = Math.PI;
        g.add(capGlow);

        /* 觸鬚 — 10 條下垂曲線（用細圓柱近似） */
        const tentacleMat = new THREE.MeshBasicMaterial({
          color: hslToHex((hue + 60) % 360, 1, 0.65),
          transparent: true, opacity: 0.55, depthWrite: false
        });
        const tentacles = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i / 10) * Math.PI * 2;
          const r = 0.28 + (i % 3) * 0.09;
          const len = 0.55 + (i % 4) * 0.22;
          const t = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.003, len, 3),
            tentacleMat.clone()
          );
          t.position.set(Math.cos(angle) * r, -len / 2 - 0.08, Math.sin(angle) * r);
          t.userData.tentacleIdx = i;
          g.add(t); tentacles.push(t);
        }

        g.position.set(x, yBase, z);
        scene.add(g);

        const state = { hue, capMat, glowMat, tentacles, g, x, z, yBase };
        tickables.push({ userData: { tick: function(t) {
          state.g.position.y = state.yBase + Math.sin(t * 0.55 + state.x) * 1.4;
          state.g.rotation.y += 0.006;

          /* 觸鬚波動 */
          state.tentacles.forEach((ten, idx) => {
            ten.rotation.z = Math.sin(t * 2.2 + idx * 0.7) * 0.18;
            ten.rotation.x = Math.cos(t * 1.8 + idx * 0.5) * 0.12;
          });

          /* 傘狀呼吸 */
          const pulse = 1 + 0.08 * Math.sin(t * 2.5);
          state.g.children[0].scale.set(pulse, 0.85 + 0.12 * Math.sin(t * 2.5), pulse);

          /* emissive 強度脈動（靜態色，省 shader 重編） */
          state.capMat.emissiveIntensity = 1.0 + 0.5 * Math.sin(t * 2.0 + state.x);
        }}});
      }

      buildJellyfish(  0,  -14, -10, 8);
      buildJellyfish(120,   12,  -6, 10);
      buildJellyfish(240,    2, -20, 9);

    })();

    /* ══════════════════════════════════════════════
       MATERIAL HELPERS
    ══════════════════════════════════════════════ */
    function goldMat(o = {}) {
      return new THREE.MeshStandardMaterial({
        color: o.color ?? 0xD4AF37, metalness: o.metalness ?? 0.85, roughness: o.roughness ?? 0.15,
        emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 0
      });
    }
    function darkMat(o = {}) {
      return new THREE.MeshStandardMaterial({
        color: o.color ?? 0x0C0C1E, metalness: o.metalness ?? 0.6, roughness: o.roughness ?? 0.4,
        emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 0
      });
    }

    const interactableObjects = [];

    /* ══════════════════════════════════════════════
       1. PORTFOLIO — 書櫃
    ══════════════════════════════════════════════ */
    (function buildPortfolio() {
      const g = new THREE.Group(); g.name = 'portfolio';
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.5, 0.6), darkMat({ color: 0x0E0E22, metalness: 0.5 }));
      body.castShadow = body.receiveShadow = true; g.add(body);
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.58), goldMat({ metalness: 0.7, roughness: 0.3 }));
        s.position.y = -2.1 + i * 1.0; s.castShadow = s.receiveShadow = true; g.add(s);
      }
      const bColors = [0xD4AF37, 0x1a1a40, 0x8C6E1A, 0x2a2a50, 0xF5E090];
      const bWidths = [0.28, 0.22, 0.32, 0.25, 0.20];
      for (let row = 0; row < 4; row++) {
        let xOff = -1.35;
        for (let b = 0; b < 5; b++) {
          const isGold = b === 0 || b === 4;
          const m = new THREE.Mesh(new THREE.BoxGeometry(bWidths[b], 0.85, 0.5), new THREE.MeshStandardMaterial({
            color: bColors[b], metalness: isGold ? 0.9 : 0.3, roughness: isGold ? 0.1 : 0.6,
            emissive: isGold ? 0xD4AF37 : 0x000000, emissiveIntensity: isGold ? 0.08 : 0
          }));
          m.position.set(xOff + bWidths[b] / 2, -1.65 + row * 1.0, 0.05);
          m.castShadow = m.receiveShadow = true; g.add(m);
          xOff += bWidths[b] + 0.05;
        }
      }
      const sph = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), goldMat({ emissive: 0xD4AF37, emissiveIntensity: 0.3 }));
      sph.position.set(1.2, 2.55, 0.1); sph.castShadow = true; g.add(sph);
      const glowMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 });
      for (let i = 0; i < 3; i++) {
        const gl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.04), glowMat);
        gl.position.set(-1.3 + i * 1.3, -0.65, 0.32); g.add(gl);
      }
      g.position.set(-10, 2.25, -18); scene.add(g); interactableObjects.push(g);
    })();

    /* ══════════════════════════════════════════════
       2. ABOUT — 書桌
    ══════════════════════════════════════════════ */
    (function buildAbout() {
      const g = new THREE.Group(); g.name = 'about';
      const top = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.18, 2.2), darkMat({ color: 0x12122A, metalness: 0.55, roughness: 0.35 }));
      top.castShadow = top.receiveShadow = true; g.add(top);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(4.02, 0.04, 2.22), goldMat({ roughness: 0.2 }));
      edge.position.y = 0.11; g.add(edge);
      const legMat = darkMat({ metalness: 0.7, roughness: 0.25 });
      [[-1.8, -0.95], [1.8, -0.95], [-1.8, 0.95], [1.8, 0.95]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.0, 0.18), legMat);
        leg.position.set(x, -1.09, z); leg.castShadow = leg.receiveShadow = true; g.add(leg);
      });
      const fo = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.08), goldMat({ roughness: 0.2 }));
      fo.position.set(-1.0, 0.77, -0.7); fo.castShadow = true; g.add(fo);
      const fi = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.06), new THREE.MeshStandardMaterial({ color: 0x0a1528, roughness: 0.8, emissive: 0x0a2040, emissiveIntensity: 0.4 }));
      fi.position.set(-1.0, 0.77, -0.66); g.add(fi);
      const f2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.08), goldMat({ roughness: 0.25 }));
      f2.position.set(0.8, 0.68, -0.72); f2.castShadow = true; g.add(f2);
      const f2i = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.66, 0.06), new THREE.MeshStandardMaterial({ color: 0x04040C, emissive: 0xD4AF37, emissiveIntensity: 0.15, roughness: 0.8 }));
      f2i.position.set(0.8, 0.68, -0.68); g.add(f2i);
      const ph = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.5, 10), goldMat({ roughness: 0.3 }));
      ph.position.set(1.55, 0.34, 0.3); ph.castShadow = true; g.add(ph);
      const penM = goldMat({ color: 0xF5E090, roughness: 0.4 });
      for (let i = 0; i < 3; i++) {
        const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.7, 6), penM);
        pen.position.set(1.55 + (i - 1) * 0.08, 0.6, 0.3); pen.rotation.z = (i - 1) * 0.1; pen.castShadow = true; g.add(pen);
      }
      const kb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.65), darkMat({ color: 0x08081C, metalness: 0.8, roughness: 0.2 }));
      kb.position.set(-0.1, 0.12, 0.55); kb.castShadow = kb.receiveShadow = true; g.add(kb);
      const kbe = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.02, 0.67), new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 0.6, transparent: true, opacity: 0.5 }));
      kbe.position.set(-0.1, 0.16, 0.55); g.add(kbe);
      g.position.set(0, 1.09, -12); scene.add(g); interactableObjects.push(g);
    })();

    /* ══════════════════════════════════════════════
       3. CONTACT — 螢光電話
    ══════════════════════════════════════════════ */
    (function buildContact() {
      const g = new THREE.Group(); g.name = 'contact';
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.18, 6), darkMat({ color: 0x0C0C20, metalness: 0.7, roughness: 0.2 }));
      base.castShadow = base.receiveShadow = true; g.add(base);
      const br = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 6, 20), goldMat({ emissive: 0xD4AF37, emissiveIntensity: 0.5 }));
      br.rotation.x = Math.PI / 2; br.position.y = 0.09; g.add(br);
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.45, 0.12), darkMat({ color: 0x080818, metalness: 0.85, roughness: 0.12 }));
      phone.position.y = 0.97; phone.rotation.x = -0.15; phone.castShadow = phone.receiveShadow = true; g.add(phone);
      const pb = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.47, 0.1), goldMat({ roughness: 0.15 }));
      pb.position.set(0, 0.97, -0.01); pb.rotation.x = -0.15; g.add(pb);
      const scr = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.28, 0.02), new THREE.MeshStandardMaterial({ color: 0x002244, emissive: 0x004488, emissiveIntensity: 1.2, roughness: 0.8 }));
      scr.position.set(0, 0.97, 0.07); scr.rotation.x = -0.15; g.add(scr);
      const env = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.03), new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 0.9 }));
      env.position.set(0, 0.97, 0.14); env.rotation.x = -0.15; g.add(env);
      const gr = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 24), new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 1.0, transparent: true, opacity: 0.7 }));
      gr.position.y = 0.97; gr.rotation.x = -0.15; g.add(gr);
      for (let i = 0; i < 3; i++) {
        const w = new THREE.Mesh(new THREE.TorusGeometry(0.18 + i * 0.14, 0.025, 5, 16), new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 0.8 - i * 0.2, transparent: true, opacity: 0.6 - i * 0.15 }));
        w.rotation.x = Math.PI / 2; w.position.set(0, 2.0 + i * 0.22, 0);
        w.userData.waveIndex = i; w.userData.isWave = true; g.add(w);
      }
      g.position.set(10, 0.09, -18); scene.add(g); interactableObjects.push(g);
    })();

    /* ══════════════════════════════════════════════
       4. SKILLS — 技能樹
    ══════════════════════════════════════════════ */
    (function buildSkills() {
      const g = new THREE.Group(); g.name = 'skills';
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 2.0, 8), goldMat({ roughness: 0.3 }));
      trunk.position.y = 1.0; trunk.castShadow = true; g.add(trunk);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.1, 6), darkMat({ color: 0x0C0C1E, metalness: 0.8 }));
      base.castShadow = base.receiveShadow = true; g.add(base);
      const bg = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.03, 6, 20), new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 }));
      bg.rotation.x = Math.PI / 2; bg.position.y = 0.05; g.add(bg);
      const branches = [
        { x: 0, y: 2.8, z: 0, r: 0.32 }, { x: -1.4, y: 2.2, z: 0.2, r: 0.22 },
        { x: 1.4, y: 2.0, z: -0.2, r: 0.22 }, { x: -0.8, y: 3.5, z: 0.6, r: 0.18 },
        { x: 0.9, y: 3.4, z: -0.5, r: 0.18 }, { x: 0, y: 4.1, z: 0.3, r: 0.15 }
      ];
      const nodeMat = goldMat({ roughness: 0.1, emissive: 0xD4AF37, emissiveIntensity: 0.4 });
      const nodes = branches.map(b => {
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(b.r, 0), nodeMat.clone());
        m.position.set(b.x, b.y, b.z); m.castShadow = true; g.add(m); return m;
      });
      const lm = new THREE.LineBasicMaterial({ color: 0xD4AF37, transparent: true, opacity: 0.5 });
      [[0,1],[0,2],[1,3],[2,4],[0,5]].forEach(([a, b]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(branches[a].x, branches[a].y, branches[a].z), new THREE.Vector3(branches[b].x, branches[b].y, branches[b].z)]);
        g.add(new THREE.Line(geo, lm));
      });
      const ag = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshStandardMaterial({ color: 0xF5E090, emissive: 0xF5E090, emissiveIntensity: 1.5, transparent: true, opacity: 0.35 }));
      ag.position.set(0, 4.1, 0.3); g.add(ag);
      g.userData.nodes = nodes;
      g.position.set(-6, 0, -4); scene.add(g); interactableObjects.push(g);
    })();

    /* ══════════════════════════════════════════════
       5. SERVICE — VIP 服務櫃檯
    ══════════════════════════════════════════════ */
    (function buildService() {
      const g = new THREE.Group(); g.name = 'service';
      const ctr = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.5, 1.4), darkMat({ color: 0x0A0A1E, metalness: 0.65, roughness: 0.3 }));
      ctr.position.y = 0.75; ctr.castShadow = ctr.receiveShadow = true; g.add(ctr);
      const te = new THREE.Mesh(new THREE.BoxGeometry(4.52, 0.05, 1.42), goldMat({ roughness: 0.15 }));
      te.position.y = 1.525; g.add(te);
      for (let i = 0; i < 3; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(4.52, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 }));
        st.position.set(0, 0.35 + i * 0.5, 0.72); g.add(st);
      }
      const ms = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.5, 6), goldMat({ roughness: 0.3 }));
      ms.position.set(-1.2, 1.8, 0); ms.castShadow = true; g.add(ms);
      const mb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.95, 0.1), darkMat({ metalness: 0.8, roughness: 0.15 }));
      mb.position.set(-1.2, 2.37, 0); mb.castShadow = true; g.add(mb);
      const scr = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.82, 0.06), new THREE.MeshStandardMaterial({ color: 0x002233, emissive: 0x003355, emissiveIntensity: 1.0, roughness: 0.8 }));
      scr.position.set(-1.2, 2.37, 0.07); g.add(scr);
      const vip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.04), new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 1.2 }));
      vip.position.set(-1.2, 2.37, 0.11); g.add(vip);
      const bb = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.08, 10), goldMat({ roughness: 0.2 }));
      bb.position.set(1.5, 1.54, 0.2); bb.castShadow = true; g.add(bb);
      const bdy = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), goldMat({ emissive: 0xD4AF37, emissiveIntensity: 0.3 }));
      bdy.position.set(1.5, 1.62, 0.2); bdy.rotation.x = Math.PI; bdy.castShadow = true; g.add(bdy);
      const bl = new THREE.Mesh(new THREE.BoxGeometry(4.52, 0.08, 1.42), new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 0.4, transparent: true, opacity: 0.6 }));
      bl.position.y = 0.04; g.add(bl);
      const sg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.1), goldMat({ roughness: 0.2 }));
      sg.position.set(0, 2.7, 0); sg.castShadow = true; g.add(sg);
      const st2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.08), new THREE.MeshStandardMaterial({ color: 0x04040C }));
      st2.position.set(0, 2.71, 0.07); g.add(st2);
      g.position.set(6, 0, -4); scene.add(g); interactableObjects.push(g);
    })();

    /* ══════════════════════════════════════════════
       TING-BOT — 可見的第三人稱機器人角色
       沿用首頁機器人 SVG 的金色科技感造型，由 hip / shoulder /
       head 多個樞紐群組組成，供行走循環與待機呼吸動畫驅動。
    ══════════════════════════════════════════════ */
    const character = new THREE.Group();
    character.name = 'tingbot';

    const botGoldMat  = goldMat({ roughness: 0.22, metalness: 0.85 });
    const botDarkMat  = darkMat({ color: 0x14142a, metalness: 0.55, roughness: 0.32 });
    const botPlateMat = darkMat({ color: 0x1c1c34, metalness: 0.45, roughness: 0.4 });
    const botEyeMat   = new THREE.MeshStandardMaterial({
      color: 0xFFF0C0, emissive: 0xFFE9A0, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.1
    });
    const botCoreMat  = new THREE.MeshStandardMaterial({
      color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 1.1, transparent: true, opacity: 0.85
    });

    /* bob：承載呼吸 / 走路上下彈動的群組 */
    const bob = new THREE.Group();
    bob.position.y = 0.95;
    character.add(bob);

    /* 軀幹 */
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.4), botDarkMat);
    torso.position.y = 0.5; torso.castShadow = true; bob.add(torso);
    const torsoTrim = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.44), botGoldMat);
    torsoTrim.position.y = 0.86; bob.add(torsoTrim);
    const chestCore = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), botCoreMat);
    chestCore.position.set(0, 0.55, -0.21); bob.add(chestCore);

    /* 頭部群組（可獨立轉動／點頭） */
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.12, 0);
    bob.add(headGroup);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.42), botPlateMat);
    head.castShadow = true; headGroup.add(head);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.18, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x082838, emissive: 0x0a3850, emissiveIntensity: 0.6, roughness: 0.5 })
    );
    visor.position.set(0, 0.01, -0.22); headGroup.add(visor);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), botEyeMat.clone());
    eyeL.position.set(-0.1, 0.01, -0.245); headGroup.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), botEyeMat.clone());
    eyeR.position.set(0.1, 0.01, -0.245); headGroup.add(eyeR);
    const headTrim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.46), botGoldMat);
    headTrim.position.y = 0.21; headGroup.add(headTrim);
    [-1, 1].forEach(side => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.12), botGoldMat);
      fin.position.set(side * 0.27, 0.02, -0.02); fin.castShadow = true; headGroup.add(fin);
    });

    /* 手臂（肩部樞紐 → 上臂 → 下臂 → 手） */
    function buildArm(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.42, 0.82, 0);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.4, 8), botDarkMat);
      upper.position.y = -0.2; upper.castShadow = true; pivot.add(upper);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), botGoldMat);
      elbow.position.y = -0.4; pivot.add(elbow);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.38, 8), botPlateMat);
      lower.position.y = -0.59; lower.castShadow = true; pivot.add(lower);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.13), botGoldMat);
      hand.position.y = -0.8; hand.castShadow = true; pivot.add(hand);
      bob.add(pivot);
      return pivot;
    }
    const armL = buildArm(-1);
    const armR = buildArm(1);

    /* 雙腿（髖部樞紐 → 大腿 → 小腿 → 腳，直接掛在 character 上，
       不隨 bob 上下彈動，僅自身依步態旋轉，模擬真實走路重心） */
    function buildLeg(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.17, 0.95, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.095, 0.46, 8), botDarkMat);
      thigh.position.y = -0.23; thigh.castShadow = true; pivot.add(thigh);
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), botGoldMat);
      knee.position.y = -0.46; pivot.add(knee);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.42, 8), botPlateMat);
      shin.position.y = -0.67; shin.castShadow = true; pivot.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.3), botGoldMat);
      foot.position.set(0, -0.91, 0.04); foot.castShadow = true; pivot.add(foot);
      character.add(pivot);
      return pivot;
    }
    const legL = buildLeg(-1);
    const legR = buildLeg(1);

    /* 落地接觸陰影（廉價假 AO，隨彈跳高度微調透明度增加重量感） */
    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.015;
    character.add(contactShadow);

    /* 腳底光環（呼應行動版 holo-ring 的金色光暈） */
    const charRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.022, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0xD4AF37, emissive: 0xD4AF37, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 })
    );
    charRing.rotation.x = Math.PI / 2;
    charRing.position.y = 0.02;
    character.add(charRing);

    character.position.set(0, 0, 26);
    character.rotation.y = 0;
    scene.add(character);

    /* ── 腳步特效：輕量物件池，重複利用 2 個發光圓環 ── */
    const FOOT_RING_COUNT = 2;
    const footRings = [];
    for (let i = 0; i < FOOT_RING_COUNT; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.07, 0.15, 16),
        new THREE.MeshBasicMaterial({ color: 0xD4AF37, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      scene.add(ring);
      footRings.push({ mesh: ring, life: 999 });
    }
    let footRingIdx = 0;
    function spawnFootstep(sideX) {
      const fr = footRings[footRingIdx % FOOT_RING_COUNT];
      footRingIdx++;
      const local = new THREE.Vector3(sideX, 0.03, 0.05);
      character.localToWorld(local);
      fr.mesh.position.set(local.x, 0.03, local.z);
      fr.mesh.scale.set(0.5, 0.5, 0.5);
      fr.mesh.material.opacity = 0.5;
      fr.mesh.visible = true;
      fr.life = 0;
    }
    function updateFootRings(dt) {
      footRings.forEach(fr => {
        if (!fr.mesh.visible) return;
        fr.life += dt;
        const t = fr.life / 0.55;
        if (t >= 1) { fr.mesh.visible = false; return; }
        fr.mesh.material.opacity = 0.5 * (1 - t);
        const s = 0.5 + t * 0.6;
        fr.mesh.scale.set(s, s, s);
      });
    }

    /* ── 行走 / 待機動畫：依 velocity 大小切換步態與呼吸 ── */
    let walkCycle     = 0;
    let footPhaseLast  = 0;
    function animateCharacter(dt, elapsed) {
      const speed  = velocity.length();
      const moving = speed > 0.45;

      if (moving) {
        walkCycle += dt * (5.5 + speed * 0.5);
        const swing = Math.sin(walkCycle);
        legL.rotation.x =  swing * 0.55;
        legR.rotation.x = -swing * 0.55;
        armL.rotation.x = -swing * 0.4;
        armR.rotation.x =  swing * 0.4;
        bob.position.y  = 0.95 + Math.abs(Math.cos(walkCycle)) * 0.05;
        headGroup.rotation.z = swing * 0.025;

        if (swing > 0.92 && footPhaseLast <= 0.92) spawnFootstep(0.17);
        if (swing < -0.92 && footPhaseLast >= -0.92) spawnFootstep(-0.17);
        footPhaseLast = swing;
      } else {
        legL.rotation.x += (0 - legL.rotation.x) * Math.min(1, dt * 8);
        legR.rotation.x += (0 - legR.rotation.x) * Math.min(1, dt * 8);
        armL.rotation.x += (0 - armL.rotation.x) * Math.min(1, dt * 8);
        armR.rotation.x += (0 - armR.rotation.x) * Math.min(1, dt * 8);
        bob.position.y  = 0.95 + Math.sin(elapsed * 1.6) * 0.03;
        headGroup.rotation.z += (0 - headGroup.rotation.z) * Math.min(1, dt * 6);
        headGroup.rotation.y  = Math.sin(elapsed * 0.55) * 0.08;
        footPhaseLast = 0;
      }

      const glow = 1.3 + Math.sin(elapsed * 3) * 0.35;
      eyeL.material.emissiveIntensity = glow;
      eyeR.material.emissiveIntensity = glow;
      chestCore.material.opacity = 0.7 + Math.sin(elapsed * 2.2) * 0.15;

      const ringPulse = 1 + Math.sin(elapsed * 2) * 0.06;
      charRing.scale.set(ringPulse, 1, ringPulse);
      charRing.material.opacity = 0.35 + Math.sin(elapsed * 2) * 0.12;
      charRing.rotation.z += dt * 0.4;

      contactShadow.material.opacity = Math.max(0.12, 0.32 - (bob.position.y - 0.95) * 1.6);

      updateFootRings(dt);
    }

    /* ══════════════════════════════════════════════
       微光軌跡 — 連接五個互動物件
    ══════════════════════════════════════════════ */
    const pathPoints = [
      new THREE.Vector3(0, 1.09, -12),    // about（書桌）
      new THREE.Vector3(-10, 2.25, -18),  // portfolio（書櫃）
      new THREE.Vector3(-6, 0, -4),       // skills（技能樹）
      new THREE.Vector3(6, 0, -4),        // service（服務台）
      new THREE.Vector3(10, 0.09, -18)    // contact（電話）
    ];
    const curve = new THREE.CatmullRomCurve3(pathPoints);
    const curvePoints = curve.getPoints(50);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const curveMat = new THREE.LineBasicMaterial({
      color: 0xD4AF37,
      transparent: true,
      opacity: 0.15
    });
    const curveLine = new THREE.Line(curveGeo, curveMat);
    scene.add(curveLine);

    /* ══════════════════════════════════════════════
       MODAL 資料
    ══════════════════════════════════════════════ */
    const OBJECT_META = {
      portfolio: { icon: '💼', title: '作品集', desc: '探索 Ting 精心打造的數位設計與開發作品，從品牌視覺到互動體驗，每件作品都是一次挑戰與突破。', href: 'portfolio.html' },
      about:     { icon: '👤', title: '關於我', desc: '認識 Ting — 一位熱愛前端美學與使用者體驗的數位工程師，這裡有我的故事、理念與創作哲學。',     href: 'about.html'     },
      contact:   { icon: '✉️', title: '聯絡我', desc: '有任何合作提案、問題或想法嗎？隨時歡迎傳訊給 Ting，數位管家全天候上線待命。',                 href: 'contact.html'   },
      skills:    { icon: '⚡', title: '技能',   desc: '從 HTML/CSS/JS 到 Three.js、UI/UX 設計，探索 Ting 的完整技術棧與專業能力樹狀圖。',            href: 'skills.html'    },
      service:   { icon: '📝', title: '服務方案', desc: '提供客製化網頁開發、品牌視覺設計及數位顧問服務。查看各方案內容，為你量身打造最佳解決方案。',   href: 'eco.html'       }
    };
    const LABEL_ZH = { portfolio: '作品集', about: '關於我', contact: '聯絡我', skills: '技能', service: '服務' };

    /* ══════════════════════════════════════════════
       MODAL 控制（含鍵盤可達性：ESC 關閉、Tab 焦點循環）
    ══════════════════════════════════════════════ */
    let lastFocused = null;
    function openModal(name) {
      const meta = OBJECT_META[name]; if (!meta) return;
      modalIcon.textContent  = meta.icon;
      modalTitle.textContent = meta.title;
      modalDesc.textContent  = meta.desc;
      modalLink.href         = meta.href;
      modalLink.textContent  = `前往${meta.title} →`;
      modal.classList.add('open');
      lastFocused = document.activeElement;
      modalClose.focus();
    }
    function closeModal() {
      modal.classList.remove('open');
      currentState = 'FREE_ROAM';
      zoomTarget = zoomFrom = null;
      tooltip.style.opacity = '0';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }
    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') { closeModal(); return; }
      // Tab 焦點陷阱：讓焦點維持在 modal 內，避免跳到背景 3D canvas
      if (e.key === 'Tab') {
        const focusables = modal.querySelectorAll('a[href], button:not([disabled])');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last  = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    });

    /* ══════════════════════════════════════════════
       RAYCASTER & HOVER
    ══════════════════════════════════════════════ */
    const raycaster  = new THREE.Raycaster();
    const mouse      = new THREE.Vector2(-99, -99);
    let   hoveredGroup = null;
    const meshToGroup  = new Map();
    const allMeshes    = [];

    interactableObjects.forEach(grp => {
      grp.traverse(child => {
        if (child.isMesh) { allMeshes.push(child); meshToGroup.set(child, grp); }
      });
    });

    function setGroupEmissive(group, intensity) {
      group.traverse(child => {
        if (!child.isMesh || !child.material) return;
        const mat = child.material;
        if (!child.userData._origEmissive) {
          child.userData._origEmissive    = mat.emissive.clone();
          child.userData._origEmissiveInt = mat.emissiveIntensity || 0;
        }
        if (intensity > 0) {
          mat.emissive.set(0x664400);
          mat.emissiveIntensity = Math.max(child.userData._origEmissiveInt, 0.2) + intensity;
        } else {
          mat.emissive.copy(child.userData._origEmissive);
          mat.emissiveIntensity = child.userData._origEmissiveInt;
        }
      });
    }

    /* ── 點擊回饋：物體短暫縮放 ── */
    function pulseGroup(group) {
      const startScale = group.scale.x;
      const t0 = performance.now();
      function step() {
        const e = (performance.now() - t0) / 220;
        if (e >= 1) { group.scale.setScalar(startScale); return; }
        const s = startScale + Math.sin(e * Math.PI) * 0.09;
        group.scale.setScalar(s);
        requestAnimationFrame(step);
      }
      step();
    }

    /* ══════════════════════════════════════════════
       INPUT — 滑鼠 & 鍵盤
    ══════════════════════════════════════════════ */
    const keys = { w: false, a: false, s: false, d: false, space: false };
    let mouseMoved = false;

    window.addEventListener('mousemove', e => {
      mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseMoved = true;

      tooltip.style.transform = `translate3d(${e.clientX + 16}px, ${e.clientY - 10}px, 0)`;

      if (orbit.active && currentState === 'FREE_ROAM') {
        const dx = e.clientX - orbit.lastX;
        const dy = e.clientY - orbit.lastY;
        orbit.yaw   -= dx * ORBIT_SPEED;
        orbit.pitch  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, orbit.pitch - dy * ORBIT_SPEED));
        orbit.lastX  = e.clientX;
        orbit.lastY  = e.clientY;
      }
    }, { passive: true });

    window.addEventListener('mousedown', e => {
      if (e.button === 0 && currentState === 'FREE_ROAM') {
        orbit.active = true;
        orbit.lastX  = e.clientX;
        orbit.lastY  = e.clientY;
        threeCanvas.style.cursor = 'grabbing';
      }
    });
    window.addEventListener('mouseup', () => {
      orbit.active = false;
      threeCanvas.style.cursor = hoveredGroup ? 'pointer' : 'grab';
    });

    let clickStartX = 0, clickStartY = 0;
    window.addEventListener('mousedown', e => { clickStartX = e.clientX; clickStartY = e.clientY; });
    window.addEventListener('mouseup', e => {
      const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
      if (dist > 5) return;
      if (currentState !== 'FREE_ROAM') return;
      if (modal.classList.contains('open')) return;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(allMeshes, false);
      if (hits.length > 0) {
        const grp = meshToGroup.get(hits[0].object);
        if (grp) { pulseGroup(grp); startZoom(grp); }
      }
    });

    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup')    keys.w = true;
      if (k === 'a' || k === 'arrowleft')  keys.a = true;
      if (k === 's' || k === 'arrowdown')  keys.s = true;
      if (k === 'd' || k === 'arrowright') keys.d = true;
      if (k === ' ' || e.code === 'Space') { keys.space = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup')    keys.w = false;
      if (k === 'a' || k === 'arrowleft')  keys.a = false;
      if (k === 's' || k === 'arrowdown')  keys.s = false;
      if (k === 'd' || k === 'arrowright') keys.d = false;
      if (k === ' ' || e.code === 'Space') keys.space = false;
    });

    threeCanvas.style.cursor = 'grab';

    /* ══════════════════════════════════════════════
       ZOOM 電影運鏡
    ══════════════════════════════════════════════ */
    function startZoom(group) {
      if (currentState === 'ZOOMED_IN') return;
      currentState = 'ZOOMED_IN';
      velocity.set(0, 0);
      velocityY = 0;

      const box    = new THREE.Box3().setFromObject(group);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const toObj    = center.clone().sub(camActual.pos).normalize();
      const camTarget = center.clone().sub(toObj.multiplyScalar(4.5));
      camTarget.y = Math.max(center.y + 1.5, 5);

      zoomTarget = { camPos: camTarget, lookAt: center.clone().add(new THREE.Vector3(0, 0.5, 0)) };
      zoomFrom   = { camPos: camActual.pos.clone(), lookAt: camActual.look.clone() };
      zoomProgress = 0;
      tooltip.style.opacity = '0';

      setTimeout(() => { if (currentState === 'ZOOMED_IN') openModal(group.name); }, 1000);
    }

    /* ══════════════════════════════════════════════
       角色移動 — 相機相對 WASD（第三人稱跟隨）
    ══════════════════════════════════════════════ */
    const ACCEL     = 600;
    const FRICTION  = 0.92;
    const MAX_SPEED = 9;
    const BOUNDS    = 33;

    /* ── 跳躍物理：重力 / 起跳力 / 落地狀態 ── */
    const GRAVITY     = -30;
    const JUMP_FORCE  = 11;
    let   velocityY   = 0;
    let   isGrounded  = true;

    /* ── 碰撞安全層：避免角色直接穿模走進家具內部 ──
       半徑取自各物件實際外形，並外擴角色體積作緩衝 */
    const PLAYER_RADIUS = 0.55;
    const OBSTACLES = [
      { x: 0,   z: -12, hx: 2.2, hz: 1.3 },  // about   書桌
      { x: -10, z: -18, hx: 1.8, hz: 0.6 },  // portfolio 書櫃
      { x: 10,  z: -18, hx: 0.9, hz: 0.9 },  // contact 電話
      { x: -6,  z: -4,  hx: 0.6, hz: 0.6 },  // skills  技能樹
      { x: 6,   z: -4,  hx: 2.5, hz: 0.9 },  // service 服務台
    ];

    function resolveObstacleCollision(nx, nz) {
      for (const o of OBSTACLES) {
        const hx = o.hx + PLAYER_RADIUS, hz = o.hz + PLAYER_RADIUS;
        const dx = nx - o.x, dz = nz - o.z;
        if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
          const overlapX = hx - Math.abs(dx);
          const overlapZ = hz - Math.abs(dz);
          if (overlapX < overlapZ) nx = o.x + Math.sign(dx || 1) * hx;
          else                     nz = o.z + Math.sign(dz || 1) * hz;
        }
      }
      return { x: nx, z: nz };
    }

    const CHASE_RADIUS = 8.5;
    const CHASE_HEIGHT = 4.2;

    function updateCharacterMovement(dt) {
      if (currentState !== 'FREE_ROAM') return;

      /* 依目前鏡頭朝向（orbit.yaw）換算前後左右，操作手感更直覺 */
      const yaw    = orbit.yaw;
      const fwdX   = -Math.sin(yaw), fwdZ   = -Math.cos(yaw);
      const rightX =  Math.cos(yaw), rightZ = -Math.sin(yaw);

      let ix = 0, iz = 0;
      if (keys.w) { ix += fwdX;   iz += fwdZ;   }
      if (keys.s) { ix -= fwdX;   iz -= fwdZ;   }
      if (keys.a) { ix -= rightX; iz -= rightZ; }
      if (keys.d) { ix += rightX; iz += rightZ; }

      const len = Math.hypot(ix, iz);
      if (len > 0.001) {
        ix /= len; iz /= len;
        velocity.x += ix * ACCEL * dt;
        velocity.y += iz * ACCEL * dt; // .y 欄位借用作世界 Z 軸分量
      }

      if (velocity.length() > MAX_SPEED) velocity.normalize().multiplyScalar(MAX_SPEED);
      const frictionFrame = Math.pow(FRICTION, dt / (1 / 60));
      velocity.multiplyScalar(frictionFrame);

      const nx = Math.max(-BOUNDS, Math.min(BOUNDS, character.position.x + velocity.x * dt));
      const nz = Math.max(-BOUNDS, Math.min(BOUNDS, character.position.z + velocity.y * dt));
      const resolved = resolveObstacleCollision(nx, nz);
      character.position.x = resolved.x;
      character.position.z = resolved.z;

      /* 跳躍 + 重力：空白鍵起跳，落地前持續受重力加速下墜 */
      if (keys.space && isGrounded) {
        velocityY  = JUMP_FORCE;
        isGrounded = false;
      }
      velocityY += GRAVITY * dt;
      character.position.y += velocityY * dt;
      if (character.position.y <= 0) {
        character.position.y = 0;
        velocityY  = 0;
        isGrounded = true;
      }

      /* 角色平滑轉向至移動方向（最短路徑角度插值） */
      if (velocity.length() > 0.35) {
        const targetYaw = Math.atan2(-velocity.x, -velocity.y);
        let diff = targetYaw - character.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        character.rotation.y += diff * Math.min(1, dt * 9);
      }

      /* 未手動拖曳鏡頭時，相機緩緩回正到角色背後（電玩式自動跟隨） */
      if (!orbit.active && len > 0.001) {
        let camDiff = character.rotation.y - orbit.yaw;
        camDiff = Math.atan2(Math.sin(camDiff), Math.cos(camDiff));
        orbit.yaw += camDiff * Math.min(1, dt * 1.6);
      }
    }

    /* 第三人稱跟隨相機：依 orbit.yaw / pitch 圍繞角色運鏡 */
    const _chaseCamOffset   = new THREE.Vector3();
    const _chaseLookForward = new THREE.Vector3();
    const _chaseLookUp      = new THREE.Vector3(0, 1.5, 0);
    function updateChaseCamera() {
      const yaw = orbit.yaw, pitch = orbit.pitch;
      _chaseCamOffset.set(
        Math.sin(yaw) * Math.cos(pitch) * CHASE_RADIUS,
        CHASE_HEIGHT + Math.sin(pitch) * 3.4,
        Math.cos(yaw) * Math.cos(pitch) * CHASE_RADIUS
      );
      camDesired.pos.copy(character.position).add(_chaseCamOffset);

      _chaseLookForward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      camDesired.look.copy(character.position)
        .add(_chaseLookUp)
        .addScaledVector(_chaseLookForward, 1.3);
    }

    /* ══════════════════════════════════════════════
       ANIMATE LOOP — 分頁不可見時暫停 + 自適應 DPR + 錯誤邊界
    ══════════════════════════════════════════════ */
    const clock = new THREE.Clock();
    /* rafId 已於函式頂部宣告，這裡沿用同一個變數 */
    let shadowFrame = 0;
    const SHADOW_INTERVAL = 6; /* 每 6 幀更新一次陰影，省 GPU */

    let dprFrameTimeSum = 0;
    let dprFrameCount   = 0;
    const DPR_SAMPLE_FRAMES = 90;
    function adaptDPR(dt) {
      if (currentDPR <= 1) return;
      dprFrameTimeSum += dt;
      dprFrameCount++;
      if (dprFrameCount < DPR_SAMPLE_FRAMES) return;
      const avgFPS = 1 / (dprFrameTimeSum / dprFrameCount);
      dprFrameTimeSum = 0; dprFrameCount = 0;
      if (avgFPS < 45) {
        currentDPR = Math.max(1, currentDPR - 0.5);
        renderer.setPixelRatio(currentDPR);
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      } else if (rafId === null) {
        clock.getDelta();
        animate();
      }
    });

    function animate() {
      if (document.hidden) { rafId = null; return; }
      rafId = requestAnimationFrame(animate);

      try {
        const dt      = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.elapsedTime;
        adaptDPR(dt);

        if (introActive) {
          introProgress = Math.min(1, introProgress + dt * 0.6);
          const t = easeOutExpo(introProgress);
          camActual.pos.lerpVectors(INTRO_FROM, INTRO_TO, t);
          camActual.look.lerpVectors(INTRO_LOOK_FROM, INTRO_LOOK_TO, t);
          camera.position.copy(camActual.pos);
          camera.lookAt(camActual.look);
          if (introProgress >= 1) { introActive = false; currentState = 'FREE_ROAM'; }
          animateObjects(elapsed);
          animateCharacter(dt, elapsed);
          tickParticles(elapsed);
          shadowFrame = (shadowFrame + 1) % SHADOW_INTERVAL;
          if (shadowFrame === 0) renderer.shadowMap.needsUpdate = true;
          renderFrame();
          return;
        }

        updateCharacterMovement(dt);
        animateCharacter(dt, elapsed);

        if (currentState === 'FREE_ROAM') {
          updateChaseCamera();
        } else if (zoomTarget && zoomProgress < 1) {
          zoomProgress = Math.min(1, zoomProgress + dt * 1.1);
          const t = easeInOutQuart(zoomProgress);
          camDesired.pos.lerpVectors(zoomFrom.camPos, zoomTarget.camPos, t);
          camDesired.look.lerpVectors(zoomFrom.lookAt, zoomTarget.lookAt, t);
        }

        const alphaPos  = 1 - Math.exp(-CAM_SMOOTH_POS  * dt);
        const alphaLook = 1 - Math.exp(-CAM_SMOOTH_LOOK * dt);
        camActual.pos.lerp(camDesired.pos,   alphaPos);
        camActual.look.lerp(camDesired.look, alphaLook);

        camera.position.copy(camActual.pos);
        camera.lookAt(camActual.look);

        if (mouseMoved && currentState === 'FREE_ROAM' && !orbit.active) {
          mouseMoved = false;
          raycaster.setFromCamera(mouse, camera);
          const hits     = raycaster.intersectObjects(allMeshes, false);
          const newHover = hits.length > 0 ? meshToGroup.get(hits[0].object) : null;

          if (newHover !== hoveredGroup) {
            if (hoveredGroup) setGroupEmissive(hoveredGroup, 0);
            if (newHover)     setGroupEmissive(newHover, 0.32);
            hoveredGroup = newHover;
            threeCanvas.style.cursor = hoveredGroup ? 'pointer' : 'grab';

            if (hoveredGroup) {
              tooltip.textContent   = LABEL_ZH[hoveredGroup.name] || hoveredGroup.name;
              tooltip.style.opacity = '1';
            } else {
              tooltip.style.opacity = '0';
            }
          }
        }

        if (!REDUCED_MOTION) {
          animateObjects(elapsed);
          tickParticles(elapsed);
        }

        shadowFrame = (shadowFrame + 1) % SHADOW_INTERVAL;
        if (shadowFrame === 0) renderer.shadowMap.needsUpdate = true;

        renderFrame();
      } catch (err) {
        console.error('[3D scene] render error:', err);
      }
    }

    function tickParticles(t) {
      for (let i = 0; i < tickables.length; i++) tickables[i].userData.tick(t);
    }

    function easeInOutQuart(t) {
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }
    function easeOutExpo(t) {
      return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    /* ══════════════════════════════════════════════
       OBJECT ANIMATIONS
    ══════════════════════════════════════════════ */
    function animateObjects(t) {
      interactableObjects.forEach(g => {
        const p = t * 0.8;
        switch (g.name) {
          case 'portfolio':
            g.rotation.y = Math.sin(p * 0.7) * 0.04;
            g.position.y = 2.25 + Math.sin(t * 0.6) * 0.06;
            break;
          case 'about':
            g.position.y = 1.09 + Math.sin(t * 0.5) * 0.02;
            break;
          case 'contact':
            g.rotation.y = t * 0.5;
            g.traverse(child => {
              if (!child.userData.isWave) return;
              const s = 0.85 + 0.2 * Math.sin(t * 2.5 - child.userData.waveIndex * 0.8);
              child.scale.set(s, s, s);
              child.material.opacity = 0.3 + 0.3 * Math.sin(t * 2 - child.userData.waveIndex);
            });
            break;
          case 'skills':
            if (g.userData.nodes) {
              g.userData.nodes.forEach((node, i) => {
                node.rotation.x = t * (0.4 + i * 0.1);
                node.rotation.y = t * (0.3 + i * 0.12);
              });
            }
            g.rotation.y = Math.sin(t * 0.4) * 0.08;
            break;
          case 'service':
            g.rotation.y = Math.sin(p * 0.5) * 0.03;
            break;
        }
      });

      pointLight.intensity = 0.45 + 0.18 * Math.sin(t * 1.4) + 0.06 * Math.sin(t * 3.1);
      /* 地平線光暈也跟著彩虹色脈動 */
      const hh = (t * 18) % 360;
      horizonGlow.material.color.setHSL(hh / 360, 0.85, 0.32);
    }

    /* ══════════════════════════════════════════════
       RESIZE — rAF 節流 + 橫豎屏 orientationchange
    ══════════════════════════════════════════════ */
    let resizePending = false;
    function handleResize() {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => {
        resizePending = false;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(currentDPR);
        if (composer)  composer.setSize(window.innerWidth, window.innerHeight);
        if (bloomPass) bloomPass.resolution.set(window.innerWidth, window.innerHeight);
      });
    }
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    /* ── 3D 場景就緒：淡入 UI 提示、隱藏載入動畫 ── */
    if (sceneLabel) sceneLabel.classList.add('ready');
    if (wasdHint)   wasdHint.classList.add('ready');
    const loading3D = document.getElementById('loading3D');
    if (loading3D) loading3D.classList.add('is-hidden');

    /* ── 卸載時清理 ── */
    window.addEventListener('pagehide', () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    }, { once: true });

    /* ── START ── */
    setupBloom();
    animate();

    // #region agent log
    fetch('http://127.0.0.1:7601/ingest/e604be3b-d853-415c-a576-91302f009b10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1814ed'},body:JSON.stringify({sessionId:'1814ed',location:'index.Js:3d-ready',message:'3D init complete',data:{bloomAvailable:!!composer,interactableCount:interactableObjects.length},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  }
})();