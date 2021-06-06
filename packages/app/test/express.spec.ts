import EventSource from 'eventsource';
import got from 'got';
import { buildClientSchema, getIntrospectionQuery, IntrospectionQuery, printSchema } from 'graphql';
import fetch from 'node-fetch';
import { gql, readStreamToBuffer } from '@envelop/app/extend';

import { HelloDocument, PingSubscriptionDocument, UsersDocument } from './generated/envelop.generated';
import { commonImplementation, createUploadFileBody, readFile, startExpressServer } from './utils';

const serverReady = startExpressServer({
  options: {
    scalars: ['DateTime'],
    enableCodegen: true,
    cache: false,
    websockets: true,
    buildContext() {
      return {
        foo: 'bar',
      };
    },
    GraphQLUpload: {},
    schema: [
      {
        typeDefs: gql`
          type Mutation {
            uploadFileToBase64(file: Upload!): String!
          }
        `,
        resolvers: {
          Mutation: {
            async uploadFileToBase64(_root, { file }) {
              return (await readStreamToBuffer(file)).toString('base64');
            },
          },
        },
      },
    ],
  },
  buildOptions: {
    prepare(tools) {
      commonImplementation(tools);
    },
  },
});

test('works', async () => {
  const { query } = await serverReady;

  await query(HelloDocument).then(v => {
    expect(v).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "hello": "Hello World!",
        },
      }
    `);
  });
});

test('dataloaders', async () => {
  const { query } = await serverReady;

  await query(UsersDocument).then(v => {
    expect(v).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "users": Array [
            Object {
              "id": 0,
            },
            Object {
              "id": 100,
            },
            Object {
              "id": 200,
            },
            Object {
              "id": 300,
            },
            Object {
              "id": 400,
            },
            Object {
              "id": 500,
            },
            Object {
              "id": 600,
            },
            Object {
              "id": 700,
            },
            Object {
              "id": 800,
            },
            Object {
              "id": 900,
            },
          ],
        },
      }
    `);
  });
});

test('altair', async () => {
  const { request } = await serverReady;

  expect(
    (
      await request({
        path: '/altair/',
        method: 'GET',
      })
    ).slice(0, 300)
  ).toMatchInlineSnapshot(`
    "<!doctype html>
    <html>

    <head>
      <meta charset=\\"utf-8\\">
      <title>Altair</title>
      <base href=\\"./\\">
      <meta name=\\"viewport\\" content=\\"width=device-width,initial-scale=1\\">
      <link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"favicon.ico\\">
      <link href=\\"styles.css\\" rel=\\"stylesheet\\" />
    </head>

    <body>
      <app-roo"
  `);

  expect(
    (
      await request({
        path: '/altair/styles.css',
        method: 'GET',
      })
    ).slice(0, 300)
  ).toMatchInlineSnapshot(
    `"@charset \\"UTF-8\\";[class*=ant-]::-ms-clear,[class*=ant-] input::-ms-clear,[class*=ant-] input::-ms-reveal,[class^=ant-]::-ms-clear,[class^=ant-] input::-ms-clear,[class^=ant-] input::-ms-reveal{display:none}[class*=ant-],[class*=ant-] *,[class*=ant-] :after,[class*=ant-] :before,[class^=ant-],[class^"`
  );
});

test('graphiql', async () => {
  const { request } = await serverReady;

  expect(
    (
      await request({
        path: '/graphiql',
        method: 'GET',
      })
    ).slice(0, 300)
  ).toMatchInlineSnapshot(`
    "
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset=\\"utf-8\\" />
        <title>GraphiQL</title>
        <meta name=\\"robots\\" content=\\"noindex\\" />
        <meta name=\\"referrer\\" content=\\"origin\\" />
        <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\" />
        <link
          rel=\\"icon\\"
          type=\\"image"
  `);
});

test('query with @stream', async () => {
  const { address } = await serverReady;
  const stream = got.stream.post(`${address}/graphql`, {
    json: {
      query: `
      query {
        stream @stream(initialCount: 1)
      }
      `,
    },
  });

  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk.toString());
  }
  expect(chunks).toHaveLength(3);
  expect(chunks[0]).toContain(`{"data":{"stream":["A"]},"hasNext":true}`);
  expect(chunks[1]).toContain(`{"data":"B","path":["stream",1],"hasNext":true}`);
  expect(chunks[2]).toContain(`{"data":"C","path":["stream",2],"hasNext":true}`);
});

