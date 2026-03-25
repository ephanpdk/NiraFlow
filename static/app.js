let lineChart = null;
let barChart = null;

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
  btnText.textContent = on ? "Menjalankan..." : "▶ Jalankan Simulasi";
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
  ["err_tungku", "err_interarrival", "err_service", "err_waktu"].forEach(id => {
    document.getElementById(id).textContent = "";
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

  return valid ? { tungku, interarrival, service, waktu } : null;
}

function updateMetrics(data) {
  document.getElementById("val_utilization").textContent =
    data.server_utilization_percent.toFixed(1) + "%";
  document.getElementById("val_wait").textContent =
    data.avg_queue_time_minutes.toFixed(1) + " mnt";
  document.getElementById("val_throughput").textContent =
    data.total_nira_processed + " batch";
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
        label: "Panjang Antrean",
        data: values,
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.08)",
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
          callbacks: {
            label: ctx => `Antrean: ${ctx.parsed.y} batch`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#8b949e", font: { size: 10 }, maxTicksLimit: 12 },
          grid: { color: "rgba(48,54,61,0.6)" },
          title: { display: true, text: "Menit", color: "#8b949e", font: { size: 11 } }
        },
        y: {
          ticks: { color: "#8b949e", font: { size: 10 } },
          grid: { color: "rgba(48,54,61,0.6)" },
          title: { display: true, text: "Jumlah Batch dalam Antrean", color: "#8b949e", font: { size: 11 } },
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
      labels: ["Utilisasi Aktif", "Idle Time"],
      datasets: [{
        label: "Persentase (%)",
        data: [utilizationPercent, idlePercent],
        backgroundColor: [
          "rgba(249, 115, 22, 0.75)",
          "rgba(139, 148, 158, 0.35)"
        ],
        borderColor: [
          "#f97316",
          "#8b949e"
        ],
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
          callbacks: {
            label: ctx => `${ctx.parsed.y.toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#8b949e", font: { size: 12, weight: "600" } },
          grid: { display: false }
        },
        y: {
          ticks: { color: "#8b949e", font: { size: 10 }, callback: v => v + "%" },
          grid: { color: "rgba(48,54,61,0.6)" },
          min: 0,
          max: 100,
          title: { display: true, text: "Persentase (%)", color: "#8b949e", font: { size: 11 } }
        }
      }
    }
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

  try {
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok) {
      const detail = json.detail || json.message || "Terjadi kesalahan pada server.";
      if (Array.isArray(json.detail)) {
        json.detail.forEach(err => {
          const loc = err.loc?.[err.loc.length - 1];
          if (loc === "jumlah_tungku") document.getElementById("err_tungku").textContent = err.msg;
          else if (loc === "mean_interarrival_nira") document.getElementById("err_interarrival").textContent = err.msg;
          else if (loc === "mean_service_time") document.getElementById("err_service").textContent = err.msg;
          else if (loc === "waktu_simulasi_menit") document.getElementById("err_waktu").textContent = err.msg;
        });
      } else {
        showError(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      return;
    }

    const data = json.data;
    updateMetrics(data);
    renderLineChart(data.time_series_queue);
    renderBarChart(data.server_utilization_percent, data.idle_percent);

    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    showError("Gagal menghubungi server. Pastikan backend berjalan dengan benar.");
  } finally {
    setLoading(false);
  }
});
