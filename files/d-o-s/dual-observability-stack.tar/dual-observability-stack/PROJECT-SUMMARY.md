# PROJECT SUMMARY: Dual Observability Stack with Chaos Engineering

## 🎯 Executive Summary

This project provides a **production-ready, enterprise-grade observability architecture** that supports two complete monitoring stacks in a single unified deployment manifest. It demonstrates modern DevOps best practices including:

- **Vendor-agnostic instrumentation** using OpenTelemetry
- **Dual stack support** (open-source vs. commercial APM)
- **Minimal configuration** (single manifest file with toggle sections)
- **Integrated chaos engineering** via Harness pipeline
- **Production deployment** via Harness CD with Kubernetes

## 📦 Project Components

### Core Files (All-in-One Approach)

| File | Purpose | Size | Critical? |
|------|---------|------|-----------|
| `k8s-manifest.yaml` | **UNIFIED** Kubernetes deployment for both stacks | ~1000 lines | ✅ YES |
| `app.py` | Python Flask app with dual OTel instrumentation | ~350 lines | ✅ YES |
| `harness-pipeline.yaml` | Complete CI/CD pipeline with chaos integration | ~600 lines | ✅ YES |
| `README.md` | Comprehensive documentation | ~800 lines | ✅ YES |
| `switch-stack.sh` | Helper script to toggle observability stacks | ~150 lines | ⚠️ Helper |
| `deploy.sh` | Quick deployment automation | ~200 lines | ⚠️ Helper |

### Supporting Files

| File | Purpose |
|------|---------|
| `requirements.txt` | Python dependencies |
| `Dockerfile` | Container image definition |
| `docker-compose.yaml` | Local testing environment |
| `harness-service.yaml` | Harness service definition |
| `harness-infrastructure.yaml` | Harness infra definition |
| `harness-environment.yaml` | Harness environment config |
| `config/*` | Local testing configurations |

## 🏗️ Architecture Deep Dive

### The "One Manifest, Two Stacks" Design

The project's key innovation is a **single Kubernetes manifest** that contains BOTH observability stacks with clear comment blocks:

```yaml
# k8s-manifest.yaml structure:

┌─────────────────────────────────────────┐
│ COMMON COMPONENTS (Always Deployed)    │
│ - Namespace                             │
│ - ConfigMap (stack selector)            │
│ - Application Deployment                │
│ - Application Service                   │
│ - Ingress                               │
└─────────────────────────────────────────┘
           │
           ├─────────────────────────────┐
           │                             │
           ▼                             ▼
┌──────────────────────┐    ┌──────────────────────┐
│ STACK A (Lines 150-  │    │ STACK B (Lines 710-  │
│ 700) - UNCOMMENTED   │    │ 800) - COMMENTED OUT │
│                      │    │                      │
│ - OTel Collector     │    │ - Dynatrace Config   │
│ - Prometheus         │    │ - OneAgent (opt)     │
│ - Tempo              │    │ - ActiveGate (opt)   │
│ - Grafana            │    │                      │
└──────────────────────┘    └──────────────────────┘
           │                             │
           └─────────────┬───────────────┘
                         ▼
           ┌──────────────────────────┐
           │ CHAOS EXPERIMENTS        │
           │ (Works with both stacks) │
           │ - Network Delay          │
           │ - Pod Failure            │
           │ - CPU Stress             │
           └──────────────────────────┘
```

### How the Toggle Works

**Method 1: ConfigMap Environment Variable**
```yaml
# In app deployment:
env:
  - name: OBSERVABILITY_STACK
    value: "otel-prometheus"  # or "dynatrace"
```

The Python app reads this and configures its exporters accordingly:
```python
if OBSERVABILITY_STACK == 'dynatrace':
    setup_dynatrace_stack()  # OTLP to Dynatrace endpoint
else:
    setup_otel_prometheus_stack()  # OTLP to Collector + Prometheus
```

**Method 2: Section Commenting**
For the infrastructure components, you manually:
1. Comment out Stack A sections (lines 150-700)
2. Uncomment Stack B sections (lines 710-800)
3. Or vice versa

This is done via:
- `./switch-stack.sh` script (automated)
- Manual editing (for fine-grained control)
- Harness pipeline preprocessing (CI/CD integration)

## 🔄 Data Flow Comparison

### Stack A: OpenTelemetry + Prometheus + Grafana

