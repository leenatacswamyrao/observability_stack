# Book Inventory Observability Stack

A FastAPI-based book management system instrumented with OpenTelemetry, Prometheus, and Grafana.

## 🚀 Architecture
- **FastAPI:** The core web application.
- **OpenTelemetry SDK:** Captures traces and metrics.
- **OTel Collector:** Receives data via OTLP and exports to Prometheus.
- **Prometheus:** Scrapes the collector and stores time-series data.
- **Grafana:** Visualizes the metrics.

## 📊 Instrumentation
- **Custom Metrics:** `manual_test_total` (tracked by `action` label).
- **Auto-Instrumentation:** `http_server_duration_milliseconds` (tracks all API traffic).

## ⚠️ Error Handling & Troubleshooting

| Error | Cause | Fix |
| :--- | :--- | :--- |
| `TypeError: unhashable type: 'dict'` | Resource defined as `{}` instead of `Resource()` | Wrap attributes in `Resource(attributes={...})`. |
| `AttributeError: 'dict' ... 'schema_url'` | SDK expected an object, found a dictionary. | Ensure `Resource` is imported from `opentelemetry.sdk.resources`. |
| **Blank Port 8889** | No data received or pipeline not active. | Check that the `service.pipelines.metrics` include `prometheus`. |
| **Missing HTTP Metrics** | Instrumentation called after route definitions. | Call `FastAPIInstrumentor.instrument_app()` before `@app.get`. |
| **Graph showing "No Data"** | Metric name mismatch in Grafana query. | Ensure query uses `http_server_duration_milliseconds_count`. |

## 🛠️ Maintenance Commands
- **Rebuild Stack:** `docker-compose up -d --build`
- **View Collector Logs:** `docker logs -f project-1-otel-collector-1`
- **View App Logs:** `docker logs -f project-1-python-app-1`
