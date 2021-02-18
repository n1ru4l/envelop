import { PluginFn } from '@guildql/types';
import { SpanAttributes, Span, SpanKind } from '@opentelemetry/api';
import * as opentelemetry from '@opentelemetry/api';
import { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/tracing';
import { GraphQLResolveInfo, print } from 'graphql';

export enum AttributeName {
  EXECUTION_ERROR = 'graphql.execute.error',
  EXECUTION_RESULT = 'graphql.execute.result',
  RESOLVER_EXCEPTION = 'graphql.resolver.exception',
  RESOLVER_FIELD_NAME = 'graphql.resolver.fieldName',
  RESOLVER_TYPE_NAME = 'graphql.resolver.typeName',
  RESOLVER_RESULT_TYPE = 'graphql.resolver.resultType',
  RESOLVER_ARGS = 'graphql.resolver.args',
  EXECUTION_OPERATION_ID = 'graphql.execute.operationId',
  EXECUTION_OPERATION_NAME = 'graphql.execute.operationName',
  EXECUTION_OPERATION_DOCUMENT = 'graphql.execute.document',
  EXECUTION_VARIABLES = 'graphql.execute.variables',
}

export type ContextWithTracing = {
  __tracingSpan: Span;
  [key: string]: unknown;
};

export type TracingOptions = {
  execution: boolean;
  resolvers: boolean;
  variables: boolean;
  result: boolean;
};

export const useOpenTelemetry = (
  options: TracingOptions,
  tracingProvider?: BasicTracerProvider,
  spanKind: SpanKind = SpanKind.SERVER,
  spanAdditionalAttributes: SpanAttributes = {},
  serviceName = 'graphql'
): PluginFn => api => {
  if (!tracingProvider) {
    tracingProvider = new BasicTracerProvider();
    tracingProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    tracingProvider.register();
  }

  const tracer = tracingProvider.getTracer(serviceName);
  const executionSet = new Map<string, Span>();

  if (options.execution && options.resolvers) {
    api.on('beforeSchemaReady', support => {
      support.wrapResolvers({
        '*': {
          '*': next => async (root: unknown, args: Record<string, unknown>, context: ContextWithTracing, info: GraphQLResolveInfo) => {
            if (context && context.__tracingSpan) {
              tracer.getActiveSpanProcessor();
              const ctx = opentelemetry.setSpan(opentelemetry.context.active(), context.__tracingSpan);
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
                ctx
              );

              try {
                return await next(root, args, context, info);
              } catch (e) {
                resolverSpan.recordException({
                  name: AttributeName.RESOLVER_EXCEPTION,
                  message: JSON.stringify(e),
                });

                throw e;
              } finally {
                resolverSpan.end();
              }
            } else {
              // eslint-disable-next-line no-console
              console.warn(`Resolver tracing with opentelemetry seems to be configured incorrectly (missing from context). skipping...`);

              return await next(root, args, context, info);
            }
          },
        },
      });
    });
  }

  if (options.execution) {
    api.on('beforeExecute', support => {
      const params = support.getExecutionParams();
      const opId = support.getOperationId();
      const span = tracer.startSpan(`${params.operationName || opId}`, {
        kind: spanKind,
        attributes: {
          ...spanAdditionalAttributes,
          [AttributeName.EXECUTION_OPERATION_ID]: opId,
          [AttributeName.EXECUTION_OPERATION_NAME]: params.operationName,
          [AttributeName.EXECUTION_OPERATION_DOCUMENT]: print(params.document),
          ...(options.variables ? { [AttributeName.EXECUTION_VARIABLES]: JSON.stringify(params.variableValues || {}) } : {}),
        },
      });

      executionSet.set(opId, span);

      const currentContext = support.getExecutionParams().contextValue;

      support.setContext(<ContextWithTracing>{
        ...(currentContext || {}),
        __tracingSpan: span,
      });
    });

    api.on('afterExecute', support => {
      const opId = support.getOperationId();
      const span = executionSet.get(opId);

      if (span) {
        executionSet.delete(opId);
        const result = support.getResult();

        if (options.result) {
          span.setAttribute(AttributeName.EXECUTION_RESULT, JSON.stringify(result));
        }

        if (result.errors && result.errors.length > 0) {
          span.recordException({
            name: AttributeName.EXECUTION_ERROR,
            message: JSON.stringify(result.errors),
          });
        }

        span.end();
      }
    });
  }
};
