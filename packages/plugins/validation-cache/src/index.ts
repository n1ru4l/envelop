import { PluginFn } from '@guildql/types';
import { GraphQLError } from 'graphql';
import lru from 'tiny-lru';

export type ValidationCacheOptions = {
  max?: number;
  ttl?: number;
};

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

export const useValidationCache = (pluginOptions: ValidationCacheOptions = {}): PluginFn => api => {
  const max = typeof pluginOptions.max === 'number' ? pluginOptions.max : DEFAULT_MAX;
  const ttl = typeof pluginOptions.ttl === 'number' ? pluginOptions.ttl : DEFAULT_TTL;
  const resultCache = lru<readonly GraphQLError[]>(max, ttl);

  api.on('schemaChange', () => {
    resultCache.clear();
  });

  api.on('beforeValidate', support => {
    const { document: key } = support.getValidationParams();

    if (resultCache.get(key)) {
      const errors = resultCache.get(key);
      support.setValidationErrors(errors);
    }
  });

  api.on('afterValidate', support => {
    const { document: key } = support.getValidationParams();
    const errors = support.getErrors();
    resultCache.set(key, errors);
  });
};
