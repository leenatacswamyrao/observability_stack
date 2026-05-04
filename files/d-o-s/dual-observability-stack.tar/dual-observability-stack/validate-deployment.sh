#!/bin/bash

# ==============================================================================
# OBSERVABILITY STACK VALIDATION SCRIPT
# ==============================================================================
# This script validates your observability deployment across multiple dimensions
# Run after deployment to ensure everything is working correctly
#
# Usage:
#   ./validate-deployment.sh [otel-prometheus|dynatrace]
# ==============================================================================

set -e

STACK=${1:-otel-prometheus}
NAMESPACE="observability-demo"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
}

pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN: $1${NC}"
    ((WARNINGS++))
}

check_command() {
    if command -v $1 &> /dev/null; then
        pass "$1 is installed"
        return 0
    else
        fail "$1 is not installed"
        return 1
    fi
}

# ==============================================================================
# PRE-FLIGHT CHECKS
# ==============================================================================

print_header "PRE-FLIGHT CHECKS"

print_test "Checking required tools"
check_command kubectl
check_command curl

print_test "Checking cluster connectivity"
if kubectl cluster-info &> /dev/null; then
    pass "Connected to Kubernetes cluster"
else
    fail "Cannot connect to Kubernetes cluster"
    exit 1
fi

print_test "Checking namespace"
if kubectl get namespace $NAMESPACE &> /dev/null; then
    pass "Namespace '$NAMESPACE' exists"
else
    fail "Namespace '$NAMESPACE' does not exist"
    exit 1
fi

# ==============================================================================
# DEPLOYMENT VALIDATION
# ==============================================================================

print_header "DEPLOYMENT VALIDATION"

