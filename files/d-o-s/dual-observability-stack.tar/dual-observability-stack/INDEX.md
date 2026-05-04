# 📁 PROJECT FILES INDEX

Complete guide to all files in this project and how to use them.

## 🎯 START HERE

**New to this project?** Read these in order:
1. **This file (INDEX.md)** - You are here
2. **QUICKSTART.md** - Step-by-step deployment checklist
3. **README.md** - Comprehensive documentation
4. **PROJECT-SUMMARY.md** - Architecture deep dive

## 📂 File Structure

```
dual-observability-stack/
├── 📘 DOCUMENTATION (Read these first)
│   ├── INDEX.md                    ← You are here
│   ├── QUICKSTART.md              ← Fast deployment guide
│   ├── README.md                  ← Main documentation
│   └── PROJECT-SUMMARY.md         ← Architecture details
│
├── 🐍 APPLICATION CODE
│   ├── app.py                     ← Flask app with OTel instrumentation
│   ├── requirements.txt           ← Python dependencies
│   └── Dockerfile                 ← Container image definition
│
├── ☸️ KUBERNETES DEPLOYMENT
│   └── k8s-manifest.yaml          ← ⭐ MASTER FILE - All K8s resources
│
├── 🔄 HARNESS CI/CD
│   ├── harness-pipeline.yaml      ← Complete pipeline definition
│   ├── harness-service.yaml       ← Service configuration
│   ├── harness-infrastructure.yaml ← Infrastructure definition
│   └── harness-environment.yaml   ← Environment configuration
│
├── 🧪 CHAOS ENGINEERING
│   └── chaos-experiments.yaml     ← Pre-built chaos scenarios
│
├── 📊 OBSERVABILITY
│   └── grafana-dashboard-app.json ← Grafana dashboard template
│
├── 🛠️ AUTOMATION SCRIPTS
│   ├── complete-deploy.sh         ← ⭐ FULL AUTOMATION - Run this!
│   ├── deploy.sh                  ← Quick deploy helper
│   ├── switch-stack.sh            ← Toggle between stacks
│   └── validate-deployment.sh     ← Verify deployment
│
├── 🧪 LOCAL TESTING
│   ├── docker-compose.yaml        ← Local testing environment
│   └── config/                    ← Local config files
│       ├── otel-collector-config.yaml
│       ├── prometheus.yml
│       ├── tempo.yaml
│       └── grafana-datasources.yaml
│
└── 🔧 PROJECT FILES
    └── .gitignore                 ← Git ignore rules
```

## 📄 File Descriptions

### 📘 Documentation Files

#### **INDEX.md** (This File)
Master index explaining all project files and how to use them.

#### **QUICKSTART.md**
**Purpose:** Get deployed FAST  
**Use When:** You want step-by-step instructions with checkboxes  
**Time to Read:** 10 minutes  
**Time to Deploy:** 30 minutes  

Step-by-step checklist covering:
- Prerequisites verification
- Local testing with Docker Compose
- Kubernetes deployment
- Harness pipeline setup
- Chaos experiments
- Troubleshooting

#### **README.md**
**Purpose:** Comprehensive project guide  
**Use When:** You want to understand everything  
**Time to Read:** 30 minutes  
**Covers:**
- Architecture overview
- Detailed deployment instructions
- Both observability stacks
- Chaos engineering
- Troubleshooting
- Advanced topics

#### **PROJECT-SUMMARY.md**
**Purpose:** Deep technical details  
**Use When:** You need architectural understanding  
**Time to Read:** 45 minutes  
**Covers:**
- Architecture diagrams
- Data flow explanations
- Design decisions
- Scaling considerations
- Security best practices
- Comparison matrix

### 🐍 Application Files

#### **app.py**
**Lines:** ~350  
**Purpose:** Main Python Flask application  

**Features:**
- OpenTelemetry instrumentation (works with both stacks)
- Auto-detects stack via environment variable
- Metrics: request count, latency, active requests
- Traces: distributed tracing with custom spans
- Multiple endpoints for testing
- Error injection for chaos testing

**Key Endpoints:**
```
/              - Home page
/health        - Health check
/api/process   - Business logic endpoint
/api/slow      - Latency testing
/api/error     - Error injection
/metrics       - Prometheus metrics (Stack A only)
```

#### **requirements.txt**
Python dependencies needed for the application.

#### **Dockerfile**
Container image definition. Multi-stage build for minimal size.

### ☸️ Kubernetes Files

#### **k8s-manifest.yaml** ⭐ MOST IMPORTANT FILE
**Lines:** ~1000  
**Purpose:** Complete Kubernetes deployment for BOTH stacks  

**Structure:**
```yaml
Lines 1-150:    Common resources (namespace, configmap, app)
Lines 150-700:  Stack A (OTel + Prometheus + Grafana) ← DEFAULT
Lines 710-800:  Stack B (Dynatrace) ← COMMENTED OUT
Lines 800+:     Chaos experiments, RBAC
```

