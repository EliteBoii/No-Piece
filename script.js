/* =========================================================
   NO-PIECE — script.js
   Particle field · live counters · terminal access sequence
   · pirate authentication
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

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  /* -----------------------------------------------------
     5. Status sequence engine — drives the auth screen
        (shared by the ACCESS TERMINAL flow and the
        LOGIN validation flow so every readout behaves
        and animates identically)
     ----------------------------------------------------- */
  const AUTH_STEPS = [
    { text: 'AUTHENTICATING', hold: 600 },
    { text: 'VERIFYING PIRATE DATABASE', hold: 650 },
    { text: 'ESTABLISHING SECURE CONNECTION', hold: 650 },
    { text: 'ACCESS GRANTED', hold: 550 },
  ];

  const LOGIN_SUCCESS_STEPS = [
    { text: 'VALIDATING', hold: 550 },
    { text: 'MATCH FOUND', hold: 550 },
    { text: 'OPENING PROFILE', hold: 650 },
  ];

  const LOGIN_DENIED_STEPS = [
    { text: 'ACCESS DENIED', hold: 750 },
    { text: 'INVALID PIRATE ID OR SECURITY PIN', hold: 950 },
  ];

  const DENIED_COLOR = '#ff4d5e';
  const DENIED_GLOW = 'rgba(255,77,94,.6)';
  const DENIED_GLOW_SOFT = 'rgba(255,77,94,.55)';

  function fadeSwapText(el, text) {
    return new Promise((resolve) => {
      el.style.opacity = '0';
      window.setTimeout(() => {
        el.textContent = text;
        el.style.opacity = '1';
        resolve();
      }, 160);
    });
  }

  function resetStatusVisuals(line, ring, bar) {
    line.classList.remove('is-granted');
    line.style.color = '';
    line.style.textShadow = '';
    line.style.opacity = '1';

    ring.classList.remove('is-done');
    ring.style.animation = '';
    ring.style.borderColor = '';
    ring.style.borderTopColor = '';
    ring.style.boxShadow = '';

    bar.classList.remove('is-granted');
    bar.style.background = '';
    bar.style.boxShadow = '';
    bar.style.width = '0%';
  }

  function applyGrantedVisuals(line, ring, bar) {
    line.classList.add('is-granted');
    ring.classList.add('is-done');
    bar.classList.add('is-granted');
  }

  function applyDeniedVisuals(line, ring, bar) {
    line.style.color = DENIED_COLOR;
    line.style.textShadow = `0 0 16px ${DENIED_GLOW}`;

    ring.style.animation = 'none';
    ring.style.borderColor = DENIED_COLOR;
    ring.style.borderTopColor = DENIED_COLOR;
    ring.style.boxShadow = `0 0 22px ${DENIED_GLOW_SOFT}`;

    bar.style.background = DENIED_COLOR;
    bar.style.boxShadow = `0 0 10px ${DENIED_COLOR}`;
  }

  /**
   * Runs a sequence of status lines on the auth screen.
   * resultVariant: 'granted' | 'denied' | null
   *  - 'granted' flips the ring/line/bar to the success color
   *    once the final step is reached (matches the original
   *    ACCESS TERMINAL behaviour).
   *  - 'denied' applies the alert color from the first step.
   */
  async function runStatusSequence(steps, resultVariant) {
    const line = document.getElementById('authLine');
    const ring = document.getElementById('authRing');
    const bar = document.getElementById('authProgressBar');
    if (!line || !ring || !bar) return;

    resetStatusVisuals(line, ring, bar);

    if (resultVariant === 'denied') {
      applyDeniedVisuals(line, ring, bar);
    }

    line.textContent = steps[0].text;

    for (let i = 0; i < steps.length; i++) {
      const currentStep = steps[i];

      if (i > 0) {
        await fadeSwapText(line, currentStep.text);
      }

      requestAnimationFrame(() => {
        bar.style.width = `${((i + 1) / steps.length) * 100}%`;
      });

      if (resultVariant === 'granted' && i === steps.length - 1) {
        applyGrantedVisuals(line, ring, bar);
      }

      await sleep(prefersReducedMotion ? 120 : currentStep.hold);
    }
  }

  /* -----------------------------------------------------
     6. Access Terminal button — authentication sequence
     ----------------------------------------------------- */
  let isAuthenticating = false;

  function initAccessButton() {
    const btn = document.getElementById('accessBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (isAuthenticating) return;
      isAuthenticating = true;

      btn.classList.add('is-loading');

      await sleep(prefersReducedMotion ? 80 : 260);

      showScreen('auth');
      await runStatusSequence(AUTH_STEPS, 'granted');

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

  /* -----------------------------------------------------
     7. Pirate database — temporary in-memory records
     ----------------------------------------------------- */
  const PIRATE_DB = [
    {
      id: 'elite',
      pin: '1234',
      name: 'Elite',
      berries: 5000,
      bounty: 2500,
      rank: 'Rookie',
      admin: true,
    },
    {
      id: 'brother',
      pin: '5678',
      name: 'Brother',
      berries: 3000,
      bounty: 1200,
      rank: 'Rookie',
      admin: false,
    },
  ];

  const SESSION_KEY = 'noPieceActivePirate';

  function findPirate(pirateId, securityPin) {
    if (!pirateId || !securityPin) return null;

    const record = PIRATE_DB.find(
      (p) =>
        p.id.toLowerCase() === pirateId.toLowerCase() && p.pin === securityPin
    );

    return record ? { ...record } : null;
  }

  function savePirateSession(pirate) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(pirate));
    } catch (err) {
      // sessionStorage may be unavailable (e.g. private mode) — fail silently
    }
  }

  /* -----------------------------------------------------
     8. Login form — Pirate ID + Security PIN
     ----------------------------------------------------- */
  function initLoginForm() {
    const form = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const idInput = document.getElementById('pirateId');
    const pinInput = document.getElementById('securityPin');
    if (!form || !loginBtn || !idInput || !pinInput) return;

    let isValidating = false;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isValidating) return;
      isValidating = true;

      const enteredId = idInput.value.trim();
      const enteredPin = pinInput.value.trim();

      loginBtn.classList.add('is-loading');
      await sleep(prefersReducedMotion ? 120 : 700);
      loginBtn.classList.remove('is-loading');

      const pirate = findPirate(enteredId, enteredPin);

      showScreen('auth');

      if (pirate) {
        await runStatusSequence(LOGIN_SUCCESS_STEPS, 'granted');
        savePirateSession(pirate);
        // Session saved — dashboard not built yet, so we stop here.
      } else {
        await runStatusSequence(LOGIN_DENIED_STEPS, 'denied');
        showScreen('login');
        pinInput.value = '';

        window.setTimeout(() => {
          idInput.focus({ preventScroll: true });
        }, prefersReducedMotion ? 0 : 250);
      }

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
