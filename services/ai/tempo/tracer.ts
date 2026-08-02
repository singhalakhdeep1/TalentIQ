import { TraceAPI } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'talentiq-ai',
  })
);

const provider = new NodeTracerProvider({ resource });

const exporter = new OTLPTraceExporter({
  url: process.env.TEMPO_ENDPOINT || 'http://localhost:4317',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

export const tracer = provider.getTracer('talentiq-ai');

export function startSpan(name: string) {
  return tracer.startSpan(name);
}
