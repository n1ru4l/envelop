import { BasicCache, getInMemoryLRUCache, isSourceObject, Plugin } from '@envelop/core';
import { GraphQLError, print } from 'graphql';

export type ValidationCache = BasicCache<readonly GraphQLError[]> & { clear(): void };

export type ValidationCacheOptions = {
  cache?: ValidationCache;
};

const rawDocumentMap = new WeakMap<any, string>();

export const useValidationCache = (pluginOptions: ValidationCacheOptions = {}): Plugin => {
  const resultCache: ValidationCache =
    typeof pluginOptions.cache !== 'undefined' ? pluginOptions.cache : getInMemoryLRUCache<readonly GraphQLError[]>();

  return {
    onSchemaChange() {
      resultCache.clear();
    },
    onParse({ params, context }) {
      rawDocumentMap.set(context, isSourceObject(params.source) ? params.source.body : params.source?.toString());
    },
    onValidate({ params, context, setResult }) {
      const key: string = rawDocumentMap.get(context) ?? print(params.documentAST);
      const cachedResult = resultCache.get(key);

      if (cachedResult !== undefined) {
        setResult(cachedResult);
        return;
      }

      return ({ result }) => {
        resultCache.set(key, result);
      };
    },
  };
};
