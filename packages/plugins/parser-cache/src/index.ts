import { PluginFn } from '@guildql/types';
import { DocumentNode, Source } from 'graphql';
import { Lru } from 'tiny-lru';

export type ParserCacheOptions = {
  max?: number;
  ttl?: number;
};

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

export const useParserCache = (pluginOptions: ParserCacheOptions): PluginFn => api => {
  const max = typeof pluginOptions.max === 'number' ? pluginOptions.max : DEFAULT_MAX;
  const ttl = typeof pluginOptions.ttl === 'number' ? pluginOptions.ttl : DEFAULT_TTL;

  const documentCache = new Lru<DocumentNode>(max, ttl);
  const errorCache = new Lru<Error>(max, ttl);

  api.on('afterOperationParse', support => {
    const { source } = support.getParams();
    const key = source instanceof Source ? source.body : source;
    const parseResult = support.getParseResult();

    if (parseResult instanceof Error) {
      errorCache.set(key, parseResult);
    } else {
      documentCache.set(key, parseResult);
    }
  });

  api.on('beforeOperationParse', support => {
    const { source } = support.getParams();
    const key = source instanceof Source ? source.body : source;

    if (errorCache.get(key)) {
      const error = errorCache.get(key);

      throw error;
    }

    if (documentCache.get(key)) {
      const document = documentCache.get(key);
      support.setParsedDocument(document);
    }
  });
};
