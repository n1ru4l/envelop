import { print } from 'graphql';
import { createSpiedPlugin, createTestkit } from '@envelop/testing';
import { useOperationMigration } from '../src';
import { migrateFieldName } from '../src/field-name';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('migrateFieldName', () => {
  const oldName = 'oldFieldName';
  const newName = 'newFieldName';

  const testSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        testValue: Foo!
      }

      type Foo {
        ${newName}: String
      }
    `,
    resolvers: {
      Query: {
        testValue: () => ({ [newName]: 'NEW_VAL' }),
      },
    },
  });

  it('Should migrate field name correctly at the level of the ast', async () => {
    const spiedPlugin = createSpiedPlugin();
    const testInstance = createTestkit(
      [
        spiedPlugin.plugin,
        useOperationMigration({
          migrations: [migrateFieldName({ typeName: 'Foo', fromName: oldName, toName: newName })],
        }),
      ],
      testSchema
    );

    const result = await testInstance.execute(`query test { testValue { ${oldName} } }`);
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
          migrations: [migrateFieldName({ typeName: 'Foo', fromName: oldName, toName: newName })],
        }),
      ],
      testSchema
    );

    const result = await testInstance.execute(`query test { testValue { ${oldName} } }`);
    expect(result.errors).toBeUndefined();
    expect(result.data.testValue[newName]).toBeUndefined();
    expect(result.data.testValue[oldName]).toBeDefined();
  });
});
