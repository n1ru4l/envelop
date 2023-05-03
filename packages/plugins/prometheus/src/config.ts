import { Registry } from 'prom-client';
import { createCounter, createHistogram, createSummary } from './utils.js';

export type PrometheusTracingPluginConfig = {
  requestCount?: boolean | ReturnType<typeof createCounter>;
  requestTotalDuration?: boolean | ReturnType<typeof createHistogram>;
  requestSummary?: boolean | ReturnType<typeof createSummary>;
  parse?: boolean | ReturnType<typeof createHistogram>;
  validate?: boolean | ReturnType<typeof createHistogram>;
  contextBuilding?: boolean | ReturnType<typeof createHistogram>;
  execute?: boolean | ReturnType<typeof createHistogram>;
  errors?: boolean | ReturnType<typeof createCounter>;
  resolvers?: boolean | ReturnType<typeof createHistogram>;
  resolversWhitelist?: string[];
  deprecatedFields?: boolean | ReturnType<typeof createCounter>;
  registry?: Registry;
  skipIntrospection?: boolean;
};
