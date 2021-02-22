import 'reflect-metadata';
import { parse } from 'graphql';
import { Application, createApplication, createModule, Injectable, Scope } from 'graphql-modules';
import { createTestkit } from '@guildql/testing';
import { useGraphQLModules } from '../src';

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
              foo: (root, args, { injector }) => injector.get(TestProvider).getFoo(),
            },
          },
        }),
      ],
    });
  });

  it('should register to the correct workflow events', () => {
    const testInstance = createTestkit([useGraphQLModules(app)]);
    expect(testInstance.emitter.listenerCount('afterExecute')).toBe(1);
    expect(testInstance.emitter.listenerCount('beforeExecute')).toBe(1);
  });

  it('Should work correctly and init all providers at the right time', async () => {
    const testInstance = createTestkit([useGraphQLModules(app)]);
    const result = await testInstance.execute(`query { foo }`);
    expect(result.data.foo).toBe('testFoo');
  });
});
