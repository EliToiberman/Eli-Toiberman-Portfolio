// ── HERO: scramble decode + magnetic cursor + role cycling ───────────────────

const HERO_TEXT      = 'ELI TOIBERMAN';
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%$&';
const ROLE_SEQUENCE  = ['Problem Solver', 'User Advocate', 'Threat Defender', 'Product Manager'];

const heroNameEl = document.getElementById('hero-name');
const heroRoleEl = document.getElementById('hero-role');

// Build individual letter spans once
const letterSpans = [];
HERO_TEXT.split('').forEach(char => {
  const span = document.createElement('span');
  if (char === ' ') {
    span.className = 'hero-letter hero-space';
    span.textContent = ' ';
  } else {
    span.className = 'hero-letter hero-scrambling';
    span.textContent = randChar();
    span.dataset.final = char;
    letterSpans.push(span);
  }
  heroNameEl.appendChild(span);
});

function randChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

let _scrambleTick     = null;
let _scrambleTimers   = [];

function playHeroAnimation() {
  // Clear any in-progress animation
  clearInterval(_scrambleTick);
  _scrambleTimers.forEach(clearTimeout);
  _scrambleTimers = [];

  // Reset state
  heroNameEl.classList.remove('name-all-locked');
  heroRoleEl.style.transition = 'none';
  heroRoleEl.style.opacity    = '0';
  heroRoleEl.style.transform  = 'translateY(10px)';
  heroRoleEl.textContent      = '';

  letterSpans.forEach(span => {
    span.style.transform = '';
    span.className       = 'hero-letter hero-scrambling';
    span.textContent     = randChar();
  });

  // Live scramble
  _scrambleTick = setInterval(() => {
    letterSpans.forEach(s => {
      if (!s.classList.contains('hero-locked') && !s.classList.contains('hero-locking')) {
        s.textContent = randChar();
      }
    });
  }, 55);

  // Lock letters in, left to right
  const LOCK_START = 350;
  const LOCK_STEP  = 90;

  letterSpans.forEach((span, i) => {
    const t = setTimeout(() => {
      span.classList.replace('hero-scrambling', 'hero-locking');
      span.textContent = span.dataset.final;
      const t2 = setTimeout(() => span.classList.replace('hero-locking', 'hero-locked'), 260);
      _scrambleTimers.push(t2);
    }, LOCK_START + i * LOCK_STEP);
    _scrambleTimers.push(t);
  });

  // After all letters locked: stop scramble, pulse name, start role cycling
  const ALL_DONE = LOCK_START + letterSpans.length * LOCK_STEP + 320;
  const tDone = setTimeout(() => {
    clearInterval(_scrambleTick);
    _scrambleTick = null;
    heroNameEl.classList.add('name-all-locked');
    startRoleCycling();
  }, ALL_DONE);
  _scrambleTimers.push(tDone);
}

// Role cycling: fade through sequence, settle on last
function startRoleCycling() {
  let idx = 0;

  function cycleNext() {
    heroRoleEl.style.transition = 'none';
    heroRoleEl.style.opacity    = '0';
    heroRoleEl.style.transform  = 'translateY(10px)';
    heroRoleEl.textContent      = ROLE_SEQUENCE[idx];

    requestAnimationFrame(() => requestAnimationFrame(() => {
      heroRoleEl.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      heroRoleEl.style.opacity    = '1';
      heroRoleEl.style.transform  = 'translateY(0)';
    }));

    if (idx < ROLE_SEQUENCE.length - 1) {
      setTimeout(() => {
        heroRoleEl.style.opacity   = '0';
        heroRoleEl.style.transform = 'translateY(-10px)';
        idx++;
        setTimeout(cycleNext, 300);
      }, 620);
    }
  }

  cycleNext();
}

// Play on page load
playHeroAnimation();

// Replay animation when the nav logo is clicked
document.getElementById('nav-logo').addEventListener('click', () => {
  document.getElementById('welcome').scrollIntoView({ behavior: 'smooth' });
  playHeroAnimation();
});

// Magnetic cursor: locked letters float toward the cursor
if (window.matchMedia('(hover: hover)').matches) {
  document.addEventListener('mousemove', e => {
    letterSpans.forEach(span => {
      if (!span.classList.contains('hero-locked')) return;
      const r  = span.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d  = Math.sqrt(dx * dx + dy * dy);
      const R  = 130;
      if (d < R && d > 0) {
        const f = (1 - d / R) * (1 - d / R) * 14;
        span.style.transform = `translate(${dx / d * f}px, ${dy / d * f}px)`;
      } else {
        span.style.transform = '';
      }
    });
  });
}

