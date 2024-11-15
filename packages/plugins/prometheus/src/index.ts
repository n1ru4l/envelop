/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { ExecutionResult, GraphQLSchema, TypeInfo, type GraphQLError } from 'graphql';
import { register as defaultRegistry } from 'prom-client';
import {
  isAsyncIterable,
  isIntrospectionOperationString,
  OnContextBuildingHook,
  OnExecuteHook,
  OnExecuteHookResult,
  OnParseHook,
  OnSubscribeHook,
  OnSubscribeHookResult,
  OnValidateHook,
  Plugin,
  type OnEnvelopedHook,
  type OnPluginInitHook,
} from '@envelop/core';
import { useOnResolve } from '@envelop/on-resolve';
import {
  CounterMetricOption,
  HistogramMetricOption,
  PrometheusTracingPluginConfig,
  SummaryMetricOption,
  type MetricsConfig,
} from './config.js';
import {
  createCounter,
  createFillLabelFnParams,
  createHistogram,
  createSummary,
  extractDeprecatedFields,
  FillLabelsFnParams,
  filterFillParamsFnParams,
  getCounterFromConfig,
  getHistogramFromConfig,
  getSummaryFromConfig,
  instrumentRegistry,
  shouldTraceFieldResolver,
  type CounterAndLabels,
  type HistogramAndLabels,
  type SummaryAndLabels,
} from './utils.js';

export {
  CounterAndLabels,
  FillLabelsFnParams,
  HistogramAndLabels,
  PrometheusTracingPluginConfig,
  SummaryAndLabels,
  HistogramMetricOption,
  CounterMetricOption,
  SummaryMetricOption,
  createCounter,
  createHistogram,
  createSummary,
  getCounterFromConfig,
  getHistogramFromConfig,
  getSummaryFromConfig,
};

export const fillLabelsFnParamsMap = new WeakMap<any, FillLabelsFnParams | null>();
export const execStartTimeMap = new WeakMap<any, number>();

