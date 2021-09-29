/**
 * Cache interface used by useParserCache and useValidationCache.
 */
export interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
}
