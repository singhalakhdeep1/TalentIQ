import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY || '');

export async function generateText(model: string, inputs: string): Promise<string> {
  const result = await hf.textGeneration({
    model,
    inputs,
    parameters: {
      max_new_tokens: 250,
      temperature: 0.7,
    },
  });

  return result.generated_text;
}

export async function classifyText(text: string): Promise<any[]> {
  const result = await hf.textClassification({
    model: 'distilbert-base-uncased-finetuned-sst-2-english',
    inputs: text,
  });

  return result;
}

export async function extractEntities(text: string): Promise<any[]> {
  const result = await hf.tokenClassification({
    model: 'dbmdz/bert-large-cased-finetuned-conll03-english',
    inputs: text,
  });

  return result;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: text,
  });

  return result;
}

export { hf };
