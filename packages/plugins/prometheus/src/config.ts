import { Registry } from 'prom-client';
import { createCounter, createHistogram, createSummary } from './utils.js';

export type PrometheusTracingPluginConfig = {
  registry?: Registry;
  skipIntrospection?: boolean;
  resolversWhitelist?: string[];

  metrics: MetricsConfig;

  labels?: LabelsConfig;
};

export type MetricsConfig = {
  graphql_envelop_request?: boolean | string | ReturnType<typeof createCounter>;
  graphql_envelop_request_duration?: boolean | string | ReturnType<typeof createHistogram>;
  graphql_envelop_request_time_summary?: boolean | string | ReturnType<typeof createSummary>;
  graphql_envelop_phase_parse?: boolean | string | ReturnType<typeof createHistogram>;
  graphql_envelop_phase_validate?: boolean | string | ReturnType<typeof createHistogram>;
  graphql_envelop_phase_context?: boolean | string | ReturnType<typeof createHistogram>;
  graphql_envelop_phase_execute?: boolean | string | ReturnType<typeof createHistogram>;
  graphql_envelop_phase_subscribe?: boolean | string | ReturnType<typeof createHistogram>;
  graphql_envelop_error_result?: boolean | string | ReturnType<typeof createCounter>;
  graphql_envelop_deprecated_field?: boolean | string | ReturnType<typeof createCounter>;
  graphql_envelop_schema_change?: boolean | string | ReturnType<typeof createCounter>;

  graphql_envelop_execute_resolver?: boolean | string | ReturnType<typeof createHistogram>;
};

export type LabelsConfig = {
  operationName?: boolean;
  operationType?: boolean;
  fieldName?: boolean;
  typeName?: boolean;
  returnType?: boolean;
};
