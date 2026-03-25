import simpy
import scipy.stats as stats
import numpy as np
from typing import List, Dict, Any, Optional


def run_simulation(
    jumlah_tungku: int,
    mean_interarrival: float,
    mean_service: float,
    waktu_simulasi: int
) -> Dict[str, Any]:
    wait_times: List[float] = []
    total_processed = [0]
    time_series: List[Dict] = []
    server_usage_samples: List[int] = []

    env = simpy.Environment()
    servers = simpy.Resource(env, capacity=jumlah_tungku)

    def monitor(env, interval: float = 1.0):
        while True:
            time_series.append({
                "minute": int(env.now),
                "queue_length": len(servers.queue)
            })
            server_usage_samples.append(servers.count)
            yield env.timeout(interval)

    def nira_process(env, nira_id: int):
        arrival_time = env.now
        with servers.request() as req:
            yield req
            wait_time = env.now - arrival_time
            wait_times.append(wait_time)
            service_time = stats.expon.rvs(scale=mean_service)
            yield env.timeout(service_time)
            total_processed[0] += 1

    def nira_generator(env):
        nira_id = 0
        while True:
            interarrival = stats.expon.rvs(scale=mean_interarrival)
            yield env.timeout(interarrival)
            env.process(nira_process(env, nira_id))
            nira_id += 1

    env.process(nira_generator(env))
    env.process(monitor(env))
    env.run(until=waktu_simulasi)

    avg_queue_time = float(np.mean(wait_times)) if wait_times else 0.0
    avg_busy = float(np.mean(server_usage_samples)) if server_usage_samples else 0.0
    utilization_percent = (avg_busy / jumlah_tungku) * 100 if jumlah_tungku > 0 else 0.0
    idle_percent = 100.0 - utilization_percent

    return {
        "server_utilization_percent": round(utilization_percent, 2),
        "idle_percent": round(idle_percent, 2),
        "avg_queue_time_minutes": round(avg_queue_time, 2),
        "total_nira_processed": total_processed[0],
        "time_series_queue": time_series
    }


def evaluate_results(
    utilization: float,
    avg_wait: float,
    jumlah_tungku: int,
    fermentation_threshold: Optional[float]
) -> Dict[str, Any]:
    if utilization > 90:
        util_status = "danger"
        util_label = "Overload"
        util_message = "Utilisasi terlalu tinggi — antrian akan terus menumpuk dan sistem tidak stabil."
        util_recommendation = f"Tambah setidaknya 1 tungku (gunakan {jumlah_tungku + 1} tungku)."
    elif utilization >= 70:
        util_status = "optimal"
        util_label = "Optimal"
        util_message = "Utilisasi berada di zona ideal — tungku bekerja efisien tanpa kelebihan kapasitas berlebih."
        util_recommendation = f"{jumlah_tungku} tungku sudah merupakan konfigurasi yang tepat."
    elif utilization >= 50:
        util_status = "warning"
        util_label = "Cukup Efisien"
        util_message = "Utilisasi sedang — sistem berjalan namun masih ada kapasitas terbuang."
        util_recommendation = f"Pertimbangkan mengurangi ke {max(1, jumlah_tungku - 1)} tungku untuk efisiensi biaya."
    else:
        util_status = "idle"
        util_label = "Terlalu Banyak Idle"
        util_message = "Idle time sangat tinggi — jumlah tungku jauh melebihi kebutuhan nyata."
        util_recommendation = f"Kurangi ke {max(1, jumlah_tungku - 1)} tungku untuk memangkas biaya operasional."

    ferm_status = None
    ferm_label = None
    ferm_message = None

    if fermentation_threshold and fermentation_threshold > 0:
        if avg_wait > fermentation_threshold:
            ferm_status = "danger"
            ferm_label = "BAHAYA FERMENTASI"
            ferm_message = (
                f"Rata-rata waktu tunggu nira ({avg_wait:.1f} mnt) MELEBIHI batas fermentasi "
                f"({fermentation_threshold:.0f} mnt). Nira berpotensi menjadi asam sebelum diproses!"
            )
        else:
            ferm_status = "safe"
            ferm_label = "AMAN"
            ferm_message = (
                f"Rata-rata waktu tunggu nira ({avg_wait:.1f} mnt) masih di bawah batas fermentasi "
                f"({fermentation_threshold:.0f} mnt). Kualitas nira terjaga."
            )

    return {
        "util_status": util_status,
        "util_label": util_label,
        "util_message": util_message,
        "util_recommendation": util_recommendation,
        "ferm_status": ferm_status,
        "ferm_label": ferm_label,
        "ferm_message": ferm_message
    }
