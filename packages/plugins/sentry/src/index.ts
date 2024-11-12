import { GraphQLError, Kind, OperationDefinitionNode, print } from 'graphql';
import {
  ExecuteFunction,
  ExecutionArgs,
  ExecutionResult,
  getDocumentString,
  isOriginalGraphQLError,
  TypedExecutionArgs,
  type Plugin,
} from '@envelop/core';
import * as Sentry from '@sentry/node';
import type { Span, TraceparentData } from '@sentry/types';

export type SentryPluginOptions<PluginContext extends Record<string, any>> = {
  /**
   * Starts a new transaction for every GraphQL Operation.
   * When disabled, an already existing Transaction will be used.
   *
   * @default true
   */
  startTransaction?: boolean;
  /**
   * Renames Transaction.
   * @default false
   */
  renameTransaction?: boolean;
  /**
   * Adds result of each resolver and operation to Span's data (available under "result")
   * @default false
   */
  includeRawResult?: boolean;
  /**
   * Adds operation's variables to a Scope (only in case of errors)
   * @default false
   */
  includeExecuteVariables?: boolean;
  /**
   * The key of the event id in the error's extension. `null` to disable.
   * @default sentryEventId
   */
  eventIdKey?: string | null;
  /**
   * Adds custom tags to every Transaction.
   */
  appendTags?: (args: TypedExecutionArgs<PluginContext>) => Record<string, unknown>;
  /**
   * Callback to set context information onto the scope.
   */
  configureScope?: (args: TypedExecutionArgs<PluginContext>, scope: Sentry.Scope) => void;
  /**
   * Produces a name of Transaction (only when "renameTransaction" or "startTransaction" are enabled) and description of created Span.
   *
   * @default operation's name or "Anonymous Operation" when missing)
   */
  transactionName?: (args: TypedExecutionArgs<PluginContext>) => string;
  /**
   * Produces tracing data for Transaction
   *
   * @default is empty
   */
  traceparentData?: (args: TypedExecutionArgs<PluginContext>) => TraceparentData | undefined;
  /**
   * Produces a "op" (operation) of created Span.
   *
   * @default execute
   */
  operationName?: (args: TypedExecutionArgs<PluginContext>) => string;
  /**
   * Indicates whether or not to skip the entire Sentry flow for given GraphQL operation.
   * By default, no operations are skipped.
   */
  skip?: (args: TypedExecutionArgs<PluginContext>) => boolean;
  /**
   * Indicates whether or not to skip Sentry exception reporting for a given error.
   * By default, this plugin skips all `GraphQLError` errors and does not report it to Sentry.
   */
  skipError?: (args: Error) => boolean;
};

export const defaultSkipError = isOriginalGraphQLError;

export const useSentry = <PluginContext extends Record<string, any> = {}>(
  options: SentryPluginOptions<PluginContext> = {},
): Plugin<PluginContext> => {
  function pick<K extends keyof SentryPluginOptions<PluginContext>>(
    key: K,
    defaultValue: NonNullable<SentryPluginOptions<PluginContext>[K]>,
  ) {
    return options[key] ?? defaultValue;
  }

  const startTransaction = pick('startTransaction', true);
  const includeRawResult = pick('includeRawResult', false);
  const includeExecuteVariables = pick('includeExecuteVariables', false);
  const renameTransaction = pick('renameTransaction', false);
  const skipOperation = pick('skip', () => false);
  const skipError = pick('skipError', defaultSkipError);

  const eventIdKey = options.eventIdKey === null ? null : 'sentryEventId';

  function addEventId(err: GraphQLError, eventId: string | null): GraphQLError {
    if (eventIdKey !== null && eventId !== null) {
      err.extensions[eventIdKey] = eventId;
    }

    return err;
  }

  return {
    onExecute({ args, executeFn, setExecuteFn }) {
      if (skipOperation(args)) {
        return;
      }

      const rootOperation = args.document.definitions.find(
        // @ts-expect-error TODO: not sure how we will make it dev friendly
        o => o.kind === Kind.OPERATION_DEFINITION,
      ) as OperationDefinitionNode;
      const operationType = rootOperation.operation;

      const document = getDocumentString(args.document, print);

      const opName = args.operationName || rootOperation.name?.value || 'Anonymous Operation';
      const addedTags: Record<string, any> = (options.appendTags && options.appendTags(args)) || {};
      const traceparentData = (options.traceparentData && options.traceparentData(args)) || {};

      const transactionName = options.transactionName ? options.transactionName(args) : opName;
      const op = options.operationName ? options.operationName(args) : 'execute';
      const tags = {
        operationName: opName,
        operation: operationType,
        ...addedTags,
      };

      const createExecuteFn = async (
        args: ExecutionArgs,
        span: Span,
      ): Promise<ReturnType<ExecuteFunction>> => {
        span.setAttribute('document', document);

        const result: ExecutionResult = await executeFn(args);

        if (includeRawResult) {
          // @ts-expect-error TODO: not sure if this is correct
          span.setAttribute('result', result);
        }

        if (result.errors && result.errors.length > 0) {
          Sentry.withScope(scope => {
            scope.setTransactionName(opName);
            scope.setTag('operation', operationType);
            scope.setTag('operationName', opName);
            scope.setExtra('document', document);

            scope.setTags(addedTags || {});

            if (includeRawResult) {
              scope.setExtra('result', result);
            }

            if (includeExecuteVariables) {
              scope.setExtra('variables', args.variableValues);
            }

            const errors = result.errors?.map(err => {
              if (skipError(err) === true) {
                return err;
              }

              const errorPath = (err.path ?? [])
                .map((v: string | number) => (typeof v === 'number' ? '$index' : v))
                .join(' > ');

              if (errorPath) {
                scope.addBreadcrumb({
                  category: 'execution-path',
                  message: errorPath,
                  level: 'debug',
                });
              }

              const eventId = Sentry.captureException(err.originalError, {
                fingerprint: ['graphql', errorPath, opName, operationType],
                contexts: {
                  GraphQL: {
                    operationName: opName,
                    operationType,
                    variables: args.variableValues,
                  },
                },
              });

              return addEventId(err, eventId);
            });

            return {
              ...result,
              errors,
            };
          });
        }

        return result;
      };

      if (startTransaction) {
        const executeFn: ExecuteFunction = args =>
          Sentry.startSpan(
            {
              name: transactionName,
              op,
              attributes: tags,
              ...traceparentData,
            },
            span => createExecuteFn(args, span),
          );
        setExecuteFn(executeFn);
      } else {
        const scope = Sentry.getCurrentScope();
        const parentSpan = scope?.getScopeData().span;
        if (!parentSpan) {
          // eslint-disable-next-line no-console
          console.warn(
            [
              `Flag "startTransaction" is disabled but Sentry failed to find a transaction.`,
              `Try to create a transaction before GraphQL execution phase is started.`,
            ].join('\n'),
          );
          return {};
        }
        const executeFn: ExecuteFunction = args =>
          Sentry.withActiveSpan(parentSpan, () => {
            return Sentry.startSpan(
              {
                name: transactionName,
                op,
                attributes: tags,
              },
              span => createExecuteFn(args, span),
            );
          });
        setExecuteFn(executeFn);

        if (renameTransaction) {
          scope!.setTransactionName(transactionName);
        }
      }

      if (options.configureScope) {
        options.configureScope(args, Sentry.getCurrentScope());
      }

      return {};
    },
  };
};
