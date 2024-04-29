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
import { PrometheusTracingPluginConfig } from './config.js';
import {
  createCounter,
  createFillLabelFnParams,
  createHistogram,
  createSummary,
  extractDeprecatedFields,
  FillLabelsFnParams,
  filterFillParamsFnParams,
  getHistogramFromConfig,
  instrumentRegistry,
  labelExists,
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
};

export const fillLabelsFnParamsMap = new WeakMap<any, FillLabelsFnParams | null>();
export const execStartTimeMap = new WeakMap<any, number>();

export const usePrometheus = (config: PrometheusTracingPluginConfig = {}): Plugin => {
  let typeInfo: TypeInfo | null = null;
  const registry = instrumentRegistry(config.registry || defaultRegistry);

  const parseHistogram = getHistogramFromConfig(
    config,
    'parse',
    typeof config.parse === 'string' ? config.parse : 'graphql_envelop_phase_parse',
    'Time spent on running GraphQL "parse" function',
  );
  const validateHistogram = getHistogramFromConfig(
    config,
    'validate',
    typeof config.validate === 'string' ? config.validate : 'graphql_envelop_phase_validate',
    'Time spent on running GraphQL "validate" function',
  );
  const contextBuildingHistogram = getHistogramFromConfig(
    config,
    'contextBuilding',
    typeof config.contextBuilding === 'string'
      ? config.contextBuilding
      : 'graphql_envelop_phase_context',
    'Time spent on building the GraphQL context',
  );
  const executeHistogram = getHistogramFromConfig(
    config,
    'execute',
    typeof config.execute === 'string' ? config.execute : 'graphql_envelop_phase_execute',
    'Time spent on running the GraphQL "execute" function',
  );
  const subscribeHistogram = getHistogramFromConfig(
    config,
    'subscribe',
    typeof config.subscribe === 'string' ? config.subscribe : 'graphql_envelop_phase_subscribe',
    'Time spent on running the GraphQL "subscribe" function',
  );

  const resolversHistogram =
    typeof config.resolvers === 'object'
      ? config.resolvers
      : config.resolvers === true || typeof config.resolvers === 'string'
        ? createHistogram({
            registry,
            histogram: {
              name:
                typeof config.resolvers === 'string'
                  ? config.resolvers
                  : 'graphql_envelop_execute_resolver',
              help: 'Time spent on running the GraphQL resolvers',
              labelNames: [
                'operationType',
                'operationName',
                'fieldName',
                'typeName',
                'returnType',
              ].filter(label => labelExists(config, label)),
            },
            fillLabelsFn: params =>
              filterFillParamsFnParams(config, {
                operationName: params.operationName!,
                operationType: params.operationType!,
                fieldName: params.info?.fieldName!,
                typeName: params.info?.parentType.name!,
                returnType: params.info?.returnType.toString()!,
              }),
          })
        : undefined;

  const requestTotalHistogram =
    typeof config.requestTotalDuration === 'object'
      ? config.requestTotalDuration
      : config.requestTotalDuration === true || typeof config.requestTotalDuration === 'string'
        ? createHistogram({
            registry,
            histogram: {
              name:
                typeof config.requestTotalDuration === 'string'
                  ? config.requestTotalDuration
                  : 'graphql_envelop_request_duration',
              help: 'Time spent on running the GraphQL operation from parse to execute',
              labelNames: ['operationType', 'operationName'].filter(label =>
                labelExists(config, label),
              ),
            },
            fillLabelsFn: params =>
              filterFillParamsFnParams(config, {
                operationName: params.operationName!,
                operationType: params.operationType!,
              }),
          })
        : undefined;

  const requestSummary =
    typeof config.requestSummary === 'object'
      ? config.requestSummary
      : config.requestSummary === true || typeof config.requestSummary === 'string'
        ? createSummary({
            registry,
            summary: {
              name:
                typeof config.requestSummary === 'string'
                  ? config.requestSummary
                  : 'graphql_envelop_request_time_summary',
              help: 'Summary to measure the time to complete GraphQL operations',
              labelNames: ['operationType', 'operationName'].filter(label =>
                labelExists(config, label),
              ),
            },
            fillLabelsFn: params =>
              filterFillParamsFnParams(config, {
                operationName: params.operationName!,
                operationType: params.operationType!,
              }),
          })
        : undefined;

  const errorsCounter =
    typeof config.errors === 'object'
      ? config.errors
      : config.errors === true || typeof config.errors === 'string'
        ? createCounter({
            registry,
            counter: {
              name:
                typeof config.errors === 'string' ? config.errors : 'graphql_envelop_error_result',
              help: 'Counts the amount of errors reported from all phases',
              labelNames: ['operationType', 'operationName', 'path', 'phase'].filter(label =>
                labelExists(config, label),
              ),
            },
            fillLabelsFn: params =>
              filterFillParamsFnParams(config, {
                operationName: params.operationName!,
                operationType: params.operationType!,
                path: params.error?.path?.join('.')!,
                phase: params.errorPhase!,
              }),
          })
        : undefined;

  const reqCounter =
    typeof config.requestCount === 'object'
      ? config.requestCount
      : config.requestCount === true || typeof config.requestCount === 'string'
        ? createCounter({
            registry,
            counter: {
              name:
                typeof config.requestCount === 'string'
                  ? config.requestCount
                  : 'graphql_envelop_request',
              help: 'Counts the amount of GraphQL requests executed through Envelop',
              labelNames: ['operationType', 'operationName'].filter(label =>
                labelExists(config, label),
              ),
            },
            fillLabelsFn: params =>
              filterFillParamsFnParams(config, {
                operationName: params.operationName!,
                operationType: params.operationType!,
              }),
          })
        : undefined;

  const deprecationCounter =
    typeof config.deprecatedFields === 'object'
      ? config.deprecatedFields
      : config.deprecatedFields === true || typeof config.deprecatedFields === 'string'
        ? createCounter({
            registry,
            counter: {
              name:
                typeof config.deprecatedFields === 'string'
                  ? config.deprecatedFields
                  : 'graphql_envelop_deprecated_field',
              help: 'Counts the amount of deprecated fields used in selection sets',
              labelNames: ['operationType', 'operationName', 'fieldName', 'typeName'].filter(
                label => labelExists(config, label),
              ),
            },
            fillLabelsFn: params =>
              filterFillParamsFnParams(config, {
                operationName: params.operationName!,
                operationType: params.operationType!,
                fieldName: params.deprecationInfo?.fieldName!,
                typeName: params.deprecationInfo?.typeName!,
              }),
          })
        : undefined;

  const schemaChangeCounter =
    typeof config.schemaChangeCount === 'object'
      ? config.schemaChangeCount
      : config.schemaChangeCount === true || typeof config.schemaChangeCount === 'string'
        ? createCounter({
            registry,
            counter: {
              name:
                typeof config.schemaChangeCount === 'string'
                  ? config.schemaChangeCount
                  : 'graphql_envelop_schema_change',
              help: 'Counts the amount of schema changes',
            },
            fillLabelsFn: () => ({}),
          })
        : undefined;

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
        parseHistogram?.histogram.observe(
          parseHistogram.fillLabelsFn(fillLabelsFnParams, context),
          totalTime,
        );

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
          validateHistogram.histogram.observe(labels, totalTime);

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
          const totalTime = (Date.now() - startTime) / 1000;
          contextBuildingHistogram.histogram.observe(
            contextBuildingHistogram.fillLabelsFn(fillLabelsFnParams, context),
            totalTime,
          );
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
              executeHistogram.histogram.observe(
                executeHistogram.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                totalTime,
              );

              requestTotalHistogram?.histogram.observe(
                requestTotalHistogram.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                totalTime,
              );

              if (requestSummary && execStartTime) {
                const summaryTime = (Date.now() - execStartTime) / 1000;

                requestSummary.summary.observe(
                  requestSummary.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                  summaryTime,
                );
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
              subscribeHistogram.histogram.observe(
                subscribeHistogram.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                totalTime,
              );

              requestTotalHistogram?.histogram.observe(
                requestTotalHistogram.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                totalTime,
              );

              if (requestSummary && execStartTime) {
                const summaryTime = (Date.now() - execStartTime) / 1000;

                requestSummary.summary.observe(
                  requestSummary.fillLabelsFn(fillLabelsFnParams, args.contextValue),
                  summaryTime,
                );
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
              resolversHistogram.histogram.observe(
                resolversHistogram.fillLabelsFn(paramsCtx, context),
                totalTime,
              );
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
