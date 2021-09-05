import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { DocumentNode } from 'graphql';
import { PersistedOperationsStore } from '../types';

export type JsonFileStoreDataMap = Map<string, DocumentNode | string>;

export class JsonFileStore implements PersistedOperationsStore {
  public storeId: string;
  private storeData: JsonFileStoreDataMap | null;

  constructor(options?: { storeId?: string }) {
    this.storeId = options?.storeId ?? `jsonstore_${Date.now()}`;
    this.storeData = null;
  }

  get(operationId: string): string | DocumentNode | null {
    if (!this.storeData) {
      return null;
    }

    return this.storeData.get(operationId) || null;
  }

  public loadFromFileSync(path: string): void {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    this.storeData = new Map(Object.entries(data));
  }

  public async loadFromFile(path: string): Promise<void> {
    const data = JSON.parse(await readFile(path, 'utf-8'));
    this.storeData = new Map(Object.entries(data));
  }
}
