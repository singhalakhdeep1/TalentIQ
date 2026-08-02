// Evidently AI monitoring client

export interface MetricResult {
  metric_name: string;
  value: number;
  timestamp: number;
}

export async function calculateDataDrift(
  reference: any[],
  current: any[]
): Promise<MetricResult[]> {
  const response = await fetch(
    `${process.env.EVIDENTLY_URL || 'http://localhost:8000'}/api/data-drift`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference,
        current,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to calculate data drift: ${response.statusText}`);
  }

  return await response.json();
}

export async function calculateModelPerformance(
  predictions: any[],
  targets: any[]
): Promise<MetricResult[]> {
  const response = await fetch(
    `${process.env.EVIDENTLY_URL || 'http://localhost:8000'}/api/performance`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        predictions,
        targets,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to calculate performance: ${response.statusText}`);
  }

  return await response.json();
}

export async function generateReport(
  metrics: MetricResult[]
): Promise<string> {
  const response = await fetch(
    `${process.env.EVIDENTLY_URL || 'http://localhost:8000'}/api/report`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to generate report: ${response.statusText}`);
  }

  const result = await response.json();
  return result.report_url;
}
