/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-console */
/* eslint-disable dot-notation */
import { Plugin } from '@envelop/types';
import * as Sentry from '@sentry/node';
import { Span } from '@sentry/types';
import { ExecutionArgs, Kind, OperationDefinitionNode, print, responsePathAsArray } from 'graphql';

const tracingSpanSymbol = Symbol('SENTRY_GRAPHQL');

export type SentryPluginOptions = {
  startTransaction?: boolean;
  renameTransaction?: boolean;
  includeRawResult?: boolean;
  includeResolverArgs?: boolean;
  includeExecuteVariables?: boolean;
  appendTags?: (args: ExecutionArgs) => Record<string, unknown>;
  transactionName?: (args: ExecutionArgs) => string;
  operationName?: (args: ExecutionArgs) => string;
};

export const useSentry = (
  options: SentryPluginOptions = {
    startTransaction: true,
  }
): Plugin<{
  [tracingSpanSymbol]: Span;
}> => {
  return {
    onExecute({ args, extendContext }) {
      const rootOperation = args.document.definitions.find(o => o.kind === Kind.OPERATION_DEFINITION) as OperationDefinitionNode;
      const operationType = rootOperation.operation;
      const document = print(args.document);
      const opName = args.operationName || rootOperation.name?.value || 'Anonymous Operation';
      const addedTags: Record<string, any> = (options.appendTags && options.appendTags(args)) || {};

      const transactionName = options.transactionName ? options.transactionName(args) : opName;
      const op = options.operationName ? options.operationName(args) : 'execute';
      const tags = {
        operationName: opName,
        operation: operationType,
        ...(addedTags || {}),
      };

      let rootSpan: Span;

      if (options.startTransaction) {
        rootSpan = Sentry.startTransaction({
          name: transactionName,
          op,
          tags,
        });
      } else {
        const scope = Sentry.getCurrentHub().getScope();
        const parentSpan = scope?.getSpan();
        const span = parentSpan?.startChild({
          description: transactionName,
          op,
          tags,
        });

        if (!span) {
          console.warn(
            [
              `Flag "startTransaction" is enabled but Sentry failed to find a transaction.`,
              `Try to create a transaction before GraphQL execution phase is started.`,
            ].join('\n')
          );
          return {};
        }

        rootSpan = span;

        if (options.renameTransaction) {
          scope!.setTransactionName(transactionName);
        }
      }

      rootSpan.setData('document', document);

      extendContext({
        [tracingSpanSymbol]: rootSpan,
      });

      return {
        onResolverCalled({ args: resolversArgs, info, context }) {
          if (context && context[tracingSpanSymbol]) {
            const { fieldName, returnType, parentType } = info;
            const parent: typeof rootSpan = context[tracingSpanSymbol];
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

              if (result instanceof Error) {
                const errorPath = responsePathAsArray(info.path).join(' > ');

                Sentry.captureException(result, {
                  fingerprint: ['graphql', errorPath, opName, operationType],
                });
              }

              childSpan.finish();
            };
          }

          return () => {};
        },
        onExecuteDone({ result }) {
          if (options.includeRawResult) {
            rootSpan.setData('result', result);
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

                const errorPath = (err.path || []).join(' > ');

                if (errorPath) {
                  scope.addBreadcrumb({
                    category: 'execution-path',
                    message: errorPath,
                    level: Sentry.Severity.Debug,
                  });
                }

                Sentry.captureException(err, {
                  fingerprint: ['graphql', errorPath, opName, operationType],
                  contexts: {
                    GraphQL: {
                      operationName: opName,
                      operationType: operationType,
                      variables: args.variableValues,
                    },
                  },
                });
              });
            }
          }

          rootSpan.finish();
        },
      };
    },
  };
};
