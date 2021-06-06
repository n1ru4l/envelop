import { CreateApp, BuildContextArgs, InferFunctionReturn, readStreamToBuffer, gql } from '@envelop/app/express';

function buildContext({ request }: BuildContextArgs) {
  return {
    request,
    foo: 'bar',
  };
}

declare module '@envelop/app/express' {
  interface EnvelopContext extends InferFunctionReturn<typeof buildContext> {}
}

export const { registerModule, buildApp } = CreateApp({
  GraphQLUpload: true,
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
  },
  schema: {
    typeDefs: gql`
      type Mutation {
        uploadFileToBase64(file: Upload!): String!
      }
    `,
    resolvers: {
      Mutation: {
        async uploadFileToBase64(_root, { file }) {
          const fileBuffer = await readStreamToBuffer(file);

          return fileBuffer.toString('base64');
        },
      },
    },
  },
  outputSchema: './schema.gql',
  scalars: {
    DateTime: true,
  },
  buildContext,
  websockets: {
    graphQLWS: true,
    subscriptionsTransport: true,
  },
  ide: {
    altair: true,
    graphiql: {
      subscriptionsEndpoint: 'http://localhost:3000/graphql',
    },
  },
});

export { gql };
