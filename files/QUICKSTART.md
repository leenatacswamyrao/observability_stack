# 🚀 QUICK START CHECKLIST

Use this checklist to deploy your dual observability stack quickly.

## ✅ Prerequisites (One-Time Setup)

### 1. Kubernetes Cluster
- [ ] Cluster is running and accessible
- [ ] `kubectl cluster-info` works
- [ ] Cluster has at least: 8 vCPU, 16GB RAM, 50GB storage
- [ ] Ingress controller installed (nginx recommended)

### 2. Container Registry
- [ ] Registry accessible (Docker Hub, GCR, ECR, etc.)
- [ ] Docker login configured: `docker login`
- [ ] Push permissions verified

### 3. Chaos Mesh (Optional but Recommended)
```bash
kubectl create ns chaos-mesh
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-mesh --version 2.6.0
```
- [ ] Chaos Mesh installed
- [ ] Verify: `kubectl get pods -n chaos-mesh`

### 4. Harness Platform (For CI/CD)
- [ ] Harness account created
- [ ] Delegate installed in cluster
- [ ] Verify: `kubectl get pods -n harness-delegate`

---

## 🎯 Option A: Quick Deploy with Stack A (OpenTelemetry)

### Local Testing (5 minutes)
```bash
# 1. Start local environment
docker-compose --profile otel up -d

# 2. Test application
curl http://localhost:8080/health

# 3. Generate load
for i in {1..50}; do
    curl -X POST http://localhost:8080/api/process \
         -H "Content-Type: application/json" \
         -d '{"test": "data"}'
done

# 4. Access Grafana
open http://localhost:3000  # Login: admin/admin

# 5. View metrics
# In Grafana → Explore → Prometheus → Query: rate(app_requests_total[1m])

# 6. Cleanup
docker-compose --profile otel down
```

**Checklist**:
- [ ] Application responds at localhost:8080
- [ ] Grafana accessible at localhost:3000
- [ ] Metrics visible in Prometheus datasource
- [ ] Traces visible in Tempo datasource

### Kubernetes Deployment (15 minutes)

```bash
# 1. Configure for Stack A (default)
./switch-stack.sh otel-prometheus

# 2. Build and push image
REGISTRY="<YOUR_REGISTRY>"  # e.g., myregistry/myrepo
docker build -t $REGISTRY/python-observability-app:v1 .
docker push $REGISTRY/python-observability-app:v1

# 3. Update manifest
sed -i "s|<+artifact.image>|$REGISTRY/python-observability-app:v1|" k8s-manifest.yaml

# 4. Deploy
kubectl apply -f k8s-manifest.yaml

# 5. Wait for readiness
kubectl wait --for=condition=ready pod -l app=python-app -n observability-demo --timeout=300s

# 6. Verify
kubectl get pods -n observability-demo
kubectl get svc -n observability-demo
```

**Checklist**:
- [ ] All pods running: `kubectl get pods -n observability-demo`
- [ ] Services created: `kubectl get svc -n observability-demo`
- [ ] Application accessible via port-forward
- [ ] Grafana accessible via port-forward

### Access Dashboards
```bash
# Terminal 1: Application
kubectl port-forward -n observability-demo svc/python-app 8080:8080

# Terminal 2: Grafana
kubectl port-forward -n observability-demo svc/grafana 3000:3000

# Terminal 3: Prometheus (optional)
kubectl port-forward -n observability-demo svc/prometheus 9090:9090
```

**Verification**:
- [ ] App responds: `curl http://localhost:8080/health`
- [ ] Grafana loads: http://localhost:3000 (admin/admin)
- [ ] Prometheus targets UP: http://localhost:9090/targets

---

## 🎯 Option B: Quick Deploy with Stack B (Dynatrace)

### Prerequisites
- [ ] Dynatrace environment ready (SaaS or Managed)
- [ ] API token generated with "Ingest metrics" and "Ingest OpenTelemetry traces" permissions
- [ ] OTLP endpoint URL noted: `https://{env-id}.live.dynatrace.com/api/v2/otlp`

