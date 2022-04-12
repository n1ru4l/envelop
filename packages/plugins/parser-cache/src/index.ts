import { Plugin, getInMemoryLRUCache } from '@envelop/core';
import { DocumentNode, Source } from 'graphql';

interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
}

export type DocumentCache = Cache<DocumentNode>;
export type ErrorCache = Cache<Error>;

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