print_test "Checking python-app deployment"
DESIRED=$(kubectl get deployment python-app -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
READY=$(kubectl get deployment python-app -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")

if [ "$DESIRED" -gt 0 ] && [ "$READY" -eq "$DESIRED" ]; then
    pass "python-app deployment: $READY/$DESIRED pods ready"
else
    fail "python-app deployment: $READY/$DESIRED pods ready (expected all ready)"
fi

print_test "Checking pod status"
NOT_RUNNING=$(kubectl get pods -n $NAMESPACE -l app=python-app --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
if [ "$NOT_RUNNING" -eq 0 ]; then
    pass "All python-app pods are running"
else
    fail "$NOT_RUNNING python-app pods are not running"
    kubectl get pods -n $NAMESPACE -l app=python-app
fi

print_test "Checking pod restarts"
RESTARTS=$(kubectl get pods -n $NAMESPACE -l app=python-app -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}' 2>/dev/null | awk '{s+=$1} END {print s+0}')
if [ "$RESTARTS" -lt 5 ]; then
    pass "Total restarts: $RESTARTS (acceptable)"
elif [ "$RESTARTS" -lt 10 ]; then
    warn "Total restarts: $RESTARTS (high)"
else
    fail "Total restarts: $RESTARTS (very high)"
fi

print_test "Checking services"
if kubectl get service python-app -n $NAMESPACE &> /dev/null; then
    pass "python-app service exists"
else
    fail "python-app service does not exist"
fi

# ==============================================================================
# APPLICATION HEALTH CHECKS
# ==============================================================================

print_header "APPLICATION HEALTH CHECKS"

print_test "Testing application endpoints"

# Port-forward to app
APP_POD=$(kubectl get pod -n $NAMESPACE -l app=python-app -o jsonpath='{.items[0].metadata.name}')
if [ -n "$APP_POD" ]; then
    pass "Found app pod: $APP_POD"
    
    # Test health endpoint
    print_test "Testing /health endpoint"
    HEALTH_STATUS=$(kubectl exec -n $NAMESPACE $APP_POD -- curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
    if [ "$HEALTH_STATUS" -eq 200 ]; then
        pass "/health endpoint returns 200"
    else
        fail "/health endpoint returns $HEALTH_STATUS"
    fi
    
    # Test root endpoint
    print_test "Testing / endpoint"
    ROOT_STATUS=$(kubectl exec -n $NAMESPACE $APP_POD -- curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ 2>/dev/null || echo "000")
    if [ "$ROOT_STATUS" -eq 200 ]; then
        pass "/ endpoint returns 200"
    else
        fail "/ endpoint returns $ROOT_STATUS"
    fi
    
    # Test API endpoint
    print_test "Testing /api/process endpoint"
    API_STATUS=$(kubectl exec -n $NAMESPACE $APP_POD -- curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/process -H "Content-Type: application/json" -d '{"test":"data"}' 2>/dev/null || echo "000")
    if [ "$API_STATUS" -eq 200 ]; then
        pass "/api/process endpoint returns 200"
    else
        fail "/api/process endpoint returns $API_STATUS"
    fi
else
    fail "Could not find app pod"
fi

# ==============================================================================
# OBSERVABILITY STACK VALIDATION
# ==============================================================================

print_header "OBSERVABILITY STACK VALIDATION - $STACK"

if [ "$STACK" == "otel-prometheus" ]; then
    # Stack A validation
    
    print_test "Checking OTel Collector"
    if kubectl get deployment otel-collector -n $NAMESPACE &> /dev/null; then
        OTEL_READY=$(kubectl get deployment otel-collector -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        if [ "$OTEL_READY" -gt 0 ]; then
            pass "OTel Collector is running"
        else
            fail "OTel Collector is not ready"
        fi
    else
        fail "OTel Collector deployment not found"
    fi
    
    print_test "Checking Prometheus"
    if kubectl get deployment prometheus -n $NAMESPACE &> /dev/null; then
        PROM_READY=$(kubectl get deployment prometheus -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        if [ "$PROM_READY" -gt 0 ]; then
            pass "Prometheus is running"
        else
            fail "Prometheus is not ready"
        fi
        
        # Check Prometheus targets
        print_test "Checking Prometheus targets"
        PROM_POD=$(kubectl get pod -n $NAMESPACE -l app=prometheus -o jsonpath='{.items[0].metadata.name}')
        if [ -n "$PROM_POD" ]; then
            UP_TARGETS=$(kubectl exec -n $NAMESPACE $PROM_POD -- curl -s http://localhost:9090/api/v1/targets 2>/dev/null | grep -o '"health":"up"' | wc -l || echo "0")
            if [ "$UP_TARGETS" -gt 0 ]; then
                pass "Prometheus has $UP_TARGETS target(s) UP"
            else
                warn "No Prometheus targets are UP"
            fi
        fi
    else
        fail "Prometheus deployment not found"
    fi
    
    print_test "Checking Grafana"
    if kubectl get deployment grafana -n $NAMESPACE &> /dev/null; then
        GRAFANA_READY=$(kubectl get deployment grafana -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        if [ "$GRAFANA_READY" -gt 0 ]; then
            pass "Grafana is running"
        else
            fail "Grafana is not ready"
        fi
    else
        fail "Grafana deployment not found"
    fi
    
    print_test "Checking Tempo"
    if kubectl get deployment tempo -n $NAMESPACE &> /dev/null; then
        TEMPO_READY=$(kubectl get deployment tempo -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        if [ "$TEMPO_READY" -gt 0 ]; then
            pass "Tempo is running"
        else
            fail "Tempo is not ready"
        fi
    else
        warn "Tempo deployment not found (optional for traces)"
    fi
    
    # Test metrics endpoint
    print_test "Checking application metrics endpoint"
    if [ -n "$APP_POD" ]; then
        METRICS=$(kubectl exec -n $NAMESPACE $APP_POD -- curl -s http://localhost:8080/metrics 2>/dev/null | grep "app_requests_total" | wc -l || echo "0")
        if [ "$METRICS" -gt 0 ]; then
            pass "Application is exposing Prometheus metrics"
        else
            fail "Application metrics endpoint not working"
        fi
    fi

elif [ "$STACK" == "dynatrace" ]; then
    # Stack B validation
    
    print_test "Checking Dynatrace configuration"
    DT_ENDPOINT=$(kubectl get configmap app-config -n $NAMESPACE -o jsonpath='{.data.DYNATRACE_ENDPOINT}' 2>/dev/null || echo "")
    if [ -n "$DT_ENDPOINT" ] && [ "$DT_ENDPOINT" != "YOUR_ENV" ]; then
        pass "Dynatrace endpoint configured: $DT_ENDPOINT"
    else
        fail "Dynatrace endpoint not configured"
    fi
    
    print_test "Checking Dynatrace secret"
    if kubectl get secret dynatrace-secret -n $NAMESPACE &> /dev/null; then
        pass "Dynatrace secret exists"
    else
        fail "Dynatrace secret not found"
    fi
    
    print_test "Checking application OTLP export"
    if [ -n "$APP_POD" ]; then
        OTLP_ERRORS=$(kubectl logs -n $NAMESPACE $APP_POD --tail=100 2>/dev/null | grep -i "otlp.*error\|dynatrace.*error" | wc -l || echo "0")
        if [ "$OTLP_ERRORS" -eq 0 ]; then
            pass "No OTLP export errors in app logs"
        else
            warn "Found $OTLP_ERRORS OTLP errors in app logs (check connectivity)"
        fi
    fi
    
    echo ""
    echo -e "${BLUE}Note: Verify in Dynatrace UI that service 'python-app' appears${NC}"
    echo -e "${BLUE}URL: $DT_ENDPOINT${NC}"
fi

# ==============================================================================
# CHAOS ENGINEERING VALIDATION
# ==============================================================================

print_header "CHAOS ENGINEERING VALIDATION"

print_test "Checking Chaos Mesh installation"
if kubectl get namespace chaos-mesh &> /dev/null; then
    CHAOS_PODS=$(kubectl get pods -n chaos-mesh --no-headers 2>/dev/null | wc -l)
    if [ "$CHAOS_PODS" -gt 0 ]; then
        pass "Chaos Mesh is installed ($CHAOS_PODS pods)"
    else
        warn "Chaos Mesh namespace exists but no pods found"
    fi
else
    warn "Chaos Mesh not installed (optional for chaos experiments)"
fi

print_test "Checking for active chaos experiments"
ACTIVE_CHAOS=$(kubectl get networkchaos,podchaos,stresschaos -n $NAMESPACE --no-headers 2>/dev/null | wc -l || echo "0")
if [ "$ACTIVE_CHAOS" -eq 0 ]; then
    pass "No active chaos experiments (clean state)"
else
    warn "$ACTIVE_CHAOS active chaos experiment(s) detected"
    kubectl get networkchaos,podchaos,stresschaos -n $NAMESPACE
fi

# ==============================================================================
# RESOURCE UTILIZATION
# ==============================================================================

print_header "RESOURCE UTILIZATION"

print_test "Checking pod resource usage"
kubectl top pods -n $NAMESPACE 2>/dev/null || warn "Metrics server not available (kubectl top won't work)"

print_test "Checking resource limits"
PODS_WITHOUT_LIMITS=$(kubectl get pods -n $NAMESPACE -o json 2>/dev/null | jq -r '.items[] | select(.spec.containers[].resources.limits == null) | .metadata.name' | wc -l || echo "0")
if [ "$PODS_WITHOUT_LIMITS" -eq 0 ]; then
    pass "All pods have resource limits defined"
else
    warn "$PODS_WITHOUT_LIMITS pod(s) without resource limits"
fi

# ==============================================================================
# SECURITY CHECKS
# ==============================================================================

print_header "SECURITY CHECKS"

print_test "Checking for secrets in ConfigMaps"
CONFIGMAP_SECRETS=$(kubectl get configmap -n $NAMESPACE -o yaml 2>/dev/null | grep -i "password\|token\|secret" | grep -v "secret-name\|secretRef" | wc -l || echo "0")
if [ "$CONFIGMAP_SECRETS" -eq 0 ]; then
    pass "No sensitive data found in ConfigMaps"
else
    warn "Potential sensitive data in ConfigMaps (check manually)"
fi

print_test "Checking for running as root"
ROOT_PODS=$(kubectl get pods -n $NAMESPACE -o json 2>/dev/null | jq -r '.items[] | select(.spec.containers[].securityContext.runAsUser == 0 or .spec.containers[].securityContext.runAsUser == null) | .metadata.name' | wc -l || echo "0")
if [ "$ROOT_PODS" -eq 0 ]; then
    pass "No pods running as root"
else
    warn "$ROOT_PODS pod(s) may be running as root"
fi

# ==============================================================================
# CONNECTIVITY TESTS
# ==============================================================================

print_header "CONNECTIVITY TESTS"

print_test "Testing pod-to-pod connectivity"
if [ -n "$APP_POD" ]; then
    # Test connectivity to OTel collector (if Stack A)
    if [ "$STACK" == "otel-prometheus" ]; then
        OTEL_CONN=$(kubectl exec -n $NAMESPACE $APP_POD -- nc -zv otel-collector 4317 2>&1 | grep -i "succeeded\|open" | wc -l || echo "0")
        if [ "$OTEL_CONN" -gt 0 ]; then
            pass "App can connect to OTel Collector"
        else
            fail "App cannot connect to OTel Collector"
        fi
    fi
fi

# ==============================================================================
# LOAD TEST (OPTIONAL)
# ==============================================================================

print_header "BASIC LOAD TEST"

print_test "Sending test traffic"
if [ -n "$APP_POD" ]; then
    echo "Sending 20 requests to /api/process..."
    SUCCESS=0
    for i in {1..20}; do
        STATUS=$(kubectl exec -n $NAMESPACE $APP_POD -- curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/process -H "Content-Type: application/json" -d '{"test":"'$i'"}' 2>/dev/null || echo "000")
        if [ "$STATUS" -eq 200 ]; then
            ((SUCCESS++))
        fi
        sleep 0.1
    done
    
    if [ "$SUCCESS" -ge 18 ]; then
        pass "Load test: $SUCCESS/20 requests succeeded (>90%)"
    elif [ "$SUCCESS" -ge 15 ]; then
        warn "Load test: $SUCCESS/20 requests succeeded (75-90%)"
    else
        fail "Load test: $SUCCESS/20 requests succeeded (<75%)"
    fi
fi

# ==============================================================================
# SUMMARY REPORT
# ==============================================================================

print_header "VALIDATION SUMMARY"

TOTAL=$((PASSED + FAILED + WARNINGS))
PASS_RATE=$((PASSED * 100 / TOTAL))

echo ""
echo -e "${GREEN}Passed:   $PASSED${NC}"
echo -e "${RED}Failed:   $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "Total:    $TOTAL"
echo ""
echo -e "Pass Rate: ${PASS_RATE}%"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ VALIDATION SUCCESSFUL${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Your observability stack is properly deployed!"
    echo ""
    echo "Next steps:"
    echo "  1. Access Grafana/Dynatrace dashboards"
    echo "  2. Generate application load"
    echo "  3. Run chaos experiments"
    echo "  4. Monitor metrics and traces"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ VALIDATION FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Please fix the failed checks above."
    echo ""
    echo "Common issues:"
    echo "  - Pods not ready: Check 'kubectl describe pod' for events"
    echo "  - Services not found: Re-apply k8s-manifest.yaml"
    echo "  - Connectivity issues: Check network policies"
    echo "  - Dynatrace errors: Verify endpoint and token"
    exit 1
fi
