import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { DIRECTIVE_SDL, IdentifyFn, useRateLimiter } from '../src/index.js';

describe('useRateLimiter', () => {
  const delay = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };
  const identifyFn: IdentifyFn = () => '0.0.0.0';

  const schemaWithDirective = makeExecutableSchema({
    typeDefs: `
    ${DIRECTIVE_SDL}

    type Query {
      limited: String @rateLimit(
        max: 1,
        window: "0.1s",
        message: "too many calls"
      ),
      unlimited: String
    }
    `,
    resolvers: {
      Query: {
        limited: (root, args, context) => 'limited',
        unlimited: (root, args, context) => 'unlimited',
      },
    },
  });

  it('Should allow unlimited calls', async () => {
    const testInstance = createTestkit(
      [
        useRateLimiter({
          identifyFn,
        }),
      ],
      schemaWithDirective
    );

    testInstance.perform({ query: `query { unlimited }` });
    await testInstance.perform({ query: `query { unlimited }` });
    const result = await testInstance.perform({ query: `query { unlimited }` });
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.data?.unlimited).toBe('unlimited');
  });

  it('Should allow calls with enough delay', async () => {
    const testInstance = createTestkit(
      [
        useRateLimiter({
          identifyFn,
        }),
      ],
      schemaWithDirective
    );

    await testInstance.perform({ query: `query { limited }` });
    await delay(300);
    const result = await testInstance.perform({ query: `query { limited }` });
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.data?.limited).toBe('limited');
  });

  it('Should limit calls', async () => {
    const testInstance = createTestkit(
      [
        useRateLimiter({
          identifyFn,
        }),
      ],
      schemaWithDirective
    );
    await testInstance.perform({ query: `query { limited }` });
    const result = await testInstance.perform({ query: `query { limited }` });
    assertSingleExecutionValue(result);
    expect(result.errors!.length).toBe(1);
    expect(result.errors![0].message).toBe('too many calls');
    expect(result.errors![0].path).toEqual(['limited']);
  });

  it('Should interpolate {{ id }}', async () => {
    const schema = makeExecutableSchema({
      typeDefs: `
      ${DIRECTIVE_SDL}

      type Query {
        limited: String @rateLimit(
          max: 1,
          window: "0.1s",
          message: "too many calls for {{ id }}"
        ),
        unlimited: String
      }
      `,
      resolvers: {
        Query: {
          limited: (root, args, context) => 'limited',
          unlimited: (root, args, context) => 'unlimited',
        },
      },
    });

    const testInstance = createTestkit(
      [
        useRateLimiter({
          identifyFn,
        }),
      ],
      schema
    );
    await testInstance.perform({ query: `query { limited }` });
    const result = await testInstance.perform({ query: `query { limited }` });

    assertSingleExecutionValue(result);

    expect(result.errors!.length).toBe(1);
    expect(result.errors![0].message).toBe(`too many calls for ${identifyFn({})}`);
    expect(result.errors![0].path).toEqual(['limited']);
  });
});
