/* ═══════════════════════════════════════════════════════════
   裝置偵測 & 模式切換（最優先執行，避免 FOUC / 資源浪費）
   - 手機 (< 768px)：完全不載入 three.js，執行機器人 + 拋擲動畫
     + 2D 背景弧線，省電不發燙。
   - 桌面 (>= 768px) 且支援 WebGL：動態載入 three.js，
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
      }, 2200));
    }, 2000));
  }

  /* 分頁不可見時暫停計時器，避免回到分頁時動畫一次性疊加觸發 */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimers();
  });

  runThrowSequence();
})();

/* ═══════════════════════════════════════════════════════════
   漢堡選單互動（手機 / 桌面共用）
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
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(!btn.classList.contains('active')); }
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

  function nextLine() {
    bubble.style.opacity = '0';
    bubble.style.transform = 'scale(0.9) translateY(4px)';
    setTimeout(() => {
      idx = (idx + 1) % lines.length;
      bubble.textContent = lines[idx];
      bubble.style.opacity = '1';
      bubble.style.transform = 'scale(1) translateY(0)';
    }, 280);
  }

  // 首次顯示後每 3.5s 切換
  setTimeout(() => {
    bubble.style.transition = 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.22,1,0.36,1)';
    setInterval(nextLine, 3500);
  }, 4000);
})();

/* ═══════════════════════════════════════════════════════════
   桌面版：動態載入 three.js → 啟動 3D 個人空間 + WASD 自由走動
   - 手機完全不會執行到這裡（USE_3D 為 false，整段提前返回）
   - three.js 僅在桌面下載/解析/執行，避免手機消耗額外流量與電力
═══════════════════════════════════════════════════════════ */
(function () {
  if (!USE_3D) return;

  const THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

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
    .then(() => initDesktop3D())
    .catch(() => {
      // three.js 載入失敗（離線或 CDN 被擋）：退回機器人 + 拋擲動畫
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
    const camDesired = { pos: new THREE.Vector3(0, 28, 45), look: new THREE.Vector3(0, 0, -10) };

    const INTRO_FROM  = new THREE.Vector3(0, 28, 40);
    const INTRO_TO    = new THREE.Vector3(0, 28, 45);
    let introProgress = 0;
    const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let introActive   = !REDUCED_MOTION;
    camActual.pos.copy(REDUCED_MOTION ? INTRO_TO : INTRO_FROM);

    let currentState  = REDUCED_MOTION ? 'FREE_ROAM' : 'INTRO';
    let zoomTarget    = null;
    let zoomProgress  = 0;
    let zoomFrom      = null;

    const velocity = new THREE.Vector2(0, 0);

    const orbit = { active: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0 };
    const ORBIT_SPEED = 0.007;
    const PITCH_MIN   = -0.8;
    const PITCH_MAX   = 0.8;

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
    dirLight.shadow.mapSize.width = dirLight.shadow.mapSize.height = 512;
    Object.assign(dirLight.shadow.camera, { near: 0.5, far: 50, left: -16, right: 16, top: 16, bottom: -16 });
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
       MODAL 控制（含基本鍵盤可達性）
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
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
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
       WASD — dt-based 移動
    ══════════════════════════════════════════════ */
    const ACCEL     = 600;
    const FRICTION  = 0.92;
    const MAX_SPEED = 12;
    const BOUNDS    = 35;

    function updateWASD(dt) {
      if (currentState !== 'FREE_ROAM') return;

      if (keys.w) velocity.y -= ACCEL * dt;
      if (keys.s) velocity.y += ACCEL * dt;
      if (keys.a) velocity.x += ACCEL * dt;
      if (keys.d) velocity.x -= ACCEL * dt;

      if (velocity.length() > MAX_SPEED) velocity.normalize().multiplyScalar(MAX_SPEED);

      const frictionFrame = Math.pow(FRICTION, dt / (1 / 60));
      velocity.multiplyScalar(frictionFrame);

      camDesired.pos.x = Math.max(-BOUNDS, Math.min(BOUNDS, camDesired.pos.x + velocity.x * dt));
      camDesired.pos.z = Math.max(-BOUNDS, Math.min(BOUNDS, camDesired.pos.z + velocity.y * dt));
    }

    /* ══════════════════════════════════════════════
       ANIMATE LOOP — 分頁不可見時暫停 + 自適應 DPR + 錯誤邊界
    ══════════════════════════════════════════════ */
    const clock = new THREE.Clock();
    let rafId = null;
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
          camActual.look.lerp(new THREE.Vector3(0, 2, -4), t * 0.1);
          camera.position.copy(camActual.pos);
          camera.lookAt(camActual.look);
          if (introProgress >= 1) { introActive = false; currentState = 'FREE_ROAM'; }
          animateObjects(elapsed);
          tickParticles(elapsed);
          shadowFrame = (shadowFrame + 1) % SHADOW_INTERVAL;
          if (shadowFrame === 0) renderer.shadowMap.needsUpdate = true;
          renderer.render(scene, camera);
          return;
        }

        updateWASD(dt);

        if (zoomTarget && zoomProgress < 1) {
          zoomProgress = Math.min(1, zoomProgress + dt * 1.1);
          const t = easeInOutQuart(zoomProgress);
          camDesired.pos.lerpVectors(zoomFrom.camPos, zoomTarget.camPos, t);
          camDesired.look.lerpVectors(zoomFrom.lookAt, zoomTarget.lookAt, t);
        }

        const orbitOffset = new THREE.Vector3(
          Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * 2,
          Math.sin(orbit.pitch) * 2,
          Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * 2 - 2
        );

        const targetPos = camDesired.pos.clone().add(
          currentState === 'FREE_ROAM' ? orbitOffset : new THREE.Vector3()
        );

        const alphaPos  = 1 - Math.exp(-CAM_SMOOTH_POS  * dt);
        const alphaLook = 1 - Math.exp(-CAM_SMOOTH_LOOK * dt);
        camActual.pos.lerp(targetPos,        alphaPos);
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

    /* ── 3D 場景就緒：淡入 UI 提示 ── */
    if (sceneLabel) sceneLabel.classList.add('ready');
    if (wasdHint)   wasdHint.classList.add('ready');

    /* ── 卸載時清理 ── */
    window.addEventListener('pagehide', () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    }, { once: true });

    /* ── START ── */
    animate();
  }
})();