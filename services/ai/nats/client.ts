import { connect, StringCodec } from 'nats';

const sc = StringCodec();

let nc: any = null;

export async function connectNATS(): Promise<void> {
  if (!nc) {
    nc = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
    });
  }
}

export async function publish(subject: string, data: any): Promise<void> {
  if (!nc) await connectNATS();
  nc.publish(subject, sc.encode(JSON.stringify(data)));
}

export async function subscribe(
  subject: string,
  callback: (data: any) => void
): Promise<void> {
  if (!nc) await connectNATS();
  const sub = nc.subscribe(subject);
  for await (const msg of sub) {
    callback(JSON.parse(sc.decode(msg.data)));
  }
}

export async function request(subject: string, data: any): Promise<any> {
  if (!nc) await connectNATS();
  const response = await nc.request(subject, sc.encode(JSON.stringify(data)));
  return JSON.parse(sc.decode(response.data));
}

export async function createQueueGroup(subject: string, groupName: string): Promise<void> {
  if (!nc) await connectNATS();
  const sub = nc.subscribe(subject, { queue: groupName });
  for await (const msg of sub) {
    // Handle messages
  }
}

export async function closeNATS(): Promise<void> {
  if (nc) {
    await nc.close();
    nc = null;
  }
}
