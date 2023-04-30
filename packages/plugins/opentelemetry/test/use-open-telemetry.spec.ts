import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { BasicTracerProvider, SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { buildSchema } from 'graphql';
import { useOpenTelemetry } from '../src/index.js';
import { makeExecutableSchema } from '@graphql-tools/schema';
import * as opentelemetry from '@opentelemetry/api';

function createTraceProvider(exporter: InMemorySpanExporter) {
  const provider = new BasicTracerProvider();
  const processor = new SimpleSpanProcessor(exporter);
  provider.addSpanProcessor(processor);
  provider.register();
  return provider;
}

describe('useOpenTelemetry', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      ping: String
    }
  `);
  const query = /* GraphQL */ `
    query {
      ping
    }
  `;

  const useTestOpenTelemetry = (exporter?: InMemorySpanExporter, options?: any) =>
    useOpenTelemetry(
      {
        resolvers: false,
        result: false,
        variables: false,
        ...(options ?? {}),
      },
      exporter ? createTraceProvider(exporter) : undefined
    );

  it('Should override execute function', async () => {
    const onExecuteSpy = jest.fn();
    const testInstance = createTestkit(
      [
        useTestOpenTelemetry(),
        {
          onExecute: onExecuteSpy,
        },
      ],
      schema
    );

    const result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(onExecuteSpy).toHaveBeenCalledTimes(1);
  });

  it('Should add execution span', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit([useTestOpenTelemetry(exporter)], schema);

    await testInstance.execute(query);
    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(1);
    expect(actual[0].name).toBe('Anonymous Operation');
  });

  it('Should add resolver span if requested', async () => {
    const exporter = new InMemorySpanExporter();
    const testInstance = createTestkit([useTestOpenTelemetry(exporter, { resolvers: true })], schema);

    await testInstance.execute(query);
    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(2);
    expect(actual[0].name).toBe('Query.ping');
    expect(actual[1].name).toBe('Anonymous Operation');
  });

  it('Should setup the active context for resolver', async () => {
    const exporter = new InMemorySpanExporter();
    const provider = createTraceProvider(exporter);

    const tracer = provider.getTracer('grapqhl');

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          ping: String!
        }
      `,
      resolvers: {
        Query: {
          ping: () => {
            expect(opentelemetry.context.active()).not.toEqual(opentelemetry.ROOT_CONTEXT);
            const parent = opentelemetry.trace.getSpan(opentelemetry.context.active());
            expect(parent).not.toBeUndefined();
            tracer.startSpan('Test Span', {}, opentelemetry.context.active()).end();
            return 'hello world';
          },
        },
      },
    });

    const testInstance = createTestkit([useTestOpenTelemetry(exporter, { resolvers: true })], schema);

    await testInstance.execute(query);

    const actual = exporter.getFinishedSpans();
    expect(actual.length).toBe(3);
    expect(actual[0].name).toBe('Test Span');
    expect(actual[1].name).toBe('Query.ping');
    expect(actual[2].name).toBe('Anonymous Operation');
  });
});
