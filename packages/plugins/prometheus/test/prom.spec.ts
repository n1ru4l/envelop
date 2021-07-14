import { PrometheusTracingPluginConfig, usePrometheus, createHistogram } from '../src';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createTestkit } from '@envelop/testing';
import { Registry, Histogram } from 'prom-client';
import { print } from 'graphql';

describe('Prom Metrics plugin', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        regularField: String!
        longField: String!
      }
    `,
    resolvers: {
      Query: {
        regularField() {
          return 'regular';
        },
        async longField() {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve('long');
            }, 500);
          });
        },
      },
    },
  });

  function prepare(config: PrometheusTracingPluginConfig, externalRegistry?: Registry) {
    const registry = externalRegistry || new Registry();

    const plugin = usePrometheus({
      ...config,
      registry,
    });
    const teskit = createTestkit([plugin], schema);

    return {
      execute: teskit.execute,
      plugin,
      async metricString(name: string) {
        return registry.getSingleMetricAsString(name);
      },
      async metricCount(name: string, sub: string | null = null) {
        const arr = await registry.getMetricsAsJSON();
        const m = arr.find(m => m.name === name);

        if (m) {
          return ((m as any).values || []).filter((v: any) => (sub === null ? true : v.metricName === `${name}_${sub}`)).length;
        }

        return 0;
      },
    };
  }

  describe('parse', () => {
    it('Should trace error during parse', async () => {
      const { execute, metricCount, metricString } = prepare({ parse: true, errors: true });
      const result = await execute('query {');

      expect(result.errors?.length).toBe(1);
      expect(await metricString('graphql_envelop_error_result')).toContain('graphql_envelop_error_result{phase="parse"} 1');
      expect(await metricCount('graphql_envelop_error_result')).toBe(1);
      expect(await metricCount('graphql_envelop_phase_parse')).toBe(0);
    });

    it('Should trace valid parse result', async () => {
      const { execute, metricCount, metricString } = prepare({ parse: true, errors: true });
      const result = await execute('query { regularField }');

      expect(result.errors).toBeUndefined();
      expect(await metricCount('graphql_envelop_error_result')).toBe(0);
      expect(await metricCount('graphql_envelop_phase_parse', 'count')).toBe(1);
      expect(await metricString('graphql_envelop_phase_parse')).toContain(
        `graphql_envelop_phase_parse_count{operationName=\"Anonymous\",operationType=\"query\"} 1`
      );
    });

    it('Should skip parse when parse = false', async () => {
      const { execute, metricCount, plugin } = prepare({ parse: false });
      const result = await execute('query { regularField }');

      expect(plugin.onParse).toBeUndefined();
      expect(result.errors).toBeUndefined();
      expect(await metricCount('graphql_envelop_phase_parse')).toBe(0);
    });

    it('Should allow to use custom Histogram and custom labelNames', async () => {
      const registry = new Registry();
      const { execute, metricCount, metricString } = prepare(
        {
          errors: true,
          parse: createHistogram({
            histogram: new Histogram({
              name: 'test_parse',
              help: 'HELP ME',
              labelNames: ['opText'] as const,
              registers: [registry],
            }),
            fillLabelsFn: params => {
              return {
                opText: print(params.document),
              };
            },
          }),
        },
        registry
      );
      const result = await execute('query { regularField }');

      expect(result.errors).toBeUndefined();
      expect(await metricCount('graphql_envelop_error_result')).toBe(0);
      expect(await metricCount('test_parse', 'count')).toBe(1);
      expect(await metricString('test_parse')).toContain(`test_parse_count{opText=\"{\\n  regularField\\n}\\n\"} 1`);
    });
  });

  describe.only('validate', () => {
    it('should register to onValidate event when needed', () => {
      const { plugin } = prepare({ validate: true, errors: true });
      expect(plugin.onValidate).toBeDefined();
    });

    it('Should trace error during validate, and also trace timing', async () => {
      const { execute, metricCount, metricString } = prepare({ validate: true, errors: true });
      const result = await execute('query test($v: String!) { regularField }');

      expect(result.errors?.length).toBe(1);
      expect(await metricString('graphql_envelop_error_result')).toContain(
        'graphql_envelop_error_result{operationName="test",operationType="query",phase="validate"} 1'
      );
      expect(await metricCount('graphql_envelop_error_result')).toBe(1);
      expect(await metricCount('graphql_envelop_phase_validate', 'count')).toBe(1);
    });

    it('Should trace valid validations result', () => {});
    it('Should skip validate when validate = false', () => {});
  });

  describe('contextBuilding', () => {
    it('Should trace valid contextBuilding result', () => {});
    it('Should skip contextBuilding when contextBuilding = false', () => {});
  });

  describe('execute', () => {
    it('Should trace error during execute with a single error', () => {});
    it('Should trace error during execute with a multiple errors', () => {});
    it('Should trace valid execute result', () => {});
    it('Should skip execute when execute = false', () => {});
  });

  describe('errors', () => {
    it('Should not trace parse errors when not needed', () => {});
    it('Should not trace validate errors when not needed', () => {});
    it('Should not trace execute errors when not needed', () => {});
  });

  describe('resolvers', () => {
    it('Should not trace resolvers when not needed', () => {});
    it('Should trace all resolvers times correctly', () => {});
    it('Should trace only specified resolvers when resolversWhitelist is used', () => {});
  });

  describe('deprecation', () => {
    it('Should not trace deprecation when not needed', () => {});
    it('Should trace all deprecated fields times correctly', () => {});
  });
});