test('SSE subscription', async () => {
  const { address } = await serverReady;
  const eventSource = new EventSource(`${address}/graphql?query=subscription{ping}`);

  let n = 0;
  const payload = await new Promise<string>(resolve => {
    eventSource.addEventListener('message', (event: any) => {
      switch (++n) {
        case 1:
        case 2:
          return expect(JSON.parse(event.data)).toStrictEqual({
            data: {
              ping: 'pong',
            },
          });
        case 3:
          expect(JSON.parse(event.data)).toStrictEqual({
            data: {
              ping: 'pong',
            },
          });
          return resolve('OK');
        default:
          console.error(event);
          throw Error('Unexpected event');
      }
    });
  });
  eventSource.close();
  expect(payload).toBe('OK');
});

test('resulting schema', async () => {
  const { query } = await serverReady;

  const schema = buildClientSchema((await query<IntrospectionQuery, never>(gql(getIntrospectionQuery()))).data!);
  expect(printSchema(schema)).toMatchInlineSnapshot(`
    "type Query {
      hello: String!
      users: [User!]!
      stream: [String!]!
    }

    type User {
      id: Int!
    }

    type Subscription {
      ping: String!
    }

    \\"\\"\\"
    A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the \`date-time\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
    \\"\\"\\"
    scalar DateTime

    \\"\\"\\"The \`Upload\` scalar type represents a file upload.\\"\\"\\"
    scalar Upload

    type Mutation {
      uploadFileToBase64(file: Upload!): String!
    }
    "
  `);
});

