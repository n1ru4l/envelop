import EventSource from 'eventsource';
import got from 'got';
import { buildClientSchema, getIntrospectionQuery, IntrospectionQuery, printSchema, print } from 'graphql';

import { createDeferredPromise, gql, LazyPromise, makeExecutableSchema, readStreamToBuffer } from '@envelop/app/extend';

import { GetContextDocument, HelloDocument, PingSubscriptionDocument, UsersDocument } from './generated/envelop.generated';
import { commonImplementation, createUploadFileBody, readFile, startFastifyServer } from './utils';

const serverReady = LazyPromise(() =>
  startFastifyServer({
    options: {
      allowBatchedQueries: true,
      GraphQLUpload: true,
      scalars: {
        DateTime: 1,
        JSONObject: 1,
      },
      enableCodegen: true,
      buildContext() {
        return {
          foo: 'bar',
        };
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
              return (await readStreamToBuffer(file)).toString('base64');
            },
          },
        },
      },
      websockets: true,
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
    testCodegenOptions: {
      tmpSchemaExtension: '.json',
    },
  })
);

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

test('custom context', async () => {
  const { query } = await serverReady;

  await query(GetContextDocument).then(v => {
    expect(v.data?.getContext.foo).toBe('bar');
  });
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
  const { request, requestRaw } = await serverReady;

  expect(
    (
      await request({
        path: '/altair',
        method: 'GET',
      })
    ).slice(0, 300)
  ).toMatchInlineSnapshot(`
    "<!doctype html>
    <html>

    <head>
      <meta charset=\\"utf-8\\">
      <title>Altair</title>
      <base href=\\"/altair/\\">
      <meta name=\\"viewport\\" content=\\"width=device-width,initial-scale=1\\">
      <link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"favicon.ico\\">
      <link href=\\"styles.css\\" rel=\\"stylesheet\\" />
    </head>

    <body>
      <a"
  `);

  const redirection = await requestRaw({
    path: '/altair/',
    method: 'GET',
  });

  expect(redirection.statusCode).toBe(302);
  expect(redirection.headers.location).toBe('/altair');

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

test('resulting schema', async () => {
  const { query } = await serverReady;

  const schema = buildClientSchema((await query<IntrospectionQuery, never>(gql(getIntrospectionQuery()))).data!);
  expect(printSchema(schema)).toMatchInlineSnapshot(`
    "type Query {
      hello: String!
      users: [User!]!
      stream: [String!]!
      getContext: JSONObject!
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
    The \`JSONObject\` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).
    \\"\\"\\"
    scalar JSONObject

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
    import type { EnvelopContext } from '@envelop/app/fastify';
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
      /** The \`JSONObject\` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
      JSONObject: any;
      /** The \`Upload\` scalar type represents a file upload. */
      Upload: Promise<import('graphql-upload').FileUpload>;
    };

    export type Query = {
      __typename?: 'Query';
      hello: Scalars['String'];
      users: Array<User>;
      stream: Array<Scalars['String']>;
      getContext: Scalars['JSONObject'];
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
      JSONObject: ResolverTypeWrapper<Scalars['JSONObject']>;
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
      JSONObject: Scalars['JSONObject'];
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
      getContext?: Resolver<ResolversTypes['JSONObject'], ParentType, ContextType>;
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

    export interface JsonObjectScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSONObject'], any> {
      name: 'JSONObject';
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
      JSONObject?: GraphQLScalarType;
      Upload?: GraphQLScalarType;
      Mutation?: MutationResolvers<ContextType>;
    };

    /**
     * @deprecated
     * Use \\"Resolvers\\" root object instead. If you wish to get \\"IResolvers\\", add \\"typesPrefix: I\\" to your config.
     */
    export type IResolvers<ContextType = EnvelopContext> = Resolvers<ContextType>;

    declare module '@envelop/app/fastify' {
      interface EnvelopResolvers extends Resolvers<import('@envelop/app/fastify').EnvelopContext> {}
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
    "{
      \\"__schema\\": {
        \\"queryType\\": {
          \\"name\\": \\"Query\\"
        },
        \\"mutationType\\": {
          \\"name\\": \\"Mutation\\"
        },
        \\"subscriptionType\\": {
          \\"name\\": \\"Subscription\\"
        },
        \\"types\\": [
          {
            \\"kind\\": \\"OBJECT\\",
            \\"name\\": \\"Query\\",
            \\"description\\": null,
            \\"fields\\": [
              {
                \\"name\\": \\"hello\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"String\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"users\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"LIST\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"NON_NULL\\",
                      \\"name\\": null,
                      \\"ofType\\": {
                        \\"kind\\": \\"OBJECT\\",
                        \\"name\\": \\"User\\",
                        \\"ofType\\": null
                      }
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"stream\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"LIST\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"NON_NULL\\",
                      \\"name\\": null,
                      \\"ofType\\": {
                        \\"kind\\": \\"SCALAR\\",
                        \\"name\\": \\"String\\",
                        \\"ofType\\": null
                      }
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"getContext\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"JSONObject\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"inputFields\\": null,
            \\"interfaces\\": [],
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"SCALAR\\",
            \\"name\\": \\"String\\",
            \\"description\\": \\"The \`String\` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.\\",
            \\"fields\\": null,
            \\"inputFields\\": null,
            \\"interfaces\\": null,
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"OBJECT\\",
            \\"name\\": \\"User\\",
            \\"description\\": null,
            \\"fields\\": [
              {
                \\"name\\": \\"id\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"Int\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"inputFields\\": null,
            \\"interfaces\\": [],
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"SCALAR\\",
            \\"name\\": \\"Int\\",
            \\"description\\": \\"The \`Int\` scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1.\\",
            \\"fields\\": null,
            \\"inputFields\\": null,
            \\"interfaces\\": null,
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"OBJECT\\",
            \\"name\\": \\"Subscription\\",
            \\"description\\": null,
            \\"fields\\": [
              {
                \\"name\\": \\"ping\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"String\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"inputFields\\": null,
            \\"interfaces\\": [],
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"SCALAR\\",
            \\"name\\": \\"DateTime\\",
            \\"description\\": \\"A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the \`date-time\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.\\",
            \\"fields\\": null,
            \\"inputFields\\": null,
            \\"interfaces\\": null,
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"SCALAR\\",
            \\"name\\": \\"JSONObject\\",
            \\"description\\": \\"The \`JSONObject\` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).\\",
            \\"fields\\": null,
            \\"inputFields\\": null,
            \\"interfaces\\": null,
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"SCALAR\\",
            \\"name\\": \\"Upload\\",
            \\"description\\": \\"The \`Upload\` scalar type represents a file upload.\\",
            \\"fields\\": null,
            \\"inputFields\\": null,
            \\"interfaces\\": null,
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"OBJECT\\",
            \\"name\\": \\"Mutation\\",
            \\"description\\": null,
            \\"fields\\": [
              {
                \\"name\\": \\"uploadFileToBase64\\",
                \\"description\\": null,
                \\"args\\": [
                  {
                    \\"name\\": \\"file\\",
                    \\"description\\": null,
                    \\"type\\": {
                      \\"kind\\": \\"NON_NULL\\",
                      \\"name\\": null,
                      \\"ofType\\": {
                        \\"kind\\": \\"SCALAR\\",
                        \\"name\\": \\"Upload\\",
                        \\"ofType\\": null
                      }
                    },
                    \\"defaultValue\\": null
                  }
                ],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"String\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"inputFields\\": null,
            \\"interfaces\\": [],
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"SCALAR\\",
            \\"name\\": \\"Boolean\\",
            \\"description\\": \\"The \`Boolean\` scalar type represents \`true\` or \`false\`.\\",
            \\"fields\\": null,
            \\"inputFields\\": null,
            \\"interfaces\\": null,
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"OBJECT\\",
            \\"name\\": \\"__Schema\\",
            \\"description\\": \\"A GraphQL Schema defines the capabilities of a GraphQL server. It exposes all available types and directives on the server, as well as the entry points for query, mutation, and subscription operations.\\",
            \\"fields\\": [
              {
                \\"name\\": \\"description\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"types\\",
                \\"description\\": \\"A list of all types supported by this server.\\",
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"LIST\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"NON_NULL\\",
                      \\"name\\": null,
                      \\"ofType\\": {
                        \\"kind\\": \\"OBJECT\\",
                        \\"name\\": \\"__Type\\",
                        \\"ofType\\": null
                      }
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"queryType\\",
                \\"description\\": \\"The type that query operations will be rooted at.\\",
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"OBJECT\\",
                    \\"name\\": \\"__Type\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"mutationType\\",
                \\"description\\": \\"If this server supports mutation, the type that mutation operations will be rooted at.\\",
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"OBJECT\\",
                  \\"name\\": \\"__Type\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"subscriptionType\\",
                \\"description\\": \\"If this server support subscription, the type that subscription operations will be rooted at.\\",
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"OBJECT\\",
                  \\"name\\": \\"__Type\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"directives\\",
                \\"description\\": \\"A list of all directives supported by this server.\\",
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"LIST\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"NON_NULL\\",
                      \\"name\\": null,
                      \\"ofType\\": {
                        \\"kind\\": \\"OBJECT\\",
                        \\"name\\": \\"__Directive\\",
                        \\"ofType\\": null
                      }
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"inputFields\\": null,
            \\"interfaces\\": [],
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"OBJECT\\",
            \\"name\\": \\"__Type\\",
            \\"description\\": \\"The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the \`__TypeKind\` enum.\\\\n\\\\nDepending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional \`specifiedByUrl\`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.\\",
            \\"fields\\": [
              {
                \\"name\\": \\"kind\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"ENUM\\",
                    \\"name\\": \\"__TypeKind\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"name\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"description\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"specifiedByUrl\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"fields\\",
                \\"description\\": null,
                \\"args\\": [
                  {
                    \\"name\\": \\"includeDeprecated\\",
                    \\"description\\": null,
                    \\"type\\": {
                      \\"kind\\": \\"SCALAR\\",
                      \\"name\\": \\"Boolean\\",
                      \\"ofType\\": null
                    },
                    \\"defaultValue\\": \\"false\\"
                  }
                ],
                \\"type\\": {
                  \\"kind\\": \\"LIST\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"NON_NULL\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"OBJECT\\",
                      \\"name\\": \\"__Field\\",
                      \\"ofType\\": null
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"interfaces\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"LIST\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"NON_NULL\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"OBJECT\\",
                      \\"name\\": \\"__Type\\",
                      \\"ofType\\": null
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"possibleTypes\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"LIST\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"NON_NULL\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"OBJECT\\",
                      \\"name\\": \\"__Type\\",
                      \\"ofType\\": null
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"enumValues\\",
                \\"description\\": null,
                \\"args\\": [
                  {
                    \\"name\\": \\"includeDeprecated\\",
                    \\"description\\": null,
                    \\"type\\": {
                      \\"kind\\": \\"SCALAR\\",
                      \\"name\\": \\"Boolean\\",
                      \\"ofType\\": null
                    },
                    \\"defaultValue\\": \\"false\\"
                  }
                ],
                \\"type\\": {
                  \\"kind\\": \\"LIST\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"NON_NULL\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"OBJECT\\",
                      \\"name\\": \\"__EnumValue\\",
                      \\"ofType\\": null
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"inputFields\\",
                \\"description\\": null,
                \\"args\\": [
                  {
                    \\"name\\": \\"includeDeprecated\\",
                    \\"description\\": null,
                    \\"type\\": {
                      \\"kind\\": \\"SCALAR\\",
                      \\"name\\": \\"Boolean\\",
                      \\"ofType\\": null
                    },
                    \\"defaultValue\\": \\"false\\"
                  }
                ],
                \\"type\\": {
                  \\"kind\\": \\"LIST\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"NON_NULL\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"OBJECT\\",
                      \\"name\\": \\"__InputValue\\",
                      \\"ofType\\": null
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"ofType\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"OBJECT\\",
                  \\"name\\": \\"__Type\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"inputFields\\": null,
            \\"interfaces\\": [],
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"ENUM\\",
            \\"name\\": \\"__TypeKind\\",
            \\"description\\": \\"An enum describing what kind of type a given \`__Type\` is.\\",
            \\"fields\\": null,
            \\"inputFields\\": null,
            \\"interfaces\\": null,
            \\"enumValues\\": [
              {
                \\"name\\": \\"SCALAR\\",
                \\"description\\": \\"Indicates this type is a scalar.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"OBJECT\\",
                \\"description\\": \\"Indicates this type is an object. \`fields\` and \`interfaces\` are valid fields.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"INTERFACE\\",
                \\"description\\": \\"Indicates this type is an interface. \`fields\`, \`interfaces\`, and \`possibleTypes\` are valid fields.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"UNION\\",
                \\"description\\": \\"Indicates this type is a union. \`possibleTypes\` is a valid field.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"ENUM\\",
                \\"description\\": \\"Indicates this type is an enum. \`enumValues\` is a valid field.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"INPUT_OBJECT\\",
                \\"description\\": \\"Indicates this type is an input object. \`inputFields\` is a valid field.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"LIST\\",
                \\"description\\": \\"Indicates this type is a list. \`ofType\` is a valid field.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"NON_NULL\\",
                \\"description\\": \\"Indicates this type is a non-null. \`ofType\` is a valid field.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"OBJECT\\",
            \\"name\\": \\"__Field\\",
            \\"description\\": \\"Object and Interface types are described by a list of Fields, each of which has a name, potentially a list of arguments, and a return type.\\",
            \\"fields\\": [
              {
                \\"name\\": \\"name\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"String\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"description\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"args\\",
                \\"description\\": null,
                \\"args\\": [
                  {
                    \\"name\\": \\"includeDeprecated\\",
                    \\"description\\": null,
                    \\"type\\": {
                      \\"kind\\": \\"SCALAR\\",
                      \\"name\\": \\"Boolean\\",
                      \\"ofType\\": null
                    },
                    \\"defaultValue\\": \\"false\\"
                  }
                ],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"LIST\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"NON_NULL\\",
                      \\"name\\": null,
                      \\"ofType\\": {
                        \\"kind\\": \\"OBJECT\\",
                        \\"name\\": \\"__InputValue\\",
                        \\"ofType\\": null
                      }
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"type\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"OBJECT\\",
                    \\"name\\": \\"__Type\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"isDeprecated\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"Boolean\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"deprecationReason\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"inputFields\\": null,
            \\"interfaces\\": [],
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"OBJECT\\",
            \\"name\\": \\"__InputValue\\",
            \\"description\\": \\"Arguments provided to Fields or Directives and the input fields of an InputObject are represented as Input Values which describe their type and optionally a default value.\\",
            \\"fields\\": [
              {
                \\"name\\": \\"name\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"String\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"description\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"type\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"OBJECT\\",
                    \\"name\\": \\"__Type\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"defaultValue\\",
                \\"description\\": \\"A GraphQL-formatted string representing the default value for this input value.\\",
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"isDeprecated\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"Boolean\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"deprecationReason\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"inputFields\\": null,
            \\"interfaces\\": [],
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"OBJECT\\",
            \\"name\\": \\"__EnumValue\\",
            \\"description\\": \\"One possible value for a given Enum. Enum values are unique values, not a placeholder for a string or numeric value. However an Enum value is returned in a JSON response as a string.\\",
            \\"fields\\": [
              {
                \\"name\\": \\"name\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"String\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"description\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"isDeprecated\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"Boolean\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"deprecationReason\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"inputFields\\": null,
            \\"interfaces\\": [],
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"OBJECT\\",
            \\"name\\": \\"__Directive\\",
            \\"description\\": \\"A Directive provides a way to describe alternate runtime execution and type validation behavior in a GraphQL document.\\\\n\\\\nIn some cases, you need to provide options to alter GraphQL's execution behavior in ways field arguments will not suffice, such as conditionally including or skipping a field. Directives provide this by describing additional information to the executor.\\",
            \\"fields\\": [
              {
                \\"name\\": \\"name\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"String\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"description\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"isRepeatable\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"Boolean\\",
                    \\"ofType\\": null
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"locations\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"LIST\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"NON_NULL\\",
                      \\"name\\": null,
                      \\"ofType\\": {
                        \\"kind\\": \\"ENUM\\",
                        \\"name\\": \\"__DirectiveLocation\\",
                        \\"ofType\\": null
                      }
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"args\\",
                \\"description\\": null,
                \\"args\\": [],
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"LIST\\",
                    \\"name\\": null,
                    \\"ofType\\": {
                      \\"kind\\": \\"NON_NULL\\",
                      \\"name\\": null,
                      \\"ofType\\": {
                        \\"kind\\": \\"OBJECT\\",
                        \\"name\\": \\"__InputValue\\",
                        \\"ofType\\": null
                      }
                    }
                  }
                },
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"inputFields\\": null,
            \\"interfaces\\": [],
            \\"enumValues\\": null,
            \\"possibleTypes\\": null
          },
          {
            \\"kind\\": \\"ENUM\\",
            \\"name\\": \\"__DirectiveLocation\\",
            \\"description\\": \\"A Directive can be adjacent to many parts of the GraphQL language, a __DirectiveLocation describes one such possible adjacencies.\\",
            \\"fields\\": null,
            \\"inputFields\\": null,
            \\"interfaces\\": null,
            \\"enumValues\\": [
              {
                \\"name\\": \\"QUERY\\",
                \\"description\\": \\"Location adjacent to a query operation.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"MUTATION\\",
                \\"description\\": \\"Location adjacent to a mutation operation.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"SUBSCRIPTION\\",
                \\"description\\": \\"Location adjacent to a subscription operation.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"FIELD\\",
                \\"description\\": \\"Location adjacent to a field.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"FRAGMENT_DEFINITION\\",
                \\"description\\": \\"Location adjacent to a fragment definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"FRAGMENT_SPREAD\\",
                \\"description\\": \\"Location adjacent to a fragment spread.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"INLINE_FRAGMENT\\",
                \\"description\\": \\"Location adjacent to an inline fragment.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"VARIABLE_DEFINITION\\",
                \\"description\\": \\"Location adjacent to a variable definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"SCHEMA\\",
                \\"description\\": \\"Location adjacent to a schema definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"SCALAR\\",
                \\"description\\": \\"Location adjacent to a scalar definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"OBJECT\\",
                \\"description\\": \\"Location adjacent to an object type definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"FIELD_DEFINITION\\",
                \\"description\\": \\"Location adjacent to a field definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"ARGUMENT_DEFINITION\\",
                \\"description\\": \\"Location adjacent to an argument definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"INTERFACE\\",
                \\"description\\": \\"Location adjacent to an interface definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"UNION\\",
                \\"description\\": \\"Location adjacent to a union definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"ENUM\\",
                \\"description\\": \\"Location adjacent to an enum definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"ENUM_VALUE\\",
                \\"description\\": \\"Location adjacent to an enum value definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"INPUT_OBJECT\\",
                \\"description\\": \\"Location adjacent to an input object type definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              },
              {
                \\"name\\": \\"INPUT_FIELD_DEFINITION\\",
                \\"description\\": \\"Location adjacent to an input object field definition.\\",
                \\"isDeprecated\\": false,
                \\"deprecationReason\\": null
              }
            ],
            \\"possibleTypes\\": null
          }
        ],
        \\"directives\\": [
          {
            \\"name\\": \\"include\\",
            \\"description\\": \\"Directs the executor to include this field or fragment only when the \`if\` argument is true.\\",
            \\"locations\\": [
              \\"FIELD\\",
              \\"FRAGMENT_SPREAD\\",
              \\"INLINE_FRAGMENT\\"
            ],
            \\"args\\": [
              {
                \\"name\\": \\"if\\",
                \\"description\\": \\"Included when true.\\",
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"Boolean\\",
                    \\"ofType\\": null
                  }
                },
                \\"defaultValue\\": null
              }
            ]
          },
          {
            \\"name\\": \\"skip\\",
            \\"description\\": \\"Directs the executor to skip this field or fragment when the \`if\` argument is true.\\",
            \\"locations\\": [
              \\"FIELD\\",
              \\"FRAGMENT_SPREAD\\",
              \\"INLINE_FRAGMENT\\"
            ],
            \\"args\\": [
              {
                \\"name\\": \\"if\\",
                \\"description\\": \\"Skipped when true.\\",
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"Boolean\\",
                    \\"ofType\\": null
                  }
                },
                \\"defaultValue\\": null
              }
            ]
          },
          {
            \\"name\\": \\"defer\\",
            \\"description\\": \\"Directs the executor to defer this fragment when the \`if\` argument is true or undefined.\\",
            \\"locations\\": [
              \\"FRAGMENT_SPREAD\\",
              \\"INLINE_FRAGMENT\\"
            ],
            \\"args\\": [
              {
                \\"name\\": \\"if\\",
                \\"description\\": \\"Deferred when true or undefined.\\",
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"Boolean\\",
                  \\"ofType\\": null
                },
                \\"defaultValue\\": null
              },
              {
                \\"name\\": \\"label\\",
                \\"description\\": \\"Unique name\\",
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"defaultValue\\": null
              }
            ]
          },
          {
            \\"name\\": \\"stream\\",
            \\"description\\": \\"Directs the executor to stream plural fields when the \`if\` argument is true or undefined.\\",
            \\"locations\\": [
              \\"FIELD\\"
            ],
            \\"args\\": [
              {
                \\"name\\": \\"if\\",
                \\"description\\": \\"Stream when true or undefined.\\",
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"Boolean\\",
                  \\"ofType\\": null
                },
                \\"defaultValue\\": null
              },
              {
                \\"name\\": \\"label\\",
                \\"description\\": \\"Unique name\\",
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"defaultValue\\": null
              },
              {
                \\"name\\": \\"initialCount\\",
                \\"description\\": \\"Number of items to return immediately\\",
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"Int\\",
                    \\"ofType\\": null
                  }
                },
                \\"defaultValue\\": null
              }
            ]
          },
          {
            \\"name\\": \\"deprecated\\",
            \\"description\\": \\"Marks an element of a GraphQL schema as no longer supported.\\",
            \\"locations\\": [
              \\"FIELD_DEFINITION\\",
              \\"ARGUMENT_DEFINITION\\",
              \\"INPUT_FIELD_DEFINITION\\",
              \\"ENUM_VALUE\\"
            ],
            \\"args\\": [
              {
                \\"name\\": \\"reason\\",
                \\"description\\": \\"Explains why this element was deprecated, usually also including a suggestion for how to access supported similar data. Formatted using the Markdown syntax, as specified by [CommonMark](https://commonmark.org/).\\",
                \\"type\\": {
                  \\"kind\\": \\"SCALAR\\",
                  \\"name\\": \\"String\\",
                  \\"ofType\\": null
                },
                \\"defaultValue\\": \\"\\\\\\"No longer supported\\\\\\"\\"
              }
            ]
          },
          {
            \\"name\\": \\"specifiedBy\\",
            \\"description\\": \\"Exposes a URL that specifies the behaviour of this scalar.\\",
            \\"locations\\": [
              \\"SCALAR\\"
            ],
            \\"args\\": [
              {
                \\"name\\": \\"url\\",
                \\"description\\": \\"The URL that specifies the behaviour of this scalar.\\",
                \\"type\\": {
                  \\"kind\\": \\"NON_NULL\\",
                  \\"name\\": null,
                  \\"ofType\\": {
                    \\"kind\\": \\"SCALAR\\",
                    \\"name\\": \\"String\\",
                    \\"ofType\\": null
                  }
                },
                \\"defaultValue\\": null
              }
            ]
          }
        ]
      }
    }
    "
  `);
});

test('upload file', async () => {
  const { app } = await serverReady;

  const fileMessage = 'hello-world';

  const body = createUploadFileBody(fileMessage);
  const res = await app.inject({
    method: 'POST',
    url: '/graphql',
    headers: body.getHeaders(),
    payload: body,
  });

  const { data } = JSON.parse(res.body);
  expect(data).toMatchInlineSnapshot(`
    Object {
      "uploadFileToBase64": "aGVsbG8td29ybGQ=",
    }
  `);

  const recovered = Buffer.from(data.uploadFileToBase64, 'base64').toString('utf-8');

  expect(recovered).toMatchInlineSnapshot(`"hello-world"`);

  expect(recovered).toBe(fileMessage);

  expect(res.statusCode).toBe(200);
});

describe('batched queries', () => {
  test('batched queries', async () => {
    const { app } = await serverReady;

    const res = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify([
        {
          query: print(UsersDocument),
        },
        {
          query: print(HelloDocument),
        },
      ]),
    });

    expect(JSON.parse(res.payload)).toMatchInlineSnapshot(`
      Array [
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
        },
        Object {
          "data": Object {
            "hello": "Hello World!",
          },
        },
      ]
    `);
  });

  test('batched queries limit', async () => {
    const { app } = await startFastifyServer({
      options: {
        scalars: '*',
        allowBatchedQueries: 2,
      },
      buildOptions: {
        prepare(tools) {
          commonImplementation(tools);
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify([
        {
          query: print(UsersDocument),
        },
        {
          query: print(HelloDocument),
        },
        {
          query: print(HelloDocument),
        },
      ]),
    });

    expect(JSON.parse(res.payload)).toMatchInlineSnapshot(`
      Object {
        "error": "Internal Server Error",
        "message": "Batched queries limit exceeded!",
        "statusCode": 500,
      }
    `);
  });
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
  const { SubscriptionsTransportWebsocketsClient } = await startFastifyServer({
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
  const { GraphQLWSWebsocketsClient, SubscriptionsTransportWebsocketsClient } = await startFastifyServer({
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

test('JIT works', async () => {
  const { query } = await startFastifyServer({
    options: {
      scalars: '*',
      jit: true,
      codegen: {
        onFinish() {},
      },
    },
    buildOptions: {
      prepare(tools) {
        commonImplementation(tools);
      },
    },
  });

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

test('codegen onFinish', async () => {
  const onFinishPromise = createDeferredPromise<boolean>();
  const { query } = await startFastifyServer({
    options: {
      scalars: '*',

      codegen: {
        onFinish() {
          onFinishPromise.resolve(true);
        },
      },
    },
    buildOptions: {
      prepare(tools) {
        commonImplementation(tools);
      },
    },
  });
  await query(HelloDocument).then(v => {
    expect(v).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "hello": "Hello World!",
        },
      }
    `);
  });

  expect(await onFinishPromise.promise).toBe(true);
});

test('prebuilt schemas', async () => {
  const schema = makeExecutableSchema({
    typeDefs: gql`
      type Query {
        hello: String!
      }
    `,
  });

  const { query } = await startFastifyServer({
    options: {
      schema,
      scalars: ['DateTime'],
    },
  });

  const introspectedSchema = buildClientSchema((await query<IntrospectionQuery, never>(gql(getIntrospectionQuery()))).data!);
  expect(printSchema(introspectedSchema)).toMatchInlineSnapshot(`
    "\\"\\"\\"
    A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the \`date-time\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
    \\"\\"\\"
    scalar DateTime

    type Query {
      hello: String!
    }
    "
  `);

  const schema2 = makeExecutableSchema({
    typeDefs: gql`
      type Query {
        hello2: String!
      }
    `,
  });

  const { query: query2 } = await startFastifyServer({
    options: {
      schema: [schema, schema2],
      scalars: ['DateTime'],
    },
  });

  const introspectedSchema2 = buildClientSchema((await query2<IntrospectionQuery, never>(gql(getIntrospectionQuery()))).data!);
  expect(printSchema(introspectedSchema2)).toMatchInlineSnapshot(`
    "\\"\\"\\"
    A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the \`date-time\` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.
    \\"\\"\\"
    scalar DateTime

    type Query {
      hello: String!
      hello2: String!
    }
    "
  `);
});

test('schema not provided', async () => {
  const erroredServer = await startFastifyServer({
    options: {
      schema: [],

      enableCodegen: false,
    },
  }).catch(err => err);

  expect(erroredServer).toMatchInlineSnapshot(`[Error: No GraphQL Schema specified!]`);
});

test('getEnveloped', async () => {
  const { envelop } = await serverReady;

  const getEnveloped = await envelop.getEnveloped;
  const { schema } = getEnveloped();
  expect(printSchema(schema)).toMatchInlineSnapshot(`
    "type Query {
      hello: String!
      users: [User!]!
      stream: [String!]!
      getContext: JSONObject!
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
    The \`JSONObject\` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).
    \\"\\"\\"
    scalar JSONObject @specifiedBy(url: \\"http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf\\")

    \\"\\"\\"The \`Upload\` scalar type represents a file upload.\\"\\"\\"
    scalar Upload

    type Mutation {
      uploadFileToBase64(file: Upload!): String!
    }
    "
  `);
});
