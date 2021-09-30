import { Plugin } from '@envelop/types';
import { GraphQLError, print } from 'graphql';
import lru from 'tiny-lru';

export type ValidationCacheOptions = {
  max?: number;
  ttl?: number;
};

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

export const useValidationCache = (pluginOptions: ValidationCacheOptions = {}): Plugin => {
  const max = typeof pluginOptions.max === 'number' ? pluginOptions.max : DEFAULT_MAX;
  const ttl = typeof pluginOptions.ttl === 'number' ? pluginOptions.ttl : DEFAULT_TTL;
  const resultCache = lru<readonly GraphQLError[]>(max, ttl);

  return {
    onSchemaChange() {
      resultCache.clear();
    },
    onValidate({ params, setResult }) {
      const key = print(params.documentAST);
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
