/* eslint-disable no-console */
import { Plugin } from '@envelop/types';
import { GraphQLError, DocumentNode, Source, ExecutionArgs } from 'graphql';
import { compileQuery, isCompiledQuery, CompilerOptions } from 'graphql-jit';
import lru from 'tiny-lru';

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

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
    onError?: (r: ReturnType<typeof compileQuery>) => void;
    /**
     * Maximum size of LRU Cache
     * @default 1000
     */
    max?: number;
    /**
     * TTL in milliseconds
     * @default 3600000
     */
    ttl?: number;
  } = {}
): Plugin => {
  const max = typeof pluginOptions.max === 'number' ? pluginOptions.max : DEFAULT_MAX;
  const ttl = typeof pluginOptions.ttl === 'number' ? pluginOptions.ttl : DEFAULT_TTL;

  const documentSourceMap = new WeakMap<DocumentNode, string>();
  const jitCache = lru<ReturnType<typeof compileQuery>>(max, ttl);

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
        setExecuteFn(function jitExecutor() {
          let compiledQuery: ReturnType<typeof compileQuery> | undefined;
          const documentSource = documentSourceMap.get(args.document);

          if (documentSource) compiledQuery = jitCache.get(documentSource);

          if (!compiledQuery) {
            compiledQuery = compileQuery(args.schema, args.document, args.operationName ?? undefined, compilerOptions);

            if (documentSource) jitCache.set(documentSource, compiledQuery);
          }

          if (!isCompiledQuery(compiledQuery)) {
            if (pluginOptions?.onError) {
              try {
                pluginOptions.onError(compiledQuery);
              } catch (e) {
                return {
                  errors: [e as GraphQLError],
                };
              }
            } else {
              console.error(compiledQuery);
            }

            return {
              errors: [new GraphQLError('Error compiling query')],
            };
          } else {
            return compiledQuery.query(args.rootValue, args.contextValue, args.variableValues);
          }
        });
      }
    },
  };
};
