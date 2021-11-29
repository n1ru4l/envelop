import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';

export type Demo = {
  schema: string;
  query: string;
  requestHeaders: Record<string, string>;
  code: string;
};

export const DEMO_SCHEMA = /* GraphQL */ `
  type Query {
    name: String!
  }
`;

export const DEMO_QUERY = /* GraphQL */ `
  query test {
    name
  }
`;
