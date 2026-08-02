// Kubeflow Pipelines client

export interface PipelineRun {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export async function createPipelineRun(
  pipelineId: string,
  parameters: Record<string, any>
): Promise<PipelineRun> {
  const response = await fetch(
    `${process.env.KUBEFLOW_URL || 'http://localhost:8080'}/apis/v1beta1/runs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KUBEFLOW_TOKEN || ''}`,
      },
      body: JSON.stringify({
        pipeline_id: pipelineId,
        parameters,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create pipeline run: ${response.statusText}`);
  }

  return await response.json();
}

export async function getPipelineRun(runId: string): Promise<PipelineRun> {
  const response = await fetch(
    `${process.env.KUBEFLOW_URL || 'http://localhost:8080'}/apis/v1beta1/runs/${runId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.KUBEFLOW_TOKEN || ''}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get pipeline run: ${response.statusText}`);
  }

  return await response.json();
}

export async function listPipelineRuns(pipelineId: string): Promise<PipelineRun[]> {
  const response = await fetch(
    `${process.env.KUBEFLOW_URL || 'http://localhost:8080'}/apis/v1beta1/runs?pipeline_id=${pipelineId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.KUBEFLOW_TOKEN || ''}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list pipeline runs: ${response.statusText}`);
  }

  return await response.json().runs;
}

export async function terminatePipelineRun(runId: string): Promise<void> {
  await fetch(
    `${process.env.KUBEFLOW_URL || 'http://localhost:8080'}/apis/v1beta1/runs/${runId}/terminate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KUBEFLOW_TOKEN || ''}`,
      },
    }
  );
}
