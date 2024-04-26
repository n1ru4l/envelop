import {
  ASTNode,
  DocumentNode,
  GraphQLError,
  GraphQLResolveInfo,
  OperationDefinitionNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import {
  Counter,
  register as defaultRegistry,
  Histogram,
  Summary,
  type HistogramConfiguration,
  type Registry,
} from 'prom-client';
import { AfterParseEventPayload } from '@envelop/core';
import { PrometheusTracingPluginConfig } from './config.js';

const histograms = new WeakMap<Registry, Map<string, Histogram>>();

export type DeprecatedFieldInfo = {
  fieldName: string;
  typeName: string;
};

export type FillLabelsFnParams = {
  document?: DocumentNode;
  operationName?: string;
  operationType?: OperationDefinitionNode['operation'];
  info?: GraphQLResolveInfo;
  errorPhase?: string;
  error?: GraphQLError;
  deprecationInfo?: DeprecatedFieldInfo;
};

export function shouldTraceFieldResolver(
  info: GraphQLResolveInfo,
  whitelist: string[] | undefined,
): boolean {
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

export function createFillLabelFnParams(
  parseResult: AfterParseEventPayload<any>['result'],
  context: any,
  filterParams: (params: FillLabelsFnParams) => FillLabelsFnParams | null,
): FillLabelsFnParams | null {
  if (parseResult === null) {
    return null;
  }
  if (parseResult instanceof Error) {
    return null;
  }
  const operation = getOperation(parseResult);
  return filterParams({
    document: parseResult,
    operationName: context?.params?.operationName || operation.name?.value || 'Anonymous',
    operationType: operation.operation,
  });
}

export type FillLabelsFn<LabelNames extends string> = (
  params: FillLabelsFnParams,
  rawContext: any,
) => Record<LabelNames, string>;

export type HistogramAndLabels<LabelNames extends string> = {
  histogram: Histogram<LabelNames>;
  fillLabelsFn: FillLabelsFn<LabelNames>;
};

export function registerHistogram<LabelNames extends string>(
  registry: Registry,
  conf: Omit<HistogramConfiguration<LabelNames>, 'registers'>,
): Histogram<LabelNames> {
  if (!histograms.has(registry)) {
    histograms.set(registry, new Map());
  }
  const registryHistograms = histograms.get(registry)!;
  if (!registryHistograms.has(conf.name)) {
    (conf as HistogramConfiguration<LabelNames>).registers = [registry];
    registryHistograms.set(conf.name, new Histogram(conf));
  }
  return registryHistograms.get(conf.name)!;
}

export function createHistogram<LabelNames extends string>(options: {
  registry: Registry;
  histogram: Omit<HistogramConfiguration<LabelNames>, 'registers'>;
  fillLabelsFn: FillLabelsFn<LabelNames>;
}): HistogramAndLabels<LabelNames> {
  return {
    histogram: registerHistogram(options.registry, options.histogram),
    // histogram: new Histogram(options.histogram),
    fillLabelsFn: options.fillLabelsFn,
  };
}

export function createSummary<LabelNames extends string>(options: {
  summary: Summary<LabelNames>;
  fillLabelsFn: FillLabelsFn<LabelNames>;
}): typeof options {
  return options;
}

export function createCounter<LabelNames extends string>(options: {
  counter: Counter<LabelNames>;
  fillLabelsFn: FillLabelsFn<LabelNames>;
}): typeof options {
  return options;
}

export function getHistogramFromConfig(
  config: PrometheusTracingPluginConfig,
  phase: keyof PrometheusTracingPluginConfig,
  name: string,
  help: string,
): ReturnType<typeof createHistogram> | undefined {
  return typeof config[phase] === 'object'
    ? (config[phase] as ReturnType<typeof createHistogram>)
    : config[phase] === true
      ? createHistogram({
          registry: config.registry || defaultRegistry,
          histogram: {
            name,
            help,
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
}

export function extractDeprecatedFields(node: ASTNode, typeInfo: TypeInfo): DeprecatedFieldInfo[] {
  const found: DeprecatedFieldInfo[] = [];

  visit(
    node,
    visitWithTypeInfo(typeInfo, {
      Argument: () => {
        const argument = typeInfo.getArgument();
        const field = typeInfo.getFieldDef();
        if (
          field &&
          argument &&
          (argument.deprecationReason != null || (argument as any).isDeprecated)
        ) {
          found.push({
            fieldName: argument.name,
            // the GraphQLArgument type doesn't contain context regarding the mutation the argument was passed to
            // however, when visiting an argument, typeInfo.getFieldDef returns the mutation
            typeName: field.name, // this is the mutation name
          });
        }
      },

      Field: () => {
        const field = typeInfo.getFieldDef();

        if (field && (field.deprecationReason != null || (field as any).isDeprecated)) {
          found.push({
            fieldName: field.name,
            typeName: typeInfo.getParentType()!.name || '',
          });
        }
      },
    }),
  );

  return found;
}

export function labelExists(config: PrometheusTracingPluginConfig, label: string) {
  const labelFlag = config.labels?.[label];
  if (labelFlag == null) {
    return true;
  }
  return labelFlag;
}

export function filterFillParamsFnParams(
  config: PrometheusTracingPluginConfig,
  params: Record<string, any>,
) {
  return Object.fromEntries(Object.entries(params).filter(([key]) => labelExists(config, key)));
}
