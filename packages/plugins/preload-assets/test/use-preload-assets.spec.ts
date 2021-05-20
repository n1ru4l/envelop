import { makeExecutableSchema } from '@graphql-tools/schema';
import { createTestkit } from '@envelop/testing';
import { usePreloadAssets } from '../src';

describe('usePreloadAssets', () => {
  const imageUrl = 'https://localhost/some-asset.png';
  const schema = makeExecutableSchema({
    typeDefs: `type Query { imageUrl: String! noAsset: String! }`,
    resolvers: {
      Query: {
        imageUrl: (_: unknown, __: unknown, context: any) => {
          context.registerPreloadAsset(imageUrl);
          return Promise.resolve(imageUrl);
        },
        noAsset: () => Promise.resolve('hi'),
      },
    },
  });

  it('Should include assets to preload', async () => {
    const testInstance = createTestkit([usePreloadAssets()], schema);
    const result = await testInstance.execute(`query { imageUrl }`);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toEqual({
      preloadAssets: ['https://localhost/some-asset.png'],
    });
  });

  it('Should not include the preload extension if no asset should be preloaded', async () => {
    const testInstance = createTestkit([usePreloadAssets()], schema);
    const result = await testInstance.execute(`query { noAsset }`);
    expect(result.errors).toBeUndefined();
    expect(result.extensions).toBeUndefined();
  });
});
