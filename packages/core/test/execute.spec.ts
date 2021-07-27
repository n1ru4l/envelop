import { assertStreamExecutionValue, collectAsyncIteratorValues, createSpiedPlugin, createTestkit } from '@envelop/testing';
import { execute, ExecutionResult, GraphQLSchema } from 'graphql';
import { schema, query } from './common';

describe('execute', () => {
  it('Should wrap and trigger events correctly', async () => {
    const spiedPlugin = createSpiedPlugin();
    const teskit = createTestkit([spiedPlugin.plugin], schema);
    await teskit.execute(query, {}, { test: 1 });
    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeResolver).toHaveBeenCalledTimes(3);
    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledWith({
      executeFn: expect.any(Function),
      setExecuteFn: expect.any(Function),
      extendContext: expect.any(Function),
      setResultAndStopExecution: expect.any(Function),
      args: {
        contextValue: expect.objectContaining({ test: 1 }),
        rootValue: {},
        schema: expect.any(GraphQLSchema),
        operationName: undefined,
        fieldResolver: undefined,
        typeResolver: undefined,
        variableValues: {},
        document: expect.objectContaining({
          definitions: expect.any(Array),
        }),
      },
    });

    expect(spiedPlugin.spies.afterResolver).toHaveBeenCalledTimes(3);
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalledWith({
      setResult: expect.any(Function),
      result: {
        data: {
          me: {
            id: '1',
            name: 'Dotan Simha',
          },
        },
      },
    });
  });

  it('Should allow to override execute function', async () => {
    const altExecute = jest.fn(execute);
    const teskit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(altExecute as any);
          },
        },
      ],
      schema
    );
    await teskit.execute(query);
    expect(altExecute).toHaveBeenCalledTimes(1);
  });

  it('Should allow to write async functions for before execute', async () => {
    const altExecute = jest.fn(execute);
    const teskit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(altExecute as any);
          },
        },
      ],
      schema
    );
    await teskit.execute(query);
  });

  it('Should allow to register to before and after resolver calls', async () => {
    const afterResolver = jest.fn();
    const onResolverCalled = jest.fn(() => afterResolver);

    const teskit = createTestkit(
      [
        {
          onExecute() {
            return {
              onResolverCalled,
            };
          },
        },
      ],
      schema
    );

    await teskit.execute(query);
    expect(onResolverCalled).toHaveBeenCalledTimes(3);
    expect(onResolverCalled).toHaveBeenCalledWith({
      root: {},
      args: {},
      context: expect.any(Object),
      info: expect.objectContaining({
        fieldName: 'me',
      }),
      resolverFn: expect.any(Function),
      replaceResolverFn: expect.any(Function),
    });
    expect(onResolverCalled).toHaveBeenCalledWith({
      root: { _id: 1, firstName: 'Dotan', lastName: 'Simha' },
      args: {},
      context: expect.any(Object),
      info: expect.objectContaining({
        fieldName: 'id',
      }),
      resolverFn: expect.any(Function),
      replaceResolverFn: expect.any(Function),
    });
    expect(onResolverCalled).toHaveBeenCalledWith({
      root: { _id: 1, firstName: 'Dotan', lastName: 'Simha' },
      args: {},
      context: expect.any(Object),
      info: expect.objectContaining({
        fieldName: 'name',
      }),
      resolverFn: expect.any(Function),
      replaceResolverFn: expect.any(Function),
    });

    expect(afterResolver).toHaveBeenCalledTimes(3);
    expect(afterResolver).toHaveBeenCalledWith({
      result: { _id: 1, firstName: 'Dotan', lastName: 'Simha' },
      setResult: expect.any(Function),
    });
    expect(afterResolver).toHaveBeenCalledWith({
      result: 1,
      setResult: expect.any(Function),
    });
    expect(afterResolver).toHaveBeenCalledWith({
      result: 'Dotan Simha',
      setResult: expect.any(Function),
    });
  });

  it('Should be able to manipulate streams', async () => {
    const streamExecuteFn = async function* () {
      for (const value of ['a', 'b', 'c', 'd']) {
        yield { data: { alphabet: value } };
      }
    };

    const teskit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(streamExecuteFn as any);

            return {
              onExecuteDone: () => {
                return {
                  onNext: ({ setResult }) => {
                    setResult({ data: { alphabet: 'x' } });
                  },
                };
              },
            };
          },
        },
      ],
      schema
    );

    const result = await teskit.execute(/* GraphQL */ `
      query {
        alphabet
      }
    `);
    assertStreamExecutionValue(result);
    const values = await collectAsyncIteratorValues(result);
    expect(values).toEqual([
      { data: { alphabet: 'x' } },
      { data: { alphabet: 'x' } },
      { data: { alphabet: 'x' } },
      { data: { alphabet: 'x' } },
    ]);
  });

  it('Should be able to invoke something after the stream has ended.', async () => {
    expect.assertions(1);
    const streamExecuteFn = async function* () {
      for (const value of ['a', 'b', 'c', 'd']) {
        yield { data: { alphabet: value } };
      }
    };

    const teskit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(streamExecuteFn as any);

            return {
              onExecuteDone: () => {
                let latestResult: ExecutionResult;
                return {
                  onNext: ({ result }) => {
                    latestResult = result;
                  },
                  onEnd: () => {
                    expect(latestResult).toEqual({ data: { alphabet: 'd' } });
                  },
                };
              },
            };
          },
        },
      ],
      schema
    );

    const result = await teskit.execute(/* GraphQL */ `
      query {
        alphabet
      }
    `);
    assertStreamExecutionValue(result);
    // run AsyncGenerator
    await collectAsyncIteratorValues(result);
  });

  it('Should be able to invoke something after the stream has ended (manual return).', async () => {
    expect.assertions(1);
    const streamExecuteFn = async function* () {
      for (const value of ['a', 'b', 'c', 'd']) {
        yield { data: { alphabet: value } };
      }
    };

    const teskit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(streamExecuteFn as any);

            return {
              onExecuteDone: () => {
                let latestResult: ExecutionResult;
                return {
                  onNext: ({ result }) => {
                    latestResult = result;
                  },
                  onEnd: () => {
                    expect(latestResult).toEqual({ data: { alphabet: 'a' } });
                  },
                };
              },
            };
          },
        },
      ],
      schema
    );

    const result = await teskit.execute(/* GraphQL */ `
      query {
        alphabet
      }
    `);
    assertStreamExecutionValue(result);
    const instance = result[Symbol.asyncIterator]();
    await instance.next();
    await instance.return!();
  });
});
