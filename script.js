/* ============================================================
   Onboarding Team Sync — slide controller
   Loads weekly JSON, populates DOM, renders Chart.js charts,
   initializes reveal.js. All renderers are null-tolerant — slides
   may be added/removed without breaking the boot path.
   ============================================================ */

const CURRENT_WEEK = "2026-05-06";

const css = getComputedStyle(document.documentElement);
const COLORS = {
  flowA: css.getPropertyValue("--flow-a").trim() || "#60a5fa",
  flowB: css.getPropertyValue("--flow-b").trim() || "#f97316",
  text: css.getPropertyValue("--text").trim() || "#f8fafc",
  textMuted: css.getPropertyValue("--text-muted").trim() || "#94a3b8",
  textDim: css.getPropertyValue("--text-dim").trim() || "#64748b",
  border: "rgba(255, 255, 255, 0.08)",
  surface: css.getPropertyValue("--bg-surface").trim() || "#131729",
  accent: css.getPropertyValue("--accent").trim() || "#f97316",
  warning: css.getPropertyValue("--warning").trim() || "#fbbf24",
  success: css.getPropertyValue("--success").trim() || "#4ade80",
  danger: css.getPropertyValue("--danger").trim() || "#f87171",
};

const FONT_SANS = `"Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
const FONT_MONO = `"JetBrains Mono", "SF Mono", monospace`;

// ---------- Helpers ----------
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "—";
}

function emptyChartHtml(title, message) {
  return `
    <div class="chart-empty">
      <div class="chart-empty-icon pulse">···</div>
      <h4>${title}</h4>
      <p>${message}</p>
    </div>
  `;
}

// ---------- Chart defaults ----------
if (typeof Chart !== "undefined") {
  Chart.defaults.color = COLORS.textMuted;
  Chart.defaults.font.family = FONT_SANS;
  Chart.defaults.font.size = 12;
  Chart.defaults.borderColor = COLORS.border;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 14;
  Chart.defaults.plugins.tooltip.backgroundColor = COLORS.surface;
  Chart.defaults.plugins.tooltip.titleColor = COLORS.text;
  Chart.defaults.plugins.tooltip.bodyColor = COLORS.textMuted;
  Chart.defaults.plugins.tooltip.borderColor = COLORS.border;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 6;
}

// ---------- Renderers ----------
function renderCover(data) {
  setText("cover-week", data.weekOf);
  setText("cover-presenter", data.presenter || "—");
  setText("footer-week", data.weekOf);
}

function renderRollout(data) {
  const tl = document.getElementById("rollout-timeline");
  if (!tl) return;
  const rollout = data.experiment?.rollout;
  if (!rollout) return;

  setText("rollout-interpretation", rollout.interpretation);

  tl.innerHTML = "";
  const today = rollout.today || data.weekOf;
  rollout.phases.forEach((phase) => {
    const node = document.createElement("div");
    let cls = "timeline-node";
    if (phase.date === today) cls += " active";
    else if (phase.date > today) cls += " future";
    node.className = cls;
    node.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-percent">${phase.percent}%</div>
      <div class="timeline-date">${phase.date}</div>
      <div class="timeline-label">${phase.label || ""}</div>
    `;
    tl.appendChild(node);
  });
}

function renderHitoMiniTimeline(data) {
  const tl = document.getElementById("hito-mini-timeline");
  if (!tl) return;

  const milestones = [
    { date: "2026-03-18", label: "Team formed" },
    { date: "2026-03-25", label: "Kickoff" },
    { date: "2026-04-01", label: "Started" },
    { date: "2026-04-30", label: "1% ship" },
    { date: "2026-05-06", label: "Today · 50%", active: true },
    { date: "2026-05-07", label: "100% rollout" },
  ];

  tl.innerHTML = milestones
    .map(
      (m) => `
    <div class="hito-tl-node ${m.active ? "active" : ""}">
      <div class="hito-tl-dot"></div>
      <div class="hito-tl-date">${m.date.slice(5)}</div>
      <div class="hito-tl-label">${m.label}</div>
    </div>
  `,
    )
    .join("");
}

function renderMetricExplainers(data) {
  (data.metrics || []).forEach((metric) => {
    const slide = document.querySelector(`[data-metric-id="${metric.id}"]`);
    if (!slide) return;
    const setIfExists = (sel, val) => {
      const el = slide.querySelector(sel);
      if (el && val != null) el.textContent = val;
    };
    setIfExists(".metric-eyebrow", metric.eyebrow);
    setIfExists(".metric-title", metric.title);
    setIfExists(".metric-definition", metric.definition);
    setIfExists(".metric-why", metric.whyItMatters);
    setIfExists(".metric-watch", metric.watchFor);

    // currentRead can be a string OR an object {data, meaning, conclusion}
    const cr = metric.currentRead;
    if (typeof cr === "string") {
      // Legacy — fold into conclusion only
      setIfExists(".metric-current-text", cr);
    } else if (cr && typeof cr === "object") {
      setIfExists(".metric-current-data", cr.data);
      setIfExists(".metric-current-meaning", cr.meaning);
      setIfExists(".metric-current-text", cr.conclusion);
    }
  });
}

