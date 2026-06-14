// 極簡 GSAP 進場動畫：卡片與標題優雅上浮
import gsap from 'https://cdn.skypack.dev/gsap@3.12.5';

window.addEventListener('DOMContentLoaded', () => {
    // 設定初始狀態
    gsap.set('.section-label, .section-header h1, .section-subtitle, .project-card, .more-projects', {
        opacity: 0,
        y: 30
    });

    // 建立時間軸
    const tl = gsap.timeline({
        defaults: { ease: 'power3.out', duration: 0.8 }
    });

    tl.to('.section-label', { opacity: 1, y: 0, duration: 0.6 })
      .to('.section-header h1', { opacity: 1, y: 0, duration: 0.7 }, '-=0.3')
      .to('.section-subtitle', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
      .to('.project-card', { opacity: 1, y: 0, duration: 0.9 }, '-=0.2')
      .to('.more-projects', { opacity: 1, y: 0, duration: 0.6 }, '-=0.3');
});