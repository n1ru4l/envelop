import { useApolloInlineTrace } from '../src';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Trace } from 'apollo-reporting-protobuf';
import { parse, validate, execute, subscribe, GraphQLError, versionInfo } from 'graphql';
import { envelop, useSchema } from '@envelop/core';
import { assertSingleExecutionValue, assertStreamExecutionValue } from '@envelop/testing';

const graphqlFuncs = { parse, validate, execute, subscribe };

describe('Apollo Inline Trace Plugin', () => {
  if (versionInfo.major < 16) {
    it('dummy', () => {});
    return;
  }

  // must create a new schema because on-resolve mutates the existing one
  const getSchema = () =>
    makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String!
          boom: String!
          person: Person!
          people: [Person!]!
        }
        type Subscription {
          hello: String!
        }
        type Person {
          name: String!
        }
      `,
      resolvers: {
        Query: {
          hello() {
            return 'world';
          },
          boom() {
            throw new Error('bam');
          },
          person() {
            return { name: 'John' };
          },
          people() {
            return [{ name: 'John' }, { name: 'Jane' }];
          },
        },
        Subscription: {
          hello: {
            async *subscribe() {
              yield { hello: 'world' };
            },
          },
        },
      },
    });

  it('should add ftv1 tracing to result extensions', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [useSchema(getSchema()), useApolloInlineTrace({ shouldTrace: () => true })],
    })();

    const result = await perform({ query: '{ hello }' });
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();
    expect(typeof result.extensions?.ftv1).toBe('string');
  });

  function expectTrace(trace: Trace) {
    expect(trace.startTime).toBeDefined();
    expect(typeof trace.startTime?.seconds).toBe('number');
    expect(typeof trace.startTime?.nanos).toBe('number');

    expect(typeof trace.durationNs).toBe('number');

    expect(trace.endTime).toBeDefined();
    expect(typeof trace.endTime?.seconds).toBe('number');
    expect(typeof trace.endTime?.nanos).toBe('number');

    expect(addSecondsAndNanos(trace.startTime!.seconds!, trace.startTime!.nanos!)).toBeLessThanOrEqual(
      addSecondsAndNanos(trace.endTime!.seconds!, trace.endTime!.nanos!)
    );

    expect(typeof trace.fieldExecutionWeight).toBe('number');

    expect(trace.root).toBeDefined();
    expect(trace.root?.child).toBeInstanceOf(Array);
  }

  function expectTraceNode(node: Trace.INode | null | undefined, field: string, type: string, parent: string) {
    expect(node).toBeDefined();

    expect(node!.responseName).toBe(field);
    expect(node!.type).toBe(type);
    expect(node!.parentType).toBe(parent);

    expect(typeof node!.startTime).toBe('number');
    expect(typeof node!.endTime).toBe('number');

    expect(node!.startTime!).toBeLessThanOrEqual(node!.endTime!);
  }

  it('should have proto tracing on flat query', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [useSchema(getSchema()), useApolloInlineTrace({ shouldTrace: () => true })],
    })();

    const result = await perform({ query: '{ hello }' });
    assertSingleExecutionValue(result);


    const ftv1 = result.extensions?.ftv1 as string as string;
    expect(typeof ftv1).toBe('string');
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const hello = trace.root?.child?.[0];
    expect(hello?.error?.length).toBe(0);
    expectTraceNode(hello, 'hello', 'String!', 'Query');
  });

  it('should have proto tracing on aliased flat query', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [useSchema(getSchema()), useApolloInlineTrace({ shouldTrace: () => true })],
    })();

    const result = await perform({ query: '{ hi: hello }' });
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();

    //

    const ftv1 = result.extensions?.ftv1 as string;
    expect(typeof ftv1).toBe('string');
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const hi = trace.root?.child?.[0];
    expect(hi?.error?.length).toBe(0);
    expectTraceNode(hi, 'hi', 'String!', 'Query');
    expect(hi?.originalFieldName).toBe('hello');
  });

  it('should have proto tracing on nested query', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [useSchema(getSchema()), useApolloInlineTrace({ shouldTrace: () => true })],
    })();

    const result = await perform({ query: '{ person { name } }' });
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();

    //

    const ftv1 = result.extensions?.ftv1 as string;
    expect(typeof ftv1).toBe('string');
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const person = trace.root?.child?.[0];
    expect(person?.error?.length).toBe(0);
    expectTraceNode(person, 'person', 'Person!', 'Query');

    const personName = person?.child?.[0];
    expect(personName?.error?.length).toBe(0);
    expectTraceNode(personName, 'name', 'String!', 'Person');
  });

  it('should have proto tracing on flat query with array field', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [useSchema(getSchema()), useApolloInlineTrace({ shouldTrace: () => true })],
    })();

    const result = await perform({ query: '{ people { name } }' });
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();

    //

    const ftv1 = result.extensions?.ftv1 as string;
    expect(typeof ftv1).toBe('string');
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const people = trace.root?.child?.[0];
    expect(people?.error?.length).toBe(0);
    expectTraceNode(people, 'people', '[Person!]!', 'Query');

    const arr = people!.child!;
    for (let i = 0; i < arr.length; i++) {
      const person = arr[i];
      expect(person?.error?.length).toBe(0);
      expect(person.index).toBe(i);
      expectTraceNode(person.child?.[0], 'name', 'String!', 'Person');
    }
  });

  function expectTraceNodeError(node: Trace.INode | null | undefined) {
    expect(node).toBeDefined();
    expect(node!.error).toBeDefined();
    const error = node!.error!;
    expect(error).toBeInstanceOf(Array);
    expect(error.length).toBeGreaterThan(0);
    expect(typeof error[0].message).toBe('string');
    expect(typeof error[0].location).toBeDefined();
    expect(typeof error[0].location?.[0].line).toBe('number');
    expect(typeof error[0].location?.[0].column).toBe('number');
    expect(() => {
      JSON.parse(error[0].json!);
    }).not.toThrow();
  }

  it('should have proto tracing on parse fail', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [useSchema(getSchema()), useApolloInlineTrace({ shouldTrace: () => true })],
    })();

    const result = await perform({ query: '{ he' });
    assertSingleExecutionValue(result);

    expect(result.errors).toBeDefined();

    //
    const ftv1 = result.extensions?.ftv1 as string;
    expect(typeof ftv1).toBe('string');
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expectTraceNodeError(trace.root);
  });

  it('should have proto tracing on validation fail', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [useSchema(getSchema()), useApolloInlineTrace({ shouldTrace: () => true })],
    })();

    const result = await perform({ query: '{ henlo }' });
    assertSingleExecutionValue(result);

    expect(result.errors).toBeDefined();

    //

    const ftv1 = result.extensions?.ftv1 as string;
    expect(typeof ftv1).toBe('string');
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expectTraceNodeError(trace.root);
  });

  it('should have proto tracing on execution fail', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [useSchema(getSchema()), useApolloInlineTrace({ shouldTrace: () => true })],
    })();

    const result = await perform({ query: '{ boom }' });
    assertSingleExecutionValue(result);

    expect(result.errors).toBeDefined();

    //

    const ftv1 = result.extensions?.ftv1 as string;
    expect(typeof ftv1).toBe('string');
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const boom = trace.root?.child?.[0];
    expectTraceNode(boom, 'boom', 'String!', 'Query');
    expectTraceNodeError(boom);
  });

  it('should skip tracing errors through rewriteError', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [useSchema(getSchema()), useApolloInlineTrace({ shouldTrace: () => true })],
    })();

    const result = await perform({ query: '{ boom }' });
    assertSingleExecutionValue(result);

    expect(result.errors).toBeDefined();

    //

    const ftv1 = result.extensions?.ftv1 as string;
    expect(typeof ftv1).toBe('string');
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);
  });

  it('should rewrite only error messages and extensions through rewriteError', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [
        useSchema(getSchema()),
        useApolloInlineTrace({
          shouldTrace: () => true,
          rewriteError: () => new GraphQLError('bim', { extensions: { str: 'ing' } }),
        }),
      ],
    })();

    const result = await perform({ query: '{ boom }' });
    assertSingleExecutionValue(result);

    expect(result.errors).toBeDefined();

    //

    const ftv1 = result.extensions?.ftv1 as string;
    expect(typeof ftv1).toBe('string');
    const trace = Trace.decode(Buffer.from(ftv1, 'base64'));

    expectTrace(trace);
    expect(trace.root?.error?.length).toBe(0);

    const boom = trace.root?.child?.[0];
    expectTraceNode(boom, 'boom', 'String!', 'Query');
    expectTraceNodeError(boom); // will check for location

    const error = boom!.error!;
    expect(error[0].message).toBe('bim'); // not 'bam'

    const errObj = JSON.parse(error[0].json!);
    expect(errObj.extensions).toEqual({ str: 'ing' });
  });

  it('should not trace subscriptions', async () => {
    const { perform } = envelop({
      ...graphqlFuncs,
      plugins: [
        useSchema(getSchema()),
        useApolloInlineTrace({
          shouldTrace: () => true,
        }),
      ],
    })();

    const result = await perform({ query: 'subscription { hello }' });
    assertStreamExecutionValue(result);

    for await (const part of result) {
      expect(part.data).toEqual({ hello: 'world' });
      expect(part.errors).toBeUndefined();
      expect(part.extensions).toBeUndefined();
    }
  });

  function addSecondsAndNanos(seconds: number, nanos: number): number {
    return seconds + nanos / 1e9;
  }
});