function renderTldr(data) {
  const ul = document.getElementById("tldr-list");
  if (!ul || !data.tldr) return;
  setText("tldr-eyebrow", data.tldr.eyebrow);
  setText("tldr-kicker", data.tldr.kicker);
  ul.innerHTML = "";
  (data.tldr.highlights || []).forEach((h) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="tldr-icon">${h.icon}</span><span class="tldr-text">${(h.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`;
    ul.appendChild(li);
  });
}

// ---------- Charts ----------
function renderVariantBalanceCharts(data) {
  const ldCanvas = document.getElementById("chart-variant-ld");
  if (!ldCanvas || !data.variantBalance) return;
  const ld = data.variantBalance.launchDarkly;
  if (ld) {
    const total = ld.flowA + ld.flowB;
    const a = ((ld.flowA / total) * 100).toFixed(1);
    const b = ((ld.flowB / total) * 100).toFixed(1);
    new Chart(ldCanvas, {
      type: "doughnut",
      data: {
        labels: [`Flow A · ${a}%`, `Flow B · ${b}%`],
        datasets: [{
          data: [ld.flowA, ld.flowB],
          backgroundColor: [COLORS.flowA, COLORS.flowB],
          borderColor: COLORS.surface,
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: { color: COLORS.textMuted, font: { size: 10 } } },
        },
      },
    });
  }

  const sfWrap = document.getElementById("snowflake-variant-wrap");
  if (sfWrap) {
    if (data.variantBalance.snowflake) {
      sfWrap.innerHTML = `<canvas id="chart-variant-sf"></canvas>`;
      const sf = data.variantBalance.snowflake;
      const total = sf.flowA + sf.flowB;
      const a = ((sf.flowA / total) * 100).toFixed(1);
      const b = ((sf.flowB / total) * 100).toFixed(1);
      new Chart(document.getElementById("chart-variant-sf"), {
        type: "doughnut",
        data: {
          labels: [`Flow A · ${a}%`, `Flow B · ${b}%`],
          datasets: [{
            data: [sf.flowA, sf.flowB],
            backgroundColor: [COLORS.flowA, COLORS.flowB],
            borderColor: COLORS.surface,
            borderWidth: 3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: { position: "bottom", labels: { color: COLORS.textMuted, font: { size: 10 } } },
          },
        },
      });
    } else {
      sfWrap.innerHTML = emptyChartHtml("Pending", "Snowflake re-pull in flight.");
    }
  }
}

function renderFunnel(data) {
  const wrap = document.getElementById("funnel-wrap");
  if (!wrap) return;
  if (!data.funnel) {
    wrap.innerHTML = emptyChartHtml("Funnel data pending", "Re-pull with consistent ANONYMOUS_ID in flight.");
    return;
  }
  wrap.innerHTML = `<canvas id="chart-funnel"></canvas>`;
  new Chart(document.getElementById("chart-funnel"), {
    type: "bar",
    data: {
      labels: data.funnel.steps,
      datasets: [
        { label: "Flow A", data: data.funnel.flowA, backgroundColor: COLORS.flowA, borderRadius: 6 },
        { label: "Flow B", data: data.funnel.flowB, backgroundColor: COLORS.flowB, borderRadius: 6 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top", labels: { color: COLORS.textMuted } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: COLORS.textMuted } },
        y: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted }, beginAtZero: true },
      },
    },
  });
}

function renderNorthStarChart(data) {
  const wrap = document.getElementById("north-star-wrap");
  if (!wrap) return;
  if (!data.northStarData) {
    wrap.innerHTML = emptyChartHtml(
      "North star data pending",
      "Filtered to ACCOUNT_CREATED with account_type='indie' AND came_from='signup_link'.",
    );
    return;
  }
  wrap.innerHTML = `<canvas id="chart-north-star"></canvas>`;
  new Chart(document.getElementById("chart-north-star"), {
    type: "bar",
    data: {
      labels: data.northStarData.categories,
      datasets: [
        { label: "Flow A", data: data.northStarData.flowA, backgroundColor: COLORS.flowA, borderRadius: 6 },
        { label: "Flow B", data: data.northStarData.flowB, backgroundColor: COLORS.flowB, borderRadius: 6 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top", labels: { color: COLORS.textMuted } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: COLORS.textMuted } },
        y: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted }, beginAtZero: true },
      },
    },
  });
}

function renderEmailCheckChart(data) {
  const wrap = document.getElementById("email-check-wrap");
  if (!wrap) return;
  if (!data.emailCheck) {
    wrap.innerHTML = emptyChartHtml("Email check data pending", "EMAIL_CHECK_RESULT by result + input_type, Flow B only.");
    return;
  }
  wrap.innerHTML = `<canvas id="chart-email-check"></canvas>`;
  const sumOf = (k) => {
    const v = data.emailCheck[k];
    if (typeof v === "number") return v;
    if (v && typeof v === "object") return (v.email || 0) + (v.username || 0);
    return 0;
  };
  const totals = data.emailCheck.totals || {};
  new Chart(document.getElementById("chart-email-check"), {
    type: "bar",
    data: {
      labels: [
        `returning · ${totals.returning_pct ?? "—"}%`,
        `temp_password · ${totals.temp_password_pct ?? "—"}%`,
        `new_user · ${totals.new_user_pct ?? "—"}%`,
      ],
      datasets: [
        {
          label: "Total Flow B email check events",
          data: [sumOf("returning"), sumOf("temp_password"), sumOf("new_user")],
          backgroundColor: [COLORS.flowA, COLORS.success, COLORS.warning],
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: COLORS.textMuted, font: { size: 11 } } },
        y: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted }, beginAtZero: true },
      },
    },
  });
}

function renderFrictionChart(data) {
  const wrap = document.getElementById("friction-wrap");
  if (!wrap) return;
  if (!data.friction) {
    wrap.innerHTML = emptyChartHtml("Friction data pending", "Failed / abandoned / forgot-password counts by variant.");
    return;
  }
  wrap.innerHTML = `<canvas id="chart-friction"></canvas>`;
  new Chart(document.getElementById("chart-friction"), {
    type: "bar",
    data: {
      labels: data.friction.events,
      datasets: [
        { label: "Flow A", data: data.friction.flowA, backgroundColor: COLORS.flowA, borderRadius: 6 },
        { label: "Flow B", data: data.friction.flowB, backgroundColor: COLORS.flowB, borderRadius: 6 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top", labels: { color: COLORS.textMuted } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: COLORS.textMuted } },
        y: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted }, beginAtZero: true },
      },
    },
  });
}

function renderCourses(data) {
  if (!data.courses) return;
  setText("courses-title", data.courses.title);
  setText("courses-context", data.courses.context);
  if (data.courses.figma) {
    setText("figma-name", data.courses.figma.name);
    const link = document.getElementById("figma-link");
    if (link && data.courses.figma.url) link.href = data.courses.figma.url;
  }

  const planUl = document.getElementById("courses-plan-list");
  if (planUl && Array.isArray(data.courses.ourPlan)) {
    planUl.innerHTML = "";
    data.courses.ourPlan.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      planUl.appendChild(li);
    });
  }

  const toolsUl = document.getElementById("courses-tools-list");
  if (toolsUl && Array.isArray(data.courses.tools)) {
    toolsUl.innerHTML = "";
    data.courses.tools.forEach((t) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${t.name}</strong> <span class="course-tool-note">${t.note || ""}</span>`;
      toolsUl.appendChild(li);
    });
  }
}

// ---------- Boot ----------
async function boot() {
  let data;
  try {
    const res = await fetch(`./data/${CURRENT_WEEK}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    document.body.innerHTML = `
      <div style="max-width: 600px; margin: 6rem auto; font-family: ${FONT_SANS}; color: ${COLORS.text};">
        <h1 style="color: ${COLORS.danger};">Failed to load data</h1>
        <p>Tried <code>./data/${CURRENT_WEEK}.json</code>. ${err.message}</p>
      </div>
    `;
    return;
  }

  renderCover(data);
  renderRollout(data);
  renderHitoMiniTimeline(data);
  renderTldr(data);
  renderMetricExplainers(data);
  renderVariantBalanceCharts(data);
  renderFunnel(data);
  renderNorthStarChart(data);
  renderEmailCheckChart(data);
  renderFrictionChart(data);
  renderCourses(data);

  Reveal.initialize({
    hash: true,
    transition: "slide",
    transitionSpeed: "default",
    backgroundTransition: "fade",
    width: 1280,
    height: 800,
    margin: 0.04,
    minScale: 0.4,
    maxScale: 1.4,
    slideNumber: "c/t",
    controls: true,
    controlsTutorial: false,
    progress: true,
  });
}

boot();
