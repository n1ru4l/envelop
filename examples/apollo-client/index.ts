import * as graphqlJs from 'graphql';
import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { EnvelopSchemaLink } from '@envelop/apollo-client';
import { envelop, useEngine, useSchema } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';

const schema = makeExecutableSchema({
  typeDefs: `type Query { hello: String! }`,
  resolvers: {
    Query: {
      hello: () => 'world',
    },
  },
});

// Use any enveloped setup
const getEnveloped = envelop({
  plugins: [useEngine(graphqlJs), useSchema(schema)],
});
const envelope = getEnveloped();

// Pass envelope to EnvelopSchemaLink
const apollo = new ApolloClient({
  cache: new InMemoryCache(),
  link: new EnvelopSchemaLink(envelope),
});

async function runExampleQuery() {
  // Use Apollo in your app
  const result = await apollo.query({
    query: gql`
      query {
        hello
      }
    `,
  });

  // eslint-disable-next-line no-console
  console.log(result);
}

runExampleQuery();
