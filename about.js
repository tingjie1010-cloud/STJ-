// 極簡 GSAP 進場動畫：左欄頭像＋右欄內容優雅上浮
import gsap from 'https://cdn.skypack.dev/gsap@3.12.5';

window.addEventListener('DOMContentLoaded', () => {
    // 設定初始狀態
    gsap.set('.avatar-wrapper, .basic-info, .section-label, .about-right h2, .bio-block p, .skills-cloud span', {
        opacity: 0,
        y: 30
    });

    // 建立時間軸
    const tl = gsap.timeline({
        defaults: { ease: 'power3.out', duration: 0.8 }
    });

    tl.to('.avatar-wrapper', { opacity: 1, y: 0, duration: 0.9 })
      .to('.basic-info', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
      .to('.section-label', { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
      .to('.about-right h2', { opacity: 1, y: 0, duration: 0.7 }, '-=0.5')
      .to('.bio-block p', { opacity: 1, y: 0, stagger: 0.1, duration: 0.7 }, '-=0.4')
      .to('.skills-cloud span', { opacity: 1, y: 0, stagger: 0.05, duration: 0.5 }, '-=0.2');
});