```
Application (Python Flask)
    │
    ├─ Metrics (OTLP/gRPC) ────────┐
    │                              │
    ├─ Traces (OTLP/gRPC) ────────┐│
    │                             ││
    └─ Logs (stdout) ────────────┐││
                                 │││
                    ┌────────────┘││
                    │             ││
                    ▼             ││
         ┌──────────────────┐    ││
         │ OTel Collector   │    ││
         │                  │    ││
         │ - Receives OTLP  │    ││
         │ - Processes      │    ││
         │ - Routes data    │    ││
         └──────────────────┘    ││
                 │               ││
                 ├─ Metrics ─────┼┘
                 │               │
                 ▼               ▼
         ┌─────────────┐  ┌──────────┐
         │ Prometheus  │  │  Tempo   │
         │             │  │          │
         │ - Scrapes   │  │ - Stores │
         │   metrics   │  │   traces │
         │ - Stores TS │  │          │
         │   data      │  │          │
         └─────────────┘  └──────────┘
                 │               │
                 └───────┬───────┘
                         │
                         ▼
                 ┌─────────────┐
                 │  Grafana    │
                 │             │
                 │ - Dashboards│
                 │ - Queries   │
                 │ - Alerts    │
                 └─────────────┘
                         │
                         ▼
                 [ Browser UI ]
```

**Key Points**:
- **Collector acts as central hub** for all telemetry
- **Prometheus scrapes metrics** from Collector's Prometheus exporter
- **Tempo receives traces** directly from Collector via OTLP
- **Grafana queries both** Prometheus and Tempo
- **All components in-cluster** - no external dependencies

### Stack B: Dynatrace

```
Application (Python Flask)
    │
    ├─ Metrics (OTLP/gRPC + API Token) ───┐
    │                                      │
    ├─ Traces (OTLP/gRPC + API Token) ────┤
    │                                      │
    └─ Logs (stdout, optional OneAgent) ──┤
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │  Dynatrace Platform     │
                              │  (SaaS/Managed)         │
                              │                         │
                              │ - OTLP Ingest Endpoint  │
                              │ - AI Engine             │
                              │ - Storage & Analytics   │
                              │ - Problem Detection     │
                              │ - Root Cause Analysis   │
                              └─────────────────────────┘
                                           │
                                           ▼
                                   [ Dynatrace UI ]
                                   [ Mobile App ]
                                   [ API Access ]
```

**Key Points**:
- **Direct connection** to Dynatrace SaaS/Managed
- **No in-cluster infrastructure** needed (except optional ActiveGate)
- **Automatic baselining** and anomaly detection
- **AI-powered insights** built-in
- **Unified platform** for all telemetry types

## 🚀 Deployment Workflows

### Workflow 1: Local Testing (Docker Compose)

```bash
# 1. Test with OpenTelemetry stack
docker-compose --profile otel up -d

# 2. Verify app works
curl http://localhost:8080/health

# 3. Access Grafana
open http://localhost:3000  # admin/admin

# 4. Generate some load
for i in {1..100}; do
    curl -X POST http://localhost:8080/api/process \
         -H "Content-Type: application/json" \
         -d '{"test": "data"}'
done

# 5. View metrics in Grafana
# Navigate to Explore → Prometheus → Run query: rate(app_requests_total[1m])

# 6. Cleanup
docker-compose --profile otel down
```

### Workflow 2: Kubernetes Direct Deploy

```bash
# 1. Choose your stack
./switch-stack.sh otel-prometheus

# 2. Build and push image
docker build -t myregistry/app:v1 .
docker push myregistry/app:v1

# 3. Update manifest
sed -i 's|<+artifact.image>|myregistry/app:v1|' k8s-manifest.yaml

# 4. Deploy
kubectl apply -f k8s-manifest.yaml

# 5. Wait for pods
kubectl wait --for=condition=ready pod -l app=python-app -n observability-demo --timeout=300s

# 6. Access
kubectl port-forward -n observability-demo svc/grafana 3000:3000
```

### Workflow 3: Harness Pipeline Deploy (Recommended)

```bash
# 1. Setup Harness (one-time)
# - Import harness-pipeline.yaml
# - Create service from harness-service.yaml
# - Create environment from harness-environment.yaml
# - Create infrastructure from harness-infrastructure.yaml

# 2. Trigger pipeline
harness-cli pipeline execute \
  --org-id <ORG> \
  --project-id <PROJECT> \
  --pipeline-id observability_demo_dual_stack \
  --variables observability_stack=otel-prometheus \
  --variables enable_chaos=true \
  --variables chaos_experiment_type=all

# 3. Monitor execution in Harness UI

# 4. Pipeline automatically:
#    - Builds image
#    - Pushes to registry
#    - Deploys to K8s
#    - Runs chaos experiments
#    - Collects metrics
#    - Sends notifications
```

