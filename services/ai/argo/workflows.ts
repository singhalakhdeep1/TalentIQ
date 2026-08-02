import axios from 'axios';

const argoUrl = process.env.ARGO_URL || 'http://localhost:2746';
const argoToken = process.env.ARGO_TOKEN || '';

const api = axios.create({
  baseURL: argoUrl,
  headers: {
    Authorization: `Bearer ${argoToken}`,
  },
});

export async function submitWorkflow(
  namespace: string,
  workflowName: string,
  parameters: Record<string, any>
): Promise<any> {
  const response = await api.post(
    `/api/v1/workflows/${namespace}/submit`,
    {
      name: workflowName,
      entrypoint: 'main',
      parameters: Object.entries(parameters).map(([name, value]) => ({
        name,
        value: String(value),
      })),
    }
  );
  return response.data;
}

export async function getWorkflow(namespace: string, workflowName: string): Promise<any> {
  const response = await api.get(`/api/v1/workflows/${namespace}/${workflowName}`);
  return response.data;
}

export async function listWorkflows(namespace: string): Promise<any[]> {
  const response = await api.get(`/api/v1/workflows/${namespace}`);
  return response.data.items;
}

export async function retryWorkflow(
  namespace: string,
  workflowName: string
): Promise<any> {
  const response = await api.put(
    `/api/v1/workflows/${namespace}/${workflowName}/retry`
  );
  return response.data;
}

export async function deleteWorkflow(
  namespace: string,
  workflowName: string
): Promise<void> {
  await api.delete(`/api/v1/workflows/${namespace}/${workflowName}`);
}
