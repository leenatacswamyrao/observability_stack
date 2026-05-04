# Dual Observability Stack - Kubernetes Application

A production-ready multi-container Python application with **dual observability stack support**, deployed via **Harness CD pipeline** with integrated **chaos engineering**.

## 🎯 Project Overview

This project demonstrates a modern observability architecture supporting two complete stacks:

- **Stack A**: OpenTelemetry + Prometheus + Grafana (open-source)
- **Stack B**: Dynatrace (commercial APM)

Key features:
- ✅ Single unified manifest file with toggleable stacks
- ✅ OpenTelemetry instrumentation (vendor-agnostic)
- ✅ Harness CD pipeline with chaos experiments
- ✅ Browser-accessible dashboards
- ✅ Chaos Mesh integration for resilience testing
- ✅ Minimal configuration files

## 📁 Project Structure

```
.
├── app.py                          # Python Flask app with OTel instrumentation
├── requirements.txt                # Python dependencies
├── Dockerfile                      # Container image
├── k8s-manifest.yaml              # Unified Kubernetes manifest (ALL-IN-ONE)
├── harness-pipeline.yaml          # Harness CD pipeline definition
├── harness-service.yaml           # Harness service configuration
├── harness-infrastructure.yaml    # Harness infrastructure definition
├── harness-environment.yaml       # Harness environment configuration
├── switch-stack.sh                # Helper script to toggle stacks
└── README.md                      # This file
```

## 🏗️ Architecture

### Application Layer
```
┌─────────────────────────────────────────────────┐
│         Python Flask Application                │
│    (Multi-container, OTel instrumented)         │
│                                                  │
│  Routes:                                         │
│  - /           → Health check                    │
│  - /api/process → Business logic                 │
│  - /api/slow    → Latency testing                │
│  - /api/error   → Error injection                │
│  - /metrics     → Prometheus metrics (Stack A)   │
└─────────────────────────────────────────────────┘
                        │
                        ▼
```

### Observability Stacks

#### Stack A: OpenTelemetry + Prometheus + Grafana
```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Application  │─────▶│     OTel     │─────▶│  Prometheus  │
│   (OTel)     │      │  Collector   │      │   (Metrics)  │
└──────────────┘      └──────────────┘      └──────────────┘
                              │                      │
                              │                      ▼
                              │              ┌──────────────┐
                              │              │   Grafana    │
                              │              │ (Dashboards) │
                              │              └──────────────┘
                              ▼
                      ┌──────────────┐
                      │    Tempo     │
                      │   (Traces)   │
                      └──────────────┘
```

#### Stack B: Dynatrace
```
┌──────────────┐
│ Application  │
│   (OTel)     │────────────────────────────────┐
└──────────────┘                                │
                                                ▼
                                    ┌──────────────────────┐
                                    │  Dynatrace Platform  │
                                    │                      │
                                    │  - Metrics           │
                                    │  - Traces            │
                                    │  - Logs              │
                                    │  - AI/AIOps          │
                                    └──────────────────────┘
```

### Chaos Engineering Flow
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Harness Pipeline│─────▶│   Chaos Mesh    │─────▶│  Observability  │
│   (Trigger)     │      │  (Experiments)  │      │  Stack (Monitor)│
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                │
                                ├─ Network Delay
                                ├─ Pod Failure
                                └─ CPU Stress
