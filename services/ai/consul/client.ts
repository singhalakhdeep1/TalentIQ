import consul from 'consul';

const consulClient = consul({
  host: process.env.CONSUL_HOST || 'localhost',
  port: parseInt(process.env.CONSUL_PORT || '8500'),
});

export async function registerService(service: {
  id: string;
  name: string;
  port: number;
  address?: string;
  check?: any;
}): Promise<void> {
  await consulClient.agent.service.register(service);
}

export async function deregisterService(serviceId: string): Promise<void> {
  await consulClient.agent.service.deregister(serviceId);
}

export async function getService(serviceName: string): Promise<any> {
  const result = await consulClient.agent.service.get(serviceName);
  return result;
}

export async function healthCheck(serviceName: string): Promise<any> {
  const result = await consulClient.health.service(serviceName);
  return result;
}

export async function getKV(key: string): Promise<string> {
  const result = await consulClient.kv.get(key);
  return result.Value ? result.Value.toString('utf-8') : '';
}

export async function setKV(key: string, value: string): Promise<void> {
  await consulClient.kv.set(key, value);
}

export { consulClient };
