/* =========================================================
   NO-PIECE — script.js
   Particle field · live counters · terminal access sequence
   ========================================================= */
(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* -----------------------------------------------------
     1. Particle field — drifting nodes + faint link lines
     ----------------------------------------------------- */
  const canvas = document.getElementById('particle-field');
  const ctx = canvas.getContext('2d');

  let width, height, particles;
  const PARTICLE_COLOR = '43, 230, 255';
  const LINK_DISTANCE = 130;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createParticles() {
    const density = Math.min(90, Math.floor((width * height) / 16000));
    particles = Array.from({ length: density }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.4,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.twinkle += 0.02;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      const alpha = 0.35 + Math.sin(p.twinkle) * 0.25;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${PARTICLE_COLOR}, ${alpha})`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DISTANCE) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${PARTICLE_COLOR}, ${
            0.12 * (1 - dist / LINK_DISTANCE)
          })`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(step);
  }

  function drawStaticFrame() {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${PARTICLE_COLOR}, 0.4)`;
      ctx.fill();
    }
  }

  function initParticleField() {
    resize();
    createParticles();

    if (prefersReducedMotion) {
      drawStaticFrame();
    } else {
      requestAnimationFrame(step);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        createParticles();
        if (prefersReducedMotion) drawStaticFrame();
      }, 200);
    });
  }

  /* -----------------------------------------------------
     2. Counter — pirates registered, rolls up on load
     ----------------------------------------------------- */
  function animateCounter(el, duration = 2200) {
    const target = parseInt(el.dataset.target, 10) || 0;

    if (prefersReducedMotion) {
      el.textContent = target.toLocaleString('en-US');
      return;
    }

    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = Math.floor(eased * target);
      el.textContent = value.toLocaleString('en-US');

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target.toLocaleString('en-US');
      }
    }

    requestAnimationFrame(tick);
  }

  /* -----------------------------------------------------
     3. Last updated — stamps current session time (UTC)
     ----------------------------------------------------- */
  function stampLastUpdated() {
    const el = document.getElementById('lastUpdated');
    if (!el) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp =
      `${now.getUTCFullYear()}.${pad(now.getUTCMonth() + 1)}.${pad(now.getUTCDate())} ` +
      `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())} UTC`;

    el.textContent = stamp;
  }

  /* -----------------------------------------------------
     4. Access Terminal button — authentication sequence
     ----------------------------------------------------- */
  function initAccessButton() {
    const btn = document.getElementById('accessBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-loading')) return;

      btn.classList.add('is-loading');

      window.setTimeout(() => {
        btn.classList.remove('is-loading');
        flashGranted(btn);
      }, 1800);
    });
  }

  function flashGranted(btn) {
    const label = btn.querySelector('.access-btn__text');
    if (!label) return;

    const original = label.textContent;
    label.textContent = 'ACCESS GRANTED';
    btn.style.background = '#8dffb0';
    btn.style.boxShadow = '0 0 34px rgba(141,255,176,.75), 0 0 90px rgba(141,255,176,.4)';

    window.setTimeout(() => {
      label.textContent = original;
      btn.style.background = '';
      btn.style.boxShadow = '';
    }, 1600);
  }

  /* -----------------------------------------------------
     Boot
     ----------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initParticleField();
    initAccessButton();
    stampLastUpdated();

    const counter = document.getElementById('statPirates');
    if (counter) {
      // slight delay so it kicks in after the entrance fade
      window.setTimeout(() => animateCounter(counter), 600);
    }
  });
})();
