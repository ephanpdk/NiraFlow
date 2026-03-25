let lineChart = null;
let barChart = null;
let compChart = null;

const form = document.getElementById("simForm");
const btnSimulate = document.getElementById("btnSimulate");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");
const loadingOverlay = document.getElementById("loadingOverlay");
const errorBanner = document.getElementById("errorBanner");
const errorMsg = document.getElementById("errorMsg");
const resultsSection = document.getElementById("results");

function setLoading(on) {
  btnSimulate.disabled = on;
  btnText.textContent = on ? "Menjalankan..." : "▶ Jalankan Simulasi M/M/c";
  btnSpinner.classList.toggle("hidden", !on);
  loadingOverlay.classList.toggle("hidden", !on);
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.classList.remove("hidden");
}

function dismissError() {
  errorBanner.classList.add("hidden");
}

function clearErrors() {
  ["err_tungku", "err_interarrival", "err_service", "err_waktu", "err_ferm"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  ["jumlah_tungku", "mean_interarrival", "mean_service", "waktu_simulasi"].forEach(id => {
    document.getElementById(id).classList.remove("is-invalid");
  });
  errorBanner.classList.add("hidden");
}

function validateForm() {
  const tungku = parseInt(document.getElementById("jumlah_tungku").value);
  const interarrival = parseFloat(document.getElementById("mean_interarrival").value);
  const service = parseFloat(document.getElementById("mean_service").value);
  const waktu = parseInt(document.getElementById("waktu_simulasi").value);
  const fermStr = document.getElementById("fermentation_threshold").value.trim();
  const ferm = fermStr !== "" ? parseFloat(fermStr) : null;

  let valid = true;

  if (isNaN(tungku) || tungku <= 0) {
    document.getElementById("err_tungku").textContent = "Jumlah tungku harus integer positif ≥ 1";
    document.getElementById("jumlah_tungku").classList.add("is-invalid");
    valid = false;
  }
  if (isNaN(interarrival) || interarrival <= 0) {
    document.getElementById("err_interarrival").textContent = "Nilai harus lebih dari 0";
    document.getElementById("mean_interarrival").classList.add("is-invalid");
    valid = false;
  }
  if (isNaN(service) || service <= 0) {
    document.getElementById("err_service").textContent = "Nilai harus lebih dari 0";
    document.getElementById("mean_service").classList.add("is-invalid");
    valid = false;
  }
  if (isNaN(waktu) || waktu <= 0) {
    document.getElementById("err_waktu").textContent = "Durasi simulasi harus lebih dari 0";
    document.getElementById("waktu_simulasi").classList.add("is-invalid");
    valid = false;
  }
  if (ferm !== null && (isNaN(ferm) || ferm <= 0)) {
    document.getElementById("err_ferm").textContent = "Batas fermentasi harus lebih dari 0 jika diisi";
    valid = false;
  }

  return valid ? { tungku, interarrival, service, waktu, ferm } : null;
}

function updateMetrics(data) {
  document.getElementById("val_utilization").textContent =
    data.server_utilization_percent.toFixed(1) + "%";
  document.getElementById("val_wait").textContent =
    data.avg_queue_time_minutes.toFixed(1) + " mnt";
  document.getElementById("val_throughput").textContent =
    data.total_nira_processed + " batch";
}

function updateFermAlert(evaluation) {
  const box = document.getElementById("fermAlert");
  const icon = document.getElementById("fermIcon");
  const label = document.getElementById("fermLabel");
  const msg = document.getElementById("fermMsg");

  if (!evaluation.ferm_status) {
    box.classList.add("hidden");
    return;
  }

  box.classList.remove("hidden", "danger", "safe");
  box.classList.add(evaluation.ferm_status);
  icon.textContent = evaluation.ferm_status === "danger" ? "⚠️" : "✅";
  label.textContent = evaluation.ferm_label;
  msg.textContent = evaluation.ferm_msg;
}

const statusMap = {
  optimal: { cls: "status-optimal", label: "Optimal (70–90%)" },
  warning: { cls: "status-warning", label: "Cukup Efisien (50–70%)" },
  danger:  { cls: "status-danger",  label: "Overload (>90%)" },
  idle:    { cls: "status-idle",    label: "Terlalu Idle (<50%)" }
};

function updateEvaluation(evaluation) {
  const badge = document.getElementById("evalBadge");
  const title = document.getElementById("evalTitle");
  const msgEl = document.getElementById("evalMsg");
  const rec   = document.getElementById("evalRec");

  const map = statusMap[evaluation.util_status] || {};
  badge.className = "eval-badge " + (map.cls || "");
  badge.textContent = evaluation.util_label || "—";
  title.textContent = "Status Utilisasi: " + (map.label || "");
  msgEl.textContent = evaluation.util_message || "";
  rec.textContent = evaluation.util_recommendation || "";
}

function renderLineChart(timeSeries) {
  const labels = timeSeries.map(d => d.minute);
  const values = timeSeries.map(d => d.queue_length);

  if (lineChart) lineChart.destroy();

  const ctx = document.getElementById("lineChart").getContext("2d");
  lineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Panjang Antrean Nira",
        data: values,
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.08)",
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#8b949e", font: { size: 11 } } },
        tooltip: {
          backgroundColor: "#161b22",
          borderColor: "#30363d",
          borderWidth: 1,
          titleColor: "#e6edf3",
          bodyColor: "#8b949e",
          callbacks: { label: ctx => `Antrean: ${ctx.parsed.y} batch` }
        }
      },
      scales: {
        x: {
          ticks: { color: "#8b949e", font: { size: 9 }, maxTicksLimit: 12 },
          grid: { color: "rgba(48,54,61,0.5)" },
          title: { display: true, text: "Menit ke-", color: "#8b949e", font: { size: 10 } }
        },
        y: {
          ticks: { color: "#8b949e", font: { size: 10 } },
          grid: { color: "rgba(48,54,61,0.5)" },
          title: { display: true, text: "Batch dalam Antrean", color: "#8b949e", font: { size: 10 } },
          beginAtZero: true
        }
      }
    }
  });
}

