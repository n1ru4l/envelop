import { parse, validate, execute, subscribe } from 'graphql';
import { envelop, useSchema } from '../src/index.js';
import { assertSingleExecutionValue } from '@envelop/testing';
import { schema } from './common.js';

const graphqlFuncs = { parse, validate, execute, subscribe };

describe('perform', () => {
  it('should parse, validate, assemble context and execute', async () => {
    const getEnveloped = envelop({ ...graphqlFuncs, plugins: [useSchema(schema)] });

    const { perform } = getEnveloped();

    const result = await perform({ query: '{ me { id } }' });
    assertSingleExecutionValue(result);

    expect(result.data).toMatchInlineSnapshot(`
      Object {
        "me": Object {
          "id": "1",
        },
      }
    `);
  });
});
