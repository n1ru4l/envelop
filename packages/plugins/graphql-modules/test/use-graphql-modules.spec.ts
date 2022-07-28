// @ts-nocheck MAKE ME WORK
import 'reflect-metadata';
import { parse } from '@graphql-tools/graphql';
import { Application, createApplication, createModule, Injectable, Scope } from 'graphql-modules';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { useGraphQLModules } from '../src/index.js';

describe.skip('useGraphQLModules', () => {
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
          typeDefs: parse(`type Query { foo: String }`),
          providers: [TestProvider],
          resolvers: {
            Query: {
              foo: (root: never, args: never, { injector }: GraphQLModules.Context) =>
                injector.get(TestProvider).getFoo(),
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
});
