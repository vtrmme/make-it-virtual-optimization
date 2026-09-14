(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     Footer year
  ============================================================ */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     UI Audio — synthesized, no external files
  ============================================================ */
  const AudioUI = (() => {
    let ctx = null;
    let enabled = false;

    function ensureCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      return ctx;
    }

    function tone({ freq = 440, duration = 0.08, type = "sine", gain = 0.05, glideTo = null }) {
      if (!enabled) return;
      const c = ensureCtx();
      if (!c) return;
      if (c.state === "suspended") c.resume();

      const osc = c.createOscillator();
      const amp = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + duration);

      amp.gain.setValueAtTime(0.0001, c.currentTime);
      amp.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);

      osc.connect(amp).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + duration + 0.02);
    }

    return {
      isEnabled: () => enabled,
      setEnabled(v) {
        enabled = v;
        if (enabled) ensureCtx();
      },
      click() { tone({ freq: 720, glideTo: 480, duration: 0.09, type: "triangle", gain: 0.06 }); },
      hover() { tone({ freq: 1000, duration: 0.045, type: "sine", gain: 0.02 }); },
      tab()   { tone({ freq: 560, glideTo: 720, duration: 0.07, type: "sine", gain: 0.045 }); },
    };
  })();

  const audioToggle = document.getElementById("audioToggle");
  if (audioToggle) {
    audioToggle.addEventListener("click", () => {
      const next = !AudioUI.isEnabled();
      AudioUI.setEnabled(next);
      audioToggle.setAttribute("aria-pressed", String(next));
      if (next) AudioUI.click();
    });
  }

  document.querySelectorAll(".sfx-click, .btn, .tab-btn, .select-card").forEach((el) => {
    el.addEventListener("mouseenter", () => AudioUI.hover());
    el.addEventListener("click", () => AudioUI.click());
  });

  /* ============================================================
     Nav: scroll state + mobile toggle
  ============================================================ */
  const siteNav = document.getElementById("siteNav");
  const navToggle = document.getElementById("navToggle");
  const mainLinks = document.getElementById("mainLinks");

  function onScroll() {
    if (window.scrollY > 20) siteNav.classList.add("is-scrolled");
    else siteNav.classList.remove("is-scrolled");

    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    const fill = document.getElementById("scrollProgress");
    if (fill) fill.style.width = progress + "%";
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      const open = mainLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    mainLinks.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        mainLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ============================================================
     Tabs (Rendimiento / Estética) — per OS section
  ============================================================ */
  document.querySelectorAll("[data-tabs]").forEach((tabGroup) => {
    const buttons = tabGroup.querySelectorAll(".tab-btn");
    const section = tabGroup.closest(".os-section");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.tab;
        buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
        section.querySelectorAll(".tab-panel").forEach((panel) => {
          panel.classList.toggle("is-active", panel.dataset.panel === target);
        });
        AudioUI.tab();
      });
    });
  });

  /* ============================================================
     Before / After compare slider
  ============================================================ */
  const compareRange = document.getElementById("compareRange");
  const compareBefore = document.getElementById("compareBefore");
  const compareHandle = document.getElementById("compareHandle");

  function updateCompare(val) {
    if (compareBefore) compareBefore.style.clipPath = `inset(0 0 0 ${val}%)`;
    if (compareHandle) compareHandle.style.left = val + "%";
  }
  if (compareRange) {
    updateCompare(compareRange.value);
    compareRange.addEventListener("input", (e) => updateCompare(e.target.value));
  }

  /* ============================================================
     Circuit-board canvas background (hero)
  ============================================================ */
  const canvas = document.getElementById("circuitCanvas");
  if (canvas && !reduceMotion) {
    const ctx2d = canvas.getContext("2d");
    let w, h, nodes, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.parentElement.offsetWidth;
      h = canvas.parentElement.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes();
    }

    function buildNodes() {
      const count = Math.max(18, Math.round((w * h) / 42000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.6 + 0.6,
      }));
    }

    const maxDist = 150;
    const goldA = "rgba(242,183,5,";
    const silverA = "rgba(201,207,214,";

    function frame() {
      ctx2d.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.35;
            ctx2d.strokeStyle = goldA + alpha + ")";
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(a.x, a.y);
            ctx2d.lineTo(b.x, b.y);
            ctx2d.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx2d.beginPath();
        ctx2d.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx2d.fillStyle = Math.random() > 0.995 ? goldA + "0.9)" : silverA + "0.5)";
        ctx2d.fill();
      }
      requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(frame);
  }

  /* ============================================================
     GSAP entrance + scroll reveals
  ============================================================ */
  if (window.gsap) {
    gsap.registerPlugin(ScrollTrigger);

    // Hero orchestrated entrance
    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl
      .to(".hero-kicker", { opacity: 1, y: 0, duration: 0.6 }, 0.1)
      .to(".hero-title .line", { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, 0.15)
      .to(".hero-sub", { opacity: 1, y: 0, duration: 0.7 }, 0.55)
      .to(".hero-actions", { opacity: 1, y: 0, duration: 0.7 }, 0.68)
      .to(".hero-meta", { opacity: 1, y: 0, duration: 0.7 }, 0.8)
      .from(".hero-badge", { opacity: 0, scale: 0.85, rotateY: 40, duration: 1.1, ease: "power4.out" }, 0.3);

    gsap.set("[data-reveal]", { opacity: 0, y: 18 });
    gsap.set(".hero-badge", { opacity: 1 });

    // Generic scroll reveals for section headers and cards
    const revealTargets = [
      ".select-card",
      ".tip-card",
      ".visual-copy",
      ".visual-mock",
      ".tools-col",
      ".compare",
    ];
    revealTargets.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            delay: (i % 3) * 0.08,
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              once: true,
            },
          }
        );
      });
    });

    document.querySelectorAll(".section-kicker, .section-title, .section-lead").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        }
      );
    });
  } else {
    // Fallback if GSAP fails to load (e.g. offline): reveal everything immediately
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
  }

  /* ============================================================
     Active nav link highlight on scroll
  ============================================================ */
  const sections = document.querySelectorAll(".os-section[id]");
  const navLinks = document.querySelectorAll(".main-links a");
  if (sections.length && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((l) => l.classList.remove("is-current"));
            const match = document.querySelector(`.main-links a[href="#${entry.target.id}"]`);
            if (match) match.classList.add("is-current");
          }
        });
      },
      { threshold: 0.4 }
    );
    sections.forEach((s) => obs.observe(s));
  }
})();
