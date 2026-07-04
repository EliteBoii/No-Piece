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
     4. Screen manager — landing / auth / login crossfade
     ----------------------------------------------------- */
  const screens = {
    landing: document.getElementById('screenLanding'),
    auth: document.getElementById('screenAuth'),
    login: document.getElementById('screenLogin'),
  };

  function showScreen(name) {
    Object.values(screens).forEach((el) => {
      if (el) el.classList.remove('is-active');
    });
    const target = screens[name];
    if (target) target.classList.add('is-active');
    return target;
  }

  /* -----------------------------------------------------
     5. Access Terminal button — authentication sequence
     ----------------------------------------------------- */
  const AUTH_STEPS = [
    { text: 'AUTHENTICATING', hold: 600 },
    { text: 'VERIFYING PIRATE DATABASE', hold: 650 },
    { text: 'ESTABLISHING SECURE CONNECTION', hold: 650 },
    { text: 'ACCESS GRANTED', hold: 550, granted: true },
  ];

  let isAuthenticating = false;

  function setAuthLine(el, step) {
    return new Promise((resolve) => {
      el.style.opacity = '0';
      window.setTimeout(() => {
        el.textContent = step.text;
        el.classList.toggle('is-granted', !!step.granted);
        el.style.opacity = '1';
        resolve();
      }, 160);
    });
  }

  async function runAuthSequence() {
    const authLine = document.getElementById('authLine');
    const authRing = document.getElementById('authRing');
    const progressBar = document.getElementById('authProgressBar');
    if (!authLine || !authRing || !progressBar) return;

    // reset state
    authRing.classList.remove('is-done');
    progressBar.classList.remove('is-granted');
    progressBar.style.width = '0%';
    authLine.classList.remove('is-granted');
    authLine.style.opacity = '1';
    authLine.textContent = AUTH_STEPS[0].text;

    for (let i = 0; i < AUTH_STEPS.length; i++) {
      const step = AUTH_STEPS[i];

      if (i > 0) {
        await setAuthLine(authLine, step);
      }

      // nudge progress bar on next frame so the width transition fires
      requestAnimationFrame(() => {
        progressBar.style.width = `${((i + 1) / AUTH_STEPS.length) * 100}%`;
      });

      if (step.granted) {
        authRing.classList.add('is-done');
        progressBar.classList.add('is-granted');
      }

      await sleep(prefersReducedMotion ? 120 : step.hold);
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function initAccessButton() {
    const btn = document.getElementById('accessBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (isAuthenticating) return;
      isAuthenticating = true;

      btn.classList.add('is-loading');

      await sleep(prefersReducedMotion ? 80 : 260);

      showScreen('auth');
      await runAuthSequence();

      const loginScreen = showScreen('login');
      btn.classList.remove('is-loading');
      isAuthenticating = false;

      // focus the first field once the login screen is in view
      window.setTimeout(() => {
        const firstField = loginScreen && loginScreen.querySelector('#pirateId');
        if (firstField) firstField.focus({ preventScroll: true });
      }, prefersReducedMotion ? 0 : 350);
    });
  }

  function flashState(btn, { text, color, glow, duration = 1600 }) {
    const label = btn.querySelector('.access-btn__text');
    if (!label) return;

    const original = label.textContent;
    label.textContent = text;
    btn.style.background = color;
    btn.style.boxShadow = `0 0 34px ${glow}, 0 0 90px ${glow}`;

    window.setTimeout(() => {
      label.textContent = original;
      btn.style.background = '';
      btn.style.boxShadow = '';
    }, duration);
  }

  /* -----------------------------------------------------
     6. Login form — Pirate ID + Security PIN
     ----------------------------------------------------- */
  function initLoginForm() {
    const form = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    if (!form || !loginBtn) return;

    let isValidating = false;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isValidating) return;
      isValidating = true;

      loginBtn.classList.add('is-loading');
      await sleep(prefersReducedMotion ? 150 : 1200);
      loginBtn.classList.remove('is-loading');

      flashState(loginBtn, {
        text: 'ACCESS CONFIRMED',
        color: '#8dffb0',
        glow: 'rgba(141,255,176,.6)',
        duration: 1600,
      });

      isValidating = false;
    });
  }

  /* -----------------------------------------------------
     Boot
     ----------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initParticleField();
    initAccessButton();
    initLoginForm();
    stampLastUpdated();

    const counter = document.getElementById('statPirates');
    if (counter) {
      // slight delay so it kicks in after the entrance fade
      window.setTimeout(() => animateCounter(counter), 600);
    }
  });
})();
