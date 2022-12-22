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
   * @deprecated Provide a `reset` implementation instead.
   */
  clear?(): void;
  /**
   * Reset the cache by clearing all entries.
   */
  reset?(): void;
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
      if (resultCache.reset) {
        resultCache.reset?.();
      } else if ('clear' in resultCache) {
        resultCache.clear?.();
      }
    },
    onParse({ params, extendContext }) {
      extendContext({ [rawDocumentSymbol]: params.source.toString() });
    },
    onValidate({ params, context, setValidationFn, validateFn }) {
      // We use setValidateFn over accessing params.rules directly, as other plugins in the chain might add more rules.
      // This would cause an issue if we are constructing the cache key here already.
      setValidationFn((...args) => {
        let ruleKey = '';
        if (Array.isArray(args[2])) {
          // Note: We could also order them... but that might be too much
          for (const rule of args[2]) {
            ruleKey = ruleKey + rule.name;
          }
        }

        const key: string = ruleKey + (context[rawDocumentSymbol] ?? print(params.documentAST));
        const cachedResult = resultCache.get(key);

        if (cachedResult !== undefined) {
          return cachedResult;
        }

        const result = validateFn(...args);
        resultCache.set(key, result);

        return result;
      });
    },
  };
};