**How to Use:**
```bash
# Deploy Stack A (default)
kubectl apply -f k8s-manifest.yaml

# Switch to Stack B
./switch-stack.sh dynatrace
# Then manually comment/uncomment sections
kubectl apply -f k8s-manifest.yaml
```

**Contains:**
- Application deployment (3 replicas)
- ConfigMap for environment config
- Services for all components
- Stack A: OTel Collector, Prometheus, Tempo, Grafana
- Stack B: Dynatrace configuration
- Chaos Mesh experiments
- Ingress resources
- RBAC rules

### 🔄 Harness Files

#### **harness-pipeline.yaml**
**Lines:** ~600  
**Purpose:** Complete CI/CD pipeline  

**Stages:**
1. **Build & Push** - Docker image creation
2. **Deploy** - Kubernetes deployment
3. **Chaos** - Inject faults (optional)
4. **Verify** - Validate deployment

**Variables:**
- `observability_stack` - Choose stack (otel-prometheus/dynatrace)
- `enable_chaos` - Enable chaos experiments (true/false)
- `chaos_experiment_type` - Type of chaos (network-delay/pod-failure/cpu-stress/all)

**How to Use:**
1. Import into Harness
2. Replace placeholders: `<YOUR_PROJECT_ID>`, `<YOUR_ORG_ID>`, connector references
3. Run with desired parameters

#### **harness-service.yaml**
Service definition for Harness. Defines the application service and artifact sources.

#### **harness-infrastructure.yaml**
Infrastructure definition pointing to your Kubernetes cluster.

#### **harness-environment.yaml**
Environment configuration (production).

### 🧪 Chaos Engineering

#### **chaos-experiments.yaml**
**Lines:** ~400  
**Purpose:** Pre-built chaos scenarios  

**Experiments Included:**
1. **Network Chaos**
   - Latency injection (mild, severe)
   - Packet loss
   - Network partition

2. **Pod Chaos**
   - Pod kill
   - Pod failure
   - Container kill

3. **Stress Chaos**
   - CPU stress
   - Memory stress
   - Combined stress

4. **Time Chaos**
   - Clock skew

5. **HTTP Chaos**
   - Request abort
   - Response delay

6. **Workflow**
   - Combined scenarios

**How to Use:**
```bash
# Apply single experiment
kubectl apply -f - <<EOF
(copy experiment here)
EOF

# Monitor
kubectl get networkchaos,podchaos,stresschaos -n observability-demo

# Cleanup
kubectl delete networkchaos,podchaos,stresschaos --all -n observability-demo
```

### 📊 Observability Files

#### **grafana-dashboard-app.json**
**Purpose:** Pre-built Grafana dashboard  

**Panels:**
- Request rate
- Error rate
- Latency percentiles (P50, P95, P99)
- Active requests
- Pod CPU/Memory usage
- Status code distribution
- Endpoint performance table

**How to Import:**
1. Login to Grafana
2. Dashboards → Import
3. Upload this file

### 🛠️ Automation Scripts

#### **complete-deploy.sh** ⭐ EASIEST WAY TO DEPLOY
**Purpose:** Fully automated deployment  
**Time:** 10-15 minutes  

**What it does:**
1. ✅ Checks prerequisites
2. ✅ Builds & pushes Docker image (optional)
3. ✅ Configures observability stack
4. ✅ Deploys to Kubernetes
5. ✅ Validates deployment
6. ✅ Provides access instructions

**Usage:**
```bash
# Deploy with OpenTelemetry stack
./complete-deploy.sh otel-prometheus

# Deploy with Dynatrace stack
./complete-deploy.sh dynatrace
```

**Interactive:** Asks for confirmation and registry info.

#### **deploy.sh**
**Purpose:** Quick deployment helper  
**Usage:**
```bash
./deploy.sh otel-prometheus  # or dynatrace
```

Less automated than complete-deploy.sh, but still helpful.

#### **switch-stack.sh**
**Purpose:** Toggle between observability stacks  
**Usage:**
```bash
./switch-stack.sh otel-prometheus  # Enable Stack A
./switch-stack.sh dynatrace        # Enable Stack B
```

**What it does:**
- Updates ConfigMap with correct stack
- Provides instructions for manual changes
- Creates backup of manifest

#### **validate-deployment.sh**
**Purpose:** Comprehensive deployment validation  
**Usage:**
```bash
./validate-deployment.sh otel-prometheus  # or dynatrace
```

**Tests:**
- ✅ Pod health
- ✅ Service availability
- ✅ Application endpoints
- ✅ Observability components
- ✅ Metrics flow
- ✅ Resource utilization
- ✅ Security checks
- ✅ Connectivity
- ✅ Load test

