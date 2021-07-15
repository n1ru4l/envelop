import { createCounter, createHistogram } from './utils';
import { Registry } from 'prom-client';

export type PrometheusTracingPluginConfig = {
  parse?: boolean | ReturnType<typeof createHistogram>;
  validate?: boolean | ReturnType<typeof createHistogram>;
  contextBuilding?: boolean | ReturnType<typeof createHistogram>;
  execute?: boolean | ReturnType<typeof createHistogram>;
  errors?: boolean | ReturnType<typeof createCounter>;
  resolvers?: boolean | ReturnType<typeof createHistogram>;
  resolversWhitelist?: string[];
  deprecatedFields?: boolean | ReturnType<typeof createCounter>;
  registry?: Registry;
};
