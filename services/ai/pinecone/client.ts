import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

export async function upsertVectors(
  indexName: string,
  vectors: Array<{ id: string; values: number[]; metadata?: Record<string, any> }>
): Promise<void> {
  const index = pinecone.index(indexName);
  await index.upsert(vectors);
}

export async function queryVectors(
  indexName: string,
  vector: number[],
  topK: number = 10,
  filter?: Record<string, any>
): Promise<any> {
  const index = pinecone.index(indexName);
  const results = await index.query({
    vector,
    topK,
    includeMetadata: true,
    filter,
  });

  return results.matches;
}

export async function deleteVectors(
  indexName: string,
  ids: string[]
): Promise<void> {
  const index = pinecone.index(indexName);
  await index.deleteMany(ids);
}

export async function createIndex(
  name: string,
  dimension: number
): Promise<void> {
  await pinecone.createIndex({
    name,
    dimension,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1',
      },
    },
  });
}

export { pinecone };
