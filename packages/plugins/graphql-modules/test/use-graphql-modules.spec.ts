import 'reflect-metadata';
import { parse } from 'graphql';
import { Application, createApplication, createModule, Injectable, Scope } from 'graphql-modules';
import {
  assertSingleExecutionValue,
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createTestkit,
} from '@envelop/testing';
import { useGraphQLModules } from '../src/index.js';

describe('useGraphQLModules', () => {
  let app: Application;

  beforeEach(() => {
    @Injectable({
      scope: Scope.Operation,
    })
    class TestProvider {
      constructor() {}

      getFoo() {
        return 'testFoo';
      }
    }

    app = createApplication({
      modules: [
        createModule({
          id: 'test',
          typeDefs: parse(`
            type Query { foo: String }

            type Subscription { bar: String }
          `),
          providers: [TestProvider],
          resolvers: {
            Query: {
              foo: (root: never, args: never, { injector }: GraphQLModules.Context) =>
                injector.get(TestProvider).getFoo(),
            },
            Subscription: {
              bar: {
                subscribe: async function* () {
                  yield 'testBar';
                },
                resolve: _ => _,
              },
            },
          },
        }),
      ],
    });
  });

  it('Should work correctly and init all providers at the right time', async () => {
    const testInstance = createTestkit([useGraphQLModules(app)]);
    const result = await testInstance.execute(`query { foo }`);
    assertSingleExecutionValue(result);
    expect(result.data?.foo).toBe('testFoo');
  });

  it('Should work for subscripions, too', async () => {
    const testInstance = createTestkit([useGraphQLModules(app)]);
    const resultStream = await testInstance.execute(`subscription { bar }`);
    assertStreamExecutionValue(resultStream);
    const allResults = await collectAsyncIteratorValues(resultStream);
    expect(allResults).toHaveLength(1);
    expect(allResults[0]?.data?.bar).toEqual('testBar');
  });
});