```

## 🚀 Getting Started

### Prerequisites

1. **Kubernetes Cluster** (already in place per your requirement)
   - Kubernetes 1.24+
   - Ingress controller (nginx recommended)
   - Sufficient resources (8 vCPU, 16GB RAM minimum)

2. **Harness Platform**
   - Harness account with CD module
   - Delegate installed in your cluster
   - Connectors configured:
     - Kubernetes connector
     - Docker registry connector
     - Git connector

3. **Container Registry**
   - Docker Hub, GCR, ECR, or similar
   - Push access configured

4. **Chaos Mesh** (for chaos experiments)
   ```bash
   kubectl create ns chaos-mesh
   helm repo add chaos-mesh https://charts.chaos-mesh.org
   helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-mesh --version 2.6.0
   ```

5. **Optional: Dynatrace Account**
   - Only needed if using Stack B
   - API token with metrics ingest permissions

### Quick Start

#### Option 1: Deploy with Stack A (OpenTelemetry + Prometheus + Grafana)

1. **Build and push Docker image**:
   ```bash
   docker build -t <YOUR_REPO>/python-observability-app:latest .
   docker push <YOUR_REPO>/python-observability-app:latest
   ```

2. **Ensure Stack A is enabled** (default configuration):
   ```bash
   ./switch-stack.sh otel-prometheus
   ```

3. **Deploy via kubectl** (for testing):
   ```bash
   kubectl apply -f k8s-manifest.yaml
   ```

4. **Or deploy via Harness**:
   - Import `harness-pipeline.yaml`
   - Set variable: `observability_stack = otel-prometheus`
   - Run pipeline

5. **Access dashboards**:
   - Application: `http://python-app.local`
   - Grafana: `http://grafana.local` (admin/admin)
   - Prometheus: Port-forward and access at `localhost:9090`

#### Option 2: Deploy with Stack B (Dynatrace)

1. **Configure Dynatrace credentials**:
   ```bash
   # Edit k8s-manifest.yaml
   # Uncomment and populate:
   #   DYNATRACE_ENDPOINT: "https://YOUR_ENV.live.dynatrace.com/api/v2/otlp"
   #   DYNATRACE_TOKEN: "YOUR_API_TOKEN"
   ```

2. **Switch to Dynatrace stack**:
   ```bash
   ./switch-stack.sh dynatrace
   ```

3. **Manually edit k8s-manifest.yaml**:
   - Comment out entire "STACK A" section (lines ~150-700)
   - Uncomment "STACK B" section (lines ~710-800)
   - Save file

4. **Deploy**:
   ```bash
   kubectl apply -f k8s-manifest.yaml
   # Or via Harness pipeline with observability_stack=dynatrace
   ```

5. **Access dashboards**:
   - Application: `http://python-app.local`
   - Dynatrace: `https://YOUR_ENV.live.dynatrace.com`

## 🔧 Harness Pipeline Setup

### 1. Create Project-Level Resources

#### Connectors
Create these in Harness:

1. **Kubernetes Connector**
   - Settings → Connectors → New Connector → Kubernetes Cluster
   - Use Delegate in cluster
   - Name: `k8s-production-cluster`

2. **Docker Registry Connector**
   - Settings → Connectors → New Connector → Docker Registry
   - Configure your registry (Docker Hub, GCR, etc.)
   - Name: `docker-registry`

3. **Git Connector**
   - Settings → Connectors → New Connector → GitHub/GitLab
   - Connect to your repository
   - Name: `git-repo`

#### Delegate
Ensure delegate is running in your cluster:
```bash
kubectl get pods -n harness-delegate
```

### 2. Import Pipeline

1. Go to Pipelines → Create Pipeline
2. Use YAML editor
3. Paste contents of `harness-pipeline.yaml`
4. Replace placeholders:
   - `<YOUR_PROJECT_ID>`
   - `<YOUR_ORG_ID>`
   - `<YOUR_K8S_CONNECTOR>`
   - `<YOUR_DOCKER_CONNECTOR>`
   - `<YOUR_GIT_CONNECTOR>`
   - `<YOUR_DOCKER_REPO>`

### 3. Create Service

1. Go to Services → New Service
2. Use YAML editor
3. Paste contents of `harness-service.yaml`
4. Update connector references

### 4. Create Environment & Infrastructure

1. Go to Environments → New Environment
2. Paste contents of `harness-environment.yaml`
3. Create Infrastructure Definition
4. Paste contents of `harness-infrastructure.yaml`

