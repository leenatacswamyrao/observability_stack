# 🚀 Chaos App Resilience & Load Testing Pipeline

A production-ready end-to-end automated framework using **Harness CD/CI**, **Apache JMeter**, and **Dynatrace OneAgent** to continuously validate the performance, data integrity, and failure resilience of a containerized Flask CRUD application backed by a PostgreSQL database.

---

## 🏗️ Architecture Overview

The current ecosystem consolidates the application layer and backend layer within a single Kubernetes manifest deployment for tight lifecycle management:

* **Frontend/API:** `chaos-service` (Flask App executing CRUD transactions on port `5000`)
* **Database:** `postgres-service` (PostgreSQL instance holding application states on port `5432`)
* **Load Driver:** **Harness Delegate Container** executing headless `ApacheJMeter.jar` execution suites dynamically.
* **Observability:** **Dynatrace Operator (OneAgent)** dynamically injecting hooks into application runtimes to monitor database operations and service traces.

---

## 🔌 Core Networking & Persistent Tunneling

Because the Harness Delegate executes in an isolated namespace (`harness-delegate-ng`), it cannot inherently resolve services running inside individual application namespaces. The pipeline establishes isolated background persistent routing tunnels prior to initiating the load injector.

```bash
echo "🔌 Initializing persistent cluster tunnels..."

# Target exact service namespaces to allow cross-namespace discovery
nohup kubectl port-forward svc/chaos-service 5000:5000 -n <your-app-namespace> > /tmp/flask_tunnel.log 2>&1 &
echo $! > /tmp/flask_pid.txt

nohup kubectl port-forward svc/postgres-service 5432:5432 -n <your-app-namespace> > /tmp/postgres_tunnel.log 2>&1 &
echo $! > /tmp/postgres_pid.txt

# Maintain pause to allow proxy binding verification
sleep 8

```

---

## 🛠️ Error Handling & Troubleshooting Ledger

### 1. `Error from server (NotFound): services "..." not found`

* **Root Cause:** The cluster agent attempted to port-forward targeting global parameters instead of targeted isolated boundaries.
* **Resolution:** Explicitly append the namespace scope argument (`-n <namespace>`) matching the application environment manifest location.

### 2. `netstat: command not found`

* **Root Cause:** Internal lightened Alpine/Debian image bundles running the pipeline runner lack extensive network tool binaries (`net-tools`).
* **Resolution:** Removed manual port checks from the bash automation script. Reliance on `sleep` intervals or direct process ID checks (`$!`) ensures clean execution without failing scripts.

### 3. Missing Traces / Empty Dynatrace Dashboards

* **Root Cause:** The application pods were running before the Dynatrace Mutating Webhook was fully operational, bypassing tracing bytecode injection.
* **Resolution:** Issue a zero-downtime rolling restart to force the application lifecycle to reload after the OneAgent operator is stable:
```bash
kubectl rollout restart deployment <your-deployment-name> -n <your-namespace>

```



---

## 🧼 Data Maintenance & Pre-Test Sanitization

To ensure performance metrics aren't skewed by database bloat, and to prevent **Unique Constraint Violations (Duplicate Keys)** from hardcoded JMeter payloads, execute a database purge prior to initializing an E2E suite:

```sql
-- Resets tables cleanly and drops primary key index seeds back to 1
TRUNCATE TABLE your_table_name RESTART IDENTITY;

```

---

## 🔮 Future Architecture Roadmap

While currently running inside a localized/managed Kubernetes boundary, this project is engineered to adapt to multi-cloud enterprise deployments. Future iterations will support automated cloud shifting and hosting configurations across:

* **Google Cloud Platform (GCP):** Transitioning to Google Kubernetes Engine (GKE) integrated with Cloud SQL for managed regional HA databases.
* **Amazon Web Services (AWS):** Migrating to Amazon Elastic Kubernetes Service (EKS) coupled with AWS Aurora Serverless for auto-scaling persistence layers.
* **Microsoft Azure:** Hosting via Azure Kubernetes Service (AKS) leveraging Azure Cosmos DB (PostgreSQL API) for global active-active write distributions.
