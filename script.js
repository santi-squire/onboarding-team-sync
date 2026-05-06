/* ============================================================
   Onboarding Team Sync — slide controller
   Loads weekly JSON data, populates DOM, renders Chart.js charts,
   initializes reveal.js. Update CURRENT_WEEK below to switch
   the week being shown.
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

function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value ?? "—";
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
  Chart.defaults.plugins.tooltip.titleFont = { family: FONT_SANS, weight: "600", size: 12 };
  Chart.defaults.plugins.tooltip.bodyFont = { family: FONT_MONO, size: 11 };
}

// ---------- Renderers ----------

function renderCover(data) {
  setText("cover-week", data.weekOf);
  setText("cover-presenter", data.presenter || "—");
  setText("footer-week", data.weekOf);
}

function renderAgenda(data) {
  const ol = document.getElementById("agenda-list");
  ol.innerHTML = "";
  (data.agenda || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    ol.appendChild(li);
  });
}

function renderShipped(data) {
  const ul = document.getElementById("shipped-list");
  ul.innerHTML = "";
  (data.thisWeekShipped || []).forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <h4>${item.title}</h4>
        <p>${item.detail}</p>
      </div>
    `;
    ul.appendChild(li);
  });
}

function renderExperimentContext(data) {
  const e = data.experiment;
  setText("experiment-jira", e.jiraKey);
  setText("experiment-title", e.jiraTitle);
  setText("experiment-problem", e.problem);
  setText("experiment-solution", e.solution);

  setText("flowA-name", e.flowA.name);
  setText("flowA-name-2", e.flowA.name);
  setText("flowA-tagline", e.flowA.tagline);
  setText("flowB-name", e.flowB.name);
  setText("flowB-name-2", e.flowB.name);
  setText("flowB-tagline", e.flowB.tagline);

  const stepsA = document.getElementById("flowA-steps");
  stepsA.innerHTML = "";
  e.flowA.steps.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    stepsA.appendChild(li);
  });

  const stepsB = document.getElementById("flowB-steps");
  stepsB.innerHTML = "";
  e.flowB.steps.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    stepsB.appendChild(li);
  });

  setText("methodology-note", e.methodologyNote);
  setText("rollout-interpretation", e.rollout.interpretation);

  // Timeline
  const tl = document.getElementById("rollout-timeline");
  tl.innerHTML = "";
  const today = data.weekOf; // simplified — assume week-of is "today"
  e.rollout.phases.forEach((phase) => {
    const node = document.createElement("div");
    let cls = "timeline-node";
    if (phase.date === today) cls += " active";
    else if (phase.date > today) cls += " future";
    node.className = cls;
    node.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-percent">${phase.percent}%</div>
      <div class="timeline-date">${phase.date}</div>
      <div class="timeline-label">${phase.label}</div>
    `;
    tl.appendChild(node);
  });
}

function renderNorthStarBlock(data) {
  const e = data.experiment;
  setText("north-star-question", e.northStar);
  setText("primary-metric", e.primaryMetric);
  setText("success-threshold", e.successThreshold);
}

function renderMetricExplainers(data) {
  // For each metric, find its slide via [data-metric-id] and populate explainer cards
  (data.metrics || []).forEach((metric) => {
    const slide = document.querySelector(`[data-metric-id="${metric.id}"]`);
    if (!slide) return;
    slide.querySelector(".metric-eyebrow").textContent = metric.eyebrow;
    slide.querySelector(".metric-title").textContent = metric.title;
    slide.querySelector(".metric-definition").textContent = metric.definition;
    slide.querySelector(".metric-why").textContent = metric.whyItMatters;
    slide.querySelector(".metric-watch").textContent = metric.watchFor;
    slide.querySelector(".metric-current").textContent = metric.currentRead;
  });
}

// ---------- Charts ----------

function renderVariantBalanceCharts(data) {
  // LD chart
  const ldCanvas = document.getElementById("chart-variant-ld");
  const ld = data.variantBalance.launchDarkly;
  const ldTotal = ld.flowA + ld.flowB;
  const ldA = ((ld.flowA / ldTotal) * 100).toFixed(1);
  const ldB = ((ld.flowB / ldTotal) * 100).toFixed(1);

  new Chart(ldCanvas, {
    type: "doughnut",
    data: {
      labels: [`Flow A · ${ldA}%`, `Flow B · ${ldB}%`],
      datasets: [
        {
          data: [ld.flowA, ld.flowB],
          backgroundColor: [COLORS.flowA, COLORS.flowB],
          borderColor: COLORS.surface,
          borderWidth: 3,
        },
      ],
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

  // Snowflake chart or pending state
  const sfWrap = document.getElementById("snowflake-variant-wrap");
  if (data.variantBalance.snowflake) {
    sfWrap.innerHTML = `<canvas id="chart-variant-sf"></canvas>`;
    const sf = data.variantBalance.snowflake;
    const sfTotal = sf.flowA + sf.flowB;
    const sfA = ((sf.flowA / sfTotal) * 100).toFixed(1);
    const sfB = ((sf.flowB / sfTotal) * 100).toFixed(1);
    new Chart(document.getElementById("chart-variant-sf"), {
      type: "doughnut",
      data: {
        labels: [`Flow A · ${sfA}%`, `Flow B · ${sfB}%`],
        datasets: [
          {
            data: [sf.flowA, sf.flowB],
            backgroundColor: [COLORS.flowA, COLORS.flowB],
            borderColor: COLORS.surface,
            borderWidth: 3,
          },
        ],
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
    sfWrap.innerHTML = emptyChartHtml(
      "Pending first pull",
      "Snowflake access just unblocked — first cross-check coming this session.",
    );
  }
}

function renderFunnel(data) {
  const wrap = document.getElementById("funnel-wrap");
  if (!data.funnel) {
    wrap.innerHTML = emptyChartHtml(
      "Funnel data pending",
      "Will populate from LOGIN_EXPERIMENT_ASSIGNED, WELCOME_SCREEN_VIEWED, and LOGIN_SUCCEEDED segmented by variant.",
    );
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
  if (!data.northStarData) {
    wrap.innerHTML = emptyChartHtml(
      "North star data pending",
      "Will populate from ACCOUNT_CREATED filtered to account_type='indie' AND came_from='signup_link', segmented by variant.",
    );
    return;
  }
  wrap.innerHTML = `<canvas id="chart-north-star"></canvas>`;
  new Chart(document.getElementById("chart-north-star"), {
    type: "line",
    data: {
      labels: data.northStarData.dates,
      datasets: [
        {
          label: "Flow A",
          data: data.northStarData.flowA,
          borderColor: COLORS.flowA,
          backgroundColor: "rgba(96, 165, 250, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: COLORS.flowA,
        },
        {
          label: "Flow B",
          data: data.northStarData.flowB,
          borderColor: COLORS.flowB,
          backgroundColor: "rgba(249, 115, 22, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: COLORS.flowB,
        },
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
  if (!data.emailCheck) {
    wrap.innerHTML = emptyChartHtml(
      "Email check data pending",
      "Will populate from EMAIL_CHECK_RESULT grouped by result (returning · temp_password · new_user). Flow B exclusive.",
    );
    return;
  }
  wrap.innerHTML = `<canvas id="chart-email-check"></canvas>`;
  new Chart(document.getElementById("chart-email-check"), {
    type: "bar",
    data: {
      labels: ["returning", "temp_password", "new_user"],
      datasets: [
        {
          label: "Flow B users",
          data: [data.emailCheck.returning, data.emailCheck.temp_password, data.emailCheck.new_user],
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
        x: { grid: { display: false }, ticks: { color: COLORS.textMuted } },
        y: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted }, beginAtZero: true },
      },
    },
  });
}

function renderFrictionChart(data) {
  const wrap = document.getElementById("friction-wrap");
  if (!data.friction) {
    wrap.innerHTML = emptyChartHtml(
      "Friction data pending",
      "Will populate from LOGIN_ATTEMPT_FAILED, FORGOT_PASSWORD_TAPPED, and LOGIN_ABANDONED, broken down by variant + reason.",
    );
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

function renderIssues(data) {
  const ul = document.getElementById("issue-list");
  ul.innerHTML = "";
  (data.openIssues || []).forEach((issue) => {
    const li = document.createElement("li");
    const markerClass = issue.severity || "";
    li.innerHTML = `
      <span class="issue-marker ${markerClass}"></span>
      <div class="issue-body">
        <h4>${issue.title}</h4>
        <p>${issue.status}</p>
      </div>
      <span class="issue-meta">${issue.owner}</span>
    `;
    ul.appendChild(li);
  });
}

function renderNextWeek(data) {
  const ul = document.getElementById("next-list");
  ul.innerHTML = "";
  (data.nextWeek || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  });
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
        <p style="color: ${COLORS.textMuted};">Tried <code>./data/${CURRENT_WEEK}.json</code>. ${err.message}</p>
        <p style="color: ${COLORS.textMuted};">Run a local server (e.g. <code>python3 -m http.server 8080</code>) and open <code>http://localhost:8080</code>.</p>
      </div>
    `;
    return;
  }

  renderCover(data);
  renderAgenda(data);
  renderShipped(data);
  renderExperimentContext(data);
  renderNorthStarBlock(data);
  renderMetricExplainers(data);

  renderVariantBalanceCharts(data);
  renderFunnel(data);
  renderNorthStarChart(data);
  renderEmailCheckChart(data);
  renderFrictionChart(data);

  renderIssues(data);
  renderNextWeek(data);

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
