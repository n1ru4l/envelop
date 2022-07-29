// import { useLiveQuery, GraphQLLiveDirectiveSDL } from '../src/index.js';
// import { makeExecutableSchema } from '@graphql-tools/schema';
// import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
// import { createTestkit, assertStreamExecutionValue } from '@envelop/testing';
// import { parse } from '@graphql-tools/graphql';

// const schema = makeExecutableSchema({
//   typeDefs: [
//     /* GraphQL */ `
//       type Query {
//         greetings: [String!]
//       }
//     `,
//     GraphQLLiveDirectiveSDL,
//   ],
//   resolvers: {
//     Query: {
//       greetings: (_: unknown, __: unknown, context) => context.greetings,
//     },
//   },
// });

// // TODO: MAKE ME WORK
// describe.skip('useLiveQuery', () => {
//   it('works with simple schema', async () => {
//     const liveQueryStore = new InMemoryLiveQueryStore();
//     const testKit = createTestkit([useLiveQuery({ liveQueryStore })], schema);
//     const contextValue = {
//       greetings: ['Hi', 'Sup', 'Ola'],
//     };
//     const result = await testKit.execute(
//       /* GraphQL */ `
//         query @live {
//           greetings
//         }
//       `,
//       undefined,
//       contextValue
//     );
//     assertStreamExecutionValue(result);
//     let current = await result.next();
//     expect(current.value).toMatchInlineSnapshot(`
// Object {
//   "data": Object {
//     "greetings": Array [
//       "Hi",
//       "Sup",
//       "Ola",
//     ],
//   },
//   "isLive": true,
// }
// `);
//     contextValue.greetings.reverse();
//     liveQueryStore.invalidate('Query.greetings');
//     current = await result.next();
//     expect(current.value).toMatchInlineSnapshot(`
// Object {
//   "data": Object {
//     "greetings": Array [
//       "Ola",
//       "Sup",
//       "Hi",
//     ],
//   },
//   "isLive": true,
// }
// `);
//     result.return?.();
//   });
// });
