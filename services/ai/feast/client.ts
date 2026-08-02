// Feast feature store client

export interface Feature {
  name: string;
  value: any;
  timestamp: number;
}

export async function getOnlineFeatures(
  featureView: string,
  entityKeys: string[]
): Promise<Record<string, Feature[]>> {
  const response = await fetch(
    `${process.env.FEAST_URL || 'http://localhost:6566'}/get-online-features`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature_view: featureView,
        entity_keys,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get online features: ${response.statusText}`);
  }

  return await response.json();
}

export async function getHistoricalFeatures(
  featureView: string,
  entityKeys: string[],
  startTime: Date,
  endTime: Date
): Promise<Record<string, Feature[]>> {
  const response = await fetch(
    `${process.env.FEAST_URL || 'http://localhost:6566'}/get-historical-features`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature_view: featureView,
        entity_keys,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get historical features: ${response.statusText}`);
  }

  return await response.json();
}

export async function ingestFeatures(
  featureView: string,
  data: Record<string, any>[]
): Promise<void> {
  const response = await fetch(
    `${process.env.FEAST_URL || 'http://localhost:6566'}/ingest`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature_view: featureView,
        data,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to ingest features: ${response.statusText}`);
  }
}