**Output:** Pass/Fail report with actionable recommendations.

### 🧪 Local Testing

#### **docker-compose.yaml**
**Purpose:** Local testing environment  
**Usage:**
```bash
# Start with OpenTelemetry stack
docker-compose --profile otel up -d

# Access
# App: http://localhost:8080
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090

# Stop
docker-compose --profile otel down
```

**Components:**
- Python app
- OpenTelemetry Collector
- Prometheus
- Tempo
- Grafana

Perfect for testing before deploying to Kubernetes.

#### **config/** Directory
Configuration files for local docker-compose setup:
- `otel-collector-config.yaml` - OTel Collector configuration
- `prometheus.yml` - Prometheus scrape config
- `tempo.yaml` - Tempo configuration
- `grafana-datasources.yaml` - Grafana datasources

## 🚀 Quick Start Guide

### For the Impatient (5 minutes)

```bash
# 1. Test locally
docker-compose --profile otel up -d
curl http://localhost:8080/health
docker-compose down

# 2. Deploy to Kubernetes
./complete-deploy.sh otel-prometheus
# Follow prompts

# 3. Access
kubectl port-forward -n observability-demo svc/grafana 3000:3000
# Visit http://localhost:3000 (admin/admin)
```

### For the Thorough (30 minutes)

1. Read QUICKSTART.md
2. Run through checklist
3. Deploy with complete-deploy.sh
4. Run validate-deployment.sh
5. Import Grafana dashboard
6. Run chaos experiments
7. Monitor in observability stack

## 🎓 Learning Path

### Beginner
1. **Start:** QUICKSTART.md
2. **Deploy:** complete-deploy.sh
3. **Verify:** validate-deployment.sh
4. **Test:** chaos-experiments.yaml (one at a time)

### Intermediate
1. **Understand:** README.md (full read)
2. **Customize:** Edit k8s-manifest.yaml
3. **Harness:** Set up pipeline
4. **Chaos:** Create custom experiments

### Advanced
1. **Deep Dive:** PROJECT-SUMMARY.md
2. **Architect:** Design your own stack
3. **Scale:** Add HPA, optimize resources
4. **Production:** Security hardening, secrets management

## 🆘 Troubleshooting Quick Reference

**Pods not starting:**
```bash
kubectl describe pod -n observability-demo <pod-name>
kubectl logs -n observability-demo <pod-name>
```

**Validation failing:**
```bash
./validate-deployment.sh otel-prometheus
# Check specific failures in output
```

**No metrics in Grafana:**
```bash
# Check Prometheus targets
kubectl port-forward -n observability-demo svc/prometheus 9090:9090
# Visit http://localhost:9090/targets
```

**Dynatrace not receiving data:**
```bash
kubectl logs -n observability-demo -l app=python-app | grep -i error
kubectl get configmap app-config -n observability-demo -o yaml
```

## 📝 Common Tasks

### Deploy Stack A (OpenTelemetry)
```bash
./complete-deploy.sh otel-prometheus
```

### Deploy Stack B (Dynatrace)
```bash
./complete-deploy.sh dynatrace
# Follow prompts to configure credentials
```

### Switch Stacks (After Deployment)
```bash
./switch-stack.sh dynatrace
kubectl apply -f k8s-manifest.yaml
```

### Run Chaos Experiment
```bash
kubectl apply -f chaos-experiments.yaml
# Wait and observe
kubectl delete networkchaos,podchaos,stresschaos --all -n observability-demo
```

### Generate Load
```bash
kubectl port-forward -n observability-demo svc/python-app 8080:8080 &
for i in {1..100}; do
  curl -X POST http://localhost:8080/api/process \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
done
```

### View Logs
```bash
kubectl logs -n observability-demo -l app=python-app --tail=50 -f
```

### Cleanup
```bash
kubectl delete namespace observability-demo
```

## 🎯 Success Criteria

You'll know everything is working when:

✅ **Stack A:**
- All pods running
- Grafana accessible
- Metrics visible in Prometheus
- Dashboard shows data
- Traces in Tempo

✅ **Stack B:**
- All pods running
- Service visible in Dynatrace
- Metrics flowing
- Traces appearing
- No errors in logs

✅ **Chaos:**
- Experiments can be created
- Impact visible in observability
- System recovers

## 📚 Additional Resources

- OpenTelemetry: https://opentelemetry.io/
- Prometheus: https://prometheus.io/
- Grafana: https://grafana.com/
- Dynatrace: https://www.dynatrace.com/
- Chaos Mesh: https://chaos-mesh.org/
- Harness: https://developer.harness.io/

---

**Questions?**
- Check README.md for detailed answers
- Review PROJECT-SUMMARY.md for architecture
- Run validate-deployment.sh for diagnostics

**Ready to deploy?**
→ Start with QUICKSTART.md or run ./complete-deploy.sh
