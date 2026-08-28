/* ==========================================================================
   Muza — vanilla JS, no dependencies.
   ========================================================================== */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Luxury/clinical reveal on load, gated by a real preloader */
  function initLoadReveal() {
    var MIN_VISIBLE = 650;   /* preloader stays at least this long, avoids a flash */
    var MAX_WAIT = 4000;     /* hard ceiling in case load never fires cleanly */
    var start = Date.now();
    var released = false;

    function release() {
      if (released) return;
      released = true;
      var elapsed = Date.now() - start;
      var wait = Math.max(0, MIN_VISIBLE - elapsed);
      window.setTimeout(function () {
        document.documentElement.classList.remove('is-preloading');
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            document.documentElement.classList.add('is-loaded');
          });
        });
      }, wait);
    }

    if (document.readyState === 'complete') {
      release();
    } else {
      window.addEventListener('load', release);
    }
    window.setTimeout(release, MAX_WAIT);
  }

  /* 2. Scroll reveal */
  function initScrollReveal() {
    var targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* 3. Mobile nav overlay */
  function initNavOverlay() {
    var toggle = document.getElementById('navToggle');
    var overlay = document.getElementById('navOverlay');
    if (!toggle || !overlay) return;

    function openMenu() {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');
    }
    function closeMenu() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    }

    toggle.addEventListener('click', function () {
      overlay.classList.contains('is-open') ? closeMenu() : openMenu();
    });

    overlay.querySelectorAll('[data-nav-link]').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeMenu();
    });
  }

  /* 4. Nav solidify on scroll */
  function initNavState() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var ticking = false;
    function update() {
      nav.classList.toggle('nav--solid', window.scrollY > 20);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* 5. Services editorial hover preview */
  function initServicesPreview() {
    var list = document.getElementById('servicesList');
    var preview = document.getElementById('servicesPreview');
    var previewImg = document.getElementById('servicesPreviewImg');
    var previewClose = document.getElementById('servicesPreviewClose');
    if (!list || !preview || !previewImg) return;

    var isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (isDesktop) {
      var currentSrc = '';
      function moveCursor(e) {
        preview.style.left = e.clientX + 'px';
        preview.style.top = e.clientY + 'px';
      }

      list.querySelectorAll('.service').forEach(function (item) {
        item.addEventListener('mouseenter', function () {
          var src = item.getAttribute('data-service-image');
          if (src && src !== currentSrc) {
            previewImg.src = src;
            previewImg.alt = item.querySelector('.service__name').textContent;
            currentSrc = src;
          }
          preview.classList.add('is-active');
        });
        item.addEventListener('mousemove', moveCursor);
        item.addEventListener('mouseleave', function () {
          preview.classList.remove('is-active');
        });
      });
      return;
    }

    /* Touch devices: no hover state exists, so tapping a service opens
       a centered overlay instead. Tap again on the same item, tap the
       close button, or tap the dimmed background to dismiss it. */
    var activeItem = null;

    function openPreview(item) {
      var src = item.getAttribute('data-service-image');
      if (!src) return;
      previewImg.src = src;
      previewImg.alt = item.querySelector('.service__name').textContent;
      preview.classList.add('is-active');
      preview.setAttribute('aria-hidden', 'false');
      activeItem = item;
    }

    function closePreview() {
      preview.classList.remove('is-active');
      preview.setAttribute('aria-hidden', 'true');
      activeItem = null;
    }

    list.querySelectorAll('.service').forEach(function (item) {
      item.addEventListener('click', function () {
        if (activeItem === item) {
          closePreview();
        } else {
          openPreview(item);
        }
      });
    });

    if (previewClose) {
      previewClose.addEventListener('click', function (e) {
        e.stopPropagation();
        closePreview();
      });
    }

    /* Tap on the dimmed background (not the image frame itself) closes it */
    preview.addEventListener('click', function (e) {
      if (e.target === preview) closePreview();
    });
  }

  /* 5b. Magnetic buttons — desktop-only cursor pull, subtle */
  function initMagneticButtons() {
    var isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isDesktop || prefersReducedMotion) return;

    var MAX_MOVE = 6;
    document.querySelectorAll('.btn').forEach(function (button) {
      button.addEventListener('mousemove', function (e) {
        var rect = button.getBoundingClientRect();
        var relX = e.clientX - rect.left - rect.width / 2;
        var relY = e.clientY - rect.top - rect.height / 2;
        var moveX = Math.max(Math.min(relX * 0.2, MAX_MOVE), -MAX_MOVE);
        var moveY = Math.max(Math.min(relY * 0.2, MAX_MOVE), -MAX_MOVE);
        button.style.transform = 'translate(' + moveX + 'px, ' + (moveY - 2) + 'px)';
      });
      button.addEventListener('mouseleave', function () {
        button.style.transform = '';
      });
    });
  }

  /* 5c. Animated stat counters — count up when hero enters view */
  function initStatCounters() {
    var stats = document.querySelectorAll('.hero__stat-num');
    if (!stats.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) return;

    function animateCount(el) {
      var raw = el.textContent.trim();
      var match = raw.match(/^(\d+)(.*)$/);
      if (!match) return; /* non-numeric like "9–20", leave as-is but still fade via parent reveal */
      var target = parseInt(match[1], 10);
      var suffix = match[2];
      var duration = 900;
      var start = null;

      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    stats.forEach(function (el) { observer.observe(el); });
  }

  /* 7. Hide result-card gallery items whose image fails to load,
        so no empty gray block with a dangling caption gradient appears */
  function initResultCardFallback() {
    var cards = document.querySelectorAll('.result-card');
    cards.forEach(function (card) {
      var img = card.querySelector('img');
      if (!img) return;
      function hideCard() { card.style.display = 'none'; }
      if (img.complete && img.naturalWidth === 0) {
        hideCard();
      } else {
        img.addEventListener('error', hideCard);
      }
    });
  }

  function init() {
    initLoadReveal();
    initScrollReveal();
    initNavOverlay();
    initNavState();
    initServicesPreview();
    initMagneticButtons();
    initStatCounters();
    initResultCardFallback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
