import { Wandb } from '@wandb/sdk';

const wandb = new Wandb({
  apiKey: process.env.WANDB_API_KEY || '',
  project: process.env.WANDB_PROJECT || 'talentiq',
  entity: process.env.WANDB_ENTITY || '',
});

export async function initRun(config: any = {}): Promise<any> {
  return await wandb.init(config);
}

export async function logMetrics(metrics: Record<string, number>, step?: number): Promise<void> {
  await wandb.log(metrics, step);
}

export async function logArtifact(
  name: string,
  type: string,
  path: string
): Promise<void> {
  const artifact = await wandb.Artifact(name, type);
  await artifact.add_file(path);
  await wandb.log_artifact(artifact);
}

export async function saveModel(model: any, name: string): Promise<void> {
  await wandb.save_model(model, name);
}

export async function logParams(params: Record<string, any>): Promise<void> {
  await wandb.config.update(params);
}

export async function finishRun(status: string = 'success'): Promise<void> {
  await wandb.finish({ status });
}

export { wandb };