### 5. Run Pipeline

Execute with parameters:
```yaml
observability_stack: otel-prometheus  # or dynatrace
enable_chaos: true
chaos_experiment_type: network-delay  # or pod-failure, cpu-stress, all
```

## 🧪 Chaos Engineering

The pipeline includes integrated chaos experiments to test resilience:

### Available Experiments

1. **Network Delay** (`network-delay`)
   - Injects 200ms latency + 50ms jitter
   - Duration: 2 minutes
   - Impact: Tests application timeout handling

2. **Pod Failure** (`pod-failure`)
   - Kills one pod randomly
   - Duration: 30 seconds
   - Impact: Tests high availability and recovery

3. **CPU Stress** (`cpu-stress`)
   - Stresses CPU to 90%
   - Duration: 2 minutes
   - Impact: Tests resource limits and scaling

### Running Chaos Experiments

Via Harness pipeline:
```yaml
enable_chaos: "true"
chaos_experiment_type: "all"  # Runs all experiments sequentially
```

Or manually:
```bash
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: test-network
  namespace: observability-demo
spec:
  action: delay
  mode: one
  selector:
    namespaces: [observability-demo]
    labelSelectors:
      app: python-app
  delay:
    latency: "200ms"
  duration: "2m"
EOF
```

### Monitoring Chaos Impact

**Stack A (Grafana)**:
1. Open Grafana dashboard
2. Create panel with query:
   ```promql
   rate(app_requests_total{status=~"5.."}[5m])
   histogram_quantile(0.95, rate(app_request_duration_seconds_bucket[5m]))
   ```
3. Observe spikes during chaos experiments

**Stack B (Dynatrace)**:
1. Navigate to Services → python-app
2. View "Problems" tab for anomalies
3. Check "Service flow" for latency changes
4. Review distributed traces for affected requests

## 📊 Observability Features

### Stack A: OpenTelemetry + Prometheus + Grafana

**Metrics Available**:
- `app_requests_total` - Request counter by method, endpoint, status
- `app_request_duration_seconds` - Request latency histogram
- `app_active_requests` - Active request gauge
- `custom_requests_total` - OpenTelemetry custom counter

**Traces**:
- Distributed tracing via Tempo
- Spans for each HTTP request
- Custom span attributes for business logic

**Grafana Dashboards**:
Create dashboards with these queries:
```promql
# Request Rate
rate(app_requests_total[5m])

# Error Rate
rate(app_requests_total{status=~"5.."}[5m])

# P95 Latency
histogram_quantile(0.95, rate(app_request_duration_seconds_bucket[5m]))

# Active Requests
app_active_requests
```

### Stack B: Dynatrace

**Automatic Features**:
- Application topology mapping
- Service dependencies
- AI-powered anomaly detection
- Root cause analysis
- Business transactions
- Real user monitoring (if RUM enabled)

**Custom Metrics**:
All OpenTelemetry metrics are automatically ingested and available in:
- Metrics Browser
- Data Explorer
- Custom dashboards

## 🔄 Switching Between Stacks

### Method 1: Using Helper Script
```bash
# Switch to OpenTelemetry stack
./switch-stack.sh otel-prometheus

# Switch to Dynatrace stack
./switch-stack.sh dynatrace
```

### Method 2: Manual Editing
Edit `k8s-manifest.yaml`:

1. Find the ConfigMap `app-config`
2. Change `OBSERVABILITY_STACK` value:
   ```yaml
   OBSERVABILITY_STACK: "otel-prometheus"  # or "dynatrace"
   ```

3. Comment/uncomment stack sections:
   - Lines ~150-700: Stack A components
   - Lines ~710-800: Stack B components

### Method 3: Harness Pipeline Variable
When running pipeline, set:
```yaml
observability_stack: dynatrace  # or otel-prometheus
```

## 🐛 Troubleshooting

