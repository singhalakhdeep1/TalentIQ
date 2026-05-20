// OpenTelemetry instrumentation — imported BEFORE everything else in main.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'talentiq-api',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
    traceExporter: new OTLPTraceExporter({
        url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}/v1/traces`,
    }),
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': { enabled: true },
            '@opentelemetry/instrumentation-express': { enabled: true },
            '@opentelemetry/instrumentation-pg': { enabled: true },
            '@opentelemetry/instrumentation-redis': { enabled: true },
        }),
    ],
});

sdk.start();

process.on('SIGTERM', () => {
    sdk.shutdown().then(() => process.exit(0));
});
