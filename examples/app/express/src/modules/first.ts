import { registerModule, gql } from '../app';

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

registerModule(
  gql`
    type Query {
      hello: String!
    }
    type Subscription {
      hello: String!
    }
  `,
  {
    resolvers: {
      Query: {
        hello(_root, _args, _ctx) {
          return 'hello';
        },
      },
      Subscription: {
        hello: {
          async *subscribe(_root, _args, _ctx) {
            for (let i = 1; i <= 5; ++i) {
              await sleep(500);

              yield {
                hello: 'Hello World ' + i,
              };
            }
            yield {
              hello: 'Done!',
            };
          },
        },
      },
    },
  }
);
