#!/bin/bash

# ==============================================================================
# Quick Deployment Script
# ==============================================================================
# Deploys the observability demo with your choice of stack
#
# Usage:
#   ./deploy.sh otel-prometheus  # Deploy with Stack A
#   ./deploy.sh dynatrace        # Deploy with Stack B
# ==============================================================================

set -e

STACK=${1:-otel-prometheus}
NAMESPACE="observability-demo"

echo "=========================================="
echo "Observability Demo - Quick Deploy"
echo "=========================================="
echo "Stack: $STACK"
echo "Namespace: $NAMESPACE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}ERROR: kubectl not found${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}WARNING: docker not found (needed for building image)${NC}"
fi

echo -e "${GREEN}✓ kubectl found${NC}"

# Check cluster connectivity
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}ERROR: Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Connected to cluster${NC}"

# Switch stack
echo ""
echo "Switching to $STACK stack..."
./switch-stack.sh "$STACK"

# Build and push image (if Docker available)
if command -v docker &> /dev/null; then
    echo ""
    read -p "Build and push Docker image? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your Docker registry (e.g., myregistry/myrepo): " DOCKER_REPO
        
        echo "Building image..."
        docker build -t "$DOCKER_REPO:latest" .
        
        echo "Pushing image..."
        docker push "$DOCKER_REPO:latest"
        
        echo -e "${GREEN}✓ Image pushed successfully${NC}"
        
        # Update manifest
        sed -i "s|<+artifact.image>|$DOCKER_REPO:latest|g" k8s-manifest.yaml
    fi
fi

# Create namespace
echo ""
echo "Creating namespace..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✓ Namespace ready${NC}"

# Deploy
echo ""
echo "Deploying to Kubernetes..."
kubectl apply -f k8s-manifest.yaml

echo -e "${GREEN}✓ Resources deployed${NC}"

# Wait for pods
echo ""
echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app=python-app -n "$NAMESPACE" --timeout=300s || true

# Show status
echo ""
echo "=========================================="
echo "Deployment Status"
echo "=========================================="
kubectl get pods -n "$NAMESPACE"

echo ""
echo "=========================================="
echo "Services"
echo "=========================================="
kubectl get svc -n "$NAMESPACE"

# Access information
echo ""
echo "=========================================="
echo "Access Information"
echo "=========================================="

if [ "$STACK" == "otel-prometheus" ]; then
    echo "Stack A (OpenTelemetry + Prometheus + Grafana)"
    echo ""
    echo "Application:"
    echo "  kubectl port-forward -n $NAMESPACE svc/python-app 8080:8080"
    echo "  Then visit: http://localhost:8080"
    echo ""
    echo "Grafana:"
    echo "  kubectl port-forward -n $NAMESPACE svc/grafana 3000:3000"
    echo "  Then visit: http://localhost:3000 (admin/admin)"
    echo ""
    echo "Prometheus:"
    echo "  kubectl port-forward -n $NAMESPACE svc/prometheus 9090:9090"
    echo "  Then visit: http://localhost:9090"
else
    echo "Stack B (Dynatrace)"
    echo ""
    echo "Application:"
    echo "  kubectl port-forward -n $NAMESPACE svc/python-app 8080:8080"
    echo "  Then visit: http://localhost:8080"
    echo ""
    echo "Dynatrace:"
    echo "  Visit your Dynatrace environment"
    echo "  Navigate to: Services > python-app"
fi

echo ""
echo "=========================================="
echo "Chaos Engineering"
echo "=========================================="
echo "To run chaos experiments:"
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
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo "1. Test the application endpoints"
echo "2. Access observability dashboards"
echo "3. Run chaos experiments"
echo "4. Monitor metrics and traces"
echo ""
echo -e "${GREEN}Deployment complete!${NC}"
