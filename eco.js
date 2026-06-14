/* ============================================================
   ECO.JS — Full animation suite
   1. Hero Canvas  — parabolic arcs + gliding dots
   2. Services Canvas — ambient nebula + bigbang on card hover
   3. JS tilt effect on service cards (mouse parallax)
   4. GSAP ScrollTrigger fade-up reveals
   5. Navbar scroll shadow
   6. Footer year auto-fill
   ============================================================ */
   'use strict';

   /* ── global ── */
   const isMobile = window.innerWidth < 768;
   
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
   
       /* Moving dot — De Casteljau quadratic interpolation */
       const tt = t % 1;
       const dx = (1-tt)*(1-tt)*x0 + 2*(1-tt)*tt*cx + tt*tt*x1;
       const dy = (1-tt)*(1-tt)*y0 + 2*(1-tt)*tt*cy + tt*tt*y1;
   
       /* Halo */
       const gr = ctx.createRadialGradient(dx, dy, 0, dx, dy, 20);
       gr.addColorStop(0,   color + (alpha + 0.50) + ')');
       gr.addColorStop(0.4, color + (alpha * 0.35) + ')');
       gr.addColorStop(1,   color + '0)');
       ctx.beginPath(); ctx.arc(dx, dy, 20, 0, Math.PI*2);
       ctx.fillStyle = gr; ctx.fill();
   
       /* Core dot */
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
   
     /* ── Particle pool ── */
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
       /* Spawn ring — slight offset from centre so burst feels radial */
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
         /* colour alternates gold / pale */
         gold: Math.random() > 0.4,
       };
     }
   
     /* Seed */
     while (particles.length < MAX_AMB) particles.push(mkAmbient());
   
     /* Public trigger — called by mouseenter on cards */
     function triggerBigBang(screenX, screenY) {
       const rect = canvas.getBoundingClientRect();
       const ox = screenX - rect.left;
       const oy = screenY - rect.top;
       const n  = isMobile ? 55 : 120;
       for (let i = 0; i < n; i++) particles.push(mkBang(ox, oy));
     }
   
     /* ── Draw ── */
     function draw(W, H, dt) {
       const f = dt / 16.67;
   
       /* Replenish ambient */
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
           /* bang particle */
           p.x    += p.vx * f; p.y   += p.vy * f;
           p.vx   *= 0.972;    p.vy  *= 0.972;
           p.life -= p.decay * f;
           if (p.life <= 0) { particles.splice(i, 1); continue; }
   
           const ca  = p.a * p.life;
           const rgb = p.gold ? '212,175,55' : '245,224,144';
   
           /* Outer glow */
           const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
           glow.addColorStop(0,   `rgba(${rgb},${ca})`);
           glow.addColorStop(0.5, `rgba(${rgb},${ca * 0.35})`);
           glow.addColorStop(1,   `rgba(${rgb},0)`);
           ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI*2);
           ctx.fillStyle = glow; ctx.fill();
   
           /* Inner core */
           ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
           ctx.fillStyle = `rgba(${rgb},${Math.min(ca * 1.8, 1)})`; ctx.fill();
         }
       }
     }
   
     /* ── Loop ── */
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
   
     /* ── .service-card mouseenter → bigbang at card centre ── */
     document.querySelectorAll('.service-card').forEach(card => {
       card.addEventListener('mouseenter', () => {
         const r = card.getBoundingClientRect();
         triggerBigBang(r.left + r.width / 2, r.top + r.height / 2);
       });
     });
   })();
   
   
   /* ════════════════════════════════════════════════════════════
      3. JS TILT — mouse-parallax 3-D tilt on [data-tilt] cards
         (disabled on mobile)
   ════════════════════════════════════════════════════════════ */
   (function initTilt() {
     if (isMobile) return;
   
     document.querySelectorAll('[data-tilt]').forEach(card => {
       const MAX = 8; // max tilt degrees
   
       card.addEventListener('mousemove', e => {
         const r  = card.getBoundingClientRect();
         const cx = r.left + r.width  / 2;
         const cy = r.top  + r.height / 2;
         const dx = (e.clientX - cx) / (r.width  / 2); // -1 → +1
         const dy = (e.clientY - cy) / (r.height / 2);
   
         const rotX =  dy * MAX * -1; // tilt away from cursor
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
      4. GSAP ScrollTrigger — fade-up reveals
   ════════════════════════════════════════════════════════════ */
   (function initGSAP() {
     if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
     gsap.registerPlugin(ScrollTrigger);
   
     /* Respect prefers-reduced-motion */
     if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
       document.querySelectorAll('.gs-reveal').forEach(el => {
         el.style.opacity = 1; el.style.transform = 'none';
       });
       return;
     }
   
     /* Hero — load animation */
     gsap.from('.hero-content', {
       opacity: 0, y: 32, duration: 1.05, ease: 'power3.out', delay: 0.28,
     });
   
     /* Group siblings under same parent → stagger together */
     const groups = new Map();
     document.querySelectorAll('.gs-reveal').forEach(el => {
       const p = el.parentElement;
       if (!groups.has(p)) groups.set(p, []);
       groups.get(p).push(el);
     });
   
     groups.forEach((els, parent) => {
       gsap.fromTo(
         els,
         { opacity: 0, y: 30 },
         {
           opacity: 1, y: 0,
           duration: 0.78, ease: 'power3.out', stagger: 0.14,
           scrollTrigger: {
             trigger: parent,
             start: 'top 83%',
             toggleActions: 'play none none none',
           },
         }
       );
     });
   })();
   
   
   /* ════════════════════════════════════════════════════════════
      5. NAVBAR — scroll shadow
   ════════════════════════════════════════════════════════════ */
   (function initNavbar() {
     const nav = document.getElementById('navbar');
     if (!nav) return;
     window.addEventListener('scroll', () => {
       nav.style.boxShadow = window.scrollY > 20
         ? '0 2px 28px rgba(0,0,0,0.65)'
         : 'none';
     }, { passive: true });
   })();
   
   
   /* ════════════════════════════════════════════════════════════
      6. FOOTER YEAR — auto current year
   ════════════════════════════════════════════════════════════ */
   (function setYear() {
     const el = document.getElementById('footer-year');
     if (el) el.textContent = new Date().getFullYear();
   })();