function renderBarChart(utilizationPercent, idlePercent) {
  if (barChart) barChart.destroy();

  const ctx = document.getElementById("barChart").getContext("2d");
  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Utilisasi Aktif (ρ)", "Idle Time"],
      datasets: [{
        label: "Persentase (%)",
        data: [utilizationPercent, idlePercent],
        backgroundColor: ["rgba(249,115,22,0.75)", "rgba(139,148,158,0.3)"],
        borderColor: ["#f97316", "#8b949e"],
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#161b22",
          borderColor: "#30363d",
          borderWidth: 1,
          titleColor: "#e6edf3",
          bodyColor: "#8b949e",
          callbacks: { label: ctx => `${ctx.parsed.y.toFixed(1)}%` }
        }
      },
      scales: {
        x: {
          ticks: { color: "#8b949e", font: { size: 12, weight: "600" } },
          grid: { display: false }
        },
        y: {
          ticks: { color: "#8b949e", font: { size: 10 }, callback: v => v + "%" },
          grid: { color: "rgba(48,54,61,0.5)" },
          min: 0, max: 100,
          title: { display: true, text: "Persentase (%)", color: "#8b949e", font: { size: 10 } }
        }
      }
    }
  });
}

function renderCompChart(comparison, selectedC, fermThreshold) {
  if (compChart) compChart.destroy();

  const labels = comparison.map(d => `c = ${d.jumlah_tungku}`);
  const utilData = comparison.map(d => d.server_utilization_percent);
  const waitData = comparison.map(d => d.avg_queue_time_minutes);

  const datasets = [
    {
      label: "Utilisasi (%)",
      data: utilData,
      backgroundColor: comparison.map(d =>
        d.jumlah_tungku === selectedC ? "rgba(249,115,22,0.85)" : "rgba(249,115,22,0.35)"
      ),
      borderColor: "#f97316",
      borderWidth: 2,
      borderRadius: 6,
      yAxisID: "y",
      type: "bar"
    },
    {
      label: "Waktu Tunggu (mnt)",
      data: waitData,
      borderColor: "#58a6ff",
      backgroundColor: "transparent",
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: comparison.map(d =>
        d.jumlah_tungku === selectedC ? "#f97316" : "#58a6ff"
      ),
      type: "line",
      yAxisID: "y2",
      tension: 0.3
    }
  ];

  if (fermThreshold) {
    datasets.push({
      label: `Batas Fermentasi (${fermThreshold} mnt)`,
      data: new Array(comparison.length).fill(fermThreshold),
      borderColor: "#f85149",
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 0,
      type: "line",
      yAxisID: "y2",
      fill: false
    });
  }

  const ctx = document.getElementById("compChart").getContext("2d");
  compChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#8b949e", font: { size: 11 }, padding: 16 } },
        tooltip: {
          backgroundColor: "#161b22",
          borderColor: "#30363d",
          borderWidth: 1,
          titleColor: "#e6edf3",
          bodyColor: "#8b949e"
        }
      },
      scales: {
        x: {
          ticks: { color: "#8b949e", font: { size: 11, weight: "600" } },
          grid: { display: false }
        },
        y: {
          position: "left",
          ticks: { color: "#f97316", font: { size: 10 }, callback: v => v + "%" },
          grid: { color: "rgba(48,54,61,0.5)" },
          title: { display: true, text: "Utilisasi (%)", color: "#f97316", font: { size: 10 } },
          min: 0, max: 105
        },
        y2: {
          position: "right",
          ticks: { color: "#58a6ff", font: { size: 10 }, callback: v => v + " mnt" },
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Waktu Tunggu (mnt)", color: "#58a6ff", font: { size: 10 } },
          beginAtZero: true
        }
      }
    }
  });
}