// Nav text: white while dark hero is visible, dark once scrolled away
const heroSection = document.getElementById('welcome');
const navLogo     = document.querySelector('.text-logo');
const navSub      = document.querySelector('.text-underlogo');

new IntersectionObserver(([entry]) => {
  navLogo.style.color = entry.isIntersecting ? '#ffffff' : '';
  navSub.style.color  = entry.isIntersecting ? 'rgba(255,255,255,0.45)' : '';
}, { threshold: 0.3 }).observe(heroSection);

// ── NAV PILL: sliding indicator ───────────────────────────────────────────
// Each toggle is --item-w (90px). Indicator left = pill-pad + index * item-w.
const ITEM_W    = 90;
const PILL_PAD  = 6;

const indicatorPill = document.querySelector('.nav-indicator-pill');
const navToggles    = document.querySelectorAll('.nav-toggle');

function setActiveIndex(index) {
  indicatorPill.style.left = `${PILL_PAD + index * ITEM_W}px`;
}

// Click: immediately snap indicator + block observer until scroll settles
// Without this guard, jumping 2+ sections triggers observer callbacks for
// every section the viewport passes through, making the indicator stutter.
let clickScrolling = false;
let clickScrollTimer;

navToggles.forEach((toggle, i) => {
  toggle.addEventListener('click', () => {
    setActiveIndex(i);
    clickScrolling = true;
    clearTimeout(clickScrollTimer);
    clickScrollTimer = setTimeout(() => { clickScrolling = false; }, 900);
  });
});

// Scroll: map section into view → indicator index
// Sections observed (skip #welcome which has no nav entry)
const sectionOrder = ['about', 'experience', 'tools'];

const scrollObserver = new IntersectionObserver(
  (entries) => {
    if (clickScrolling) return;
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const idx = sectionOrder.indexOf(entry.target.id);
        if (idx !== -1) setActiveIndex(idx);
      }
    });
  },
  { threshold: 0.45 }
);

sectionOrder.forEach(id => {
  const el = document.getElementById(id);
  if (el) scrollObserver.observe(el);
});

// Initialise indicator on the first nav item (About)
setActiveIndex(0);

// ── TIMELINE: scroll-driven dot/line highlighting ─────────────────────────
const timelineObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      const dot  = entry.target.querySelector('.marker-dot');
      const line = entry.target.querySelector('.marker-line');
      if (entry.isIntersecting) {
        dot?.classList.add('marker-dot--active');
        line?.classList.add('marker-line--active');
      } else {
        dot?.classList.remove('marker-dot--active');
        line?.classList.remove('marker-line--active');
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll('.timeline-entry').forEach(el => timelineObserver.observe(el));

// ── EMAIL CHIPS: copy to clipboard ───────────────────────────────────────
document.querySelectorAll('.chip-email').forEach(btn => {
  btn.addEventListener('click', () => {
    const email = btn.dataset.email;

    function showCopied() {
      btn.textContent = 'Copied!';
      btn.classList.add('chip-copied');
      setTimeout(() => {
        btn.classList.remove('chip-copied');
        btn.textContent = 'Email';
      }, 2000);
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(email).then(showCopied).catch(() => {
        execCommandCopy(email);
        showCopied();
      });
    } else {
      execCommandCopy(email);
      showCopied();
    }
  });
});

function execCommandCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}// ── SCROLL HINT: fade out on first scroll ─────────────────────────────────
const scrollHint = document.querySelector('.scroll-hint');
if (scrollHint) {
  window.addEventListener('scroll', () => {
    scrollHint.classList.toggle('is-hidden', window.scrollY > 80);
  }, { passive: true });
}

// ── ENTRANCE ANIMATIONS ───────────────────────────────────────────────────
// Assign stagger delays so grids pop in one by one
document.querySelectorAll('.tool-card[data-animate]').forEach((el, i) => {
  el.style.transitionDelay = `${i * 55}ms`;
});
document.querySelectorAll('.timeline-entry[data-animate]').forEach((el, i) => {
  el.style.transitionDelay = `${i * 100}ms`;
});
const aboutText = document.querySelector('.about-text[data-animate]');
if (aboutText) aboutText.style.transitionDelay = '150ms';

const animObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      animObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('[data-animate]').forEach(el => animObserver.observe(el));
