import { Cache, Plugin } from '@envelop/types';
import { DocumentNode, Source } from 'graphql';
import lru from 'tiny-lru';

export type ParserCacheOptions = {
  max?: number;
  ttl?: number;
  documentCache?: Cache<DocumentNode>;
  errorCache?: Cache<Error>;
};

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

export const useParserCache = (pluginOptions: ParserCacheOptions = {}): Plugin => {
  const max = typeof pluginOptions.max === 'number' ? pluginOptions.max : DEFAULT_MAX;
  const ttl = typeof pluginOptions.ttl === 'number' ? pluginOptions.ttl : DEFAULT_TTL;

  const documentCache =
    typeof pluginOptions.documentCache !== 'undefined' ? pluginOptions.documentCache : lru<DocumentNode>(max, ttl);
  const errorCache = typeof pluginOptions.errorCache !== 'undefined' ? pluginOptions.errorCache : lru<Error>(max, ttl);

  return {
    onParse({ params, setParsedDocument }) {
      const { source } = params;
      const key = source instanceof Source ? source.body : source;

      const cachedError = errorCache.get(key);

      if (cachedError !== undefined) {
        throw cachedError;
      }

      const cachedDocument = documentCache.get(key);

      if (cachedDocument !== undefined) {
        setParsedDocument(cachedDocument);
      }

      return ({ result }) => {
        if (result instanceof Error) {
          errorCache.set(key, result);
        } else if (result !== null) {
          documentCache.set(key, result);
        }
      };
    },
  };
};
