/* ═══════════════════════════════════════════════════════════
   core.js — 手機 / 桌面共用的最小腳本
   只放兩端都需要的邏輯（目前：漢堡選單）。
   刻意保持極小體積，因為這是唯一「兩端都要下載」的 JS。
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