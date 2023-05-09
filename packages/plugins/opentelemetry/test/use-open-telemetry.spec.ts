import { buildSchema } from 'graphql';
import { traceDirective } from 'graphql-otel';
import { createTestkit } from '@envelop/testing';
import { InMemorySpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { useOpenTelemetry } from '../src/index.js';
import { buildSpanTree, cleanSpanTreeForSnapshot, otelSetup } from './utils';

const inMemorySpanExporter = otelSetup() as InMemorySpanExporter;

describe('useOpenTelemetry', () => {
  beforeEach(() => {
    inMemorySpanExporter.reset();
  });

  const trace = traceDirective('trace');

  const schema = buildSchema(/* GraphQL */ `
    ${trace.typeDefs}

    type User {
      name: String @trace
      posts: [Post] @trace
    }

    type Post {
      title: String
    }

    type Query {
      users: [User] @trace
    }
  `);

  const query = /* GraphQL */ `
    query {
      users {
        name
        posts {
          title
        }
      }
    }
  `;

  it('Should wrap the traced fields in a span and assert the tree', async () => {
    const testInstance = createTestkit([useOpenTelemetry()], schema);

    await testInstance.execute(query);
    const spans = inMemorySpanExporter.getFinishedSpans();
    const rootSpan = spans.find(span => !span.parentSpanId) as ReadableSpan;
    const spanTree = buildSpanTree({ span: rootSpan, children: [] }, spans);

    const cleanTree = cleanSpanTreeForSnapshot(spanTree);

    expect(JSON.stringify(cleanTree, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"span\\": {
          \\"attributes\\": {
            \\"query\\": \\"{\\\\n  users {\\\\n    name\\\\n    posts {\\\\n      title\\\\n    }\\\\n  }\\\\n}\\"
          },
          \\"links\\": [],
          \\"events\\": [],
          \\"status\\": {
            \\"code\\": 0
          },
          \\"name\\": \\"Query:users\\",
          \\"kind\\": 0
        },
        \\"children\\": []
      }"
    `);
  });
});