### Configuration (10 minutes)

1. **Update k8s-manifest.yaml**:
```bash
# Edit ConfigMap section
OBSERVABILITY_STACK: "dynatrace"  # Change from otel-prometheus

# Uncomment and populate:
DYNATRACE_ENDPOINT: "https://{YOUR-ENV}.live.dynatrace.com/api/v2/otlp"

# Uncomment Secret section and add token:
apiVersion: v1
kind: Secret
metadata:
  name: dynatrace-secret
  namespace: observability-demo
type: Opaque
stringData:
  token: "YOUR_API_TOKEN_HERE"
```

2. **Switch configuration**:
```bash
./switch-stack.sh dynatrace
```

3. **Manual edits**:
- [ ] Comment out Stack A section (lines 150-700)
- [ ] Uncomment Stack B section (lines 710-800)
- [ ] Save file

### Deployment (5 minutes)
```bash
# 1. Build and push image
REGISTRY="<YOUR_REGISTRY>"
docker build -t $REGISTRY/python-observability-app:v1 .
docker push $REGISTRY/python-observability-app:v1

# 2. Update manifest
sed -i "s|<+artifact.image>|$REGISTRY/python-observability-app:v1|" k8s-manifest.yaml

# 3. Deploy
kubectl apply -f k8s-manifest.yaml

# 4. Wait
kubectl wait --for=condition=ready pod -l app=python-app -n observability-demo --timeout=300s
```

### Verification
```bash
# 1. Check app logs for Dynatrace connection
kubectl logs -n observability-demo -l app=python-app --tail=50 | grep -i dynatrace

# 2. Generate traffic
kubectl port-forward -n observability-demo svc/python-app 8080:8080 &
for i in {1..100}; do
    curl -X POST http://localhost:8080/api/process \
         -H "Content-Type: application/json" \
         -d '{"test": "data"}'
done

# 3. Check Dynatrace UI (wait 1-2 minutes for data)
# Navigate to: Services → python-app
```

**Checklist**:
- [ ] App pods running
- [ ] No OTLP export errors in logs
- [ ] Service appears in Dynatrace UI (within 2 minutes)
- [ ] Metrics flowing to Dynatrace
- [ ] Traces visible in Dynatrace

---

## 🔧 Harness Pipeline Setup (30 minutes)

### 1. Create Connectors

**Kubernetes Connector**:
- [ ] Settings → Connectors → + New Connector → Kubernetes Cluster
- [ ] Name: `k8s-production-cluster`
- [ ] Use Delegate in cluster
- [ ] Test connection → Save

**Docker Registry Connector**:
- [ ] Settings → Connectors → + New Connector → Docker Registry
- [ ] Name: `docker-registry`
- [ ] Registry URL: (your registry)
- [ ] Credentials: (your credentials)
- [ ] Test connection → Save

**Git Connector**:
- [ ] Settings → Connectors → + New Connector → GitHub/GitLab
- [ ] Name: `git-repo`
- [ ] Repository: (your repo URL)
- [ ] Credentials: (your credentials)
- [ ] Test connection → Save

### 2. Import Pipeline

```bash
# Edit harness-pipeline.yaml and replace:
# - <YOUR_PROJECT_ID> with your Harness project ID
# - <YOUR_ORG_ID> with your Harness org ID
# - <YOUR_K8S_CONNECTOR> with "k8s-production-cluster"
# - <YOUR_DOCKER_CONNECTOR> with "docker-registry"
# - <YOUR_GIT_CONNECTOR> with "git-repo"
# - <YOUR_DOCKER_REPO> with your registry/repo path
```

- [ ] Pipelines → + Create Pipeline → Import from YAML
- [ ] Paste edited harness-pipeline.yaml content
- [ ] Save

### 3. Create Service

