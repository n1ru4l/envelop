import { Plugin } from '@envelop/core';
import { GraphQLError, print } from 'graphql';
import LRU from 'lru-cache';

export interface ValidationCache {
  /**
   * Get a result from the validation cache.
   */
  get(key: string): readonly GraphQLError[] | undefined;
  /**
   * Set a result to the validation cache.
   */
  set(key: string, value: readonly GraphQLError[]): void;
  /**
   * Reset the cache by clearing all entries.
   */
  clear(): void;
}

export type ValidationCacheOptions = {
  cache?: ValidationCache;
};

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

const rawDocumentSymbol = Symbol('rawDocument');

export const useValidationCache = (pluginOptions: ValidationCacheOptions = {}): Plugin => {
  const resultCache =
    typeof pluginOptions.cache !== 'undefined'
      ? pluginOptions.cache
      : new LRU<string, readonly GraphQLError[]>({
          max: DEFAULT_MAX,
          maxAge: DEFAULT_TTL,
        });

  return {
    onSchemaChange() {
      resultCache.clear();
    },
    onParse({ params, extendContext }) {
      extendContext({ [rawDocumentSymbol]: params.source.toString() });
    },
    onValidate({ params, context, setResult }) {
      const key: string = context[rawDocumentSymbol] ?? print(params.documentAST);
      const cachedResult = resultCache.get(key);

      if (cachedResult !== undefined) {
        setResult(cachedResult);
      }

      return ({ result }) => {
        resultCache.set(key, result);
      };
    },
  };
};
