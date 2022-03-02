import { envelop, useSchema } from '@envelop/core';
import { createTestkit } from '@envelop/testing';
import { buildSchema, GraphQLError, parse } from 'graphql';
import { useExtendedValidation } from '../src';

describe('useExtendedValidation', () => {
  it('supports usage of multiple useExtendedValidation in different plugins', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String!
      }
    `);
    const operation = /* GraphQL */ `
      {
        foo
      }
    `;
    const testInstance = createTestkit(
      [
        useExtendedValidation({
          rules: [
            ctx => {
              return {
                OperationDefinition() {
                  ctx.reportError(new GraphQLError('No 1'));
                },
              };
            },
          ],
        }),
        useExtendedValidation({
          rules: [
            ctx => {
              return {
                OperationDefinition() {
                  ctx.reportError(new GraphQLError('No 2'));
                },
              };
            },
          ],
        }),
      ],
      schema
    );

    const result = await testInstance.execute(operation);
    expect(result).toMatchInlineSnapshot(`
    Object {
      "data": null,
      "errors": Array [
        [GraphQLError: No 1],
        [GraphQLError: No 2],
      ],
    }
    `);
  });
  it('run extended validation phase exactly once if no validation error occurs', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String!
      }
    `);
    const operation = /* GraphQL */ `
      {
        foo
      }
    `;
    let extendedValidationRunCount = 0;
    const testInstance = createTestkit(
      [
        useExtendedValidation({
          rules: [
            () => {
              return {
                OperationDefinition() {
                  extendedValidationRunCount = extendedValidationRunCount + 1;
                },
              };
            },
          ],
        }),
        useExtendedValidation({
          rules: [
            () => {
              return {
                OperationDefinition() {},
              };
            },
          ],
        }),
      ],
      schema
    );

    await testInstance.execute(operation);
    expect(extendedValidationRunCount).toEqual(1);
  });
  it('execute throws an error if "contextFactory" has not been invoked', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String!
      }
    `);
    const operation = /* GraphQL */ `
      {
        foo
      }
    `;
    const { execute } = envelop({
      plugins: [
        useSchema(schema),
        useExtendedValidation({
          rules: [() => ({})],
        }),
      ],
    })();
    await expect(
      execute({
        document: parse(operation),
        contextValue: {},
        schema,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Plugin has not been properly set up. The 'contextFactory' function is not invoked and the result has not been passed to 'execute'."`
    );
  });
});
