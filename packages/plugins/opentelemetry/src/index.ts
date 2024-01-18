import { ExecutionResult, getOperationAST, print } from 'graphql';
import {
  getDocumentString,
  isAsyncIterable,
  OnExecuteHookResult,
  OnSubscribeHookResult,
  Plugin,
} from '@envelop/core';
import { useOnResolve } from '@envelop/on-resolve';
import { SpanAttributes, SpanKind, SpanStatusCode, TracerProvider } from '@opentelemetry/api';
import * as opentelemetry from '@opentelemetry/api';
import {
  BasicTracerProvider,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { hasInlineArgument } from './has-inline-argument';

export enum AttributeName {
  EXECUTION_ERROR = 'graphql.execute.error',
  EXECUTION_RESULT = 'graphql.execute.result',
  RESOLVER_EXCEPTION = 'graphql.resolver.exception',
  RESOLVER_FIELD_NAME = 'graphql.resolver.fieldName',
  RESOLVER_TYPE_NAME = 'graphql.resolver.typeName',
  RESOLVER_RESULT_TYPE = 'graphql.resolver.resultType',
  RESOLVER_ARGS = 'graphql.resolver.args',
  EXECUTION_OPERATION_NAME = 'graphql.execute.operationName',
  EXECUTION_OPERATION_TYPE = 'graphql.execute.operationType',
  EXECUTION_OPERATION_DOCUMENT = 'graphql.execute.document',
  EXECUTION_VARIABLES = 'graphql.execute.variables',
}

const tracingSpanSymbol = Symbol('OPEN_TELEMETRY_GRAPHQL');

export type TracingOptions = {
  document?: boolean;
  resolvers?: boolean;
  variables?: boolean;
  result?: boolean;
  traceIdInResult?: string;
};

type PluginContext = {
  [tracingSpanSymbol]: opentelemetry.Span;
};

export const useOpenTelemetry = (
  options: TracingOptions,
  tracingProvider?: TracerProvider,
  spanKind: SpanKind = SpanKind.SERVER,
  spanAdditionalAttributes: SpanAttributes = {},
  serviceName = 'graphql',
): Plugin<PluginContext> => {
  if (!tracingProvider) {
    const basicTraceProvider = new BasicTracerProvider();
    basicTraceProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    basicTraceProvider.register();
    tracingProvider = basicTraceProvider;
  }

  const tracer = tracingProvider.getTracer(serviceName);

  const spanByContext = new WeakMap<any, opentelemetry.Span>();

  return {
    onPluginInit({ addPlugin }) {
      if (options.resolvers) {
        addPlugin(
          useOnResolve(({ info, context, args }) => {
            const parentSpan = spanByContext.get(context);
            if (parentSpan) {
              const ctx = opentelemetry.trace.setSpan(opentelemetry.context.active(), parentSpan);
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
                ctx,
              );

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
            }

            return () => {};
          }),
        );
      }
    },
    onExecute({ args }) {
      const operationAst = getOperationAST(args.document, args.operationName);
      if (!operationAst) {
        return;
      }
      const operationType = operationAst.operation;
      let isDocumentLoggable: boolean;
      if (options.document == null || options.document === true) {
        if (options.variables) {
          isDocumentLoggable = true;
        } else if (!hasInlineArgument(args.document)) {
          isDocumentLoggable = true;
        } else {
          isDocumentLoggable = false;
        }
      } else {
        isDocumentLoggable = false;
      }
      const operationName = operationAst.name?.value || 'anonymous';
      const executionSpan = tracer.startSpan(`${operationType}.${operationName}`, {
        kind: spanKind,
        attributes: {
          ...spanAdditionalAttributes,
          [AttributeName.EXECUTION_OPERATION_NAME]: operationName,
          [AttributeName.EXECUTION_OPERATION_TYPE]: operationType,
          [AttributeName.EXECUTION_OPERATION_DOCUMENT]: isDocumentLoggable
            ? getDocumentString(args.document, print)
            : undefined,
          ...(options.variables
            ? { [AttributeName.EXECUTION_VARIABLES]: JSON.stringify(args.variableValues ?? {}) }
            : {}),
        },
      });

      const otelContext = opentelemetry.trace.setSpan(
        opentelemetry.context.active(),
        executionSpan,
      );

      const resultCbs: OnExecuteHookResult<PluginContext> = {
        onExecuteDone({ result, setResult }) {
          if (!isAsyncIterable(result)) {
            if (result.data && options.result) {
              executionSpan.setAttribute(AttributeName.EXECUTION_RESULT, JSON.stringify(result));
            }
            if (options.traceIdInResult) {
              setResult(addTraceIdToResult(otelContext, result, options.traceIdInResult));
            }
            markError(executionSpan, result);
            executionSpan.end();
          }

          return {
            // handles async iterator
            onNext: ({ result, setResult }) => {
              if (options.traceIdInResult) {
                setResult(addTraceIdToResult(otelContext, result, options.traceIdInResult));
              }
              markError(executionSpan, result);
            },
            onEnd: () => {
              executionSpan.end();
            },
          };
        },
      };

      if (options.resolvers) {
        spanByContext.set(args.contextValue, executionSpan);
      }

      return resultCbs;
    },
    onSubscribe({ args }) {
      const operationAst = getOperationAST(args.document, args.operationName);
      if (!operationAst) {
        return;
      }
      const operationType = 'subscription';
      let isDocumentLoggable: boolean;
      if (options.variables) {
        isDocumentLoggable = true;
      } else if (!hasInlineArgument(args.document)) {
        isDocumentLoggable = true;
      } else {
        isDocumentLoggable = false;
      }
      const operationName = operationAst.name?.value || 'anonymous';
      const subscriptionSpan = tracer.startSpan(`${operationType}.${operationName}`, {
        kind: spanKind,
        attributes: {
          ...spanAdditionalAttributes,
          [AttributeName.EXECUTION_OPERATION_NAME]: operationName,
          [AttributeName.EXECUTION_OPERATION_TYPE]: operationType,
          [AttributeName.EXECUTION_OPERATION_DOCUMENT]: isDocumentLoggable
            ? getDocumentString(args.document, print)
            : undefined,
          ...(options.variables
            ? { [AttributeName.EXECUTION_VARIABLES]: JSON.stringify(args.variableValues ?? {}) }
            : {}),
        },
      });

      const otelContext = opentelemetry.trace.setSpan(
        opentelemetry.context.active(),
        subscriptionSpan,
      );

      const resultCbs: OnSubscribeHookResult<PluginContext> = {
        onSubscribeError: ({ error }) => {
          if (error) subscriptionSpan.setStatus({ code: SpanStatusCode.ERROR });
        },
        onSubscribeResult() {
          return {
            // handles async iterator
            onNext: ({ result, setResult }) => {
              if (options.traceIdInResult) {
                setResult(addTraceIdToResult(otelContext, result, options.traceIdInResult));
              }
              markError(subscriptionSpan, result);
            },
            onEnd: () => {
              subscriptionSpan.end();
            },
          };
        },
      };

      if (options.resolvers) {
        spanByContext.set(args.contextValue, subscriptionSpan);
      }

      return resultCbs;
    },
  };
};

function addTraceIdToResult(
  ctx: opentelemetry.Context,
  result: ExecutionResult,
  traceIdProp: string,
): ExecutionResult {
  return {
    ...result,
    extensions: {
      ...result.extensions,
      [traceIdProp]: opentelemetry.trace.getSpan(ctx)?.spanContext().traceId,
    },
  };
}

function markError(executionSpan: opentelemetry.Span, result: ExecutionResult) {
  if (result.errors && result.errors.length > 0) {
    executionSpan.setStatus({ code: opentelemetry.SpanStatusCode.ERROR });
    executionSpan.recordException({
      name: AttributeName.EXECUTION_ERROR,
      message: JSON.stringify(result.errors),
    });
  }
}
