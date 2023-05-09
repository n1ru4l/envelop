import { traceDirective } from 'graphql-otel';
import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { InMemorySpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { useOpenTelemetry } from '../src/index.js';
import { buildSpanTree, cleanSpanTreeForSnapshot, otelSetup } from './utils';

const inMemorySpanExporter = otelSetup() as InMemorySpanExporter;

describe('useOpenTelemetry', () => {
  beforeEach(() => {
    inMemorySpanExporter.reset();
  });

  const trace = traceDirective('trace');

  const typeDefs = /* GraphQL */ `
    ${trace.typeDefs}

    type User {
      name: String
      posts: [Post] @trace
    }

    type Post {
      title: String
      comments: [Comment] @trace
    }

    type Comment {
      text: String
    }

    type Query {
      users: [User] @trace
    }
  `;

  const resolvers = {
    Query: {
      users: () => [
        { name: 'foobar', posts: [{ title: 'foobar', comments: [{ text: 'foobar' }] }] },
      ],
    },
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const query = /* GraphQL */ `
    query {
      users {
        name
        posts {
          title
          comments {
            text
          }
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
            \\"query\\": \\"{\\\\n  users {\\\\n    name\\\\n    posts {\\\\n      title\\\\n      comments {\\\\n        text\\\\n      }\\\\n    }\\\\n  }\\\\n}\\"
          },
          \\"links\\": [],
          \\"events\\": [],
          \\"status\\": {
            \\"code\\": 0
          },
          \\"name\\": \\"Query:users\\",
          \\"kind\\": 0
        },
        \\"children\\": [
          {
            \\"span\\": {
              \\"attributes\\": {},
              \\"links\\": [],
              \\"events\\": [],
              \\"status\\": {
                \\"code\\": 0
              },
              \\"name\\": \\"User:posts\\",
              \\"parentSpanId\\": \\"<parentSpanId>\\",
              \\"kind\\": 0
            },
            \\"children\\": [
              {
                \\"span\\": {
                  \\"attributes\\": {},
                  \\"links\\": [],
                  \\"events\\": [],
                  \\"status\\": {
                    \\"code\\": 0
                  },
                  \\"name\\": \\"Post:comments\\",
                  \\"parentSpanId\\": \\"<parentSpanId>\\",
                  \\"kind\\": 0
                },
                \\"children\\": []
              }
            ]
          }
        ]
      }"
    `);
  });
});
