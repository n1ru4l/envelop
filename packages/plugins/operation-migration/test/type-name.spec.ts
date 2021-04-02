import { print } from 'graphql';
import { createSpiedPlugin, createTestkit } from '@envelop/testing';
import { useOperationMigration } from '../src';
import { migrateTypeName } from '../src/type-name';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('migrateTypeName', () => {
  const oldName = 'OldFoo';
  const newName = 'Foo';

  const testSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        testValue: Foo!
      }

      type Foo {
        f: String
      }
    `,
    resolvers: {
      Query: {
        testValue: () => ({ f: '1' }),
      },
    },
  });

  it('Should migrate field name correctly at the level of the ast', async () => {
    const spiedPlugin = createSpiedPlugin();
    const testInstance = createTestkit(
      [
        spiedPlugin.plugin,
        useOperationMigration({
          migrations: [migrateTypeName({ fromName: oldName, toName: newName })],
        }),
      ],
      testSchema
    );

    const result = await testInstance.execute(`query { testValue { ... on OldFoo { f }} }`);
    expect(result.errors).toBeUndefined();
    const executeDocument = (spiedPlugin.spies.beforeExecute.mock.calls[0] as any)[0]['args']['document'];
    expect(print(executeDocument)).toContain(newName);
    expect(print(executeDocument)).not.toContain(oldName);
  });

  it('Should migrate field name correctly at the level of the result', async () => {
    const spiedPlugin = createSpiedPlugin();
    const testInstance = createTestkit(
      [
        spiedPlugin.plugin,
        useOperationMigration({
          migrations: [migrateTypeName({ fromName: oldName, toName: newName })],
        }),
      ],
      testSchema
    );

    const result = await testInstance.execute(`query { testValue { __typename ... on OldFoo { f }} }`);
    const executeDocument = (spiedPlugin.spies.beforeExecute.mock.calls[0] as any)[0]['args']['document'];
    console.log(print(executeDocument));

    console.log(result.errors[0].stack);
    expect(result.errors).toBeUndefined();
    expect(result.data.testValue.__typename).toBe(oldName);
  });
});
