# NiraFlow — Decision Support System

## Overview
Web-based Decision Support System untuk pemodelan antrean stokastik pada alur produksi Gula Aren. Menggunakan Discrete Event Simulation (DES) berbasis SimPy untuk mensimulasikan alur nira dan mencari jumlah tungku optimal.

## Architecture
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript + Chart.js (served by FastAPI)
- **Backend**: Python FastAPI on port 5000
- **Simulation Engine**: SimPy (Discrete Event Simulation) + scipy.stats (stochastic distributions)

## Project Structure
```
main.py          - FastAPI app, serves API + static files on port 5000
simulation.py    - SimPy simulation engine (stochastic queue model)
static/
  index.html     - Main UI (form, dashboard, charts)
  style.css      - Dark theme styles
  app.js         - Async fetch, validation, Chart.js rendering
```

## API
- `POST /api/simulate` — Run queue simulation
  - Input: `jumlah_tungku`, `mean_interarrival_nira`, `mean_service_time`, `waktu_simulasi_menit`
  - Output: server utilization %, avg queue time, total processed, time-series queue data

## Running
The workflow runs `python main.py` on port 5000. All simulation computation happens in the Python backend; the frontend only renders final numbers.

## Dependencies
fastapi, uvicorn, simpy, scipy, numpy
