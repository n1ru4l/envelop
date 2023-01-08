import 'reflect-metadata';
import { parse } from 'graphql';
import { Application, createApplication, createModule, Injectable, Scope, gql } from 'graphql-modules';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
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

  test('Should work correctly and init all providers at the right time', async () => {
    const testInstance = createTestkit([useGraphQLModules(app)]);
    const result = await testInstance.execute(`query { foo }`);
    assertSingleExecutionValue(result);
    expect(result.data?.foo).toBe('testFoo');
  });

  test('Global Token of a module should be accessible by itself (singleton)', async () => {
    @Injectable({
      scope: Scope.Singleton,
      global: true,
    })
    class Data {
      lorem() {
        return 'ipsum';
      }
    }

    @Injectable({
      scope: Scope.Singleton,
    })
    class AppData {
      constructor(private data: Data) {}

      ipsum() {
        return this.data.lorem();
      }
    }

    const fooModule = createModule({
      id: 'foo',
      providers: [Data, AppData],
      typeDefs: gql`
        type Query {
          foo: String!
        }
      `,
      resolvers: {
        Query: {
          foo(_parent: {}, _args: {}, { injector }: GraphQLModules.ModuleContext) {
            return injector.get(AppData).ipsum();
          },
        },
      },
    });

    const app = createApplication({
      modules: [fooModule],
    });

    const testInstance = createTestkit([useGraphQLModules(app)]);
    const result = await testInstance.execute(`query { foo }`);
    assertSingleExecutionValue(result);
    expect(result.data?.foo).toBe('ipsum');
  });
});