export const usePrometheus = (config: PrometheusTracingPluginConfig): Plugin => {
  let typeInfo: TypeInfo | null = null;
  config.registry = instrumentRegistry(config.registry || defaultRegistry);

  const parseHistogram = getHistogramFromConfig<['parse'], MetricsConfig>(
    config,
    'graphql_envelop_phase_parse',
    ['parse'],
    {
      help: 'Time spent on running GraphQL "parse" function',
    },
  );
  const validateHistogram = getHistogramFromConfig<['validate'], MetricsConfig>(
    config,
    'graphql_envelop_phase_validate',
    ['validate'],
    {
      help: 'Time spent on running GraphQL "validate" function',
    },
  );
  const contextBuildingHistogram = getHistogramFromConfig<['context'], MetricsConfig>(
    config,
    'graphql_envelop_phase_context',
    ['context'],
    {
      help: 'Time spent on building the GraphQL context',
    },
  );
  const executeHistogram = getHistogramFromConfig<['execute'], MetricsConfig>(
    config,
    'graphql_envelop_phase_execute',
    ['execute'],
    {
      help: 'Time spent on running the GraphQL "execute" function',
    },
  );
  const subscribeHistogram = getHistogramFromConfig<['subscribe'], MetricsConfig>(
    config,
    'graphql_envelop_phase_subscribe',
    ['subscribe'],
    {
      help: 'Time spent on running the GraphQL "subscribe" function',
    },
  );

  const resolversHistogram = getHistogramFromConfig<['execute', 'subscribe'], MetricsConfig>(
    config,
    'graphql_envelop_execute_resolver',
    ['execute', 'subscribe'],
    {
      help: 'Time spent on running the GraphQL resolvers',
      labelNames: ['operationType', 'operationName', 'fieldName', 'typeName', 'returnType'],
    },
    params =>
      filterFillParamsFnParams(config, {
        operationName: params.operationName!,
        operationType: params.operationType!,
        fieldName: params.info?.fieldName!,
        typeName: params.info?.parentType.name!,
        returnType: params.info?.returnType.toString()!,
      }),
  );

  const requestTotalHistogram = getHistogramFromConfig<['execute', 'subscribe'], MetricsConfig>(
    config,
    'graphql_envelop_request_duration',
    ['execute', 'subscribe'],
    {
      help: 'Time spent on running the GraphQL operation from parse to execute',
    },
  );

  const requestSummary = getSummaryFromConfig<['execute', 'subscribe'], MetricsConfig>(
    config,
    'graphql_envelop_request_time_summary',
    ['execute', 'subscribe'],
    {
      help: 'Summary to measure the time to complete GraphQL operations',
    },
  );

  const errorsCounter = getCounterFromConfig<
    ['parse', 'validate', 'context', 'execute', 'subscribe'],
    MetricsConfig
  >(
    config,
    'graphql_envelop_error_result',
    ['parse', 'validate', 'context', 'execute', 'subscribe'],
    {
      help: 'Counts the amount of errors reported from all phases',
      labelNames: ['operationType', 'operationName', 'path', 'phase'],
    },
    params => {
      const labels: Record<string, string> = {
        operationName: params.operationName!,
        operationType: params.operationType!,
        phase: params.errorPhase!,
      };

      if (params.error?.path) {
        labels.path = params.error.path?.join('.');
      }

      return filterFillParamsFnParams(config, labels);
    },
  );

  const reqCounter = getCounterFromConfig<['execute', 'subscribe'], MetricsConfig>(
    config,
    'graphql_envelop_request',
    ['execute', 'subscribe'],
    {
      help: 'Counts the amount of GraphQL requests executed through Envelop',
    },
  );

  const deprecationCounter = getCounterFromConfig<['parse'], MetricsConfig>(
    config,
    'graphql_envelop_deprecated_field',
    ['parse'],
    {
      help: 'Counts the amount of deprecated fields used in selection sets',
      labelNames: ['operationType', 'operationName', 'fieldName', 'typeName'],
    },
    params =>
      filterFillParamsFnParams(config, {
        operationName: params.operationName!,
        operationType: params.operationType!,
        fieldName: params.deprecationInfo?.fieldName!,
        typeName: params.deprecationInfo?.typeName!,
      }),
  );

  const schemaChangeCounter = getCounterFromConfig<['schema'], MetricsConfig>(
    config,
    'graphql_envelop_schema_change',
    ['schema'],
    {
      help: 'Counts the amount of schema changes',
      labelNames: [],
    },
    () => ({}),
  );

  // parse is mandatory, because it sets up label params for the whole request.
  const phasesToHook = new Set(['parse']);
  for (const metric of [
    parseHistogram,
    validateHistogram,
    contextBuildingHistogram,
    executeHistogram,
    subscribeHistogram,
    resolversHistogram,
    requestTotalHistogram,
    requestSummary,
    errorsCounter,
    reqCounter,
    deprecationCounter,
    schemaChangeCounter,
  ]) {
    metric?.phases!.forEach(phase => phasesToHook.add(phase));
  }

  const onParse: OnParseHook<{}> = ({ context, params }) => {
    if (config.skipIntrospection && isIntrospectionOperationString(params.source)) {
      return;
    }

    const startTime = Date.now();

    return params => {
      const fillLabelsFnParams = createFillLabelFnParams(params.result, context, params =>
        filterFillParamsFnParams(config, params),
      );
      fillLabelsFnParamsMap.set(context, fillLabelsFnParams);

      if (!fillLabelsFnParams) {
        // means that we got a parse error
        if (errorsCounter?.shouldObserve!({ error: params.result, errorPhase: 'parse' }, context)) {
          // TODO: use fillLabelsFn
          errorsCounter?.counter.labels({ phase: 'parse' }).inc();
        }
        // TODO: We should probably always report parse timing, error or not.
        return;
      }

      const totalTime = (Date.now() - startTime) / 1000;

      if (parseHistogram?.shouldObserve!(fillLabelsFnParams, context)) {
        parseHistogram?.histogram.observe(
          parseHistogram.fillLabelsFn(fillLabelsFnParams, context),
          totalTime,
        );
      }

      if (deprecationCounter && typeInfo) {
        const deprecatedFields = extractDeprecatedFields(fillLabelsFnParams.document!, typeInfo);

        for (const depField of deprecatedFields) {
          const deprecationLabelParams = {
            ...fillLabelsFnParams,
            deprecationInfo: depField,
          };

          if (deprecationCounter.shouldObserve!(deprecationLabelParams, context)) {
            deprecationCounter.counter
              .labels(deprecationCounter.fillLabelsFn(deprecationLabelParams, context))
              .inc();
          }
        }
      }
    };
  };

  const onValidate: OnValidateHook<{}> = ({ context }) => {
    const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
    if (!fillLabelsFnParams) {
      return undefined;
    }

    const startTime = Date.now();

    return ({ valid }) => {
      const totalTime = (Date.now() - startTime) / 1000;
      let labels;
      if (validateHistogram?.shouldObserve!(fillLabelsFnParams, context)) {
        labels = validateHistogram.fillLabelsFn(fillLabelsFnParams, context);
        validateHistogram.histogram.observe(labels, totalTime);
      }

      if (
        !valid &&
        errorsCounter?.phases!.includes('validate') &&
        errorsCounter?.shouldObserve!(fillLabelsFnParams, context)
      ) {
        // TODO: we should probably iterate over validation errors to report each error.
        errorsCounter?.counter
          // TODO: Use fillLabelsFn
          .labels(
            errorsCounter.fillLabelsFn({ ...fillLabelsFnParams, errorPhase: 'validate' }, context),
          )
          .inc();
      }
    };
  };

  const onContextBuilding: OnContextBuildingHook<{}> | undefined = ({ context }) => {
    const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
    if (
      !fillLabelsFnParams ||
      !contextBuildingHistogram?.shouldObserve!(fillLabelsFnParams, context)
    ) {
      return;
    }

    const startTime = Date.now();

    return () => {
      const totalTime = (Date.now() - startTime) / 1000;
      contextBuildingHistogram.histogram.observe(
        contextBuildingHistogram.fillLabelsFn(fillLabelsFnParams, context),
        totalTime,
      );
    };
  };

  const onExecute: OnExecuteHook<{}> | undefined = ({ args }) => {
    const fillLabelsFnParams = fillLabelsFnParamsMap.get(args.contextValue);
    if (!fillLabelsFnParams) {
      return;
    }

    const shouldObserveRequsets = reqCounter?.shouldObserve!(fillLabelsFnParams, args.contextValue);
    const shouldObserveExecute = executeHistogram?.shouldObserve!(
      fillLabelsFnParams,
      args.contextValue,
    );
    const shouldObserveRequestTotal = requestTotalHistogram?.shouldObserve!(
      fillLabelsFnParams,
      args.contextValue,
    );
    const shouldObserveSummary = requestSummary?.shouldObserve!(
      fillLabelsFnParams,
      args.contextValue,
    );

    const shouldHandleEnd =
      shouldObserveRequsets ||
      shouldObserveExecute ||
      shouldObserveRequestTotal ||
      shouldObserveSummary;

    const shouldHandleResult = errorsCounter !== undefined;

    if (!shouldHandleEnd && !shouldHandleResult) {
      return;
    }

    const startTime = Date.now();
    if (shouldObserveRequsets) {
      reqCounter?.counter
        .labels(reqCounter.fillLabelsFn(fillLabelsFnParams, args.contextValue))
        .inc();
    }

    function handleResult(result: ExecutionResult) {
      if (result.errors && result.errors.length > 0) {
        for (const error of result.errors) {
          const labelParams = {
            ...fillLabelsFnParams,
            errorPhase: 'execute',
            error,
          };

          if (errorsCounter!.shouldObserve!(labelParams, args.contextValue)) {
            errorsCounter!.counter
              .labels(errorsCounter!.fillLabelsFn(labelParams, args.contextValue))
              .inc();
          }
        }
      }
    }

    const result: OnExecuteHookResult<{}> = {
      onExecuteDone: ({ result }) => {
        const handleEnd = () => {
          const totalTime = (Date.now() - startTime) / 1000;
          if (shouldObserveExecute) {
            executeHistogram!.histogram.observe(
              executeHistogram!.fillLabelsFn(fillLabelsFnParams, args.contextValue),
              totalTime,
            );
          }

          if (shouldObserveRequestTotal) {
            requestTotalHistogram!.histogram.observe(
              requestTotalHistogram!.fillLabelsFn(fillLabelsFnParams, args.contextValue),
              totalTime,
            );
          }

          if (shouldObserveSummary) {
            const execStartTime = execStartTimeMap.get(args.contextValue);
            if (execStartTime) {
              const summaryTime = (Date.now() - execStartTime) / 1000;

              requestSummary!.summary.observe(
                requestSummary!.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                summaryTime,
              );
            }
          }
        };

        if (!isAsyncIterable(result)) {
          shouldHandleResult && handleResult(result);
          shouldHandleEnd && handleEnd();
          return undefined;
        } else {
          return {
            onNext: shouldHandleResult
              ? ({ result }) => {
                  handleResult(result);
                }
              : undefined,
            onEnd: shouldHandleEnd ? handleEnd : undefined,
          };
        }
      },
    };

    return result;
  };

  const onSubscribe: OnSubscribeHook<{}> | undefined = ({ args }) => {
    const fillLabelsFnParams = fillLabelsFnParamsMap.get(args.contextValue);
    if (!fillLabelsFnParams) {
      return undefined;
    }

    const shouldObserveRequsets = reqCounter?.shouldObserve!(fillLabelsFnParams, args.contextValue);
    const shouldObserveExecute = executeHistogram?.shouldObserve!(
      fillLabelsFnParams,
      args.contextValue,
    );
    const shouldObserveRequestTotal = requestTotalHistogram?.shouldObserve!(
      fillLabelsFnParams,
      args.contextValue,
    );
    const shouldObserveSummary = requestSummary?.shouldObserve!(
      fillLabelsFnParams,
      args.contextValue,
    );

    const shouldHandleEnd =
      shouldObserveRequsets ||
      shouldObserveExecute ||
      shouldObserveRequestTotal ||
      shouldObserveSummary;

    const shouldHandleResult = errorsCounter !== undefined;

    const startTime = Date.now();
    if (shouldObserveRequsets) {
      reqCounter?.counter
        .labels(reqCounter.fillLabelsFn(fillLabelsFnParams, args.contextValue))
        .inc();
    }

    function handleResult(result: ExecutionResult) {
      if (errorsCounter && result.errors && result.errors.length > 0) {
        for (const error of result.errors) {
          errorsCounter.counter
            .labels(
              errorsCounter.fillLabelsFn(
                {
                  ...fillLabelsFnParams,
                  errorPhase: 'execute',
                  error,
                },
                args.contextValue,
              ),
            )
            .inc();
        }
      }
    }

    if (!shouldHandleEnd && !shouldHandleResult) {
      return;
    }

    const result: OnSubscribeHookResult<{}> = {
      onSubscribeResult: ({ result }) => {
        const handleEnd = () => {
          const totalTime = (Date.now() - startTime) / 1000;
          if (shouldObserveExecute) {
            subscribeHistogram!.histogram.observe(
              subscribeHistogram!.fillLabelsFn(fillLabelsFnParams, args.contextValue),
              totalTime,
            );
          }
          if (shouldObserveRequestTotal) {
            requestTotalHistogram?.histogram.observe(
              requestTotalHistogram.fillLabelsFn(fillLabelsFnParams, args.contextValue),
              totalTime,
            );
          }

          if (shouldObserveSummary) {
            const execStartTime = execStartTimeMap.get(args.contextValue);
            if (execStartTime) {
              const summaryTime = (Date.now() - execStartTime) / 1000;

              requestSummary!.summary.observe(
                requestSummary!.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                summaryTime,
              );
            }
          }
        };
        if (!isAsyncIterable(result)) {
          shouldHandleResult && handleResult(result);
          shouldHandleEnd && handleEnd();
          return undefined;
        } else {
          return {
            onNext: shouldHandleResult
              ? ({ result }) => {
                  handleResult(result);
                }
              : undefined,
            onEnd: shouldHandleEnd ? handleEnd : undefined,
          };
        }
      },
    };

    return result;
  };

  const onPluginInit: OnPluginInitHook<{}> = ({ addPlugin, registerContextErrorHandler }) => {
    if (resolversHistogram) {
      addPlugin(
        useOnResolve(({ info, context }) => {
          const shouldTrace = shouldTraceFieldResolver(info, config.resolversWhitelist);

          if (!shouldTrace) {
            return undefined;
          }

          const startTime = Date.now();

          return () => {
            const totalTime = (Date.now() - startTime) / 1000;
            const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
            const paramsCtx = {
              ...fillLabelsFnParams,
              info,
            };
            resolversHistogram.histogram.observe(
              resolversHistogram.fillLabelsFn(paramsCtx, context),
              totalTime,
            );
          };
        }),
      );
    }
    if (errorsCounter) {
      registerContextErrorHandler(({ context, error }) => {
        const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
        if (
          errorsCounter.shouldObserve!(
            { error: error as GraphQLError, errorPhase: 'context', ...fillLabelsFnParamsMap },
            context,
          )
        ) {
          errorsCounter.counter
            .labels(
              errorsCounter?.fillLabelsFn(
                // FIXME: unsafe cast here, but it's ok, fillabelfn is doing duck typing anyway
                { ...fillLabelsFnParams, errorPhase: 'context', error: error as GraphQLError },
                context,
              ),
            )
            .inc();
        }
      });
    }
  };

  const onEnveloped: OnEnvelopedHook<{}> = ({ context }) => {
    if (!execStartTimeMap.has(context)) {
      execStartTimeMap.set(context, Date.now());
    }
  };

  function hookIf<T>(phase: string, hook: T): T | undefined {
    if (phasesToHook.has(phase)) {
      return hook;
    }
    return undefined;
  }

  const countedSchemas = new WeakSet<GraphQLSchema>();
  return {
    onSchemaChange({ schema }) {
      typeInfo = new TypeInfo(schema);

      if (schemaChangeCounter?.shouldObserve!({}, null) && !countedSchemas.has(schema)) {
        schemaChangeCounter.counter.inc();
        countedSchemas.add(schema);
      }
    },
    onEnveloped: hookIf('execute', onEnveloped) ?? hookIf('subscribe', onEnveloped),
    onPluginInit:
      errorsCounter?.phases!.includes('context') || resolversHistogram ? onPluginInit : undefined,
    onParse: hookIf('parse', onParse),
    onValidate: hookIf('validate', onValidate),
    onContextBuilding: hookIf('context', onContextBuilding),
    onExecute: hookIf('execute', onExecute),
    onSubscribe: hookIf('subscribe', onSubscribe),
  };
};
