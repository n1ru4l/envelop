/* eslint-disable no-console */
/* eslint-disable dot-notation */
import { Plugin } from '@guildql/types';
import * as Sentry from '@sentry/node';
import { ExecutionArgs, Kind, OperationDefinitionNode, print } from 'graphql';

const tracingSpanSymbol = Symbol('SENTRY_GRAPHQL');

export type SentryPluginOptions = {
  appendTags?: (args: ExecutionArgs) => Record<string, unknown>;
};

export const useSentry = (options: SentryPluginOptions): Plugin => {
  return {
    onExecute({ args, extendContext }) {
      const operationType = (args.document.definitions.find(o => o.kind === Kind.OPERATION_DEFINITION) as OperationDefinitionNode).operation;
      const document = print(args.document);
      const opName = args.operationName || 'Anonymous Operation';

      const rootTransaction = Sentry.startTransaction({
        name: opName,
        op: 'execute',
        tags: {
          operationName: opName,
          operation: operationType,
          ...((options.appendTags && options.appendTags(args)) || {}),
        },
      });

      extendContext({
        [tracingSpanSymbol]: rootTransaction,
      });

      return {
        onResolverCalled({ args: resolversArgs, info, context }) {
          if (context && context[tracingSpanSymbol]) {
            const { fieldName, returnType, parentType } = info;
            const parent: typeof rootTransaction = context[tracingSpanSymbol];
            const childSpan = parent.startChild({
              op: `${parentType.name}.${fieldName}`,
              tags: {
                fieldName,
                parentType: parentType.toString(),
                returnType: returnType.toString(),
                args: JSON.stringify(resolversArgs || {}),
              },
            });

            return ({ result }) => {
              childSpan.setData('result', result);

              if (result instanceof Error) {
                childSpan.setStatus('InternalError');
              }

              childSpan.finish();
            };
          }

          return () => {};
        },
        onExecuteDone({ result }) {
          rootTransaction.finish();

          if (result.errors && result.errors.length > 0) {
            for (const err of result.errors) {
              Sentry.withScope(scope => {
                scope.setTag('operation', operationType);
                scope.setTag('operationName', opName);
                scope.setExtra('document', document);
                scope.setExtra('variables', args.variableValues);

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
        },
      };
    },
  };
};