## 🧪 Chaos Engineering Integration

The project includes **built-in chaos experiments** that inject faults while both observability stacks monitor the impact:

### Chaos Experiment Flow

```
┌──────────────────────────────────────────────────────────┐
│ Harness Pipeline - Chaos Engineering Stage              │
└──────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ Pre-Chaos        │    │ Baseline         │
    │ Metrics          │    │ Establishment    │
    │ Collection       │    │                  │
    └──────────────────┘    └──────────────────┘
              │                       │
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │ Inject Chaos          │
              │ (Chaos Mesh)          │
              │                       │
              │ Types:                │
              │ • Network Delay       │
              │ • Pod Failure         │
              │ • CPU Stress          │
              └───────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ Monitor Impact   │    │ Verify Recovery  │
    │ (Real-time)      │    │                  │
    │                  │    │ - Pods restart?  │
    │ Stack A: Grafana │    │ - Errors spike?  │
    │ Stack B: Dynatrace│   │ - Latency high?  │
    └──────────────────┘    └──────────────────┘
              │                       │
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │ Post-Chaos Analysis   │
              │                       │
              │ • Compare metrics     │
              │ • Generate report     │
              │ • Document findings   │
              └───────────────────────┘
```

### Example: Network Delay Chaos

**Before Chaos**:
```
Request Latency P95: 50ms
Error Rate: 0.1%
Active Pods: 3/3
```

**During Network Delay (200ms + 50ms jitter)**:
```
Request Latency P95: 350ms  ← 7x increase
Error Rate: 2.5%           ← Timeouts occurring
Active Pods: 3/3           ← All still running
```

**Observability Stack Response**:

**Stack A (Grafana Dashboard)**:
```promql
# Query 1: Latency spike
histogram_quantile(0.95, rate(app_request_duration_seconds_bucket[1m]))

# Query 2: Error rate increase  
rate(app_requests_total{status=~"5.."}[1m])

# Visual: Red spike on timeline correlating with chaos injection
```

**Stack B (Dynatrace)**:
- **Automatic Problem Detection**: "Response time degradation on python-app"
- **Root Cause**: "Network latency increase detected"
- **Impact Analysis**: "15% of user requests affected"
- **AI Recommendation**: "Transient network issue, monitoring for recovery"

## 📊 Metrics & Observability Comparison

### What Each Stack Provides

| Capability | Stack A (OTel+Prom+Grafana) | Stack B (Dynatrace) |
|------------|----------------------------|-------------------|
| **Metrics** | ✅ Custom metrics via Prometheus | ✅ Auto + custom metrics |
| **Traces** | ✅ Distributed traces via Tempo | ✅ PurePath technology |
| **Logs** | ⚠️ Requires Loki (not included) | ✅ Built-in log ingestion |
| **Dashboards** | ✅ Fully customizable Grafana | ✅ Pre-built + custom |
| **Alerting** | ✅ Prometheus AlertManager | ✅ AI-powered alerts |
| **AI/Anomaly** | ❌ Manual threshold setup | ✅ Automatic baselining |
| **Root Cause** | ❌ Manual investigation | ✅ Davis AI engine |
| **Cost** | ✅ Free (OSS) | 💰 Subscription-based |
| **Scalability** | ⚠️ Requires tuning | ✅ Managed scalability |
| **Setup Time** | ~2 hours | ~30 minutes |

### Key Metrics Collected

Both stacks collect these metrics from the Python app:

1. **Request Metrics**:
   - `app_requests_total` - Counter by method, endpoint, status
   - `app_request_duration_seconds` - Histogram of latencies
   - `app_active_requests` - Gauge of in-flight requests

2. **System Metrics**:
   - CPU usage
   - Memory usage
   - Pod restarts
   - Network I/O

3. **Business Metrics** (custom):
   - Processing time per request
   - Data size processed
   - Error types and frequencies

## 🎓 Key Design Decisions

### Why OpenTelemetry in Both Stacks?

**Vendor Neutrality**: Using OTel means:
- **Same instrumentation code** works for both stacks
- **No lock-in** to either vendor
- **Future-proof** as OTel becomes standard
- **Easy migration** between commercial APM solutions

### Why Single Manifest Instead of Kustomize/Helm?

**Simplicity**: The requirement was "minimal files":
- **Kustomize**: Would require base + 2 overlays = 3 directories
- **Helm**: Would require chart + 2 values files = complex templating
- **Single YAML**: One file, clear comments, easy to understand

