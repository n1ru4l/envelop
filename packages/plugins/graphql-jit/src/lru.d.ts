declare module 'lru-cache' {
  // eslint-disable-next-line import/no-default-export
  export default class LRU<K extends string, V> {
    constructor(options?: {
      max?: number;
      maxAge?: number;
      stale?: boolean;
      noDisposeOnSet?: boolean;
      dispose?(id: string): void;
    });

    set(key: K, value: V, ttl?: number): void;
    get(key: K): V | undefined;
    del(key: K): void;
  }
}
