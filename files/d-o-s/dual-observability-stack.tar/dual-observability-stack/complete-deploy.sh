#!/bin/bash

# ==============================================================================
# COMPLETE DEPLOYMENT AUTOMATION SCRIPT
# ==============================================================================
# This script automates the entire deployment process from start to finish
#
# Usage:
#   ./complete-deploy.sh [otel-prometheus|dynatrace]
# 
# What it does:
#   1. Validates prerequisites
#   2. Builds and pushes Docker image
#   3. Configures the observability stack
#   4. Deploys to Kubernetes
#   5. Validates deployment
#   6. Provides access instructions
# ==============================================================================

set -e

STACK=${1:-otel-prometheus}
NAMESPACE="observability-demo"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# ==============================================================================
# FUNCTIONS
# ==============================================================================

print_banner() {
    echo -e "${CYAN}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   DUAL OBSERVABILITY STACK DEPLOYMENT                        ║
║   OpenTelemetry + Prometheus + Grafana  OR  Dynatrace        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

print_step() {
    echo -e "${MAGENTA}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ INFO: $1${NC}"
}

# ==============================================================================
# STEP 0: BANNER AND INTRO
# ==============================================================================

print_banner

echo -e "${CYAN}Selected Stack:${NC} $STACK"
echo -e "${CYAN}Target Namespace:${NC} $NAMESPACE"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# ==============================================================================
# STEP 1: PREREQUISITES CHECK
# ==============================================================================

print_header "STEP 1: Checking Prerequisites"

print_step "Checking required tools..."

MISSING_TOOLS=0

if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found"
    MISSING_TOOLS=1
else
    print_success "kubectl found"
fi

if ! command -v docker &> /dev/null; then
    print_warning "docker not found (optional, for building image)"
else
    print_success "docker found"
fi

if [ $MISSING_TOOLS -eq 1 ]; then
    print_error "Missing required tools. Please install them and try again."
    exit 1
fi

print_step "Checking cluster connectivity..."
if kubectl cluster-info &> /dev/null; then
    CLUSTER_NAME=$(kubectl config current-context)
    print_success "Connected to cluster: $CLUSTER_NAME"
else
    print_error "Cannot connect to Kubernetes cluster"
    exit 1
fi

print_step "Checking cluster resources..."
NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
print_info "Cluster has $NODES node(s)"

# ==============================================================================
# STEP 2: DOCKER IMAGE BUILD & PUSH
# ==============================================================================

print_header "STEP 2: Docker Image (Optional)"

if command -v docker &> /dev/null; then
    read -p "Build and push Docker image? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        read -p "Enter your Docker registry (e.g., myregistry/myrepo): " DOCKER_REPO
        
        if [ -z "$DOCKER_REPO" ]; then
            print_error "Registry cannot be empty"
            exit 1
        fi
        
        IMAGE_TAG="${DOCKER_REPO}:$(date +%Y%m%d-%H%M%S)"
        
        print_step "Building Docker image: $IMAGE_TAG"
        docker build -t "$IMAGE_TAG" . || {
            print_error "Docker build failed"
            exit 1
        }
        print_success "Image built successfully"
        
        print_step "Pushing to registry..."
        docker push "$IMAGE_TAG" || {
            print_error "Docker push failed"
            exit 1
        }
        print_success "Image pushed successfully"
        
        print_step "Tagging as latest..."
        docker tag "$IMAGE_TAG" "${DOCKER_REPO}:latest"
        docker push "${DOCKER_REPO}:latest"
        
        # Update manifest
        print_step "Updating manifest with image..."
        sed -i.bak "s|<+artifact.image>|${IMAGE_TAG}|g" k8s-manifest.yaml
        print_success "Manifest updated"
        
        MANIFEST_FILE="k8s-manifest.yaml"
    else
        print_info "Skipping Docker build. Make sure to update image in manifest."
        read -p "Enter the image to use (or press Enter to skip): " DOCKER_IMAGE
        
        if [ -n "$DOCKER_IMAGE" ]; then
            sed -i.bak "s|<+artifact.image>|${DOCKER_IMAGE}|g" k8s-manifest.yaml
            MANIFEST_FILE="k8s-manifest.yaml"
        else
            print_warning "You'll need to manually update the image in k8s-manifest.yaml"
            MANIFEST_FILE="k8s-manifest.yaml"
        fi
    fi
else
    print_warning "Docker not available. Skipping image build."
    print_info "Make sure to update the image in k8s-manifest.yaml"
    MANIFEST_FILE="k8s-manifest.yaml"
fi

# ==============================================================================
# STEP 3: CONFIGURE OBSERVABILITY STACK
# ==============================================================================

print_header "STEP 3: Configure Observability Stack"

print_step "Switching to $STACK stack..."
./switch-stack.sh "$STACK"

if [ "$STACK" == "dynatrace" ]; then
    echo ""
    print_warning "Dynatrace stack selected!"
    echo ""
    echo "You need to manually configure:"
    echo "  1. Edit k8s-manifest.yaml"
    echo "  2. Uncomment Stack B section (lines 710-800)"
    echo "  3. Comment out Stack A section (lines 150-700)"
    echo "  4. Add your Dynatrace endpoint and token"
    echo ""
    read -p "Have you configured Dynatrace settings? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please configure Dynatrace settings before continuing"
        exit 1
    fi
fi

# ==============================================================================
# STEP 4: DEPLOY TO KUBERNETES
# ==============================================================================

print_header "STEP 4: Deploy to Kubernetes"

print_step "Creating namespace..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - &> /dev/null
print_success "Namespace ready"

print_step "Deploying resources..."
if kubectl apply -f "$MANIFEST_FILE"; then
    print_success "Resources deployed"
else
    print_error "Deployment failed"
    exit 1
fi

print_step "Waiting for pods to be ready (this may take 2-3 minutes)..."
echo ""

# Wait for app pods
kubectl wait --for=condition=ready pod -l app=python-app -n "$NAMESPACE" --timeout=300s || {
    print_warning "App pods not ready after 5 minutes"
    echo "Current pod status:"
    kubectl get pods -n "$NAMESPACE" -l app=python-app
}

# Wait for observability stack (Stack A only)
if [ "$STACK" == "otel-prometheus" ]; then
    print_step "Waiting for observability components..."
    
    kubectl wait --for=condition=ready pod -l app=otel-collector -n "$NAMESPACE" --timeout=120s 2>/dev/null || \
        print_warning "OTel Collector not ready"
    
    kubectl wait --for=condition=ready pod -l app=prometheus -n "$NAMESPACE" --timeout=120s 2>/dev/null || \
        print_warning "Prometheus not ready"
    
    kubectl wait --for=condition=ready pod -l app=grafana -n "$NAMESPACE" --timeout=120s 2>/dev/null || \
        print_warning "Grafana not ready"
fi

echo ""
print_success "Deployment completed!"

# ==============================================================================
# STEP 5: VALIDATE DEPLOYMENT
# ==============================================================================

print_header "STEP 5: Validate Deployment"

print_step "Running validation script..."
echo ""

if [ -f "./validate-deployment.sh" ]; then
    chmod +x ./validate-deployment.sh
    ./validate-deployment.sh "$STACK" || {
        print_warning "Validation found issues. Check output above."
    }
else
    print_warning "Validation script not found. Skipping automated validation."
    
    # Manual validation
    print_step "Manual validation..."
    kubectl get pods -n "$NAMESPACE"
    kubectl get svc -n "$NAMESPACE"
fi

# ==============================================================================
# STEP 6: ACCESS INFORMATION
# ==============================================================================

print_header "STEP 6: Access Your Deployment"

echo ""
echo -e "${GREEN}Deployment successful!${NC}"
echo ""

if [ "$STACK" == "otel-prometheus" ]; then
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  OpenTelemetry + Prometheus + Grafana Stack${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Access URLs (use port-forward):"
    echo ""
    echo -e "${YELLOW}Application:${NC}"
    echo "  kubectl port-forward -n $NAMESPACE svc/python-app 8080:8080"
    echo "  Then visit: http://localhost:8080"
    echo ""
    echo -e "${YELLOW}Grafana:${NC}"
    echo "  kubectl port-forward -n $NAMESPACE svc/grafana 3000:3000"
    echo "  Then visit: http://localhost:3000"
    echo "  Login: admin / admin"
    echo ""
    echo -e "${YELLOW}Prometheus:${NC}"
    echo "  kubectl port-forward -n $NAMESPACE svc/prometheus 9090:9090"
    echo "  Then visit: http://localhost:9090"
    echo ""
    
    echo "Quick test commands:"
    echo ""
    echo "# Test application health"
    echo "kubectl port-forward -n $NAMESPACE svc/python-app 8080:8080 &"
    echo "curl http://localhost:8080/health"
    echo ""
    echo "# Generate load"
    echo "for i in {1..50}; do curl -X POST http://localhost:8080/api/process \\"
    echo "  -H 'Content-Type: application/json' -d '{\"test\":\"data\"}'; done"
    echo ""
    
else
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Dynatrace Stack${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Access URLs:"
    echo ""
    echo -e "${YELLOW}Application:${NC}"
    echo "  kubectl port-forward -n $NAMESPACE svc/python-app 8080:8080"
    echo "  Then visit: http://localhost:8080"
    echo ""
    echo -e "${YELLOW}Dynatrace:${NC}"
    echo "  Visit your Dynatrace environment"
    echo "  Navigate to: Services → python-app"
    echo ""
    
    DT_ENDPOINT=$(kubectl get configmap app-config -n "$NAMESPACE" -o jsonpath='{.data.DYNATRACE_ENDPOINT}' 2>/dev/null || echo "")
    if [ -n "$DT_ENDPOINT" ]; then
        echo "  Environment: $DT_ENDPOINT"
    fi
    echo ""
    
    echo -e "${YELLOW}Note:${NC} It may take 1-2 minutes for data to appear in Dynatrace"
    echo ""
fi

# ==============================================================================
# STEP 7: NEXT STEPS
# ==============================================================================

print_header "Next Steps"

echo ""
echo "1. Access the dashboards using the commands above"
echo "2. Generate application traffic to see metrics"
echo "3. Run chaos experiments:"
echo "   kubectl apply -f chaos-experiments.yaml"
echo "4. Monitor the impact in your observability stack"
echo ""

if [ "$STACK" == "otel-prometheus" ]; then
    echo "Grafana Dashboard Setup:"
    echo "  1. Login to Grafana (admin/admin)"
    echo "  2. Go to Dashboards → Import"
    echo "  3. Upload grafana-dashboard-app.json"
    echo ""
fi

echo "Run chaos experiments:"
echo "  kubectl apply -f - <<EOF"
echo "  apiVersion: chaos-mesh.org/v1alpha1"
echo "  kind: NetworkChaos"
echo "  metadata:"
echo "    name: test"
echo "    namespace: $NAMESPACE"
echo "  spec:"
echo "    action: delay"
echo "    mode: one"
echo "    selector:"
echo "      namespaces: [$NAMESPACE]"
echo "      labelSelectors:"
echo "        app: python-app"
echo "    delay:"
echo "      latency: \"200ms\""
echo "    duration: \"2m\""
echo "  EOF"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "For more information, see:"
echo "  - README.md (comprehensive guide)"
echo "  - PROJECT-SUMMARY.md (architecture details)"
echo "  - QUICKSTART.md (step-by-step checklist)"
echo ""
