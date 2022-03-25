import { Plugin, DefaultContext, TypedExecutionArgs } from '@envelop/types';
import { GraphQLError } from 'graphql';
import { handleStreamOrSingleExecutionResult } from '../utils';

export type ErrorHandler = <TContext = DefaultContext>(
  errors: readonly GraphQLError[],
  context: TypedExecutionArgs<TContext>
) => void;

export const useErrorHandler = <ContextType>(errorHandler: ErrorHandler): Plugin<ContextType> => {
  return {
    onValidate({ context, params }) {
      return function ({ result }) {
        if (result.length) {
          errorHandler(result, {
            schema: params.schema,
            document: params.documentAST,
            contextValue: context,
          });
        }
      };
    },
    onExecute() {
      return {
        onExecuteDone(payload) {
          return handleStreamOrSingleExecutionResult(payload, ({ result, args }) => {
            if (result.errors?.length) {
              errorHandler(result.errors, args);
            }
          });
        },
      };
    },
  };
};