test('codegen result', async () => {
  const { tmpPath, codegenPromise } = await serverReady;

  await codegenPromise;

  expect(tmpPath).toBeTruthy();

  expect(
    await readFile(tmpPath!, {
      encoding: 'utf-8',
    })
  ).toMatchInlineSnapshot(`
    "import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
    import type { EnvelopContext } from '@envelop/app/express';
    export type Maybe<T> = T | null;
    export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
    export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
    export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
    export type RequireFields<T, K extends keyof T> = { [X in Exclude<keyof T, K>]?: T[X] } & { [P in K]-?: NonNullable<T[P]> };
    /** All built-in and custom scalars, mapped to their actual values */
    export type Scalars = {
      ID: string;
      String: string;
      Boolean: boolean;
      Int: number;
      Float: number;
      /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the \`date-time\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
      DateTime: any;
      /** The \`Upload\` scalar type represents a file upload. */
      Upload: Promise<import('graphql-upload').FileUpload>;
    };

    export type Query = {
      __typename?: 'Query';
      hello: Scalars['String'];
      users: Array<User>;
      stream: Array<Scalars['String']>;
    };

    export type User = {
      __typename?: 'User';
      id: Scalars['Int'];
    };

    export type Subscription = {
      __typename?: 'Subscription';
      ping: Scalars['String'];
    };

    export type Mutation = {
      __typename?: 'Mutation';
      uploadFileToBase64: Scalars['String'];
    };

    export type MutationUploadFileToBase64Args = {
      file: Scalars['Upload'];
    };

    export type ResolverTypeWrapper<T> = Promise<T> | T;

    export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
      fragment: string;
      resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
    };

    export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
      selectionSet: string;
      resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
    };
    export type StitchingResolver<TResult, TParent, TContext, TArgs> =
      | LegacyStitchingResolver<TResult, TParent, TContext, TArgs>
      | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
    export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
      | ResolverFn<TResult, TParent, TContext, TArgs>
      | StitchingResolver<TResult, TParent, TContext, TArgs>;

    export type ResolverFn<TResult, TParent, TContext, TArgs> = (
      parent: TParent,
      args: TArgs,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

    export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
      parent: TParent,
      args: TArgs,
      context: TContext,
      info: GraphQLResolveInfo
    ) => AsyncIterator<TResult> | Promise<AsyncIterator<TResult>>;

    export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
      parent: TParent,
      args: TArgs,
      context: TContext,
      info: GraphQLResolveInfo
    ) => TResult | Promise<TResult>;

    export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
      subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
      resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
    }

    export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
      subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
      resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
    }

    export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
      | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
      | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

    export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
      | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
      | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

    export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
      parent: TParent,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

    export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
      obj: T,
      context: TContext,
      info: GraphQLResolveInfo
    ) => boolean | Promise<boolean>;

    export type NextResolverFn<T> = () => Promise<T>;

    export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
      next: NextResolverFn<TResult>,
      parent: TParent,
      args: TArgs,
      context: TContext,
      info: GraphQLResolveInfo
    ) => TResult | Promise<TResult>;

    /** Mapping between all available schema types and the resolvers types */
    export type ResolversTypes = {
      Query: ResolverTypeWrapper<{}>;
      String: ResolverTypeWrapper<Scalars['String']>;
      User: ResolverTypeWrapper<User>;
      Int: ResolverTypeWrapper<Scalars['Int']>;
      Subscription: ResolverTypeWrapper<{}>;
      DateTime: ResolverTypeWrapper<Scalars['DateTime']>;
      Upload: ResolverTypeWrapper<Scalars['Upload']>;
      Mutation: ResolverTypeWrapper<{}>;
      Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
    };

    /** Mapping between all available schema types and the resolvers parents */
    export type ResolversParentTypes = {
      Query: {};
      String: Scalars['String'];
      User: User;
      Int: Scalars['Int'];
      Subscription: {};
      DateTime: Scalars['DateTime'];
      Upload: Scalars['Upload'];
      Mutation: {};
      Boolean: Scalars['Boolean'];
    };

    export type QueryResolvers<
      ContextType = EnvelopContext,
      ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']
    > = {
      hello?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
      users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
      stream?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
    };

    export type UserResolvers<
      ContextType = EnvelopContext,
      ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']
    > = {
      id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
      __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
    };

    export type SubscriptionResolvers<
      ContextType = EnvelopContext,
      ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']
    > = {
      ping?: SubscriptionResolver<ResolversTypes['String'], 'ping', ParentType, ContextType>;
    };

    export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
      name: 'DateTime';
    }

    export interface UploadScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Upload'], any> {
      name: 'Upload';
    }

    export type MutationResolvers<
      ContextType = EnvelopContext,
      ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']
    > = {
      uploadFileToBase64?: Resolver<
        ResolversTypes['String'],
        ParentType,
        ContextType,
        RequireFields<MutationUploadFileToBase64Args, 'file'>
      >;
    };

    export type Resolvers<ContextType = EnvelopContext> = {
      Query?: QueryResolvers<ContextType>;
      User?: UserResolvers<ContextType>;
      Subscription?: SubscriptionResolvers<ContextType>;
      DateTime?: GraphQLScalarType;
      Upload?: GraphQLScalarType;
      Mutation?: MutationResolvers<ContextType>;
    };

    /**
     * @deprecated
     * Use \\"Resolvers\\" root object instead. If you wish to get \\"IResolvers\\", add \\"typesPrefix: I\\" to your config.
     */
    export type IResolvers<ContextType = EnvelopContext> = Resolvers<ContextType>;

    declare module '@envelop/app/express' {
      interface EnvelopResolvers extends Resolvers<import('@envelop/app/express').EnvelopContext> {}
    }
    "
  `);
});

test('outputSchema result', async () => {
  const { tmpSchemaPath, codegenPromise } = await serverReady;

  await codegenPromise;

  expect(tmpSchemaPath).toBeTruthy();

  expect(
    await readFile(tmpSchemaPath!, {
      encoding: 'utf-8',
    })
  ).toMatchInlineSnapshot(`
    "schema {
      query: Query
      mutation: Mutation
      subscription: Subscription
    }

    type Query {
      hello: String!
      users: [User!]!
      stream: [String!]!
    }

    type User {
      id: Int!
    }

    type Subscription {
      ping: String!
    }

    \\"\\"\\"
    A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the \`date-time\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
    \\"\\"\\"
    scalar DateTime

    \\"\\"\\"
    The \`Upload\` scalar type represents a file upload.
    \\"\\"\\"
    scalar Upload

    type Mutation {
      uploadFileToBase64(file: Upload!): String!
    }
    "
  `);
});

