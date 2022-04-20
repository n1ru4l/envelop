/* eslint-disable no-console */
import { Plugin } from '@envelop/core';
import { DocumentNode, Source, ExecutionArgs, ExecutionResult } from 'graphql';
import { compileQuery, isCompiledQuery, CompilerOptions, CompiledQuery } from 'graphql-jit';
import lru from 'tiny-lru';

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

type JITCacheEntry = {
  query: CompiledQuery['query'];
  subscribe?: CompiledQuery['subscribe'];
};

export interface JITCache {
  get(key: string): JITCacheEntry | undefined;
  set(key: string, value: JITCacheEntry): void;
}

export const useGraphQlJit = (
  compilerOptions: Partial<CompilerOptions> = {},
  pluginOptions: {
    /**
     * A helper function that helps to conditionally enable JIT based on incoming request
     */
    enableIf?: (executionArgs: ExecutionArgs) => boolean | Promise<boolean>;
    /**
     * Callback triggered in case of GraphQL Jit compilation error.
     */
    onError?: (r: ExecutionResult) => void;
    /**
     * Custom cache instance
     */
    cache?: JITCache;
  } = {}
): Plugin => {
  const documentSourceMap = new WeakMap<DocumentNode, string>();
  const jitCache =
    typeof pluginOptions.cache !== 'undefined' ? pluginOptions.cache : lru<JITCacheEntry>(DEFAULT_MAX, DEFAULT_TTL);

  function compile(args: ExecutionArgs) {
    const compilationResult = compileQuery(args.schema, args.document, args.operationName ?? undefined, compilerOptions);

    if (isCompiledQuery(compilationResult)) {
      return compilationResult;
    } else {
      if (pluginOptions?.onError) {
        pluginOptions.onError(compilationResult);
      } else {
        console.error(compilationResult);
      }
      return {
        query: () => compilationResult,
      };
    }
  }

  function getCacheEntry(args: ExecutionArgs): JITCacheEntry {
    const documentSource = documentSourceMap.get(args.document);

    if (!documentSource) {
      return compile(args);
    }

    let compiledQuery = jitCache.get(documentSource);

    if (!compiledQuery) {
      compiledQuery = compile(args);
      jitCache.set(documentSource, compiledQuery);
    }

    return compiledQuery;
  }

  function execute(args: ExecutionArgs) {
    const cacheEntry = getCacheEntry(args);

    return cacheEntry.query(args.rootValue, args.contextValue, args.variableValues);
  }

  function subscribe(args: ExecutionArgs) {
    const cacheEntry = getCacheEntry(args);

    return cacheEntry.subscribe
      ? (cacheEntry.subscribe(args.rootValue, args.contextValue, args.variableValues) as any)
      : cacheEntry.query(args.rootValue, args.contextValue, args.variableValues);
  }

  return {
    onParse({ params: { source } }) {
      const key = source instanceof Source ? source.body : source;

      return ({ result }) => {
        if (!result || result instanceof Error) return;

        documentSourceMap.set(result, key);
      };
    },
    async onExecute({ args, setExecuteFn }) {
      if (!pluginOptions.enableIf || (pluginOptions.enableIf && (await pluginOptions.enableIf(args)))) {
        setExecuteFn(execute);
      }
    },
    async onSubscribe({ args, setSubscribeFn }) {
      if (!pluginOptions.enableIf || (pluginOptions.enableIf && (await pluginOptions.enableIf(args)))) {
        setSubscribeFn(subscribe);
      }
    },
  };
};
