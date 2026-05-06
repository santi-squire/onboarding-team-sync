/* ============================================================
   Onboarding Team Sync — animations + new-slide population
   Loads independently of script.js. Populates:
     · headline finding slide
     · caveats slide
     · retrospective slide
     · commitments slide
   And orchestrates motion (counter, fragment cascade, chart easing).
   ============================================================ */

(() => {
  const CURRENT_WEEK = "2026-05-06";

  // ---------- Chart.js global animation polish ----------
  // These run synchronously at module load — must be set BEFORE
  // script.js constructs any Chart instance. script.js calls boot()
  // which awaits a fetch, so this code runs first in practice.
  if (typeof Chart !== "undefined") {
    Chart.defaults.animation = {
      duration: 1100,
      easing: "easeOutExpo",
    };
    // Per-property animation polish — bars rise from 0, lines ease in
    if (Chart.defaults.animations) {
      Chart.defaults.animations.y = {
        duration: 1100,
        easing: "easeOutExpo",
        from: 0,
      };
      Chart.defaults.animations.x = {
        duration: 800,
        easing: "easeOutQuart",
      };
    }
  }

  // ---------- DOM helpers ----------
  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value != null) el.textContent = value;
  }

  // ---------- Load week JSON + populate new slides ----------
  async function populateNewSlides() {
    let data;
    try {
      const res = await fetch(`./data/${CURRENT_WEEK}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      console.warn("[animations] failed to load week JSON:", err);
      return null;
    }

    populateHeadline(data);
    populatePerExposure(data);
    populateCaveats(data);
    populateRetrospective(data);
    populateCommitments(data);
    populateCourses(data);
    return data;
  }

  // ---------- Per-exposure slide ----------
  function populatePerExposure(data) {
    const p = data.perExposure;
    if (!p) return;
    setText("per-exposure-eyebrow", p.eyebrow);
    setText("per-exposure-title", p.title);
    setText("per-exposure-subtitle", p.subtitle);
    setText("exposure-honest-take", p.honestTake);

    if (p.flowA) {
      setText("exposure-a-rate", p.flowA.rate?.toFixed ? p.flowA.rate.toFixed(1) : p.flowA.rate);
      setText("exposure-a-rate-label", p.flowA.rateLabel || "");
      setText("exposure-a-fraction", `${p.flowA.numerator} / ${p.flowA.denominator} devices`);
      setText("exposure-a-path", p.flowA.path || "");
    }
    if (p.flowB) {
      setText("exposure-b-rate", p.flowB.rate?.toFixed ? p.flowB.rate.toFixed(1) : p.flowB.rate);
      setText("exposure-b-rate-label", p.flowB.rateLabel || "");
      setText("exposure-b-fraction", `${p.flowB.numerator} / ${p.flowB.denominator} devices`);
      setText("exposure-b-path", p.flowB.path || "");
    }

    // Delta callout
    if (p.flowA?.rate && p.flowB?.rate) {
      const delta = ((p.flowB.rate - p.flowA.rate) / p.flowA.rate) * 100;
      const sign = delta >= 0 ? "+" : "";
      setText("exposure-delta", `Flow B is ${sign}${delta.toFixed(0)}% relative to Flow A`);
    }

    const ul = document.getElementById("exposure-caveats");
    if (ul && Array.isArray(p.caveats)) {
      ul.innerHTML = "";
      p.caveats.forEach((c) => {
        const li = document.createElement("li");
        li.textContent = c;
        ul.appendChild(li);
      });
    }
  }

  // ---------- Courses slides ----------
  function populateCourses(data) {
    const c = data.courses;
    if (!c) return;

    setText("courses-title", c.title);
    setText("courses-tagline", c.tagline);
    setText("courses-context", c.context);

    if (c.figma) {
      setText("figma-name", c.figma.name);
      setText("figma-subtitle", c.figma.subtitle);
      const link = document.getElementById("figma-link");
      if (link && c.figma.url) link.href = c.figma.url;

      const ul = document.getElementById("figma-highlights");
      if (ul && Array.isArray(c.figma.highlights)) {
        ul.innerHTML = "";
        c.figma.highlights.forEach((h) => {
          const li = document.createElement("li");
          li.textContent = h;
          ul.appendChild(li);
        });
      }
    }

    if (c.claudeDesignFlow) {
      const f = c.claudeDesignFlow;
      setText("cflow-step1-title", f.step1?.title);
      setText("cflow-step1-detail", f.step1?.detail);
      setText("cflow-step2-title", f.step2?.title);
      setText("cflow-step2-detail", f.step2?.detail);
      setText("cflow-step3-title", f.step3?.title);
      setText("cflow-step3-detail", f.step3?.detail);
    }

    const list = document.getElementById("tools-list");
    if (list && Array.isArray(c.tools)) {
      list.innerHTML = "";
      c.tools.forEach((t) => {
        const li = document.createElement("li");
        li.className = "tool-card";
        li.innerHTML = `
          <div class="tool-head">
            <span class="tool-name">${escapeHtml(t.name)}</span>
            <span class="tool-license">${escapeHtml(t.license || "")}</span>
          </div>
          <div class="tool-meta">${escapeHtml(t.by || "")}${t.released ? ` · ${escapeHtml(t.released)}` : ""}</div>
          <p class="tool-note">${escapeHtml(t.note || "")}</p>
        `;
        list.appendChild(li);
      });
    }
  }

  function populateHeadline(data) {
    const h = data.headlineFinding;
    if (!h) return;

    setText("headline-kicker", h.eyebrow || "Headline");
    setText("headline-explanation-kicker", h.kicker || "");
    setText("headline-explanation", h.explanation || "");
    setText("headline-takeaway", h.takeaway || "");
    setText("headline-stat-suffix", h.statSuffix || "");

    // Stat target — strip non-numeric for animation
    const statEl = document.getElementById("headline-stat");
    if (statEl) {
      const raw = (h.stat || "0").replace(/[^\d.]/g, "");
      const target = parseFloat(raw) || 0;
      statEl.dataset.target = String(target);
      statEl.textContent = "0.0";
    }
  }

  function populateCaveats(data) {
    const list = document.getElementById("caveat-list");
    if (!list || !Array.isArray(data.caveats)) return;
    list.innerHTML = "";
    data.caveats.forEach((c, i) => {
      const li = document.createElement("li");
      li.className = "caveat-card";
      li.innerHTML = `
        <span class="caveat-num">${String(i + 1).padStart(2, "0")}</span>
        <div>
          <h4>${escapeHtml(c.title)}</h4>
          <p>${escapeHtml(c.detail)}</p>
          <div class="caveat-fix">${escapeHtml(c.fix || "")}</div>
        </div>
      `;
      list.appendChild(li);
    });
  }

  function populateRetrospective(data) {
    const r = data.retrospective || {};
    const stats = r.stats || {};

    // Stat strip — prefer custom cells if provided
    const strip = document.getElementById("retro-stat-strip");
    if (strip) {
      const cells = Array.isArray(stats.cells) && stats.cells.length > 0
        ? stats.cells
        : [
            { value: stats.daysToShip ?? "—", label: "Days to ship" },
            { value: stats.platforms ?? "—", label: "Platforms" },
            { value: stats.eventsInstrumented ?? "—", label: "Events instrumented" },
          ];
      strip.innerHTML = cells
        .map(
          (c) => `
        <div class="retro-stat-cell">
          <div class="retro-stat-value">${escapeHtml(String(c.value))}</div>
          <div class="retro-stat-label">${escapeHtml(c.label || "")}</div>
          ${c.subtext ? `<div class="retro-stat-sub">${escapeHtml(c.subtext)}</div>` : ""}
        </div>`,
        )
        .join("");
    }

    // Two columns — items can be strings OR { title, detail, learning }
    fillRetroColumn("retro-went-well", r.wentWell, "to be filled in live");
    fillRetroColumn("retro-slowed-down", r.slowedDown, "to be filled in live");
  }

  function fillRetroColumn(id, items, placeholderText) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = "";
    if (Array.isArray(items) && items.length > 0) {
      items.forEach((item) => {
        const li = document.createElement("li");
        if (typeof item === "string") {
          li.textContent = item;
        } else {
          const title = escapeHtml(item.title || "");
          const detail = escapeHtml(item.detail || "");
          const learning = escapeHtml(item.learning || "");
          li.innerHTML = `
            <div class="retro-item-title">${title}</div>
            ${detail ? `<div class="retro-item-detail">${detail}</div>` : ""}
            ${learning ? `<div class="retro-item-learning"><span class="retro-item-learning-label">Learning</span> ${learning}</div>` : ""}
          `;
        }
        ul.appendChild(li);
      });
    } else {
      for (let i = 0; i < 3; i++) {
        const li = document.createElement("li");
        li.className = "retro-placeholder";
        li.textContent = placeholderText;
        ul.appendChild(li);
      }
    }
  }

  function populateCommitments(data) {
    const ul = document.getElementById("commitment-list");
    if (!ul) return;
    ul.innerHTML = "";

    const items = Array.isArray(data.commitments) ? data.commitments : [];

    if (items.length === 0) {
      const li = document.createElement("li");
      li.className = "commitment-placeholder";
      li.textContent = "Commitments will be agreed in this session — added live.";
      ul.appendChild(li);
      return;
    }

    items.forEach((c, i) => {
      const li = document.createElement("li");
      const num = String(i + 1).padStart(2, "0");
      const text = typeof c === "string" ? c : (c.text || c.title || "");
      const owner = (typeof c === "object" && c.owner) ? c.owner : "";
      const scope = (typeof c === "object" && c.scope) ? c.scope : "";
      const note = (typeof c === "object" && c.note) ? c.note : "";
      li.innerHTML = `
        <span class="commitment-num">${num}</span>
        <span class="commitment-check" aria-hidden="true"></span>
        <div class="commitment-body">
          <div class="commitment-text">${escapeHtml(text)}</div>
          ${note ? `<div class="commitment-note">${escapeHtml(note)}</div>` : ""}
        </div>
        <div class="commitment-meta-stack">
          ${owner ? `<span class="commitment-meta">${escapeHtml(owner)}</span>` : ""}
          ${scope ? `<span class="commitment-scope">${escapeHtml(scope)}</span>` : ""}
        </div>
      `;
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  // ---------- Headline counter animation (GSAP) ----------
  let headlineAnimated = false;
  function animateHeadline() {
    if (headlineAnimated) return;
    const el = document.getElementById("headline-stat");
    if (!el) return;
    const target = parseFloat(el.dataset.target || "0");
    if (!target) return;

    headlineAnimated = true;

    if (typeof gsap !== "undefined") {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 1.6,
        ease: "expo.out",
        onUpdate: () => {
          el.textContent = obj.v.toFixed(1);
        },
        onComplete: () => {
          el.textContent = target.toFixed(1);
        },
      });

      // Subtle scale-in on the whole stat block
      const block = qs(".headline-stat-block");
      if (block) {
        gsap.fromTo(
          block,
          { scale: 0.92, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1, ease: "expo.out" },
        );
      }

      const left = qs(".headline-left");
      if (left) {
        gsap.fromTo(
          left.children,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", stagger: 0.09, delay: 0.1 },
        );
      }
    } else {
      // Fallback: vanilla rAF tween
      const start = performance.now();
      const dur = 1500;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = (target * eased).toFixed(1);
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target.toFixed(1);
      };
      requestAnimationFrame(tick);
    }
  }

  function resetHeadline() {
    headlineAnimated = false;
    const el = document.getElementById("headline-stat");
    if (el) el.textContent = "0.0";
  }

  // ---------- Reveal.js hooks ----------
  function wireRevealHooks() {
    if (typeof Reveal === "undefined") {
      // Reveal isn't initialized yet — try again shortly
      setTimeout(wireRevealHooks, 80);
      return;
    }

    const fire = (slide) => {
      if (!slide) return;
      if (slide.id === "headline-slide" || slide.classList?.contains("headline-slide")) {
        animateHeadline();
      } else {
        // Optional: reset so re-entering replays
        // resetHeadline();
      }
    };

    // Initial
    if (typeof Reveal.isReady === "function" && Reveal.isReady()) {
      fire(Reveal.getCurrentSlide());
    } else {
      Reveal.on("ready", (e) => fire(e.currentSlide));
    }

    Reveal.on("slidechanged", (e) => fire(e.currentSlide));
  }

  // ---------- Timeline shimmer overlay ----------
  function injectTimelineShimmer() {
    // Wait until script.js renders the timeline nodes
    const tryInject = (attempts = 0) => {
      const tl = document.getElementById("rollout-timeline");
      if (!tl) return;
      if (tl.children.length === 0 && attempts < 30) {
        return setTimeout(() => tryInject(attempts + 1), 80);
      }
      if (tl.querySelector(".timeline-shimmer")) return;
      const sh = document.createElement("div");
      sh.className = "timeline-shimmer";
      tl.appendChild(sh);
    };
    tryInject();
  }

  // ---------- Boot ----------
  async function init() {
    await populateNewSlides();
    injectTimelineShimmer();
    wireRevealHooks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
