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

/* ═══════════════════════════════════════════════════════════
   2D 背景 CANVAS — 弧線軌跡 + 光點
   手機版：主視覺背景，常駐繪製。
   桌面 3D 模式：被 three-canvas 完全遮蓋，不啟動繪製迴圈，
   省去白白運行的 rAF。
═══════════════════════════════════════════════════════════ */
(function () {
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
    scene.background = new THREE.Color(0x04040C);
    scene.fog = new THREE.Fog(0x04040C, 30, 80);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);

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
    scene.add(new THREE.AmbientLight(0xfff5cc, 0.35));

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
      s.castShadow = false; // 次要光源不投射陰影，省一次 shadow pass
      s.target.position.set(0, 0, 0);
      scene.add(s); scene.add(s.target);
      return s;
    }
    makeSpot(0xFFF5CC, 1.8, 10, 20, 10, Math.PI / 5, 0.4, 1.2);
    makeSpot(0xD4AF37, 1.2, -12, 16, 6, Math.PI / 6, 0.5, 1.4);

    const pointLight = new THREE.PointLight(0xD4AF37, 0.6, 30);
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
      const COUNT = 180;
      const positions = new Float32Array(COUNT * 3);
      const colors    = new Float32Array(COUNT * 3);
      const speeds    = new Float32Array(COUNT);
      const offsets   = new Float32Array(COUNT);
      const palette = [[0.831,0.686,0.216],[0.961,0.882,0.565],[1.0,0.902,0.8],[0.95,0.82,0.4],[0.78,0.62,0.18]];

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
        size: 0.09, transparent: true, opacity: 0.5,
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
       樹木 — 極簡花園世界
    ══════════════════════════════════════════════ */
    function createTree(x, z, scale = 1) {
      const g = new THREE.Group();
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3D2B1F, roughness: 0.9 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x2D6A4F, roughness: 0.8 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2*scale, 0.35*scale, 1.2*scale, 6), trunkMat);
      trunk.position.y = 0.6*scale; trunk.castShadow = true; trunk.receiveShadow = true; g.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.8*scale, 1.6*scale, 6), leafMat);
      crown.position.y = 1.6*scale + 0.4*scale; crown.castShadow = true; crown.receiveShadow = true; g.add(crown);
      const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.6*scale, 1.2*scale, 6), leafMat);
      crown2.position.y = 2.4*scale + 0.6*scale; crown2.castShadow = true; crown2.receiveShadow = true; g.add(crown2);
      g.position.set(x, 0, z);
      g.rotation.y = Math.random() * Math.PI * 2;
      return g;
    }

    const treePositions = [
      [-18,-25],[-22,-18],[-12,-30],[5,-32],[18,-28],[22,-20],
      [-25,-5],[-20,5],[25,-5],[20,5],[-15,10],[15,10],
      [-28,-12],[28,-12],[0,-35],[0,10]
    ];
    treePositions.forEach(([x,z]) => {
      scene.add(createTree(x, z, 0.6 + Math.random() * 0.6));
    });

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
    const keys = { w: false, a: false, s: false, d: false };
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
    });
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup')    keys.w = false;
      if (k === 'a' || k === 'arrowleft')  keys.a = false;
      if (k === 's' || k === 'arrowdown')  keys.s = false;
      if (k === 'd' || k === 'arrowright') keys.d = false;
    });

    threeCanvas.style.cursor = 'grab';

    /* ══════════════════════════════════════════════
       ZOOM 電影運鏡
    ══════════════════════════════════════════════ */
    function startZoom(group) {
      if (currentState === 'ZOOMED_IN') return;
      currentState = 'ZOOMED_IN';
      velocity.set(0, 0);

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

      character.position.x = Math.max(-BOUNDS, Math.min(BOUNDS, character.position.x + velocity.x * dt));
      character.position.z = Math.max(-BOUNDS, Math.min(BOUNDS, character.position.z + velocity.y * dt));

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
    function updateChaseCamera() {
      const yaw = orbit.yaw, pitch = orbit.pitch;
      const offset = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch) * CHASE_RADIUS,
        CHASE_HEIGHT + Math.sin(pitch) * 3.4,
        Math.cos(yaw) * Math.cos(pitch) * CHASE_RADIUS
      );
      camDesired.pos.copy(character.position).add(offset);

      const lookForward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      camDesired.look.copy(character.position)
        .add(new THREE.Vector3(0, 1.5, 0))
        .addScaledVector(lookForward, 1.3);
    }

    /* ══════════════════════════════════════════════
       ANIMATE LOOP — 分頁不可見時暫停 + 自適應 DPR + 錯誤邊界
    ══════════════════════════════════════════════ */
    const clock = new THREE.Clock();
    /* rafId 已於函式頂部宣告，這裡沿用同一個變數 */
    let shadowFrame = 0;
    const SHADOW_INTERVAL = 3;

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
          renderer.render(scene, camera);
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

        renderer.render(scene, camera);
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

      pointLight.intensity = 0.55 + 0.18 * Math.sin(t * 1.4) + 0.06 * Math.sin(t * 3.1);
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
    animate();
  }
})();