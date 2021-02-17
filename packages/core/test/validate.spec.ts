import { createSpiedPlugin, createTestkit } from '@envelop/testing';
import { GraphQLError, validate } from 'graphql';
import { schema, query } from './common';

describe('validate', () => {
  it('Should call before validate and after validate correctly', async () => {
    const spiedPlugin = createSpiedPlugin();
    const teskit = createTestkit([spiedPlugin.plugin], schema);
    await teskit.execute(query);
    expect(spiedPlugin.spies.beforeValidate).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeValidate).toHaveBeenCalledWith({
      params: {
        schema,
        documentAST: expect.any(Object),
        options: undefined,
        rules: undefined,
        typeInfo: undefined,
      },
      setResult: expect.any(Function),
      setValidationFn: expect.any(Function),
      validateFn: validate,
    });

    expect(spiedPlugin.spies.afterValidate).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.afterValidate).toHaveBeenCalledWith({
      result: [],
      valid: true,
    });
  });

  it('Should allow to replace validate function', async () => {
    const replacementFn = jest.fn(validate);
    const teskit = createTestkit(
      [
        {
          onValidate: ({ setValidationFn }) => {
            setValidationFn(replacementFn);
          },
        },
      ],
      schema
    );
    await teskit.execute(query);
    expect(replacementFn).toHaveBeenCalledTimes(1);
    expect(replacementFn).toHaveBeenCalledWith(schema, expect.any(Object), undefined, undefined, undefined);
  });

  it('Should allow to set validation result and avoid running validate', async () => {
    const replacementFn = jest.fn(validate);
    const teskit = createTestkit(
      [
        {
          onValidate: ({ setValidationFn, setResult }) => {
            setValidationFn(replacementFn);
            setResult([]);
          },
        },
      ],
      schema
    );
    await teskit.execute(query);
    expect(replacementFn).toHaveBeenCalledTimes(0);
  });

  it('Should allow to manipulate validation results during execution and effect result', async () => {
    const e = new GraphQLError('failed');
    const replacementFn = jest.fn(() => {
      return [e];
    });

    const after = jest.fn();
    const teskit = createTestkit(
      [
        {
          onValidate: ({ setValidationFn }) => {
            setValidationFn(replacementFn);
            return after;
          },
        },
      ],
      schema
    );
    await teskit.execute(query);
    expect(after).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledWith({ valid: false, result: [e] });
  });
});
