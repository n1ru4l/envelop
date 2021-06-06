import { registerModule, gql } from '../app';

registerModule(
  gql`
    extend type Query {
      hello2: String!
    }
  `,
  {
    resolvers: {
      Query: {
        hello2() {
          return 'asd';
        },
      },
    },
  }
);
