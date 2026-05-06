/* ============================================================
   Email-First Login Analysis — slide controller
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

function pillFor(tier) {
  if (tier === "must") return `<span class="pill pill-accent">Must</span>`;
  return `<span class="pill pill-info">Nice</span>`;
}

function statusPill(label) {
  if (label === "ok") return `<span class="pill pill-success">OK</span>`;
  if (label === "pending") return `<span class="pill pill-warning">Pending</span>`;
  if (label === "fail") return `<span class="pill pill-danger">Fail</span>`;
  return `<span class="pill pill-info">${label}</span>`;
}

// ---------- Chart defaults ----------

if (typeof Chart !== "undefined") {
  Chart.defaults.color = COLORS.textMuted;
  Chart.defaults.font.family = FONT_SANS;
  Chart.defaults.font.size = 12;
  Chart.defaults.borderColor = COLORS.border;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 16;
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
  setText("cover-deploy", data.deployedDate);
  setText("cover-days", `${data.daysSinceDeploy}`);
  setText("footer-week", data.weekOf);
}

function renderStatus(data) {
  setText("status-headline", data.headline);
  setText("stat-week-num", `Week ${data.weekNumber}`);
  setText("stat-days", data.daysSinceDeploy);
  setText("stat-source", data.dataSource.startsWith("Pending") ? "Pending" : data.dataSource);
}

function renderShipped(data) {
  const ul = document.getElementById("shipped-list");
  ul.innerHTML = "";
  data.thisWeekShipped.forEach((item) => {
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

function renderEvents(data) {
  const tbody = document.querySelector("#events-table tbody");
  tbody.innerHTML = "";
  data.events.forEach((ev) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono">${ev.name}</td>
      <td class="muted">${ev.scope}</td>
      <td class="muted">${ev.purpose}</td>
      <td>${pillFor(ev.tier)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderNorthStar(data) {
  setText("north-star-question", data.experimentMeta.northStar);
  setText("primary-metric", data.experimentMeta.primaryMetric);
}

function renderThreshold(data) {
  setText("threshold", data.experimentMeta.successThreshold);
}

function renderVariantBalance(data) {
  // LaunchDarkly chart
  const ldCanvas = document.getElementById("chart-variant-ld");
  const ld = data.variantBalance.launchDarkly;
  const total = ld.flowA + ld.flowB;
  const flowAPct = ((ld.flowA / total) * 100).toFixed(1);
  const flowBPct = ((ld.flowB / total) * 100).toFixed(1);

  new Chart(ldCanvas, {
    type: "doughnut",
    data: {
      labels: [`Flow A · ${flowAPct}%`, `Flow B · ${flowBPct}%`],
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
      cutout: "65%",
      plugins: {
        legend: { position: "bottom", labels: { color: COLORS.textMuted, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label.split(" · ")[0]}: ${ctx.parsed} exposures`,
          },
        },
      },
    },
  });

  // Snowflake placeholder
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
        cutout: "65%",
        plugins: {
          legend: { position: "bottom", labels: { color: COLORS.textMuted, font: { size: 11 } } },
        },
      },
    });
  } else {
    sfWrap.innerHTML = emptyChartHtml(
      "Awaiting Snowflake access",
      "Once Denis K provisions access we'll cross-check LD's split against the source-of-truth event stream.",
    );
  }

  // Note
  const noteText = ld.note || "";
  setText("variant-balance-note-text", noteText);
}

function renderFunnel(data) {
  const wrap = document.getElementById("funnel-wrap");
  if (!data.funnel) {
    wrap.innerHTML = emptyChartHtml(
      "Funnel data pending",
      "Will populate from LOGIN_EXPERIMENT_ASSIGNED, WELCOME_SCREEN_VIEWED, and LOGIN_SUCCEEDED tables once Snowflake access is live.",
    );
    return;
  }
  wrap.innerHTML = `<canvas id="chart-funnel"></canvas>`;
  const labels = data.funnel.steps;
  new Chart(document.getElementById("chart-funnel"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Flow A",
          data: data.funnel.flowA,
          backgroundColor: COLORS.flowA,
          borderRadius: 6,
        },
        {
          label: "Flow B",
          data: data.funnel.flowB,
          backgroundColor: COLORS.flowB,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { color: COLORS.textMuted } },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: COLORS.textMuted },
        },
        y: {
          grid: { color: COLORS.border },
          ticks: { color: COLORS.textMuted },
          beginAtZero: true,
        },
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
          label: "Flow A — Indie via signup_link",
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
          label: "Flow B — Indie via signup_link",
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
      plugins: {
        legend: { position: "top", labels: { color: COLORS.textMuted } },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: COLORS.textMuted },
        },
        y: {
          grid: { color: COLORS.border },
          ticks: { color: COLORS.textMuted },
          beginAtZero: true,
        },
      },
    },
  });
}

function renderSanityChecks(data) {
  const tbody = document.querySelector("#sanity-table tbody");
  tbody.innerHTML = "";

  const expectedRows = [
    { event: "Email check result", expected: "Flow B only", flowAExpected: 0, flowBExpected: ">0" },
    { event: "Signup link tapped", expected: "Flow A only", flowAExpected: ">0", flowBExpected: 0 },
    { event: "Login experiment assigned", expected: "Both", flowAExpected: ">0", flowBExpected: ">0" },
  ];

  expectedRows.forEach((row) => {
    const tr = document.createElement("tr");
    if (data.sanityChecks && data.sanityChecks[row.event]) {
      const observed = data.sanityChecks[row.event];
      tr.innerHTML = `
        <td class="mono">${row.event}</td>
        <td class="muted">${row.expected}</td>
        <td class="mono">${observed.flowA}</td>
        <td class="mono">${observed.flowB}</td>
        <td>${statusPill(observed.status)}</td>
      `;
    } else {
      tr.innerHTML = `
        <td class="mono">${row.event}</td>
        <td class="muted">${row.expected}</td>
        <td class="mono muted">—</td>
        <td class="mono muted">—</td>
        <td>${statusPill("pending")}</td>
      `;
    }
    tbody.appendChild(tr);
  });
}

function renderIssues(data) {
  const ul = document.getElementById("issue-list");
  ul.innerHTML = "";
  data.openIssues.forEach((issue) => {
    const li = document.createElement("li");
    const markerClass = issue.blocking?.toLowerCase().includes("trustworthiness")
      ? "danger"
      : issue.blocking
      ? "warn"
      : "";
    li.innerHTML = `
      <span class="issue-marker ${markerClass}"></span>
      <div class="issue-body">
        <h4>${issue.title}</h4>
        <p>${issue.status}${issue.blocking ? ` · <strong style="color: var(--text-muted);">Blocks:</strong> ${issue.blocking}` : ""}</p>
      </div>
      <span class="issue-meta">${issue.owner}</span>
    `;
    ul.appendChild(li);
  });
}

function renderNextWeek(data) {
  const ul = document.getElementById("next-list");
  ul.innerHTML = "";
  data.nextWeek.forEach((item) => {
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
  renderStatus(data);
  renderShipped(data);
  renderEvents(data);
  renderNorthStar(data);
  renderThreshold(data);
  renderVariantBalance(data);
  renderFunnel(data);
  renderNorthStarChart(data);
  renderSanityChecks(data);
  renderIssues(data);
  renderNextWeek(data);

  // Init reveal AFTER content is in the DOM so layout calculations are correct
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
