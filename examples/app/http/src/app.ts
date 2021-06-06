import { CreateApp, BuildContextArgs, InferFunctionReturn, gql } from '@envelop/app/http';

function buildContext({ request }: BuildContextArgs) {
  return {
    request,
    foo: 'bar',
  };
}

declare module '@envelop/app/http' {
  interface EnvelopContext extends InferFunctionReturn<typeof buildContext> {}
}

export const { registerModule, buildApp } = CreateApp({
  codegen: {
    federation: true,
    deepPartialResolvers: true,
    targetPath: './src/envelop.generated.ts',
    preImportCode: `
    /* eslint-disable no-use-before-define */
    `,
    scalars: {
      DateTime: 'string',
    },
    documents: 'src/graphql/*',
  },
  outputSchema: './schema.gql',
  scalars: {
    DateTime: 1,
  },
  buildContext,

  schema: {
    typeDefs: gql`
      type Query {
        hello3: String!
      }
    `,
    resolvers: {
      Query: {
        hello3(_root, _args, _ctx) {
          return 'zzz';
        },
      },
    },
  },

  ide: {
    altair: true,
    graphiql: {
      subscriptionsEndpoint: 'http://localhost:3000/graphql',
    },
  },
});

export { gql };
