import { Client } from 'node-vault';

const vault = new Client({
  endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN || '',
});

export async function getSecret(path: string): Promise<any> {
  try {
    const result = await vault.read(path);
    return result.data;
  } catch (error) {
    throw new Error(`Failed to read secret from ${path}: ${error}`);
  }
}

export async function setSecret(path: string, data: Record<string, any>): Promise<void> {
  try {
    await vault.write(path, data);
  } catch (error) {
    throw new Error(`Failed to write secret to ${path}: ${error}`);
  }
}

export async function deleteSecret(path: string): Promise<void> {
  try {
    await vault.delete(path);
  } catch (error) {
    throw new Error(`Failed to delete secret at ${path}: ${error}`);
  }
}

export async function listSecrets(path: string): Promise<string[]> {
  try {
    const result = await vault.list(path);
    return result.data.keys;
  } catch (error) {
    throw new Error(`Failed to list secrets at ${path}: ${error}`);
  }
}

export { vault };
