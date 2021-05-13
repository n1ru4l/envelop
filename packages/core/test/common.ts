import { EventEmitter, on } from 'events';
import { GraphQLID, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';

const createPubSub = <TTopicPayload extends { [key: string]: unknown }>(emitter: EventEmitter) => {
  return {
    publish: <TTopic extends Extract<keyof TTopicPayload, string>>(topic: TTopic, payload: TTopicPayload[TTopic]) => {
      emitter.emit(topic as string, payload);
    },
    subscribe: async function*<TTopic extends Extract<keyof TTopicPayload, string>>(
      topic: TTopic
    ): AsyncIterableIterator<TTopicPayload[TTopic]> {
      const asyncIterator = on(emitter, topic);
      for await (const [value] of asyncIterator) {
        yield value;
      }
    },
  };
};

export const pubSub = createPubSub<{
  ping: string;
}>(new EventEmitter());

const GraphQLUser = new GraphQLObjectType({
  name: 'User',
  fields: {
    id: {
      type: GraphQLNonNull(GraphQLID),
      resolve: u => u._id,
    },
    name: {
      type: GraphQLNonNull(GraphQLString),
      resolve: u => `${u.firstName} ${u.lastName}`,
    },
  },
});

const GraphQLQuery = new GraphQLObjectType({
  name: 'Query',
  fields: {
    me: {
      type: GraphQLNonNull(GraphQLUser),
      resolve: () => {
        return { _id: 1, firstName: 'Dotan', lastName: 'Simha' };
      },
    },
  },
});

const GraphQLSubscription = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    ping: {
      type: GraphQLString,
      subscribe: async function*() {
        const stream = pubSub.subscribe('ping');
        return yield* stream;
      },
      resolve: (b, _, context) => {
        return `${b} ${context}`;
      },
    },
  },
});

export const schema = new GraphQLSchema({ query: GraphQLQuery, subscription: GraphQLSubscription });

export const query = /* GraphQL */ `
  query me {
    me {
      id
      name
    }
  }
`;

export const subscription = /* GraphQL */ `
  subscription ping {
    ping
  }
`;