Trade-off: Manual commenting vs. automated overlay, but meets the "minimal files" requirement.

### Why Harness for CI/CD?

Per your requirement:
- **Native Chaos Integration**: Harness has chaos engineering built-in
- **Service/Infra Abstraction**: Clean separation of concerns
- **Enterprise Ready**: RBAC, audit logs, compliance
- **GitOps Support**: Declarative pipeline-as-code

## 🔐 Security Considerations

### Secrets Management

**Current State** (Demo):
```yaml
# ConfigMap - NOT FOR PRODUCTION
DYNATRACE_TOKEN: "plain_text"  # ❌ INSECURE
```

**Production Approach**:
```yaml
# Use Kubernetes Secrets
apiVersion: v1
kind: Secret
metadata:
  name: dynatrace-secret
type: Opaque
data:
  token: <base64_encoded_token>

# Or use External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: dynatrace-secret
spec:
  secretStoreRef:
    name: aws-secrets-manager
  target:
    name: dynatrace-secret
  data:
  - secretKey: token
    remoteRef:
      key: prod/dynatrace/api-token
```

### Network Policies

**Add these for production**:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: python-app-netpol
  namespace: observability-demo
spec:
  podSelector:
    matchLabels:
      app: python-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector: {}
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: otel-collector
  - to:
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
  - to:  # For Dynatrace
    - podSelector: {}
    ports:
    - protocol: TCP
      port: 443
```

## 📈 Scaling Considerations

### Current Limits

```yaml
python-app:
  replicas: 3
  resources:
    requests: {cpu: 250m, memory: 256Mi}
    limits: {cpu: 500m, memory: 512Mi}

prometheus:
  resources:
    requests: {cpu: 500m, memory: 512Mi}
    limits: {cpu: 1000m, memory: 1Gi}
```

### Production Scaling

**For 1000+ RPS**:
```yaml
python-app:
  replicas: 10-20
  autoscaling:
    enabled: true
    minReplicas: 10
    maxReplicas: 50
    targetCPUUtilization: 70

otel-collector:
  replicas: 3
  autoscaling: true
  resources:
    requests: {cpu: 1000m, memory: 2Gi}
    limits: {cpu: 2000m, memory: 4Gi}

prometheus:
  resources:
    requests: {cpu: 2000m, memory: 8Gi}
    limits: {cpu: 4000m, memory: 16Gi}
  retention: 15d  # Reduce from 30d
  storageClass: fast-ssd
  volumeSize: 100Gi
```

## 🎯 Success Criteria

You'll know the deployment is successful when:

### Stack A Verification
- [ ] Application responds at `http://python-app.local`
- [ ] Grafana accessible at `http://grafana.local`
- [ ] Prometheus showing targets as "UP" at `/targets`
- [ ] Metrics visible in Grafana Explore
- [ ] Traces appearing in Tempo datasource
- [ ] Chaos experiments trigger visible anomalies

### Stack B Verification
- [ ] Application responds at `http://python-app.local`
- [ ] Dynatrace UI shows "python-app" service
- [ ] Metrics flowing to Dynatrace
- [ ] Distributed traces visible
- [ ] Chaos experiments create "Problems" in Dynatrace
- [ ] Davis AI detects anomalies automatically

### Chaos Engineering Verification
- [ ] Network delay experiment increases P95 latency
- [ ] Pod failure experiment doesn't break service (3 replicas)
- [ ] CPU stress experiment triggers resource alerts
- [ ] Both observability stacks detect the anomalies
- [ ] System recovers after chaos ends

## 🚀 Next Steps

1. **Week 1**: Deploy Stack A locally with docker-compose
2. **Week 2**: Deploy Stack A to Kubernetes cluster
3. **Week 3**: Configure Harness pipeline
4. **Week 4**: Add chaos experiments
5. **Week 5**: Switch to Stack B (Dynatrace)
6. **Week 6**: Compare insights from both stacks
7. **Week 7**: Production hardening (secrets, RBAC, scaling)
8. **Week 8**: Team training and runbooks

## 📚 Additional Resources

- **Project Repository**: (Link to your Git repo)
- **Harness Docs**: https://developer.harness.io/
- **OpenTelemetry**: https://opentelemetry.io/
- **Chaos Mesh**: https://chaos-mesh.org/
- **Dynatrace OTel**: https://www.dynatrace.com/support/help/shortlink/otel

---

**Questions or Issues?**
Contact: devops-team@yourcompany.com
Slack: #observability-demo
