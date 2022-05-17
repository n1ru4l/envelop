/* eslint-disable no-console */
import { EnvelopError, Plugin, PromiseOrValue } from '@envelop/core';
import { DocumentNode, Source, ExecutionArgs, ExecutionResult, print, GraphQLSchema, getOperationAST } from 'graphql';
import { compileQuery, CompilerOptions, CompiledQuery } from 'graphql-jit';
import lru from 'tiny-lru';

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

type CompilationResult = ReturnType<typeof compileQuery>;

export interface JITCache {
  get(key: string): CompilationResult | undefined;
  set(key: string, value: CompilationResult): void;
}

function isSource(source: any): source is Source {
  return source.body != null;
}

function isCompiledQuery(compilationResult: any): compilationResult is CompiledQuery<unknown, unknown> {
  return compilationResult.query != null;
}

const MUST_DEFINE_OPERATION_NAME_ERR = 'Must provide operation name if query contains multiple operations.';

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
    typeof pluginOptions.cache !== 'undefined' ? pluginOptions.cache : lru<CompilationResult>(DEFAULT_MAX, DEFAULT_TTL);

  function getCacheKey(document: DocumentNode, operationName?: string) {
    if (!operationName) {
      const operationAST = getOperationAST(document);
      if (!operationAST) {
        throw new EnvelopError(MUST_DEFINE_OPERATION_NAME_ERR);
      }
      operationName = operationAST.name?.value;
    }
    const documentSource = getDocumentSource(document);
    return `${documentSource}::${operationName}`;
  }

  function getDocumentSource(document: DocumentNode): string {
    let documentSource = documentSourceMap.get(document);
    if (!documentSource) {
      documentSource = print(document);
      documentSourceMap.set(document, documentSource);
    }
    return documentSource;
  }

  function getCompilationResult(schema: GraphQLSchema, document: DocumentNode, operationName?: string) {
    const cacheKey = getCacheKey(document, operationName);

    let compiledQuery = jitCache.get(cacheKey);

    if (!compiledQuery) {
      compiledQuery = compileQuery(schema, document, operationName, compilerOptions);
      jitCache.set(cacheKey, compiledQuery);
    }

    return compiledQuery;
  }

  return {
    onParse({ params: { source } }) {
      const key = isSource(source) ? source.body : source;

      return ({ result }) => {
        if (!result || result instanceof Error) return;

        documentSourceMap.set(result, key);
      };
    },
    onValidate({ params, setResult }) {
      try {
        const compilationResult = getCompilationResult(params.schema, params.documentAST);
        if (!isCompiledQuery(compilationResult) && compilationResult?.errors != null) {
          setResult(compilationResult.errors);
        }
      } catch (e: any) {
        // Validate doesn't work in case of multiple operations
        if (e.message !== MUST_DEFINE_OPERATION_NAME_ERR) {
          throw e;
        }
      }
    },
    async onExecute({ args, setExecuteFn, setResultAndStopExecution }) {
      if (!pluginOptions.enableIf || (pluginOptions.enableIf && (await pluginOptions.enableIf(args)))) {
        const compilationResult = getCompilationResult(args.schema, args.document, args.operationName ?? undefined);
        if (isCompiledQuery(compilationResult)) {
          setExecuteFn(function jitExecute(args): PromiseOrValue<ExecutionResult<any, any>> {
            return compilationResult.query(args.rootValue, args.contextValue, args.variableValues);
          });
        } else if (compilationResult != null) {
          setResultAndStopExecution(compilationResult as ExecutionResult);
        }
      }
    },
    async onSubscribe({ args, setSubscribeFn, setResultAndStopExecution }) {
      if (!pluginOptions.enableIf || (pluginOptions.enableIf && (await pluginOptions.enableIf(args)))) {
        const compilationResult = getCompilationResult(args.schema, args.document, args.operationName ?? undefined);
        if (isCompiledQuery(compilationResult)) {
          setSubscribeFn(function jitSubscribe(args: ExecutionArgs) {
            return compilationResult.subscribe
              ? compilationResult.subscribe(args.rootValue, args.contextValue, args.variableValues)
              : compilationResult.query(args.rootValue, args.contextValue, args.variableValues);
          } as any);
        } else if (compilationResult != null) {
          setResultAndStopExecution(compilationResult as ExecutionResult);
        }
      }
    },
  };
};