- [ ] Services → + New Service
- [ ] Use YAML editor
- [ ] Paste harness-service.yaml content (edit connector refs)
- [ ] Save

### 4. Create Environment & Infrastructure

- [ ] Environments → + New Environment
- [ ] Paste harness-environment.yaml content
- [ ] Save
- [ ] Add Infrastructure Definition
- [ ] Paste harness-infrastructure.yaml content
- [ ] Save

### 5. Run Pipeline

- [ ] Open pipeline
- [ ] Run → Input parameters:
  - `observability_stack`: `otel-prometheus` or `dynatrace`
  - `enable_chaos`: `true`
  - `chaos_experiment_type`: `network-delay`
- [ ] Execute

**Verification**:
- [ ] Build stage succeeds
- [ ] Deploy stage succeeds
- [ ] Chaos stage runs (if enabled)
- [ ] Verification stage completes
- [ ] Email notification received

---

## 🧪 Chaos Experiments (10 minutes)

### Manual Chaos Testing

**Network Delay**:
```bash
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-test
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
    jitter: "50ms"
  duration: "2m"
EOF

# Wait 2 minutes, then check observability
# Stack A: Grafana → Check latency spike
# Stack B: Dynatrace → Check for Problem detection

# Cleanup
kubectl delete networkchaos network-test -n observability-demo
```

**Checklist**:
- [ ] Chaos experiment created
- [ ] Latency increased (visible in dashboards)
- [ ] Observability stack detected anomaly
- [ ] System recovered after experiment

---

## 📊 Success Verification

### Final Checks

**Application Health**:
- [ ] `kubectl get pods -n observability-demo` - All pods Running
- [ ] `curl http://localhost:8080/health` - Returns 200 OK
- [ ] App metrics endpoint accessible: `/metrics`

**Stack A (if deployed)**:
- [ ] Grafana dashboards loading
- [ ] Prometheus targets showing UP
- [ ] Metrics queries returning data
- [ ] Traces visible in Tempo

**Stack B (if deployed)**:
- [ ] Service visible in Dynatrace
- [ ] Metrics flowing (check Data Explorer)
- [ ] Traces appearing (check Distributed Traces)
- [ ] No errors in app logs

**Chaos Engineering**:
- [ ] Chaos Mesh pods running
- [ ] Experiments can be created
- [ ] Impact visible in observability stack
- [ ] System recovers post-chaos

---

## 🆘 Troubleshooting Quick Reference

**Pods not starting**:
```bash
kubectl describe pod -n observability-demo -l app=python-app
kubectl logs -n observability-demo -l app=python-app --tail=100
```

**Metrics not appearing (Stack A)**:
```bash
# Check OTel Collector
kubectl logs -n observability-demo -l app=otel-collector

# Check Prometheus targets
kubectl port-forward -n observability-demo svc/prometheus 9090:9090
# Visit: http://localhost:9090/targets
```

**Dynatrace not receiving data (Stack B)**:
```bash
# Check app logs for connection errors
kubectl logs -n observability-demo -l app=python-app | grep -i error

# Verify environment variables
kubectl get configmap app-config -n observability-demo -o yaml
kubectl get secret dynatrace-secret -n observability-demo -o yaml
```

**Harness pipeline failing**:
- Check delegate is running: `kubectl get pods -n harness-delegate`
- Verify all connector refs are correct
- Check pipeline execution logs in Harness UI

---

## 📚 Next Steps After Deployment

1. **Create Custom Dashboards**: Build Grafana dashboards for your KPIs
2. **Set Up Alerts**: Configure alerting rules for critical metrics
3. **Run Regular Chaos**: Schedule weekly chaos experiments
4. **Document Runbooks**: Create incident response procedures
5. **Train Team**: Familiarize team with both observability stacks

---

**Need Help?**
- Read: README.md (comprehensive guide)
- Read: PROJECT-SUMMARY.md (architecture deep-dive)
- Check: Troubleshooting sections in both docs
