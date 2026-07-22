/* ============================================================
   ECO.JS — Ting. Studio 服務頁
   原生 ES6+ · 無框架依賴 · IntersectionObserver 驅動的動畫
   ============================================================ */
   'use strict';

   /* ── global ── */
   const isMobile = window.innerWidth < 768;
   const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   
   /* ════════════════════════════════════════════════════════════
      UTILITY — canvas resize + IntersectionObserver loop manager
   ════════════════════════════════════════════════════════════ */
   function makeLoop(canvas, section, drawFn) {
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     let raf = null, running = false, last = 0;
   
     function resize() {
       canvas.width  = canvas.offsetWidth;
       canvas.height = canvas.offsetHeight;
     }
     resize();
     window.addEventListener('resize', resize, { passive: true });
   
     function loop(ts) {
       if (!running) return;
       const dt = Math.min(ts - last, 100);
       last = ts;
       ctx.clearRect(0, 0, canvas.width, canvas.height);
       drawFn(ctx, canvas.width, canvas.height, dt);
       raf = requestAnimationFrame(loop);
     }
   
     function start() {
       if (running) return;
       running = true; last = performance.now();
       raf = requestAnimationFrame(loop);
     }
     function stop() {
       running = false;
       if (raf) { cancelAnimationFrame(raf); raf = null; }
     }
   
     const obs = new IntersectionObserver(
       e => e[0].isIntersecting ? start() : stop(),
       { threshold: 0.05 }
     );
     obs.observe(section || canvas);
     start();
   
     return { ctx, start, stop };
   }
   
   /* ════════════════════════════════════════════════════════════
      1. HERO CANVAS — 4 parabolic arcs + gliding light dots
   ════════════════════════════════════════════════════════════ */
   (function heroCanvas() {
     const canvas  = document.getElementById('bigbang-canvas');
     const section = document.getElementById('hero-section');
     if (!canvas) return;
   
     const GOLD  = 'rgba(212,175,55,';
     const LIGHT = 'rgba(245,224,144,';
   
     const arcs = [
       { t:0.00, speed:0.0008, color:GOLD,  alpha:0.38, flip:false, oy:0.08 },
       { t:0.25, speed:0.0006, color:LIGHT, alpha:0.22, flip:true,  oy:0.16 },
       { t:0.55, speed:0.0010, color:GOLD,  alpha:0.28, flip:false, oy:0.04 },
       { t:0.78, speed:0.0007, color:LIGHT, alpha:0.20, flip:true,  oy:0.12 },
     ];
   
     const STAR_N = isMobile ? 35 : 80;
     const stars = Array.from({ length: STAR_N }, () => ({
       x: Math.random(), y: Math.random(),
       r: Math.random() * 1.3 + 0.3,
       a: Math.random() * 0.40 + 0.08,
     }));
   
     function drawArc(ctx, arc, W, H) {
       const { t, color, alpha, flip, oy } = arc;
       const x0 = W * (flip ? 0.88 : 0.04);
       const y0 = H * (0.12 + oy);
       const cx = W * 0.50;
       const cy = H * (flip ? -0.06 : 1.08);
       const x1 = W * (flip ? 0.08 : 0.94);
       const y1 = H * (0.82 - oy);
   
       ctx.beginPath();
       ctx.moveTo(x0, y0);
       ctx.quadraticCurveTo(cx, cy, x1, y1);
       ctx.strokeStyle = color + alpha + ')';
       ctx.lineWidth = 1.3;
       ctx.stroke();
   
       const tt = t % 1;
       const dx = (1-tt)*(1-tt)*x0 + 2*(1-tt)*tt*cx + tt*tt*x1;
       const dy = (1-tt)*(1-tt)*y0 + 2*(1-tt)*tt*cy + tt*tt*y1;
   
       const gr = ctx.createRadialGradient(dx, dy, 0, dx, dy, 20);
       gr.addColorStop(0,   color + (alpha + 0.50) + ')');
       gr.addColorStop(0.4, color + (alpha * 0.35) + ')');
       gr.addColorStop(1,   color + '0)');
       ctx.beginPath(); ctx.arc(dx, dy, 20, 0, Math.PI*2);
       ctx.fillStyle = gr; ctx.fill();
   
       ctx.beginPath(); ctx.arc(dx, dy, 2.6, 0, Math.PI*2);
       ctx.fillStyle = color + '0.95)'; ctx.fill();
     }
   
     makeLoop(canvas, section, (ctx, W, H, dt) => {
       for (const s of stars) {
         ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
         ctx.fillStyle = `rgba(245,224,144,${s.a})`; ctx.fill();
       }
       for (const arc of arcs) {
         arc.t += arc.speed * dt;
         if (arc.t > 1) arc.t -= 1;
         drawArc(ctx, arc, W, H);
       }
     });
   })();
   
   /* ════════════════════════════════════════════════════════════
      2. SERVICES CANVAS — ambient nebula + bigbang on hover
      (手機關閉 bigbang 觸發)
   ════════════════════════════════════════════════════════════ */
   (function servicesCanvas() {
     const canvas  = document.getElementById('services-canvas');
     const section = document.getElementById('services-section');
     if (!canvas || !section) return;
   
     const ctx = canvas.getContext('2d');
     let raf = null, running = false, last = 0;
   
     function resize() {
       canvas.width  = canvas.offsetWidth;
       canvas.height = canvas.offsetHeight;
     }
     resize();
     window.addEventListener('resize', resize, { passive: true });
   
     const MAX_AMB = isMobile ? 45 : 100;
     const particles = [];
   
     function mkAmbient() {
       return {
         kind: 'amb',
         x:  Math.random() * canvas.width,
         y:  Math.random() * canvas.height,
         vx: (Math.random() - 0.5) * 0.15,
         vy: (Math.random() - 0.5) * 0.15,
         r:  Math.random() * 1.5 + 0.4,
         a:  Math.random() * 0.30 + 0.06,
       };
     }
   
     function mkBang(ox, oy) {
       const angle = Math.random() * Math.PI * 2;
       const spd   = Math.random() * (isMobile ? 2.8 : 4.0) + 1.0;
       const spread = Math.random() * 20;
       return {
         kind: 'bang',
         x:  ox + Math.cos(angle) * spread,
         y:  oy + Math.sin(angle) * spread,
         vx: Math.cos(angle) * spd,
         vy: Math.sin(angle) * spd,
         r:  Math.random() * 2.4 + 0.6,
         a:  Math.random() * 0.75 + 0.25,
         life:  1.0,
         decay: Math.random() * 0.013 + 0.007,
         gold: Math.random() > 0.4,
       };
     }
   
     while (particles.length < MAX_AMB) particles.push(mkAmbient());
   
     function triggerBigBang(screenX, screenY) {
       if (isMobile) return; // 手機關閉爆發
       const rect = canvas.getBoundingClientRect();
       const ox = screenX - rect.left;
       const oy = screenY - rect.top;
       const n  = isMobile ? 55 : 120;
       for (let i = 0; i < n; i++) particles.push(mkBang(ox, oy));
     }
   
     function draw(W, H, dt) {
       const f = dt / 16.67;
   
       if (particles.filter(p => p.kind === 'amb').length < MAX_AMB) {
         particles.push(mkAmbient());
       }
   
       for (let i = particles.length - 1; i >= 0; i--) {
         const p = particles[i];
   
         if (p.kind === 'amb') {
           p.x += p.vx * f; p.y += p.vy * f;
           if (p.x < -2) p.x = W+2; if (p.x > W+2) p.x = -2;
           if (p.y < -2) p.y = H+2; if (p.y > H+2) p.y = -2;
           ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
           ctx.fillStyle = `rgba(212,175,55,${p.a})`; ctx.fill();
   
         } else {
           p.x    += p.vx * f; p.y   += p.vy * f;
           p.vx   *= 0.972;    p.vy  *= 0.972;
           p.life -= p.decay * f;
           if (p.life <= 0) { particles.splice(i, 1); continue; }
   
           const ca  = p.a * p.life;
           const rgb = p.gold ? '212,175,55' : '245,224,144';
   
           const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
           glow.addColorStop(0,   `rgba(${rgb},${ca})`);
           glow.addColorStop(0.5, `rgba(${rgb},${ca * 0.35})`);
           glow.addColorStop(1,   `rgba(${rgb},0)`);
           ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI*2);
           ctx.fillStyle = glow; ctx.fill();
   
           ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
           ctx.fillStyle = `rgba(${rgb},${Math.min(ca * 1.8, 1)})`; ctx.fill();
         }
       }
     }
   
     function loop(ts) {
       if (!running) return;
       const dt = Math.min(ts - last, 100); last = ts;
       ctx.clearRect(0, 0, canvas.width, canvas.height);
       draw(canvas.width, canvas.height, dt);
       raf = requestAnimationFrame(loop);
     }
     function start() {
       if (running) return; running = true; last = performance.now();
       raf = requestAnimationFrame(loop);
     }
     function stop() {
       running = false; if (raf) { cancelAnimationFrame(raf); raf = null; }
     }
   
     const obs = new IntersectionObserver(
       e => e[0].isIntersecting ? start() : stop(),
       { threshold: 0.05 }
     );
     obs.observe(section);
     start();
   
     document.querySelectorAll('.service-card').forEach(card => {
       card.addEventListener('mouseenter', () => {
         const r = card.getBoundingClientRect();
         triggerBigBang(r.left + r.width / 2, r.top + r.height / 2);
       });
     });
   })();
   
   /* ════════════════════════════════════════════════════════════
      3. JS TILT — mouse-parallax (手機關閉)
   ════════════════════════════════════════════════════════════ */
   (function initTilt() {
     if (isMobile || prefersReducedMotion) return;
   
     document.querySelectorAll('[data-tilt]').forEach(card => {
       const MAX = 8;
   
       card.addEventListener('mousemove', e => {
         const r  = card.getBoundingClientRect();
         const cx = r.left + r.width  / 2;
         const cy = r.top  + r.height / 2;
         const dx = (e.clientX - cx) / (r.width  / 2);
         const dy = (e.clientY - cy) / (r.height / 2);
   
         const rotX =  dy * MAX * -1;
         const rotY =  dx * MAX;
   
         card.style.transform =
           `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px) scale(1.015)`;
         card.style.transition = 'transform .08s linear';
       });
   
       card.addEventListener('mouseleave', () => {
         card.style.transform = '';
         card.style.transition = 'transform .45s cubic-bezier(.22,.68,0,1.2)';
       });
     });
   })();
   
   /* ════════════════════════════════════════════════════════════
      4. SCROLL REVEAL — 原生 IntersectionObserver，觸發後立即 unobserve
   ════════════════════════════════════════════════════════════ */
   (function initReveal() {
     const targets = document.querySelectorAll('.reveal');
     if (!targets.length) return;
   
     if (prefersReducedMotion) {
       targets.forEach(el => el.classList.add('is-visible'));
       return;
     }
   
     const obs = new IntersectionObserver((entries, observer) => {
       entries.forEach(entry => {
         if (entry.isIntersecting) {
           entry.target.classList.add('is-visible');
           observer.unobserve(entry.target); // 釋放資源
         }
       });
     }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
   
     targets.forEach(el => obs.observe(el));
   })();
   
   /* ════════════════════════════════════════════════════════════
      5. NAVBAR — glassmorphism on scroll
   ════════════════════════════════════════════════════════════ */
   (function initNavbar() {
     const nav = document.getElementById('navbar');
     if (!nav) return;
   
     function update() {
       nav.classList.toggle('navbar--scrolled', window.scrollY > 50);
     }
     update();
     window.addEventListener('scroll', update, { passive: true });
   })();
   
   /* ════════════════════════════════════════════════════════════
      6. MOBILE DRAWER MENU
   ════════════════════════════════════════════════════════════ */
   (function initDrawer() {
     const hamburger = document.getElementById('hamburger-btn');
     const drawer    = document.getElementById('mobile-drawer');
     const overlay   = document.getElementById('drawer-overlay');
     const closeBtn  = document.getElementById('drawer-close-btn');
     if (!hamburger || !drawer || !overlay) return;
   
     function openDrawer() {
       drawer.hidden = false;
       overlay.hidden = false;
       // 強制 reflow 讓 transition 生效
       requestAnimationFrame(() => {
         drawer.classList.add('is-open');
         overlay.classList.add('is-visible');
       });
       hamburger.classList.add('is-active');
       hamburger.setAttribute('aria-expanded', 'true');
       hamburger.setAttribute('aria-label', '關閉選單');
       document.body.classList.add('no-scroll');
       closeBtn?.focus();
     }
   
     function closeDrawer() {
       drawer.classList.remove('is-open');
       overlay.classList.remove('is-visible');
       hamburger.classList.remove('is-active');
       hamburger.setAttribute('aria-expanded', 'false');
       hamburger.setAttribute('aria-label', '開啟選單');
       document.body.classList.remove('no-scroll');
       hamburger.focus();
       window.setTimeout(() => {
         if (!drawer.classList.contains('is-open')) {
           drawer.hidden = true;
           overlay.hidden = true;
         }
       }, 450);
     }
   
     hamburger.addEventListener('click', () => {
       const isOpen = drawer.classList.contains('is-open');
       isOpen ? closeDrawer() : openDrawer();
     });
     closeBtn?.addEventListener('click', closeDrawer);
     overlay.addEventListener('click', closeDrawer);
     drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
   
     document.addEventListener('keydown', e => {
       if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
     });
   })();
   
   /* ════════════════════════════════════════════════════════════
      7. METRIC COUNT-UP — 進場後數字淡入/計數，僅觸發一次
   ════════════════════════════════════════════════════════════ */
   (function initMetrics() {
     const counters = document.querySelectorAll('.metric-count');
     if (!counters.length) return;
   
     function animateCount(el) {
       const target   = parseFloat(el.dataset.target) || 0;
       const decimals = parseInt(el.dataset.decimals || '0', 10);
       const suffix   = el.dataset.suffix || '';
       const duration = 1200;
       const start    = performance.now();
   
       if (prefersReducedMotion) {
         el.textContent = target.toFixed(decimals) + suffix;
         return;
       }
   
       function tick(now) {
         const p = Math.min((now - start) / duration, 1);
         const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
         const value = target * eased;
         el.textContent = value.toFixed(decimals) + suffix;
         if (p < 1) requestAnimationFrame(tick);
       }
       requestAnimationFrame(tick);
     }
   
     const obs = new IntersectionObserver((entries, observer) => {
       entries.forEach(entry => {
         if (entry.isIntersecting) {
           animateCount(entry.target);
           observer.unobserve(entry.target);
         }
       });
     }, { threshold: 0.5 });
   
     counters.forEach(el => obs.observe(el));
   })();
   
   /* ════════════════════════════════════════════════════════════
      8. BACK TO TOP
   ════════════════════════════════════════════════════════════ */
   (function initBackToTop() {
     const btn = document.getElementById('back-to-top');
     if (!btn) return;
   
     function update() {
       btn.classList.toggle('is-visible', window.scrollY > 480);
     }
     update();
     window.addEventListener('scroll', update, { passive: true });
   
     btn.addEventListener('click', () => {
       window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
     });
   })();
   
   /* ════════════════════════════════════════════════════════════
      9. QUICK CONTACT FORM — 前端驗證 + 蜜罐防機器人
   ════════════════════════════════════════════════════════════ */
   (function initContactForm() {
     const form   = document.getElementById('quick-contact-form');
     const status = document.getElementById('form-status');
     if (!form || !status) return;
   
     form.addEventListener('submit', e => {
       e.preventDefault();
   
       // 蜜罐欄位：機器人通常會自動填入此隱藏欄位
       const honeypot = form.querySelector('#qc-company');
       if (honeypot && honeypot.value.trim() !== '') {
         return; // 靜默丟棄，不給機器人任何回饋
       }
   
       const name    = form.querySelector('#qc-name');
       const email   = form.querySelector('#qc-email');
       const message = form.querySelector('#qc-message');
   
       if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
         status.textContent = '請完整填寫姓名、Email 與需求簡述。';
         status.className = 'form-status form-status--error';
         return;
       }
   
       const submitBtn = form.querySelector('.form-submit');
       submitBtn.disabled = true;
       status.textContent = '傳送中…';
       status.className = 'form-status';
   
       // 此處僅為前端示意；正式環境請接上真實的表單服務或後端 API
       window.setTimeout(() => {
         status.textContent = '訊息已送出，感謝您的聯繫，我會盡快回覆！';
         status.className = 'form-status form-status--success';
         form.reset();
         submitBtn.disabled = false;
       }, 700);
     });
   })();
   
   /* ════════════════════════════════════════════════════════════
      10. FOOTER YEAR
   ════════════════════════════════════════════════════════════ */
   (function setYear() {
     const el = document.getElementById('footer-year');
     if (el) el.textContent = new Date().getFullYear();
   })();