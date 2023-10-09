/* eslint-disable no-console */
import { DocumentNode, ExecutionArgs, ExecutionResult } from 'graphql';
import { CompiledQuery, compileQuery, CompilerOptions, isCompiledQuery } from 'graphql-jit';
import {
  getDocumentString,
  makeExecute,
  makeSubscribe,
  Plugin,
  PromiseOrValue,
  TypedExecutionArgs,
} from '@envelop/core';

type JSONStringifier = (result: any) => string;

type JITCacheEntry = {
  query: CompiledQuery['query'];
  subscribe?: CompiledQuery['subscribe'];
  stringify: JSONStringifier;
};

export type ExecutionResultWithSerializer = ExecutionResult & {
  stringify?: JSONStringifier;
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
    onError?: (r: ExecutionResultWithSerializer) => void;
    /**
     * Custom cache instance
     */
    cache?: JITCache;
  } = {},
): Plugin => {
  const jitCacheByDocumentString = pluginOptions.cache;

  const jitCacheByDocument = new WeakMap<DocumentNode, JITCacheEntry>();

  function getCacheEntry<T>(args: TypedExecutionArgs<T>): JITCacheEntry {
    let cacheEntry: JITCacheEntry | undefined;

    cacheEntry = jitCacheByDocument.get(args.document);

    if (!cacheEntry && jitCacheByDocumentString) {
      const documentSource = getDocumentString(args.document);
      if (documentSource) {
        cacheEntry = jitCacheByDocumentString.get(documentSource);
      }
    }

    if (!cacheEntry) {
      const compilationResult = compileQuery(
        args.schema,
        args.document,
        args.operationName ?? undefined,
        compilerOptions,
      );

      if (!isCompiledQuery(compilationResult)) {
        if (pluginOptions?.onError) {
          pluginOptions.onError(compilationResult);
        } else {
          console.error(compilationResult);
        }
        cacheEntry = {
          query: () => compilationResult,
          stringify: r => JSON.stringify(r),
        };
      } else {
        cacheEntry = compilationResult;
      }

      jitCacheByDocument.set(args.document, cacheEntry);
      if (jitCacheByDocumentString) {
        const documentSource = getDocumentString(args.document);
        if (documentSource) {
          jitCacheByDocumentString.set(documentSource, cacheEntry);
        }
      }
    }
    return cacheEntry;
  }

  function jitExecutor(args: TypedExecutionArgs<unknown>) {
    const cacheEntry = getCacheEntry(args);

    const result$ = cacheEntry.subscribe
      ? (cacheEntry.subscribe(
          args.rootValue,
          args.contextValue,
          args.variableValues,
        ) as PromiseOrValue<ExecutionResultWithSerializer>)
      : (cacheEntry.query(
          args.rootValue,
          args.contextValue,
          args.variableValues,
        ) as PromiseOrValue<ExecutionResultWithSerializer>);
    if (isPromise(result$)) {
      return result$.then(r => {
        r.stringify = cacheEntry.stringify;
        return r;
      });
    }
    result$.stringify = cacheEntry.stringify;
    return result$;
  }

  const executeFn = makeExecute(jitExecutor);
  const subscribeFn = makeSubscribe(jitExecutor);

  return {
    onExecute({ args, setExecuteFn }) {
      if (pluginOptions.enableIf) {
        const enableIfRes$ = pluginOptions.enableIf(args);
        if (isPromise(enableIfRes$)) {
          return enableIfRes$.then(res => {
            if (res) {
              setExecuteFn(executeFn);
            }
          });
        }
        if (enableIfRes$) {
          setExecuteFn(executeFn);
        }
        return;
      }
      setExecuteFn(executeFn);
    },
    onSubscribe({ args, setSubscribeFn }) {
      if (pluginOptions.enableIf) {
        const enableIfRes$ = pluginOptions.enableIf(args);
        if (isPromise(enableIfRes$)) {
          return enableIfRes$.then(res => {
            if (res) {
              setSubscribeFn(subscribeFn);
            }
          });
        }
        if (enableIfRes$) {
          setSubscribeFn(subscribeFn);
        }
        return;
      }
      setSubscribeFn(subscribeFn);
    },
  };
};

function isPromise<T>(p: T | Promise<T>): p is Promise<T> {
  return (p as any)?.then != null;
}
