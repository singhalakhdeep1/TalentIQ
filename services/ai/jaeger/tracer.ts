import { initTracer } from 'jaeger-client';

const tracer = initTracer({
  serviceName: 'talentiq-ai',
  sampler: {
    type: 'const',
    param: 1,
  },
  reporter: {
    logSpans: true,
    agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
    agentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6831'),
  },
});

export function startSpan(operationName: string) {
  return tracer.startSpan(operationName);
}

export function traceAsync<T>(
  operationName: string,
  fn: (span: any) => Promise<T>
): Promise<T> {
  const span = startSpan(operationName);
  return fn(span)
    .finally(() => {
      span.finish();
    });
}

export { tracer };
