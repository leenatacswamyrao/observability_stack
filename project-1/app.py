from fastapi import FastAPI
import time
import random

app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "Healthy", "service": "Python-DevSecOps-App"}

@app.get("/io-heavy")
def io_heavy():
    # Simulate a variable load for JMeter to catch
    process_time = random.uniform(0.1, 0.5)
    time.sleep(process_time)
    return {"delay": process_time, "message": "Simulated IO Bound task"}

@app.get("/healthz")
def health_check():
    return {"status": "ok"}