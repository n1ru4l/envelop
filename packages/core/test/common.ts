import { makeExecutableSchema } from '@graphql-tools/schema';

export const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      me: User!
    }
    type User {
      id: ID!
      name: String!
    }
  `,
  resolvers: {
    Query: {
      me: () => {
        return { _id: 1, firstName: 'Dotan', lastName: 'Simha' };
      },
    },
    User: {
      id: u => u._id,
      name: u => `${u.firstName} ${u.lastName}`,
    },
  },
});

export const query = /* GraphQL */ `
  query me {
    me {
      id
      name
    }
  }
`;
