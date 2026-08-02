import weaviate from 'weaviate-ts-client';

const client = weaviate.client({
  scheme: process.env.WEAVIATE_SCHEME || 'http',
  host: process.env.WEAVIATE_HOST || 'localhost',
  port: parseInt(process.env.WEAVIATE_PORT || '8080'),
  apiKey: process.env.WEAVIATE_API_KEY
    ? new weaviate.ApiKey(process.env.WEAVIATE_API_KEY)
    : undefined,
});

export async function createClass(className: string, properties: any[]): Promise<void> {
  const classObj = {
    class: className,
    properties: properties.map((p) => ({
      name: p.name,
      dataType: p.dataType,
    })),
  };

  await client.schema.classCreator().withClass(classObj).do();
}

export async function addObject(
  className: string,
  data: Record<string, any>
): Promise<string> {
  const result = await client.data
    .creator()
    .withClassName(className)
    .withProperties(data)
    .do();

  return result.id;
}

export async function searchObjects(
  className: string,
  query: string,
  limit: number = 10
): Promise<any[]> {
  const result = await client.graphql
    .get()
    .withClassName(className)
    .withNearText({
      concepts: [query],
      certainty: 0.7,
    })
    .withLimit(limit)
    .do();

  return result.data.Get[className];
}

export async function getObject(
  className: string,
  id: string
): Promise<any> {
  const result = await client.data
    .getterById()
    .withId(id)
    .withClassName(className)
    .do();

  return result;
}

export async function deleteObject(className: string, id: string): Promise<void> {
  await client.data.deleter().withId(id).withClassName(className).do();
}

export { client };
