import { execute, parse } from 'graphql';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { useApolloFederation } from '../src/index.js';

describe('useApolloFederation', () => {
  const query = /* GraphQL */ `
    # A query that the gateway resolves by calling all three services
    query GetCurrentUserReviews {
      me {
        username
        reviews {
          body
          product {
            name
            upc
          }
        }
      }
    }
  `;

  const {
    ApolloGateway,
    LocalGraphQLDataSource,
  }: typeof import('@apollo/gateway') = require('@apollo/gateway');
  const accounts: typeof import('./fixtures/accounts') = require('./fixtures/accounts');
  const products: typeof import('./fixtures/products') = require('./fixtures/products');
  const reviews: typeof import('./fixtures/reviews') = require('./fixtures/reviews');

  const gateway = new ApolloGateway({
    localServiceList: [
      { name: 'accounts', typeDefs: accounts.typeDefs },
      { name: 'products', typeDefs: products.typeDefs },
      { name: 'reviews', typeDefs: reviews.typeDefs },
    ],
    buildService: definition => {
      switch (definition.name) {
        case 'accounts':
          return new LocalGraphQLDataSource(accounts.schema);
        case 'products':
          return new LocalGraphQLDataSource(products.schema);
        case 'reviews':
          return new LocalGraphQLDataSource(reviews.schema);
      }
      throw new Error(`Unknown service ${definition.name}`);
    },
  });

  beforeAll(async () => {
    await gateway.load();
  });

  const useTestFederation = () =>
    useApolloFederation({
      gateway,
    });

  it('Should override execute function', async () => {
    const onExecuteSpy = jest.fn();

    const testInstance = createTestkit([
      useTestFederation(),
      {
        onExecute: onExecuteSpy,
      },
    ]);

    await testInstance.execute(query);

    expect(onExecuteSpy).toHaveBeenCalledTimes(1);
    expect(onExecuteSpy.mock.calls[0][0].executeFn).not.toBe(execute);
    expect(onExecuteSpy.mock.calls[0][0].executeFn.name).toBe('federationExecutor');
  });

  it('Should execute document string correctly', async () => {
    const testInstance = createTestkit([useTestFederation()]);
    const result = await testInstance.execute(query);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeFalsy();
    expect(result.data).toMatchInlineSnapshot(`
{
  "me": {
    "reviews": [
      {
        "body": "Love it!",
        "product": {
          "name": "Table",
          "upc": "1",
        },
      },
      {
        "body": "Too expensive.",
        "product": {
          "name": "Couch",
          "upc": "2",
        },
      },
    ],
    "username": "@ada",
  },
}
`);
  });

  it('Should execute parsed document correctly', async () => {
    const testInstance = createTestkit([useTestFederation()]);
    const result = await testInstance.execute(parse(query));
    assertSingleExecutionValue(result);
    expect(result.errors).toBeFalsy();
    expect(result.data).toMatchInlineSnapshot(`
{
  "me": {
    "reviews": [
      {
        "body": "Love it!",
        "product": {
          "name": "Table",
          "upc": "1",
        },
      },
      {
        "body": "Too expensive.",
        "product": {
          "name": "Couch",
          "upc": "2",
        },
      },
    ],
    "username": "@ada",
  },
}
`);
  });

  afterAll(async () => {
    await gateway.stop();
  });
});