### Application Not Starting
```bash
# Check pod status
kubectl get pods -n observability-demo

# View logs
kubectl logs -n observability-demo -l app=python-app --tail=50

# Check events
kubectl describe pod -n observability-demo -l app=python-app
```

### Metrics Not Appearing (Stack A)
```bash
# Check OTel Collector
kubectl logs -n observability-demo -l app=otel-collector

# Verify Prometheus targets
kubectl port-forward -n observability-demo svc/prometheus 9090:9090
# Open http://localhost:9090/targets

# Test app metrics endpoint
kubectl port-forward -n observability-demo svc/python-app 8080:8080
curl http://localhost:8080/metrics
```

### Dynatrace Not Receiving Data (Stack B)
```bash
# Check app logs for OTLP export errors
kubectl logs -n observability-demo -l app=python-app | grep -i dynatrace

# Verify environment variables
kubectl get configmap app-config -n observability-demo -o yaml

# Test OTLP endpoint connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v https://YOUR_ENV.live.dynatrace.com/api/v2/otlp
```

### Chaos Experiments Not Working
```bash
# Check Chaos Mesh installation
kubectl get pods -n chaos-mesh

# View chaos experiment status
kubectl get networkchaos,podchaos,stresschaos -n observability-demo

# Check experiment logs
kubectl logs -n chaos-mesh -l app.kubernetes.io/component=controller-manager
```

## 📈 Performance Tuning

### Resource Limits
Current settings (per component):

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| Python App | 250m | 500m | 256Mi | 512Mi |
| OTel Collector | 200m | 500m | 256Mi | 512Mi |
| Prometheus | 500m | 1000m | 512Mi | 1Gi |
| Grafana | 200m | 500m | 256Mi | 512Mi |
| Tempo | 200m | 500m | 256Mi | 512Mi |

### Scaling
Adjust replicas in `k8s-manifest.yaml`:
```yaml
spec:
  replicas: 3  # Increase for higher load
```

Or use HPA:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: python-app-hpa
  namespace: observability-demo
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: python-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🔐 Security Considerations

1. **Secrets Management**:
   - Never commit Dynatrace tokens to Git
   - Use Harness secret manager or Kubernetes secrets
   - Rotate API tokens regularly

2. **Network Policies**:
   - Restrict pod-to-pod communication
   - Limit egress to observability endpoints

3. **RBAC**:
   - Chaos experiments require appropriate permissions
   - Use service accounts with minimal privileges

## 🎓 Learning Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Tutorials](https://grafana.com/tutorials/)
- [Dynatrace OpenTelemetry](https://www.dynatrace.com/support/help/extend-dynatrace/opentelemetry/)
- [Chaos Mesh Documentation](https://chaos-mesh.org/docs/)
- [Harness CD Docs](https://developer.harness.io/docs/continuous-delivery/)

## 📝 Next Steps

1. **Add Custom Dashboards**:
   - Create Grafana dashboards for your business KPIs
   - Configure Dynatrace SLOs

2. **Implement Alerting**:
   - Prometheus AlertManager rules
   - Dynatrace problem notifications
   - Harness pipeline alerts

3. **Enhance Chaos Experiments**:
   - Custom chaos scenarios
   - Scheduled chaos testing
   - Blast radius controls

4. **CI/CD Integration**:
   - Add automated testing before deployment
   - Implement blue-green or canary deployments
   - Add rollback automation

5. **Cost Optimization**:
   - Monitor resource utilization
   - Adjust retention policies
   - Optimize metric cardinality

## 🤝 Contributing

This is a demonstration project. For production use:
- Add comprehensive tests
- Implement proper secret management
- Configure production-grade storage
- Set up backup and disaster recovery
- Implement proper RBAC and network policies

## 📄 License

This project is provided as-is for educational and demonstration purposes.

---

**Questions or Issues?**
- Check the troubleshooting section above
- Review Harness logs in the pipeline execution
- Examine Kubernetes events and pod logs
- Verify all prerequisites are met
