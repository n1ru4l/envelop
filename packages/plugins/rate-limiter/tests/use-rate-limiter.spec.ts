import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { DIRECTIVE_SDL, IdentifyFn, useRateLimiter } from '../src/index.js';

describe('Rate-Limiter', () => {
  describe('Directive', () => {
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
        schemaWithDirective,
      );

      testInstance.execute(`query { unlimited }`);
      await testInstance.execute(`query { unlimited }`);
      const result = await testInstance.execute(`query { unlimited }`);
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
        schemaWithDirective,
      );

      await testInstance.execute(`query { limited }`);
      await delay(300);
      const result = await testInstance.execute(`query { limited }`);
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
        schemaWithDirective,
      );
      await testInstance.execute(`query { limited }`);
      const result = await testInstance.execute(`query { limited }`);
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
        schema,
      );
      await testInstance.execute(`query { limited }`);
      const result = await testInstance.execute(`query { limited }`);

      assertSingleExecutionValue(result);

      expect(result.errors!.length).toBe(1);
      expect(result.errors![0].message).toBe(`too many calls for ${identifyFn({})}`);
      expect(result.errors![0].path).toEqual(['limited']);
    });
  });

  describe('Programmatic', () => {
    it('should throw an error if the rate limit is exceeded', async () => {
      let numberOfCalls = 0;
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            foo: String
          }
        `,
        resolvers: {
          Query: {
            foo: () => {
              numberOfCalls++;
              return 'bar';
            },
          },
        },
      });
      const testkit = createTestkit(
        [
          useRateLimiter({
            identifyFn: (ctx: any) => ctx.userId,
            configByField: [
              {
                type: 'Query',
                field: 'foo',
                max: 5,
                window: '5s',
              },
            ],
          }),
        ],
        schema,
      );
      const query = /* GraphQL */ `
        {
          foo
        }
      `;
      const executeQuery = () =>
        testkit.execute(
          query,
          {},
          {
            userId: '1',
          },
        );
      for (let i = 0; i < 5; i++) {
        const result = await executeQuery();

        expect(result).toEqual({
          data: {
            foo: 'bar',
          },
        });
      }
      const result = await executeQuery();

      assertSingleExecutionValue(result);

      // Resolver shouldn't be called
      expect(numberOfCalls).toBe(5);
      expect(result.data?.foo).toBeFalsy();
      const firstError = result.errors?.[0];
      expect(firstError?.message).toBe("You are trying to access 'foo' too often");
      expect(firstError?.path).toEqual(['foo']);
    });
    it('should reset tokens when the ttl is expired', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            foo: String
          }
        `,
        resolvers: {
          Query: {
            foo: () => 'bar',
          },
        },
      });
      const testkit = createTestkit(
        [
          useRateLimiter({
            identifyFn: (ctx: any) => ctx.userId,
            configByField: [
              {
                type: 'Query',
                field: 'foo',
                max: 5,
                window: '1s',
              },
            ],
          }),
        ],
        schema,
      );
      const query = /* GraphQL */ `
        {
          foo
        }
      `;
      const executeQuery = () =>
        testkit.execute(
          query,
          {},
          {
            userId: '1',
          },
        );
      for (let i = 0; i < 5; i++) {
        const result = await executeQuery();

        expect(result).toEqual({
          data: {
            foo: 'bar',
          },
        });
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = await executeQuery();

      assertSingleExecutionValue(result);

      expect(result.errors?.length).toBeFalsy();
      expect(result.data?.foo).toBe('bar');
    });
    it('should provide different tokens for different identifiers', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            foo: String
          }
        `,
        resolvers: {
          Query: {
            foo: () => 'bar',
          },
        },
      });
      const testkit = createTestkit(
        [
          useRateLimiter({
            identifyFn: (ctx: any) => ctx.userId,
            configByField: [
              {
                type: 'Query',
                field: 'foo',
                max: 1,
                message: 'Rate limit of "Query.foo" exceeded for "{{ id }}"',
                window: '1s',
              },
            ],
          }),
        ],
        schema,
      );
      const query = /* GraphQL */ `
        {
          foo
        }
      `;
      for (let i = 0; i < 2; i++) {
        const executeQuery = () => testkit.execute(query, {}, { userId: `User${i}` });
        const resultSuccessful = await executeQuery();

        expect(resultSuccessful).toEqual({
          data: {
            foo: 'bar',
          },
        });

        const resultFails = await executeQuery();
        assertSingleExecutionValue(resultFails);
        expect(resultFails.data?.foo).toBeFalsy();
        const firstError = resultFails.errors?.[0];
        expect(firstError?.message).toBe(`Rate limit of "Query.foo" exceeded for "User${i}"`);
        expect(firstError?.path).toEqual(['foo']);
      }
      expect.assertions(8);
    });
    it('should return other fields even if one of them fails', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            foo: String
            bar: String
          }
        `,
        resolvers: {
          Query: {
            foo: () => 'FOO',
            bar: () => 'BAR',
          },
        },
      });
      const testkit = createTestkit(
        [
          useRateLimiter({
            identifyFn: (ctx: any) => ctx.userId,
            configByField: [
              {
                type: 'Query',
                field: 'foo',
                max: 1,
                message: 'Rate limit of "Query.foo" exceeded for "{{ id }}"',
                window: '1s',
              },
            ],
          }),
        ],
        schema,
      );
      const query = /* GraphQL */ `
        {
          foo
          bar
        }
      `;
      const executeQuery = () => testkit.execute(query, {}, { userId: 'MYUSER' });
      await executeQuery();
      const result = await executeQuery();
      assertSingleExecutionValue(result);
      expect(result.data?.bar).toBe('BAR');
      expect(result.errors?.[0]?.message).toBe(`Rate limit of "Query.foo" exceeded for "MYUSER"`);
    });
  });
});
