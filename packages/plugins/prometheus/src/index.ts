/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { Plugin, OnExecuteHookResult, OnParseHook, OnValidateHook, OnContextBuildingHook, OnExecuteHook } from '@envelop/types';
import { Counter, Histogram, register as defaultRegistry } from 'prom-client';
import {
  getHistogramFromConfig,
  createHistogram,
  createCounter,
  shouldTraceFieldResolver,
  FillLabelsFnParams,
  createInternalContext,
} from './utils';
import { PrometheusTracingPluginConfig } from './config';

export { PrometheusTracingPluginConfig, createCounter, createHistogram, FillLabelsFnParams };

const promPluginContext = Symbol('promPluginContext');

type PluginInternalContext = {
  [promPluginContext]: FillLabelsFnParams;
};

export const usePrometheus = (config: PrometheusTracingPluginConfig = {}): Plugin<PluginInternalContext> => {
  const parseHistogram = getHistogramFromConfig(
    config,
    'parse',
    'graphql_envelop_phase_parse',
    'Time spent on running GraphQL "parse" function'
  );
  const validateHistogram = getHistogramFromConfig(
    config,
    'validate',
    'graphql_envelop_phase_validate',
    'Time spent on running GraphQL "validate" function'
  );
  const contextBuildingHistogram = getHistogramFromConfig(
    config,
    'contextBuilding',
    'graphql_envelop_phase_context',
    'Time spent on building the GraphQL context'
  );
  const executeHistogram = getHistogramFromConfig(
    config,
    'execute',
    'graphql_envelop_phase_execute',
    'Time spent on running the GraphQL "execute" function'
  );

  const resolversHistogram =
    typeof config.resolvers === 'object'
      ? config.resolvers
      : config.resolvers === true
      ? createHistogram({
          histogram: new Histogram({
            name: 'graphql_envelop_execute_resolver',
            help: 'Time spent on running the GraphQL resolvers',
            labelNames: ['operationType', 'operationName', 'fieldName', 'typeName', 'returnType'] as const,
            registers: [config.registry || defaultRegistry],
          }),
          fillLabelsFn: params => ({
            operationName: params.operationName,
            operationType: params.operationType,
            fieldName: params.info?.fieldName!,
            typeName: params.info?.parentType.name!,
            returnType: params.info?.returnType.toString()!,
          }),
        })
      : undefined;

  const errorsCounter =
    typeof config.errors === 'object'
      ? config.errors
      : config.errors === true
      ? createCounter({
          counter: new Counter({
            name: 'graphql_envelop_error_result',
            help: 'Counts the amount of errors reported from all phases',
            labelNames: ['operationType', 'operationName', 'path', 'phase'] as const,
            registers: [config.registry || defaultRegistry],
          }),
          fillLabelsFn: params => ({
            operationName: params.operationName,
            operationType: params.operationType,
            path: params.error?.path?.join('.')!,
            phase: params.errorPhase!,
          }),
        })
      : undefined;

  const deprecationCounter =
    typeof config.deprecatedFields === 'object'
      ? config.deprecatedFields
      : config.deprecatedFields === true
      ? createCounter({
          counter: new Counter({
            name: 'graphql_envelop_deprecated_field',
            help: 'Counts the amount of deprecated fields used in selection sets',
            labelNames: ['operationType', 'operationName', 'fieldName', 'typeName'] as const,
            registers: [config.registry || defaultRegistry],
          }),
          fillLabelsFn: params => ({
            operationName: params.operationName,
            operationType: params.operationType,
            fieldName: params.info?.fieldName!,
            typeName: params.info?.parentType.name!,
          }),
        })
      : undefined;

  const onParse: OnParseHook<PluginInternalContext> = ({ extendContext }) => {
    const startTime = Date.now();

    return params => {
      const totalTime = (Date.now() - startTime) / 1000;
      const internalContext = createInternalContext(params.result);

      if (internalContext) {
        extendContext({
          [promPluginContext]: internalContext,
        });

        if (parseHistogram) {
          const labels = parseHistogram.fillLabelsFn ? parseHistogram.fillLabelsFn(internalContext) : {};
          parseHistogram.histogram.observe(labels, totalTime);
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

  const onValidate: OnValidateHook<PluginInternalContext> | undefined = validateHistogram
    ? ({ context }) => {
        if (!context[promPluginContext]) {
          return undefined;
        }

        const startTime = Date.now();

        return ({ valid }) => {
          const labels = validateHistogram.fillLabelsFn ? validateHistogram.fillLabelsFn(context[promPluginContext]) : {};
          const totalTime = (Date.now() - startTime) / 1000;
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

  const onContextBuilding: OnContextBuildingHook<PluginInternalContext> | undefined = contextBuildingHistogram
    ? ({ context }) => {
        if (!context[promPluginContext]) {
          return undefined;
        }

        const startTime = Date.now();

        return () => {
          const totalTime = (Date.now() - startTime) / 1000;
          const labels = contextBuildingHistogram.fillLabelsFn
            ? contextBuildingHistogram.fillLabelsFn(context[promPluginContext])
            : {};
          contextBuildingHistogram.histogram.observe(labels, totalTime);
        };
      }
    : undefined;

  const onExecute: OnExecuteHook<PluginInternalContext> | undefined = executeHistogram
    ? ({ args }) => {
        if (!args.contextValue[promPluginContext]) {
          return undefined;
        }

        const startTime = Date.now();
        const result: OnExecuteHookResult<PluginInternalContext> = {
          onExecuteDone: ({ result }) => {
            const totalTime = (Date.now() - startTime) / 1000;
            const labels = executeHistogram.fillLabelsFn
              ? executeHistogram.fillLabelsFn(args.contextValue[promPluginContext])
              : {};
            executeHistogram.histogram.observe(labels, totalTime);

            if (errorsCounter && result.errors && result.errors.length > 0) {
              for (const error of result.errors) {
                const errorLabels = errorsCounter.fillLabelsFn
                  ? errorsCounter.fillLabelsFn({
                      ...args.contextValue[promPluginContext],
                      errorPhase: 'execute',
                      error,
                    })
                  : {};
                errorsCounter.counter.labels(errorLabels).inc();
              }
            }
          },
        };

        if (resolversHistogram) {
          result.onResolverCalled = ({ info }) => {
            const shouldTrace = shouldTraceFieldResolver(info, config.resolversWhitelist);

            if (!shouldTrace) {
              return undefined;
            }

            const startTime = Date.now();

            return () => {
              const paramsCtx = {
                ...args.contextValue[promPluginContext],
                info,
              };
              const totalTime = (Date.now() - startTime) / 1000;
              const labels = resolversHistogram.fillLabelsFn ? resolversHistogram.fillLabelsFn(paramsCtx) : {};
              resolversHistogram.histogram.observe(labels, totalTime);

              if (deprecationCounter && info.parentType.getFields()[info.fieldName].isDeprecated) {
                const depLabels = deprecationCounter.fillLabelsFn ? deprecationCounter.fillLabelsFn(paramsCtx) : {};
                deprecationCounter.counter.labels(depLabels).inc();
              }
            };
          };
        }

        return result;
      }
    : undefined;

  return {
    onParse,
    onValidate,
    onContextBuilding,
    onExecute,
  };
};
