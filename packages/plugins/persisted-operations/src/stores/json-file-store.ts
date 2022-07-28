import { readFileSync, promises } from 'fs';
import { DocumentNode } from '@graphql-tools/graphql';
import { PersistedOperationsStore } from '../types.js';

export type JsonFileStoreDataMap = Map<string, DocumentNode | string>;

export class JsonFileStore implements PersistedOperationsStore {
  private storeData: JsonFileStoreDataMap | null = null;

  get(operationId: string): string | DocumentNode | undefined {
    if (!this.storeData) {
      return undefined;
    }

    return this.storeData.get(operationId) || undefined;
  }

  public loadFromFileSync(path: string): void {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    this.storeData = new Map(Object.entries(data));
  }

  public async loadFromFile(path: string): Promise<void> {
    const data = JSON.parse(await promises.readFile(path, 'utf-8'));
    this.storeData = new Map(Object.entries(data));
  }
}
