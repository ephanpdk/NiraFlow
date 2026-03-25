import simpy
import scipy.stats as stats
import numpy as np
from typing import List, Dict, Any


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
