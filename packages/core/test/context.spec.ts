import { createSpiedPlugin, createTestkit } from '@envelop/testing';
import { FieldNode, parse, visit } from 'graphql';
import { schema, query } from './common';

describe('contextFactory', () => {
  it('Should call before parse and after parse correctly', async () => {
    const spiedPlugin = createSpiedPlugin();
    const teskit = createTestkit([spiedPlugin.plugin], schema);
    await teskit.execute(query);
    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledWith({
      context: expect.any(Object),
      extendContext: expect.any(Function),
    });

    expect(spiedPlugin.spies.afterContextBuilding).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.afterContextBuilding).toHaveBeenCalledWith({
      context: expect.any(Object),
    });
  });

  it('Should set initial `createProxy` arguments as initial context', async () => {
    const spiedPlugin = createSpiedPlugin();
    const teskit = createTestkit([spiedPlugin.plugin], schema);
    await teskit.execute(query, {}, { test: true });
    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledWith({
      context: expect.objectContaining({
        test: true,
      }),
      extendContext: expect.any(Function),
    });
  });

  it('Should allow to extend context', async () => {
    const afterContextSpy = jest.fn();
    const onExecuteSpy = jest.fn();

    const teskit = createTestkit(
      [
        {
          onContextBuilding({ extendContext }) {
            extendContext({
              test: true,
            });

            return afterContextSpy;
          },
          onExecute: onExecuteSpy,
        },
      ],
      schema
    );

    await teskit.execute(query, {}, {});
    expect(afterContextSpy).toHaveBeenCalledWith({
      context: {
        test: true,
      },
    });
    expect(onExecuteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.objectContaining({
          contextValue: {
            test: true,
          },
        }),
      })
    );
  });

  it('Should throw an error in case of invalid context extension', async () => {
    const teskit = createTestkit(
      [
        {
          onContextBuilding({ extendContext }) {
            extendContext('test' as any);
          },
        },
      ],
      schema
    );

    const r = await teskit.execute(query, {});
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].message).toBe(`Invalid context extension provided! Expected "object", got: ""test"" (string)`);
  });

  it('Should allow to provide async function for context extension', async () => {
    const afterContextSpy = jest.fn();
    const onExecuteSpy = jest.fn();
    const teskit = createTestkit(
      [
        {
          onContextBuilding: async ({ extendContext }) => {
            await new Promise(resolve => setTimeout(resolve, 1000));

            extendContext({
              test: true,
            });

            return afterContextSpy;
          },
          onExecute: onExecuteSpy,
        },
      ],
      schema
    );
    await teskit.execute(query, {}, {});
    expect(afterContextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {
          test: true,
        },
      })
    );
    expect(onExecuteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.objectContaining({
          contextValue: {
            test: true,
          },
        }),
      })
    );
  });
});
