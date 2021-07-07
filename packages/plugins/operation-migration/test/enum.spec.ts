import { print } from 'graphql';
import { createSpiedPlugin, createTestkit } from '@envelop/testing';
import { useOperationMigration } from '../src';
import { migrateEnum } from '../src/enum';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('migrateEnum', () => {
  const oldName = 'OLD_VAL';
  const newName = 'NEW_VAL';

  const testSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        foo(v: Foo!): String
        testValue: Foo!
      }

      enum Foo {
        ${newName}
        OTHER_VAL
      }
    `,
    resolvers: {
      Query: {
        testValue: () => newName,
      },
    },
  });

  it('Should migrate enum value correctly at the level of the ast', async () => {
    const spiedPlugin = createSpiedPlugin();
    const testInstance = createTestkit(
      [
        spiedPlugin.plugin,
        useOperationMigration({
          migrations: [migrateEnum({ enumName: 'Foo', fromName: oldName, toName: newName })],
        }),
      ],
      testSchema
    );

    const result = await testInstance.execute(`query test { foo(v: ${oldName}) }`);
    expect(result.errors).toBeUndefined();
    const executeDocument = (spiedPlugin.spies.beforeExecute.mock.calls[0] as any)[0]['args']['document'];
    expect(print(executeDocument)).toContain(newName);
    expect(print(executeDocument)).not.toContain(oldName);
  });

  it('Should migrate enum value correctly at the level of the variables', async () => {
    const spiedPlugin = createSpiedPlugin();
    const testInstance = createTestkit(
      [
        spiedPlugin.plugin,
        useOperationMigration({
          migrations: [migrateEnum({ enumName: 'Foo', fromName: oldName, toName: newName })],
        }),
      ],
      testSchema
    );

    const result = await testInstance.execute(`query test($v: Foo!) { foo(v: $v) }`, { v: oldName });
    expect(result.errors).toBeUndefined();
    const variableValues = (spiedPlugin.spies.beforeExecute.mock.calls[0] as any)[0]['args']['variableValues'];
    expect(variableValues.v).toBe(newName);
  });

  it('Should migrate enum value correctly at the level of the result', async () => {
    const spiedPlugin = createSpiedPlugin();
    const testInstance = createTestkit(
      [
        spiedPlugin.plugin,
        useOperationMigration({
          migrations: [migrateEnum({ enumName: 'Foo', fromName: oldName, toName: newName })],
        }),
      ],
      testSchema
    );

    const result = await testInstance.execute(`query test { testValue }`, { v: oldName });
    expect(result.errors).toBeUndefined();
    expect(result.data.testValue).toBe(oldName);
  });
});
