import { Registry } from 'prom-client';
import { createCounter, createHistogram, createSummary } from './utils.js';

export type PrometheusTracingPluginConfig = {
  requestCount?: boolean | string | ReturnType<typeof createCounter>;
  requestTotalDuration?: boolean | string | ReturnType<typeof createHistogram>;
  requestSummary?: boolean | string | ReturnType<typeof createSummary>;
  parse?: boolean | string | ReturnType<typeof createHistogram>;
  validate?: boolean | string | ReturnType<typeof createHistogram>;
  contextBuilding?: boolean | string | ReturnType<typeof createHistogram>;
  execute?: boolean | string | ReturnType<typeof createHistogram>;
  subscribe?: boolean | string | ReturnType<typeof createHistogram>;
  errors?: boolean | string | ReturnType<typeof createCounter>;
  resolvers?: boolean | string | ReturnType<typeof createHistogram>;
  resolversWhitelist?: string[];
  deprecatedFields?: boolean | string | ReturnType<typeof createCounter>;
  registry?: Registry;
  skipIntrospection?: boolean;
  schemaChangeCount?: boolean | string | ReturnType<typeof createCounter>;
  labels?: {
    operationName?: boolean;
    operationType?: boolean;
    fieldName?: boolean;
    typeName?: boolean;
    returnType?: boolean;
  };
};
