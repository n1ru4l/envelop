import { Plugin, getInMemoryLRUCache, BasicCache, isSourceObject } from '@envelop/core';
import { DocumentNode } from 'graphql';

export type DocumentCache = BasicCache<DocumentNode>;
export type ErrorCache = BasicCache<Error>;

export type ParserCacheOptions = {
  documentCache?: DocumentCache;
  errorCache?: ErrorCache;
};

export const useParserCache = (pluginOptions: ParserCacheOptions = {}): Plugin => {
  const documentCache: DocumentCache =
    typeof pluginOptions.documentCache !== 'undefined' ? pluginOptions.documentCache : getInMemoryLRUCache();
  const errorCache: ErrorCache =
    typeof pluginOptions.errorCache !== 'undefined' ? pluginOptions.errorCache : getInMemoryLRUCache();

  return {
    onParse({ params, setParsedDocument }) {
      const { source } = params;
      const key = isSourceObject(source) ? source.body : params.source?.toString();

      const cachedError = errorCache.get(key);

      if (cachedError !== undefined) {
        throw cachedError;
      }

      const cachedDocument = documentCache.get(key);

      if (cachedDocument !== undefined) {
        setParsedDocument(cachedDocument);
        return;
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
