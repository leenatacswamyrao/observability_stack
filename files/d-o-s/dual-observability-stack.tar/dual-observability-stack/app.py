"""
Multi-Container Python Application with Dual Observability Stack Support
Supports both OpenTelemetry+Prometheus+Grafana AND Dynatrace
"""

from flask import Flask, jsonify, request
import os
import logging
import time
import random

# OpenTelemetry imports
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from prometheus_client import make_wsgi_app, Counter, Histogram, Gauge
from werkzeug.middleware.dispatcher import DispatcherMiddleware

# Configuration from environment
OBSERVABILITY_STACK = os.getenv('OBSERVABILITY_STACK', 'otel-prometheus')  # 'otel-prometheus' or 'dynatrace'
SERVICE_NAME = os.getenv('SERVICE_NAME', 'python-app')
OTEL_ENDPOINT = os.getenv('OTEL_ENDPOINT', 'http://otel-collector:4317')
DYNATRACE_ENDPOINT = os.getenv('DYNATRACE_ENDPOINT', '')
DYNATRACE_TOKEN = os.getenv('DYNATRACE_TOKEN', '')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Custom Prometheus metrics (when using otel-prometheus stack)
request_counter = Counter('app_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('app_request_duration_seconds', 'Request duration', ['method', 'endpoint'])
active_requests = Gauge('app_active_requests', 'Active requests')

def setup_otel_prometheus_stack():
    """Setup OpenTelemetry with Prometheus and OTLP exporters"""
    logger.info("Configuring OpenTelemetry + Prometheus stack")
    
    # Resource
    resource = Resource.create({
        "service.name": SERVICE_NAME,
        "service.version": "1.0.0",
        "deployment.environment": os.getenv('ENVIRONMENT', 'production')
    })
    
    # Tracing - OTLP for Grafana/Tempo
    trace_provider = TracerProvider(resource=resource)
    otlp_span_exporter = OTLPSpanExporter(endpoint=OTEL_ENDPOINT, insecure=True)
    trace_provider.add_span_processor(BatchSpanProcessor(otlp_span_exporter))
    trace.set_tracer_provider(trace_provider)
    
    # Metrics - Prometheus
    prometheus_reader = PrometheusMetricReader()
    metric_provider = MeterProvider(resource=resource, metric_readers=[prometheus_reader])
    metrics.set_meter_provider(metric_provider)
    
    # Instrument Flask
    FlaskInstrumentor().instrument_app(app)
    
    logger.info("OpenTelemetry + Prometheus stack configured")

def setup_dynatrace_stack():
    """Setup OpenTelemetry with Dynatrace OTLP endpoint"""
    logger.info("Configuring Dynatrace stack")
    
    if not DYNATRACE_ENDPOINT or not DYNATRACE_TOKEN:
        logger.warning("Dynatrace endpoint or token not configured")
        return
    
    # Resource
    resource = Resource.create({
        "service.name": SERVICE_NAME,
        "service.version": "1.0.0",
        "deployment.environment": os.getenv('ENVIRONMENT', 'production')
    })
    
    # Tracing - Dynatrace OTLP endpoint
    trace_provider = TracerProvider(resource=resource)
    headers = {"Authorization": f"Api-Token {DYNATRACE_TOKEN}"}
    otlp_span_exporter = OTLPSpanExporter(
        endpoint=DYNATRACE_ENDPOINT,
        headers=headers,
        insecure=False
    )
    trace_provider.add_span_processor(BatchSpanProcessor(otlp_span_exporter))
    trace.set_tracer_provider(trace_provider)
    
    # Metrics - Dynatrace OTLP endpoint
    otlp_metric_exporter = OTLPMetricExporter(
        endpoint=DYNATRACE_ENDPOINT,
        headers=headers,
        insecure=False
    )
    metric_reader = PeriodicExportingMetricReader(otlp_metric_exporter, export_interval_millis=60000)
    metric_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(metric_provider)
    
    # Instrument Flask
    FlaskInstrumentor().instrument_app(app)
    
    logger.info("Dynatrace stack configured")

# Initialize observability based on stack choice
if OBSERVABILITY_STACK == 'dynatrace':
    setup_dynatrace_stack()
else:
    setup_otel_prometheus_stack()

# Get tracer and meter for custom instrumentation
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

# Custom OTel metrics
otel_request_counter = meter.create_counter(
    "custom_requests_total",
    description="Total number of requests",
    unit="1"
)

# Routes
@app.before_request
def before_request():
    request.start_time = time.time()
    active_requests.inc()

@app.after_request
def after_request(response):
    request_duration_seconds = time.time() - request.start_time
    
    # Prometheus metrics
    request_counter.labels(
        method=request.method,
        endpoint=request.endpoint or 'unknown',
        status=response.status_code
    ).inc()
    request_duration.labels(
        method=request.method,
        endpoint=request.endpoint or 'unknown'
    ).observe(request_duration_seconds)
    active_requests.dec()
    
    # OpenTelemetry metrics
    otel_request_counter.add(1, {
        "method": request.method,
        "endpoint": request.endpoint or 'unknown',
        "status": str(response.status_code)
    })
    
    return response

@app.route('/')
def home():
    with tracer.start_as_current_span("home_request") as span:
        span.set_attribute("custom.greeting", "welcome")
        logger.info("Home endpoint accessed")
        return jsonify({
            "message": "Multi-Container Python App",
            "observability_stack": OBSERVABILITY_STACK,
            "service": SERVICE_NAME,
            "status": "healthy"
        })

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "observability": OBSERVABILITY_STACK}), 200

@app.route('/api/process', methods=['POST'])
def process_data():
    with tracer.start_as_current_span("process_data") as span:
        data = request.get_json() or {}
        
        # Simulate processing with random delay
        processing_time = random.uniform(0.1, 0.5)
        time.sleep(processing_time)
        
        span.set_attribute("processing.time", processing_time)
        span.set_attribute("data.size", len(str(data)))
        
        # Simulate occasional errors for chaos testing
        if random.random() < 0.05:  # 5% error rate
            logger.error("Simulated processing error")
            span.set_attribute("error", True)
            return jsonify({"error": "Processing failed"}), 500
        
        logger.info(f"Processed data in {processing_time:.2f}s")
        return jsonify({
            "status": "processed",
            "processing_time": processing_time,
            "data_received": data
        })

@app.route('/api/slow')
def slow_endpoint():
    """Endpoint for testing high latency scenarios"""
    with tracer.start_as_current_span("slow_endpoint") as span:
        delay = random.uniform(2, 5)
        span.set_attribute("delay", delay)
        time.sleep(delay)
        return jsonify({"message": "Slow operation completed", "delay": delay})

@app.route('/api/error')
def error_endpoint():
    """Endpoint for testing error scenarios"""
    with tracer.start_as_current_span("error_endpoint") as span:
        span.set_attribute("error", True)
        raise Exception("Intentional error for testing")

# Add Prometheus metrics endpoint (only for otel-prometheus stack)
if OBSERVABILITY_STACK == 'otel-prometheus':
    app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {
        '/metrics': make_wsgi_app()
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    logger.info(f"Starting application on port {port} with {OBSERVABILITY_STACK} stack")
    app.run(host='0.0.0.0', port=port, debug=False)
