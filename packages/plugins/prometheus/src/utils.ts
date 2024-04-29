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
  type CounterConfiguration,
  type HistogramConfiguration,
  type Registry,
  type SummaryConfiguration,
} from 'prom-client';
import { AfterParseEventPayload } from '@envelop/core';
import { PrometheusTracingPluginConfig } from './config.js';

const histograms = new WeakMap<Registry, Map<string, Histogram>>();
const summaries = new WeakMap<Registry, Map<string, Summary>>();
const counters = new WeakMap<Registry, Map<string, Counter>>();

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

export type FillLabelsFn<LabelNames extends string, Params extends Record<string, any>> = (
  params: Params,
  rawContext: any,
) => Record<LabelNames, string | number>;

export type HistogramAndLabels<LabelNames extends string, Params extends Record<string, any>> = {
  histogram: Histogram<LabelNames>;
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
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

export function createHistogram<
  LabelNames extends string,
  Params extends Record<string, any> = FillLabelsFnParams,
>(options: {
  registry: Registry;
  histogram: Omit<HistogramConfiguration<LabelNames>, 'registers'>;
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
}): HistogramAndLabels<LabelNames, Params> {
  return {
    histogram: registerHistogram(options.registry, options.histogram),
    // histogram: new Histogram(options.histogram),
    fillLabelsFn: options.fillLabelsFn,
  };
}

export type SummaryAndLabels<LabelNames extends string, Params extends Record<string, any>> = {
  summary: Summary<LabelNames>;
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
};

export function registerSummary<LabelNames extends string>(
  registry: Registry,
  conf: Omit<SummaryConfiguration<LabelNames>, 'registers'>,
): Summary<LabelNames> {
  if (!summaries.has(registry)) {
    summaries.set(registry, new Map());
  }
  const registrySummaries = summaries.get(registry)!;
  if (!registrySummaries.has(conf.name)) {
    (conf as HistogramConfiguration<LabelNames>).registers = [registry];
    registrySummaries.set(conf.name, new Summary(conf));
  }
  return registrySummaries.get(conf.name)!;
}

export function createSummary<
  LabelNames extends string,
  Params extends Record<string, any> = FillLabelsFnParams,
>(options: {
  registry: Registry;
  summary: Omit<SummaryConfiguration<LabelNames>, 'registers'>;
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
}): SummaryAndLabels<LabelNames, Params> {
  return {
    summary: registerSummary(options.registry, options.summary),
    fillLabelsFn: options.fillLabelsFn,
  };
}

export type CounterAndLabels<LabelNames extends string, Params extends Record<string, any>> = {
  counter: Counter<LabelNames>;
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
};

export function registerCounter<LabelNames extends string>(
  registry: Registry,
  conf: Omit<CounterConfiguration<LabelNames>, 'registers'>,
): Counter<LabelNames> {
  if (!counters.has(registry)) {
    counters.set(registry, new Map());
  }
  const registryCounters = counters.get(registry)!;
  if (!registryCounters.has(conf.name)) {
    (conf as CounterConfiguration<LabelNames>).registers = [registry];
    registryCounters.set(conf.name, new Counter(conf));
  }
  return registryCounters.get(conf.name)!;
}

export function createCounter<
  LabelNames extends string,
  Params extends Record<string, any> = FillLabelsFnParams,
>(options: {
  registry: Registry;
  counter: Omit<CounterConfiguration<LabelNames>, 'registers'>;
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
}): CounterAndLabels<LabelNames, Params> {
  return {
    counter: registerCounter(options.registry, options.counter),
    fillLabelsFn: options.fillLabelsFn,
  };
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

const clearRegistry = new WeakMap<Registry, () => void>();
export function instrumentRegistry(registry: Registry) {
  if (!clearRegistry.has(registry)) {
    clearRegistry.set(registry, registry.clear.bind(registry));
  }
  registry.clear = () => {
    histograms.delete(registry);
    summaries.delete(registry);
    counters.delete(registry);
    clearRegistry.get(registry)!();
  };
  return registry;
}