function getStatusPill(util) {
  if (util > 90) return `<span class="status-pill pill-danger">Overload</span>`;
  if (util >= 70) return `<span class="status-pill pill-optimal">Optimal</span>`;
  if (util >= 50) return `<span class="status-pill pill-warning">Sedang</span>`;
  return `<span class="status-pill pill-idle">Idle</span>`;
}

function renderCompTable(comparison, selectedC) {
  const tbody = document.getElementById("compTableBody");
  tbody.innerHTML = "";

  comparison.forEach(row => {
    const tr = document.createElement("tr");
    if (row.jumlah_tungku === selectedC) tr.classList.add("highlight-row");

    tr.innerHTML = `
      <td><strong>${row.jumlah_tungku} tungku${row.jumlah_tungku === selectedC ? " ★" : ""}</strong></td>
      <td>${row.server_utilization_percent.toFixed(1)}%</td>
      <td>${row.idle_percent.toFixed(1)}%</td>
      <td>${row.avg_queue_time_minutes.toFixed(1)}</td>
      <td>${row.total_nira_processed}</td>
      <td>${getStatusPill(row.server_utilization_percent)}</td>
    `;
    tbody.appendChild(tr);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const params = validateForm();
  if (!params) return;

  setLoading(true);

  const payload = {
    jumlah_tungku: params.tungku,
    mean_interarrival_nira: params.interarrival,
    mean_service_time: params.service,
    waktu_simulasi_menit: params.waktu
  };
  if (params.ferm !== null) payload.fermentation_threshold = params.ferm;

  try {
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok) {
      if (Array.isArray(json.detail)) {
        json.detail.forEach(err => {
          const loc = err.loc?.[err.loc.length - 1];
          const fieldMap = {
            jumlah_tungku: "err_tungku",
            mean_interarrival_nira: "err_interarrival",
            mean_service_time: "err_service",
            waktu_simulasi_menit: "err_waktu"
          };
          if (fieldMap[loc]) document.getElementById(fieldMap[loc]).textContent = err.msg;
        });
      } else {
        showError(json.detail || json.message || "Terjadi kesalahan pada server.");
      }
      return;
    }

    const data = json.data;

    updateMetrics(data);
    updateFermAlert(data.evaluation);
    updateEvaluation(data.evaluation);
    renderLineChart(data.time_series_queue);
    renderBarChart(data.server_utilization_percent, data.idle_percent);
    renderCompChart(data.comparison, params.tungku, data.fermentation_threshold);
    renderCompTable(data.comparison, params.tungku);

    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    showError("Gagal menghubungi server. Pastikan backend berjalan dengan benar.");
  } finally {
    setLoading(false);
  }
});
