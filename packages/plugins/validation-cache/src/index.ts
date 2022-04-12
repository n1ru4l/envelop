import { getInMemoryLRUCache, Plugin } from '@envelop/core';
import { GraphQLError, print } from 'graphql';

export interface ValidationCache {
  get(key: string): readonly GraphQLError[] | undefined;
  set(key: string, value: readonly GraphQLError[]): void;
  clear(): void;
}

export type ValidationCacheOptions = {
  cache?: ValidationCache;
};

const rawDocumentSymbol = Symbol('rawDocument');

export const useValidationCache = (pluginOptions: ValidationCacheOptions = {}): Plugin => {
  const resultCache =
    typeof pluginOptions.cache !== 'undefined' ? pluginOptions.cache : getInMemoryLRUCache<readonly GraphQLError[]>();

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
