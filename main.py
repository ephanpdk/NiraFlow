from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
import uvicorn
from simulation import run_simulation

app = FastAPI(title="NiraFlow API")


class SimulationInput(BaseModel):
    jumlah_tungku: int
    mean_interarrival_nira: float
    mean_service_time: float
    waktu_simulasi_menit: int

    @field_validator("jumlah_tungku")
    @classmethod
    def tungku_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Jumlah tungku harus lebih dari 0")
        return v

    @field_validator("mean_interarrival_nira", "mean_service_time")
    @classmethod
    def must_be_positive_float(cls, v):
        if v <= 0:
            raise ValueError("Nilai harus lebih dari 0")
        return v

    @field_validator("waktu_simulasi_menit")
    @classmethod
    def waktu_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Durasi simulasi harus lebih dari 0")
        return v


@app.post("/api/simulate")
async def simulate(payload: SimulationInput):
    result = run_simulation(
        jumlah_tungku=payload.jumlah_tungku,
        mean_interarrival=payload.mean_interarrival_nira,
        mean_service=payload.mean_service_time,
        waktu_simulasi=payload.waktu_simulasi_menit
    )
    return {"status": "success", "data": result}


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": str(exc)}
    )


app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=False)
