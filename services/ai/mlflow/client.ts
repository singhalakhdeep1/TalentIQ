// MLflow tracking client

export interface RunInfo {
  run_id: string;
  experiment_id: string;
  status: string;
  metrics: Record<string, number>;
  params: Record<string, string>;
}

const trackingUri = process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000';

export async function createExperiment(name: string): Promise<string> {
  const response = await fetch(`${trackingUri}/api/2.0/mlflow/experiments/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  const data = await response.json();
  return data.experiment_id;
}

export async function createRun(experimentId: string): Promise<string> {
  const response = await fetch(`${trackingUri}/api/2.0/mlflow/runs/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ experiment_id: experimentId }),
  });

  const data = await response.json();
  return data.run.info.run_id;
}

export async function logMetric(runId: string, key: string, value: number): Promise<void> {
  await fetch(`${trackingUri}/api/2.0/mlflow/runs/log-metric`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      run_id: runId,
      key,
      value,
      timestamp: Date.now(),
      step: 0,
    }),
  });
}

export async function logParam(runId: string, key: string, value: string): Promise<void> {
  await fetch(`${trackingUri}/api/2.0/mlflow/runs/log-parameter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: runId, key, value }),
  });
}

export async function endRun(runId: string): Promise<void> {
  await fetch(`${trackingUri}/api/2.0/mlflow/runs/terminate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: runId, status: 'FINISHED' }),
  });
}

export async function getRun(runId: string): Promise<RunInfo> {
  const response = await fetch(`${trackingUri}/api/2.0/mlflow/runs/get?run_id=${runId}`);
  const data = await response.json();
  const run = data.run;

  return {
    run_id: run.info.run_id,
    experiment_id: run.info.experiment_id,
    status: run.info.status,
    metrics: run.data?.metrics || {},
    params: run.data?.params || {},
  };
}
