/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-console */
/* eslint-disable dot-notation */
import { Plugin } from '@guildql/types';
import * as Sentry from '@sentry/node';
import { ExecutionArgs, Kind, OperationDefinitionNode, print } from 'graphql';

const tracingSpanSymbol = Symbol('SENTRY_GRAPHQL');

export type SentryPluginOptions = {
  includeRawResult?: boolean;
  includeResolverArgs?: boolean;
  includeExecuteVariables?: boolean;
  appendTags?: (args: ExecutionArgs) => Record<string, unknown>;
};

export const useSentry = (options: SentryPluginOptions): Plugin => {
  return {
    onExecute({ args, extendContext }) {
      const rootOperation = args.document.definitions.find(o => o.kind === Kind.OPERATION_DEFINITION) as OperationDefinitionNode;
      const operationType = rootOperation.operation;
      const document = print(args.document);
      const opName = args.operationName || rootOperation.name?.value || 'Anonymous Operation';
      const addedTags: Record<string, any> = (options.appendTags && options.appendTags(args)) || {};

      const rootTransaction = Sentry.startTransaction({
        name: opName,
        op: 'execute',
        tags: {
          operationName: opName,
          operation: operationType,
          ...(addedTags || {}),
        },
      });

      rootTransaction.setData('document', document);

      extendContext({
        [tracingSpanSymbol]: rootTransaction,
      });

      return {
        onResolverCalled({ args: resolversArgs, info, context }) {
          if (context && context[tracingSpanSymbol]) {
            const { fieldName, returnType, parentType } = info;
            const parent: typeof rootTransaction = context[tracingSpanSymbol];
            const tags: Record<string, string> = {
              fieldName,
              parentType: parentType.toString(),
              returnType: returnType.toString(),
            };

            if (options.includeResolverArgs) {
              tags.args = options.includeResolverArgs ? JSON.stringify(resolversArgs || {}) : '';
            }

            const childSpan = parent.startChild({
              op: `${parentType.name}.${fieldName}`,
              tags,
            });

            return ({ result }) => {
              if (options.includeRawResult) {
                childSpan.setData('result', result);
              }

              childSpan.finish();
            };
          }

          return () => {};
        },
        onExecuteDone({ result }) {
          if (options.includeRawResult) {
            rootTransaction.setData('result', result);
          }

          if (result.errors && result.errors.length > 0) {
            for (const err of result.errors) {
              Sentry.withScope(scope => {
                scope.setTransactionName(opName);
                scope.setTag('operation', operationType);
                scope.setTag('operationName', opName);
                scope.setExtra('document', document);

                scope.setTags(addedTags || {});

                if (options.includeRawResult) {
                  scope.setExtra('result', result);
                }

                if (options.includeExecuteVariables) {
                  scope.setExtra('variables', args.variableValues);
                }

                if (err.path) {
                  scope.addBreadcrumb({
                    category: 'execution-path',
                    message: err.path.join(' > '),
                    level: Sentry.Severity.Debug,
                  });
                }

                Sentry.captureException(err);
              });
            }
          }

          rootTransaction.finish();
        },
      };
    },
  };
};
