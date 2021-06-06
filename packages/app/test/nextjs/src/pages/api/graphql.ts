import { buildApp } from '../../api/app';

const EnvelopApp = buildApp({
  async prepare({ gql, registerModule }) {
    registerModule(
      gql`
        type Query {
          hello: String!
        }
      `,
      {
        resolvers: {
          Query: {
            hello() {
              return 'Hello World!';
            },
          },
        },
      }
    );
  },
});

export default EnvelopApp.handler;