test('GraphQLWS websocket subscriptions', async () => {
  const { GraphQLWSWebsocketsClient } = await serverReady;

  let n = 0;

  const { done } = GraphQLWSWebsocketsClient.subscribe(PingSubscriptionDocument, data => {
    ++n;

    switch (n) {
      case 1:
      case 2:
      case 3:
        return expect(data).toStrictEqual({
          data: {
            ping: 'pong',
          },
        });
      default:
        throw Error('Unexpected data from subscription!');
    }
  });

  await done;

  expect(n).toBe(3);
});

test('websocket subscriptions legacy only', async () => {
  const { SubscriptionsTransportWebsocketsClient } = await startExpressServer({
    options: {
      websockets: 'legacy',
      scalars: '*',
    },
    buildOptions: {
      prepare(tools) {
        commonImplementation(tools);
        tools.registerModule(
          gql`
            extend type Query {
              getContext: JSONObject!
            }
          `,
          {
            resolvers: {
              Query: {
                getContext(_root, _args, ctx) {
                  return ctx;
                },
              },
            },
          }
        );
      },
    },
  });

  let n = 0;

  const { done: doneSubscriptionsTransport } = SubscriptionsTransportWebsocketsClient.subscribe(
    PingSubscriptionDocument,
    data => {
      ++n;

      switch (n) {
        case 1:
        case 2:
        case 3:
          return expect(data).toStrictEqual({
            data: {
              ping: 'pong',
            },
          });
        default:
          throw Error('Unexpected data from subscription!');
      }
    }
  );

  await doneSubscriptionsTransport;

  expect(n).toBe(3);
});

test('websocket subscriptions supporting both legacy and new protocols', async () => {
  const { GraphQLWSWebsocketsClient, SubscriptionsTransportWebsocketsClient } = await startExpressServer({
    options: {
      websockets: 'both',
      scalars: '*',
    },
    buildOptions: {
      prepare(tools) {
        commonImplementation(tools);
        tools.registerModule(
          gql`
            extend type Query {
              getContext: JSONObject!
            }
          `,
          {
            resolvers: {
              Query: {
                getContext(_root, _args, ctx) {
                  return ctx;
                },
              },
            },
          }
        );
      },
    },
  });

  let nGraphQLWS = 0;

  const { done } = GraphQLWSWebsocketsClient.subscribe(PingSubscriptionDocument, data => {
    ++nGraphQLWS;

    switch (nGraphQLWS) {
      case 1:
      case 2:
      case 3:
        return expect(data).toStrictEqual({
          data: {
            ping: 'pong',
          },
        });
      default:
        throw Error('Unexpected data from subscription!');
    }
  });

  await done;

  expect(nGraphQLWS).toBe(3);

  let nSubscriptionsTransport = 0;

  const { done: doneSubscriptionsTransport } = SubscriptionsTransportWebsocketsClient.subscribe(
    PingSubscriptionDocument,
    data => {
      ++nSubscriptionsTransport;

      switch (nSubscriptionsTransport) {
        case 1:
        case 2:
        case 3:
          return expect(data).toStrictEqual({
            data: {
              ping: 'pong',
            },
          });
        default:
          throw Error('Unexpected data from subscription!');
      }
    }
  );

  await doneSubscriptionsTransport;

  expect(nSubscriptionsTransport).toBe(3);
});

test('upload file', async () => {
  const { address } = await serverReady;

  const fileMessage = 'hello-world';

  const body = createUploadFileBody(fileMessage);

  const response = await fetch(address + '/graphql', {
    body,
    method: 'POST',
    headers: body.getHeaders(),
  });

  expect(await response.clone().text()).toMatchInlineSnapshot(`"{\\"data\\":{\\"uploadFileToBase64\\":\\"aGVsbG8td29ybGQ=\\"}}"`);

  expect(response.status).toBe(200);

  const { data } = await response.json();
  expect(data).toMatchInlineSnapshot(`
    Object {
      "uploadFileToBase64": "aGVsbG8td29ybGQ=",
    }
  `);

  const recovered = Buffer.from(data.uploadFileToBase64, 'base64').toString('utf-8');

  expect(recovered).toMatchInlineSnapshot(`"hello-world"`);

  expect(recovered).toBe(fileMessage);

  expect(response.status).toBe(200);
});
