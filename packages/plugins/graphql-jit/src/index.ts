/* eslint-disable no-console */
import { Plugin } from '@envelop/types';
import { GraphQLError } from 'graphql';
import { compileQuery, isCompiledQuery, CompilerOptions } from 'graphql-jit';

export const useGraphQlJit = (
  compilerOptions: Partial<CompilerOptions> = {},
  pluginOptions: Partial<{
    onError: (r: ReturnType<typeof compileQuery>) => void;
  }> = {}
): Plugin => {
  return {
    onExecute({ args, setExecuteFn }) {
      setExecuteFn(function jitExecutor() {
        const compiledQuery = compileQuery(args.schema, args.document, args.operationName ?? undefined, compilerOptions);

        if (!isCompiledQuery(compiledQuery)) {
          if (pluginOptions?.onError) {
            try {
              pluginOptions.onError(compiledQuery);
            } catch (e) {
              return {
                errors: [e],
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
    },
  };
};
