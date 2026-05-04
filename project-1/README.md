# Python DevSecOps & Observability Stack 🚀

This repository tracks my 90-day professional development pivot focusing on **Test Automation (Playwright/Selenium)**, **DevSecOps**, and **Full-Stack Observability**.

## 🏗️ Project Architecture
The project consists of a Python FastAPI "System Under Test" (SUT) instrumented with OpenTelemetry, sending metrics and traces to a vendor-neutral collector, which then feeds Prometheus and Grafana.

- **App:** Python FastAPI (Asynchronous)
- **CI/CD:** Harness (Coming Soon)
- **Observability:** OpenTelemetry + Prometheus + Grafana
- **Testing:** Playwright (TypeScript) + Selenium (Python)
- **Infrastructure:** Docker & Kubernetes (Minikube)

---

## 🛠️ Tech Stack & Tools
| Category | Tools |
| :--- | :--- |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **Observability** | OpenTelemetry, Prometheus, Grafana |
| **Containerization** | Docker, Docker Compose |
| **DevSecOps** | Snyk/Trivy (Planned), Multi-stage Docker builds |
| **Testing** | Playwright, Selenium, JMeter, Postman |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Docker Desktop
- Git Bash (on Windows)
- Python 3.11+

### 1. Setup Local Environment
```bash
# Create and activate virtual environment
python -m venv venv
source venv/Scripts/activate  # Git Bash

# Install dependencies
pip install -r requirements.txt
````

### 2\. Run the Stack

To bypass Windows path conversion issues in Git Bash, use the following command:

```bash
MSYS_NO_PATHCONV=1 docker-compose up --build
```

### 3\. Verify Endpoints

  - **Application:** [http://localhost:8000](https://www.google.com/search?q=http://localhost:8000)
  - **Prometheus:** [http://localhost:9090](https://www.google.com/search?q=http://localhost:9090)
  - **Grafana:** [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)

-----

## 📈 Roadmap & Progress

### ✅ Phase 1: Foundation (May 4, 2026)

  - Built FastAPI SUT with intentional performance bottlenecks (`/io-heavy`).
  - Configured OpenTelemetry Collector with `debug` and `prometheus` exporters.
  - Resolved Docker-on-Windows volume mounting issues using `MSYS_NO_PATHCONV`.
  - Verified metrics flow from App → OTel → Prometheus.

### ⏳ Phase 2: Automation & Dashboards (Current)

  - [ ] Implement Grafana Dashboards for HTTP request latency.
  - [ ] Setup Playwright Framework (TypeScript/POM).
  - [ ] First E2E Test Suite.

### ⏳ Phase 3: Chaos & Resilience

  - [ ] Harness Chaos Engineering integration.
  - [ ] Resilience testing during JMeter load tests.
  - [ ] Dynatrace integration.

-----
