import { GraphQLError, DocumentNode, OperationDefinitionNode, GraphQLResolveInfo } from 'graphql';
import { AfterParseEventPayload } from '@envelop/types';
import { PrometheusTracingPluginConfig } from './config';
import { Counter, Histogram, register as defaultRegistry } from 'prom-client';

export type FillLabelsFnParams = {
  document: DocumentNode;
  operationName: string;
  operationType: OperationDefinitionNode['operation'];
  info?: GraphQLResolveInfo;
  errorPhase?: string;
  error?: GraphQLError;
};

export function shouldTraceFieldResolver(info: GraphQLResolveInfo, whitelist: string[] | undefined): boolean {
  if (!whitelist) {
    return true;
  }

  const parentType = info.parentType.name;
  const fieldName = info.fieldName;
  const coordinate = `${parentType}.${fieldName}`;

  return whitelist.includes(coordinate) || whitelist.includes(`${parentType}.*`);
}

function getOperation(document: DocumentNode): OperationDefinitionNode {
  return document.definitions[0] as OperationDefinitionNode;
}

export function createInternalContext(parseResult: AfterParseEventPayload<any>['result']): FillLabelsFnParams | null {
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

export function getHistogramFromConfig(
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
          registers: [config.registry || defaultRegistry],
        }),
        fillLabelsFn: params => ({
          operationName: params.operationName,
          operationType: params.operationType,
        }),
      })
    : undefined;
}
