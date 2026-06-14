// 極簡 GSAP 進場動畫：照片與文字平滑淡入 + 上浮
import gsap from 'https://cdn.skypack.dev/gsap@3.12.5';

window.addEventListener('DOMContentLoaded', () => {
    // 設定初始狀態
    gsap.set('.avatar-wrapper, .social-links, .section-label, .contact-right h2, .bio-text, .golden-words', {
        opacity: 0,
        y: 30
    });

    // 建立時間軸依序進場
    const tl = gsap.timeline({
        defaults: { ease: 'power3.out', duration: 0.9 }
    });

    tl.to('.avatar-wrapper', { opacity: 1, y: 0, duration: 1 })
      .to('.social-links', { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
      .to('.section-label', { opacity: 1, y: 0, duration: 0.6 }, '-=0.2')
      .to('.contact-right h2', { opacity: 1, y: 0, duration: 0.8 }, '-=0.5')
      .to('.bio-text', { opacity: 1, y: 0, duration: 0.8 }, '-=0.4')
      .to('.golden-words', { opacity: 1, y: 0, duration: 0.7 }, '-=0.2');
});