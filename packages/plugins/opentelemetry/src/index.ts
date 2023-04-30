import { Plugin, OnExecuteHookResult, isAsyncIterable } from '@envelop/core';
import { useOnResolve } from '@envelop/on-resolve';
import { ContextManager, SpanAttributes, SpanKind, trace, TracerProvider } from '@opentelemetry/api';
import * as opentelemetry from '@opentelemetry/api';
import { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { print } from 'graphql';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';

export enum AttributeName {
  EXECUTION_ERROR = 'graphql.execute.error',
  EXECUTION_RESULT = 'graphql.execute.result',
  RESOLVER_EXCEPTION = 'graphql.resolver.exception',
  RESOLVER_FIELD_NAME = 'graphql.resolver.fieldName',
  RESOLVER_TYPE_NAME = 'graphql.resolver.typeName',
  RESOLVER_RESULT_TYPE = 'graphql.resolver.resultType',
  RESOLVER_ARGS = 'graphql.resolver.args',
  EXECUTION_OPERATION_NAME = 'graphql.execute.operationName',
  EXECUTION_OPERATION_DOCUMENT = 'graphql.execute.document',
  EXECUTION_VARIABLES = 'graphql.execute.variables',
}

const traceContextSymbol = Symbol('OPEN_TELEMETRY_GRAPHQL_ACTIVE_CONTEXT');

const getActiveContext = (context: PluginContext): opentelemetry.Context => {
  return context[traceContextSymbol] || opentelemetry.ROOT_CONTEXT;
};

export type TracingOptions = {
  resolvers: boolean;
  variables: boolean;
  result: boolean;
};

type PluginContext = {
  [traceContextSymbol]: opentelemetry.Context;
};

export const useOpenTelemetry = (
  options: TracingOptions,
  tracingProvider?: TracerProvider,
  contextManager?: ContextManager,
  spanKind: SpanKind = SpanKind.SERVER,
  spanAdditionalAttributes: SpanAttributes = {},
  serviceName = 'graphql'
): Plugin<PluginContext> => {
  if (!tracingProvider) {
    const basicTraceProvider = new BasicTracerProvider();
    basicTraceProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    basicTraceProvider.register();
    tracingProvider = basicTraceProvider;
  }

  if (!contextManager) {
    const contextManager = new AsyncLocalStorageContextManager();
    contextManager.enable();
    opentelemetry.context.setGlobalContextManager(contextManager);
  }

  const tracer = tracingProvider.getTracer(serviceName);

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useOnResolve(({ info, context, args, resolver, replaceResolver }) => {
          replaceResolver(async (root, args, context, info) => {
            return await opentelemetry.context.with(getActiveContext(context), async () => {
              return resolver(root, args, context, info);
            });
          });

          if (!options.resolvers) {
            return;
          }

          const { fieldName, returnType, parentType } = info;

          const resolverSpan = tracer.startSpan(
            `${parentType.name}.${fieldName}`,
            {
              attributes: {
                [AttributeName.RESOLVER_FIELD_NAME]: fieldName,
                [AttributeName.RESOLVER_TYPE_NAME]: parentType.toString(),
                [AttributeName.RESOLVER_RESULT_TYPE]: returnType.toString(),
                [AttributeName.RESOLVER_ARGS]: JSON.stringify(args || {}),
              },
            },
            getActiveContext(context)
          );

          context[traceContextSymbol] = opentelemetry.trace.setSpan(getActiveContext(context), resolverSpan);

          return ({ result }) => {
            if (result instanceof Error) {
              resolverSpan.recordException({
                name: AttributeName.RESOLVER_EXCEPTION,
                message: JSON.stringify(result),
              });
            } else {
              resolverSpan.end();
            }
          };

          return () => {};
        })
      );
    },
    onExecute({ args, extendContext }) {
      const executionSpan = tracer.startSpan(`${args.operationName || 'Anonymous Operation'}`, {
        kind: spanKind,
        attributes: {
          ...spanAdditionalAttributes,
          [AttributeName.EXECUTION_OPERATION_NAME]: args.operationName ?? undefined,
          [AttributeName.EXECUTION_OPERATION_DOCUMENT]: print(args.document),
          ...(options.variables
            ? { [AttributeName.EXECUTION_VARIABLES]: JSON.stringify(args.variableValues ?? {}) }
            : {}),
        },
      });

      const activeContext = opentelemetry.trace.setSpan(opentelemetry.context.active(), executionSpan);

      const resultCbs: OnExecuteHookResult<PluginContext> = {
        onExecuteDone({ result }) {
          if (isAsyncIterable(result)) {
            executionSpan.end();
            // eslint-disable-next-line no-console
            console.warn(
              `Plugin "newrelic" encountered a AsyncIterator which is not supported yet, so tracing data is not available for the operation.`
            );
            return;
          }

          if (result.data && options.result) {
            executionSpan.setAttribute(AttributeName.EXECUTION_RESULT, JSON.stringify(result));
          }

          if (result.errors && result.errors.length > 0) {
            executionSpan.recordException({
              name: AttributeName.EXECUTION_ERROR,
              message: JSON.stringify(result.errors),
            });
          }

          executionSpan.end();
        },
      };

      extendContext({
        [traceContextSymbol]: activeContext,
      });

      return resultCbs;
    },
  };
};
