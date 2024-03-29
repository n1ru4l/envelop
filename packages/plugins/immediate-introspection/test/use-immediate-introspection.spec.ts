import { getIntrospectionQuery } from 'graphql';
import { useExtendContext } from '@envelop/core';
import { createTestkit } from '@envelop/testing';
import { schema } from '../../../core/test/common.js';
import { useImmediateIntrospection } from '../src/index.js';

describe('useImmediateIntrospection', () => {
  it('skips context building for introspection only operation', async () => {
    const testInstance = createTestkit(
      [
        useImmediateIntrospection(),
        useExtendContext<() => Promise<{}>>(() => Promise.reject('EHHH')),
      ],
      schema,
    );

    await testInstance.execute(/* GraphQL */ `
      query {
        __typename
      }
    `);
  });
  it('skips context building for introspection only operation (alias)', async () => {
    const testInstance = createTestkit(
      [
        useImmediateIntrospection(),
        useExtendContext<() => Promise<{}>>(() => Promise.reject('EHHH')),
      ],
      schema,
    );

    await testInstance.execute(/* GraphQL */ `
      query {
        some: __typename
      }
    `);
  });
  it('runs context building for operation containing non introspection fields', async () => {
    const testInstance = createTestkit(
      [
        useImmediateIntrospection(),
        useExtendContext<() => Promise<{}>>(() => Promise.reject('This should reject')),
      ],
      schema,
    );

    try {
      await testInstance.execute(/* GraphQL */ `
        query {
          __schema {
            aaa: __typename
          }
          me {
            id
          }
        }
      `);
      throw new Error('Should throw.');
    } catch (err) {
      if (err === 'This should reject') {
        return;
      }
      throw err;
    }
  });

  it('runs context building for operation containing mutation', async () => {
    const testInstance = createTestkit(
      [
        useImmediateIntrospection(),
        useExtendContext<() => Promise<{}>>(() => Promise.reject('This should reject')),
      ],
      schema,
    );

    try {
      await testInstance.execute(/* GraphQL */ `
        mutation {
          createUser {
            id
          }
        }
      `);
      throw new Error('Should throw.');
    } catch (err) {
      if (err === 'This should reject') {
        return;
      }
      throw err;
    }
  });

  it('runs context building for operation containing subscription', async () => {
    const testInstance = createTestkit(
      [
        useImmediateIntrospection(),
        useExtendContext<() => Promise<{}>>(() => Promise.reject('This should reject')),
      ],
      schema,
    );

    try {
      await testInstance.execute(/* GraphQL */ `
        subscription {
          message
        }
      `);
      throw new Error('Should throw.');
    } catch (err) {
      if (err === 'This should reject') {
        return;
      }
      throw err;
    }
  });

  it('runs context building for operation containing non introspection fields', async () => {
    const testInstance = createTestkit(
      [
        useImmediateIntrospection(),
        useExtendContext<() => Promise<{}>>(() => Promise.reject('This should reject')),
      ],
      schema,
    );

    try {
      await testInstance.execute(/* GraphQL */ `
        query {
          __schema {
            aaa: __typename
          }
          me {
            id
          }
        }
      `);
      throw new Error('Should throw.');
    } catch (err) {
      if (err === 'This should reject') {
        return;
      }
      throw err;
    }
  });

  it('skips context building for introspection operation generated by getIntrospectionQuery', async () => {
    const testInstance = createTestkit(
      [
        useImmediateIntrospection(),
        useExtendContext<() => Promise<{}>>(() => Promise.reject('This should not reject')),
      ],
      schema,
    );

    await testInstance.execute(getIntrospectionQuery());
  });
});
