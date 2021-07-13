/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import {
  Plugin,
  OnExecuteHookResult,
  OnParseHook,
  AfterParseEventPayload,
  OnValidateHook,
  OnContextBuildingHook,
  OnExecuteHook,
} from '@envelop/types';
import { DocumentNode, OperationDefinitionNode, GraphQLResolveInfo } from 'graphql';
import { Counter, Histogram } from 'prom-client';

export type TracerOptions<Args> = {
  name: string;
  help?: string;
  modifyReportLabels?: (args: Args, labels: Record<string, string>) => Record<string, string>[];
};

const promPluginContext = Symbol('promPluginContext');

export type FillLabelsFnParams = {
  document: DocumentNode;
  operationName: string;
  operationType: OperationDefinitionNode['operation'];
  info?: GraphQLResolveInfo;
  errorPath?: string;
  errorPhase?: string;
};

function getOperation(document: DocumentNode): OperationDefinitionNode {
  return document.definitions[0] as OperationDefinitionNode;
}

function createInternalContext(parseResult: AfterParseEventPayload<any>['result']): FillLabelsFnParams | null {
  if (parseResult === null) {
    return null;
  } else if (parseResult instanceof Error) {
    return null;
  } else {
    const operation = getOperation(parseResult);
    return {
      document: parseResult,
      operationName: operation.name?.value || 'Anonymous',
      operationType: operation.operation,
    };
  }
}

export function createHistogram<LabelNames extends string>(options: {
  histogram: Histogram<LabelNames>;
  fillLabelsFn?: (params: FillLabelsFnParams) => Record<LabelNames, string>;
}): typeof options {
  return options;
}

export function createCounter<LabelNames extends string>(options: {
  counter: Counter<LabelNames>;
  fillLabelsFn?: (params: FillLabelsFnParams) => Record<LabelNames, string>;
}): typeof options {
  return options;
}

export type PrometheusTracingPluginConfig = {
  parse?: boolean | ReturnType<typeof createHistogram>;
  validate?: boolean | ReturnType<typeof createHistogram>;
  contextBuilding?: boolean | ReturnType<typeof createHistogram>;
  execute?: boolean | ReturnType<typeof createHistogram>;
  errors?: ReturnType<typeof createCounter>;
  resolvers?: ReturnType<typeof createHistogram>;
  deprecatedFields?: ReturnType<typeof createCounter>;
};

function getHistogram(
  config: PrometheusTracingPluginConfig,
  phase: keyof PrometheusTracingPluginConfig,
  name: string,
  help: string
): ReturnType<typeof createHistogram> | undefined {
  return typeof config[phase] === 'object'
    ? (config[phase] as ReturnType<typeof createHistogram>)
    : config[phase] === true
    ? createHistogram({
        histogram: new Histogram({
          name,
          help,
          labelNames: ['operationType', 'operationName'] as const,
        }),
        fillLabelsFn: params => ({
          operationName: params.operationName,
          operationType: params.operationType,
        }),
      })
    : undefined;
}

type PluginInternalContext = {
  [promPluginContext]: FillLabelsFnParams;
};

export const usePrometheus = (config: PrometheusTracingPluginConfig): Plugin<PluginInternalContext> => {
  const parseHistogram = getHistogram(
    config,
    'parse',
    'graphql_envelop_phase_parse',
    'Time spent on running GraphQL "parse" function'
  );
  const validateHistogram = getHistogram(
    config,
    'validate',
    'graphql_envelop_phase_validate',
    'Time spent on running GraphQL "validate" function'
  );
  const contextBuildingHistogram = getHistogram(
    config,
    'contextBuilding',
    'graphql_envelop_phase_context',
    'Time spent on building the GraphQL context'
  );
  const executeHistogram = getHistogram(
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
          }),
          fillLabelsFn: params => ({
            operationName: params.operationName,
            operationType: params.operationType,
            path: params.errorPath!,
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
          }),
          fillLabelsFn: params => ({
            operationName: params.operationName,
            operationType: params.operationType,
            fieldName: params.info?.fieldName!,
            typeName: params.info?.parentType.name!,
          }),
        })
      : undefined;

  const onParse: OnParseHook<PluginInternalContext> | undefined = parseHistogram
    ? ({ extendContext }) => {
        const startTime = Date.now();

        return params => {
          const internalContext = createInternalContext(params.result);

          if (internalContext) {
            extendContext({
              [promPluginContext]: internalContext,
            });

            const totalTime = (Date.now() - startTime) / 1000;
            const labels = parseHistogram.fillLabelsFn ? parseHistogram.fillLabelsFn(internalContext) : {};
            parseHistogram.histogram.observe(labels, totalTime);
          } else {
            // means that we got a parse error, report it
            errorsCounter?.counter
              .labels({
                phase: 'parse',
              })
              .inc();
          }
        };
      }
    : undefined;

  const onValidate: OnValidateHook<PluginInternalContext> | undefined = validateHistogram
    ? ({ context }) => {
        if (context[promPluginContext]) {
          const startTime = Date.now();

          return ({ valid }) => {
            const labels = validateHistogram.fillLabelsFn ? validateHistogram.fillLabelsFn(context[promPluginContext]) : {};
            const totalTime = (Date.now() - startTime) / 1000;
            validateHistogram.histogram.observe(labels, totalTime);
            errorsCounter?.counter.labels(labels).inc();
          };
        }

        return undefined;
      }
    : undefined;

  const onContextBuilding: OnContextBuildingHook<PluginInternalContext> | undefined = contextBuildingHistogram
    ? ({ context }) => {
        if (context[promPluginContext]) {
          const startTime = Date.now();

          return () => {
            const totalTime = (Date.now() - startTime) / 1000;
            const labels = contextBuildingHistogram.fillLabelsFn
              ? contextBuildingHistogram.fillLabelsFn(context[promPluginContext])
              : {};
            contextBuildingHistogram.histogram.observe(labels, totalTime);
          };
        }

        return undefined;
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
                      errorPath: error.path?.join('.'),
                    })
                  : {};

                errorsCounter.counter.labels(errorLabels).inc();
              }
            }
          },
        };

        if (resolversHistogram) {
          result.onResolverCalled = ({ info }) => {
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
                deprecationCounter.counter.labels(depLabels).inc(totalTime);
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
