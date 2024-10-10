/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { ExecutionResult, GraphQLSchema, TypeInfo } from 'graphql';
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
} from '@envelop/core';
import { useOnResolve } from '@envelop/on-resolve';
import { PrometheusTracingPluginConfig, type MetricsConfig } from './config.js';
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

  const parseHistogram = getHistogramFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_phase_parse',
    {
      help: 'Time spent on running GraphQL "parse" function',
    },
  );
  const validateHistogram = getHistogramFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_phase_validate',
    {
      help: 'Time spent on running GraphQL "validate" function',
    },
  );
  const contextBuildingHistogram = getHistogramFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_phase_context',
    {
      help: 'Time spent on building the GraphQL context',
    },
  );
  const executeHistogram = getHistogramFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_phase_execute',
    {
      help: 'Time spent on running the GraphQL "execute" function',
    },
  );
  const subscribeHistogram = getHistogramFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_phase_subscribe',
    {
      help: 'Time spent on running the GraphQL "subscribe" function',
    },
  );

  const resolversHistogram = getHistogramFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_execute_resolver',
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

  const requestTotalHistogram = getHistogramFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_request_duration',
    {
      help: 'Time spent on running the GraphQL operation from parse to execute',
    },
  );

  const requestSummary = getSummaryFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_request_time_summary',
    {
      help: 'Summary to measure the time to complete GraphQL operations',
    },
  );

  const errorsCounter = getCounterFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_error_result',
    {
      help: 'Counts the amount of errors reported from all phases',
      labelNames: ['operationType', 'operationName', 'path', 'phase'],
    },
    params =>
      filterFillParamsFnParams(config, {
        operationName: params.operationName!,
        operationType: params.operationType!,
        path: params.error?.path?.join('.')!,
        phase: params.errorPhase!,
      }),
  );

  const reqCounter = getCounterFromConfig<MetricsConfig>(config, 'graphql_envelop_request', {
    help: 'Counts the amount of GraphQL requests executed through Envelop',
  });

  const deprecationCounter = getCounterFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_deprecated_field',
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

  const schemaChangeCounter = getCounterFromConfig<MetricsConfig>(
    config,
    'graphql_envelop_schema_change',
    {
      help: 'Counts the amount of schema changes',
      labelNames: [],
    },
    () => ({}),
  );

  const onParse: OnParseHook<{}> = ({ context, params }) => {
    if (config.skipIntrospection && isIntrospectionOperationString(params.source)) {
      return;
    }

    const startTime = Date.now();

    return params => {
      const totalTime = (Date.now() - startTime) / 1000;
      let fillLabelsFnParams = fillLabelsFnParamsMap.get(params.result);
      if (!fillLabelsFnParams) {
        fillLabelsFnParams = createFillLabelFnParams(params.result, context, params =>
          filterFillParamsFnParams(config, params),
        );
        fillLabelsFnParamsMap.set(context, fillLabelsFnParams);
      }

      if (fillLabelsFnParams) {
        if (parseHistogram?.shouldRecordFn(fillLabelsFnParams, context)) {
          parseHistogram.histogram.observe(
            parseHistogram.fillLabelsFn(fillLabelsFnParams, context),
            totalTime,
          );
        }
        if (deprecationCounter && typeInfo) {
          const deprecatedFields = extractDeprecatedFields(fillLabelsFnParams.document!, typeInfo);

          if (deprecatedFields.length > 0) {
            for (const depField of deprecatedFields) {
              deprecationCounter.counter
                .labels(
                  deprecationCounter.fillLabelsFn(
                    {
                      ...fillLabelsFnParams,
                      deprecationInfo: depField,
                    },
                    context,
                  ),
                )
                .inc();
            }
          }
        }
      } else {
        // means that we got a parse error, report it
        errorsCounter?.counter
          .labels({
            phase: 'parse',
          })
          .inc();
      }
    };
  };

  const onValidate: OnValidateHook<{}> | undefined = validateHistogram
    ? ({ context }) => {
        const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
        if (!fillLabelsFnParams) {
          return undefined;
        }

        const startTime = Date.now();

        return ({ valid }) => {
          const totalTime = (Date.now() - startTime) / 1000;
          const labels = validateHistogram.fillLabelsFn(fillLabelsFnParams, context);
          if (validateHistogram?.shouldRecordFn(fillLabelsFnParams, context)) {
            validateHistogram.histogram.observe(labels, totalTime);
          }

          if (!valid) {
            errorsCounter?.counter
              .labels({
                ...labels,
                phase: 'validate',
              })
              .inc();
          }
        };
      }
    : undefined;

  const onContextBuilding: OnContextBuildingHook<{}> | undefined = contextBuildingHistogram
    ? ({ context }) => {
        const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
        if (!fillLabelsFnParams) {
          return undefined;
        }

        const startTime = Date.now();

        return () => {
          if (contextBuildingHistogram.shouldRecordFn(fillLabelsFnParams, context)) {
            const totalTime = (Date.now() - startTime) / 1000;
            contextBuildingHistogram.histogram.observe(
              contextBuildingHistogram.fillLabelsFn(fillLabelsFnParams, context),
              totalTime,
            );
          }
        };
      }
    : undefined;

  const onExecute: OnExecuteHook<{}> | undefined = executeHistogram
    ? ({ args }) => {
        const fillLabelsFnParams = fillLabelsFnParamsMap.get(args.contextValue);
        if (!fillLabelsFnParams) {
          return undefined;
        }

        const startTime = Date.now();
        reqCounter?.counter
          .labels(reqCounter.fillLabelsFn(fillLabelsFnParams, args.contextValue))
          .inc();

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

        const result: OnExecuteHookResult<{}> = {
          onExecuteDone: ({ result }) => {
            const execStartTime = execStartTimeMap.get(args.contextValue);
            const handleEnd = () => {
              const totalTime = (Date.now() - startTime) / 1000;
              if (executeHistogram.shouldRecordFn(fillLabelsFnParams, args.contextValue)) {
                executeHistogram.histogram.observe(
                  executeHistogram.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                  totalTime,
                );
              }

              if (requestTotalHistogram?.shouldRecordFn(fillLabelsFnParams, args.contextValue)) {
                requestTotalHistogram.histogram.observe(
                  requestTotalHistogram.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                  totalTime,
                );
              }

              if (requestSummary && execStartTime) {
                const summaryTime = (Date.now() - execStartTime) / 1000;

                if (requestSummary.shouldRecordFn(fillLabelsFnParams, args.contextValue)) {
                  requestSummary.summary.observe(
                    requestSummary.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                    summaryTime,
                  );
                }
              }
            };
            if (!isAsyncIterable(result)) {
              handleResult(result);
              handleEnd();
              return undefined;
            } else {
              return {
                onNext({ result }) {
                  handleResult(result);
                },
                onEnd() {
                  handleEnd();
                },
              };
            }
          },
        };

        return result;
      }
    : undefined;

  const onSubscribe: OnSubscribeHook<{}> | undefined = subscribeHistogram
    ? ({ args }) => {
        const fillLabelsFnParams = fillLabelsFnParamsMap.get(args.contextValue);
        if (!fillLabelsFnParams) {
          return undefined;
        }

        const startTime = Date.now();
        reqCounter?.counter
          .labels(reqCounter.fillLabelsFn(fillLabelsFnParams, args.contextValue))
          .inc();

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

        const result: OnSubscribeHookResult<{}> = {
          onSubscribeResult: ({ result }) => {
            const execStartTime = execStartTimeMap.get(args.contextValue);
            const handleEnd = () => {
              const totalTime = (Date.now() - startTime) / 1000;
              if (subscribeHistogram.shouldRecordFn(fillLabelsFnParams, args.contextValue)) {
                subscribeHistogram.histogram.observe(
                  subscribeHistogram.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                  totalTime,
                );
              }

              if (requestTotalHistogram?.shouldRecordFn(fillLabelsFnParams, args.contextValue)) {
                requestTotalHistogram.histogram.observe(
                  requestTotalHistogram.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                  totalTime,
                );
              }

              if (requestSummary && execStartTime) {
                const summaryTime = (Date.now() - execStartTime) / 1000;

                if (requestSummary.shouldRecordFn(fillLabelsFnParams, args.contextValue)) {
                  requestSummary.summary.observe(
                    requestSummary.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                    summaryTime,
                  );
                }
              }
            };
            if (!isAsyncIterable(result)) {
              handleResult(result);
              handleEnd();
              return undefined;
            } else {
              return {
                onNext({ result }) {
                  handleResult(result);
                },
                onEnd() {
                  handleEnd();
                },
              };
            }
          },
        };

        return result;
      }
    : undefined;

  const countedSchemas = new WeakSet<GraphQLSchema>();
  return {
    onEnveloped({ context }) {
      if (!execStartTimeMap.has(context)) {
        execStartTimeMap.set(context, Date.now());
      }
    },
    onPluginInit({ addPlugin, registerContextErrorHandler }) {
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
              if (resolversHistogram.shouldRecordFn(paramsCtx, context)) {
                resolversHistogram.histogram.observe(
                  resolversHistogram.fillLabelsFn(paramsCtx, context),
                  totalTime,
                );
              }
            };
          }),
        );
      }
      registerContextErrorHandler(({ context }) => {
        const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
        let extraLabels;
        if (fillLabelsFnParams) {
          extraLabels = contextBuildingHistogram?.fillLabelsFn(fillLabelsFnParams, context);
        }
        errorsCounter?.counter
          .labels({
            ...extraLabels,
            phase: 'context',
          })
          .inc();
      });
    },
    onSchemaChange({ schema }) {
      typeInfo = new TypeInfo(schema);
      if (schemaChangeCounter && !countedSchemas.has(schema)) {
        schemaChangeCounter.counter.inc();
        countedSchemas.add(schema);
      }
    },
    onParse,
    onValidate,
    onContextBuilding,
    onExecute,
    onSubscribe,
  };
};
