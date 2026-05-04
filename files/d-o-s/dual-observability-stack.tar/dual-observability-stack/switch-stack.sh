#!/bin/bash

# ==============================================================================
# Observability Stack Switcher
# ==============================================================================
# This script modifies k8s-manifest.yaml to enable/disable observability stacks
#
# Usage:
#   ./switch-stack.sh otel-prometheus  # Enable OpenTelemetry + Prometheus + Grafana
#   ./switch-stack.sh dynatrace        # Enable Dynatrace
# ==============================================================================

set -e

STACK=$1
MANIFEST_FILE="k8s-manifest.yaml"

if [ -z "$STACK" ]; then
    echo "Usage: $0 [otel-prometheus|dynatrace]"
    exit 1
fi

if [ ! -f "$MANIFEST_FILE" ]; then
    echo "Error: $MANIFEST_FILE not found"
    exit 1
fi

echo "Switching to $STACK observability stack..."

# Backup original manifest
cp "$MANIFEST_FILE" "${MANIFEST_FILE}.backup"

case "$STACK" in
    "otel-prometheus")
        echo "Configuring OpenTelemetry + Prometheus + Grafana stack..."
        
        # Update ConfigMap
        sed -i 's/OBSERVABILITY_STACK: "dynatrace"/OBSERVABILITY_STACK: "otel-prometheus"/' "$MANIFEST_FILE"
        
        # In a real implementation, you would:
        # 1. Uncomment all Stack A sections
        # 2. Comment out all Stack B sections
        # For this demo, the manifest is already configured for Stack A by default
        
        echo "✓ Stack A (OpenTelemetry + Prometheus + Grafana) enabled"
        echo ""
        echo "Components deployed:"
        echo "  - OpenTelemetry Collector"
        echo "  - Prometheus"
        echo "  - Tempo (for traces)"
        echo "  - Grafana"
        echo ""
        echo "Access URLs after deployment:"
        echo "  - Application: http://python-app.local"
        echo "  - Grafana: http://grafana.local (admin/admin)"
        ;;
    
    "dynatrace")
        echo "Configuring Dynatrace stack..."
        
        # Update ConfigMap
        sed -i 's/OBSERVABILITY_STACK: "otel-prometheus"/OBSERVABILITY_STACK: "dynatrace"/' "$MANIFEST_FILE"
        
        # Check if Dynatrace credentials are configured
        if ! grep -q "DYNATRACE_ENDPOINT:" "$MANIFEST_FILE" | grep -v "^#"; then
            echo ""
            echo "⚠️  WARNING: Dynatrace credentials not configured!"
            echo ""
            echo "Please update the following in $MANIFEST_FILE:"
            echo "  1. Uncomment and set DYNATRACE_ENDPOINT"
            echo "  2. Uncomment and set DYNATRACE_TOKEN in Secret"
            echo "  3. Uncomment the Dynatrace Stack B section"
            echo "  4. Comment out the Stack A section"
            echo ""
            echo "See the manifest file for detailed instructions."
        fi
        
        echo "✓ Stack B (Dynatrace) configuration updated"
        echo ""
        echo "Manual steps required:"
        echo "  1. Edit k8s-manifest.yaml and uncomment Stack B sections"
        echo "  2. Comment out Stack A sections"
        echo "  3. Add your Dynatrace credentials"
        echo ""
        echo "Access URLs after deployment:"
        echo "  - Application: http://python-app.local"
        echo "  - Dynatrace: https://YOUR_ENV.live.dynatrace.com"
        ;;
    
    *)
        echo "Error: Invalid stack '$STACK'"
        echo "Valid options: otel-prometheus, dynatrace"
        exit 1
        ;;
esac

echo ""
echo "Manifest updated successfully!"
echo "Backup saved to: ${MANIFEST_FILE}.backup"
echo ""
echo "Next steps:"
echo "  1. Review the changes in $MANIFEST_FILE"
echo "  2. Deploy using: kubectl apply -f $MANIFEST_FILE"
echo "  3. Or trigger Harness pipeline with observability_stack=$STACK"
