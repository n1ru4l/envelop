---
title: Securing your GraphQL API
sidebar_label: Securing your GraphQL API
---

# Securing your GraphQL API

Building a secure GraphQL API is hard because by design of to the "Graph" part withing GraphQL.
Tooling for making different aspects of a GraphQL server secure have existed since forever.
However, combining that tooling is often cumbersome and results in messy code.
With envelop securing your server is now as easy as pie!

## Authentication

Authentication is the process of identifying who is doing a request against your server.
Rolling out your own authentication solution is a crucial and important task as any flaws can result in severe security issues.

### Auth0

We recommend using an existing third-party service such as [Auth0](https://auth0.com/) for most users.
With the `@envelop/auth0` plugin, you can simply bootstrap the authorization process.

```tsx
import { envelop, useExtendContext } from '@envelop/core';
import { useAuth0 } from '@envelop/auth0';
import { schema } from './schema';
const getEnveloped = envelop({
  plugins: [
    useSchema(schema),
    useAuth0({
      domain: 'YOUR_AUTH0_DOMAIN_HERE',
      audience: 'YOUR_AUTH0_AUDIENCE_HERE',
      headerName: 'authorization',
      extendContextField: 'auth0',
      tokenType: 'Bearer',
    }),
    // load user from database and add it to context
    // so it is available within the resolvers
    useExtendContext(async ({ auth0, db }) => {
      const user = await db.users.load(auth0.sub);
      return {
        user,
      };
    }),
  ],
});
```

On the client you just need to add the `Authorization: Bearer tokenXXX` header and you are good!
Check out the [Auth0 Envelop plugin](/plugins/use-auth0) for all possible configuration options.

### Generic Auth

In some cases using a third party auth provider is not possible. But now worries, the generic auth plugin has you covered!
[Learn more over here](/plugins/use-generic-auth)

## Authorization

Authorization is the process of allowing or denying the authenticated (or sometimes unauthenticated) user to access information.
Since GraphQL is a graph, applying authorization based on field resolvers is handy and allows fine-grained control.

Your GraphQL graph might become quite complicated over time, having a strategy for ensuring correct authorization as the graph grows is mandatory.

Most of the time this logic should be applied within your business logic that is called within your resolvers, however, for some use-cases it is possible to apply authorization rules before any execution is even happening. E.g. if we want to prevent the execution of a GraphQL operation that selects fields the viewer is not allowed to see.

Right now envelop ships with two plugins that allow applying authorization before the execution phase.

### Schema based on context

With the `useSchema` plugin it is possible to dynamically select a schema for execution based on the context object. This is handy if you have a public schema (e.g. for third-party API consumers) and a private schema (for in-house API consumers).

Libraries such as [`graphql-public-schema-filter`](https://github.com/n1ru4l/graphql-public-schema-filter) can be used for generating a schema with only access to a sub part of the original schema using either SDL directives or schema field extensions.

```ts
import { envelop, useSchema } from '@envelop/core';
import { privateSchema, publicSchema } from './schema';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins (e.g. useAuth0)
    useSchema(context => (context.isPrivateApiUser ? privateSchema : publicSchema)),
  ],
});
```

### Allow-list operation fields

With the `useOperationFieldPermissions` plugin you can automatically reject GraphQL operations that include specific field selections within the operations selection set. It works by extracting a set of [schema coordinates](https://github.com/graphql/graphql-spec/pull/746) from the context object. A custom validation rule will verify whether the selection only includes allowed selections and prevent the execution of the operation if it encounters any prohibited selections.

This plugin is perfect for use-cases where you want the whole schema being introspectable, but restrict access to a certain part of the Graph only to specific users. E.g. in a payment subscription model, where API users should only have access to the data that is included within the plan.

```ts
import { envelop, useSchema } from '@envelop/core';
import { useOperationFieldPermissions } from '@envelop/operation-field-permissions';
import { schema } from './schema';
const getEnveloped = envelop({
  plugins: [
    // ... other plugins (e.g. useAuth0)
    useSchema(schema),
    useOperationFieldPermissions({
      // user is only allowed to select the Query.hello field within operations.
      getPermissions: context => new Set(['Query.hello']),
    }),
  ],
});
```

Trying to execute the following operation:

```graphql
query {
  notHello
}
```

would result in the following error:

**Response**

```json
{
  "data": null,
  "errors": [
    {
      "message": "Insufficient permissions for selecting 'Query.notHello'.",
      "locations": [
        {
          "line": 2,
          "column": 2
        }
      ]
    }
  ]
}
```

## Prevent leaking sensitive Information

In most GraphQL servers any thrown error or rejected promise will result in the original error leaking to the outside world. Some frameworks have custom logic for catching unexpected errors and mapping them to an unexpected error instead. With envelop this abstraction is now possible with any server! Just add the [`useMaskedErrors`](https://www.envelop.dev/plugins/use-masked-errors) plugin and throw `EnvelopError` instances for expected errors that should leak to the outside world. You can also add custom extension fields that will also be sent to the clients.

```tsx
import { envelop, useSchema, useMaskedErrors, EnvelopError } from '@envelop/core';
import { makeExecutableSchema } from 'graphql';

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      something: String!
      somethingElse: String!
      somethingSpecial: String!
    }
  `,
  resolvers: {
    Query: {
      something: () => {
        throw new EnvelopError('Error that is propagated to the clients.');
      },
      somethingElse: () => {
        throw new Error("Unsafe error that will be masked as 'Unexpected Error.'.");
      },
      somethingSpecial: () => {
        throw new EnvelopError('The error will have an extensions field.', {
          code: 'ERR_CODE',
          randomNumber: 123,
        });
      },
    },
  },
});

const getEnveloped = envelop({
  plugins: [useSchema(schema), useMaskedErrors()],
});
```

For people migrating from apollo-server the [`useApolloServerErrors`](/plugins/use-apollo-server-errors) plugin provides full backwards-compatibility to how apollo-server handles GraphQL error masking.

## Protection against malicious GraphQL operations

One of the main benefits of GraphQL is that data can be requested individually. However, this also introduces the possibility for attackers to send operations with deeply nested selection sets that could block other requests being processed. Fortunately, infinite loops are not possible by design as a fragment cannot self-reference itself. Unfortunately, that still does not prevent possible attackers from sending selection sets that are hundreds of levels deep.

The following schema

```graphql
type Query {
  author(id: ID!): Author!
}
type Author {
  id: ID!
  posts: [Post!]!
}
type Post {
  id: ID!
  author: Author!
}
```

Would allow sending and executing queries such as:

```graphql
query {
  author(id: 42) {
    posts {
      author {
        posts {
          author {
            posts {
              author {
                posts {
                  author {
                    posts {
                      author {
                        posts {
                          author {
                            id
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

There are a few measurements you can use for preventing the execution of such operations.

### Persisted Operations

Instead of allowing any arbitrary GraphQL operation in production usage, we could use an allow-list of operations that the server is allowed to execute. We can collect such a list by scanning the code-base and extracting the list of operations. This is easy as pie with [GraphQL Codegen](https://www.npmjs.com/package/graphql-codegen-persisted-query-ids)

With the [`usePersistedOperations`](/plugins/use-persisted-operations) plugin such an extracted map can easily be used for allow-listing such operations.

```ts
import { envelop } from '@envelop/core';
import { usePersistedOperations, PersistedOperationsStore } from '@envelop/persisted-operations';
import persistedOperations from './codegen-artifact';

const store: PersistedOperationsStore = {
  canHandle: key => key in persistedOperations,
  get: key => persistedOperations[key],
};

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    usePersistedOperations({
      store: myStore,
      // only allow the operations within our persistedOperations object
      onlyPersistedOperations: true,
    }),
  ],
});
```

### Query Depth Limiting

Sometimes persisted operations cannot be used. E.g. if you are building an API that is used by third party users. However, we can still apply some
protection.

The [`useDepthLimit`](/plugins/use-depth-limit) allows a maximum nesting level an operation is allowed to have.

```ts
import { envelop } from '@envelop/core';
import { useDepthLimit } from '@envelop/depth-limit';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useDepthLimit({
      maxDepth: 10,
    }),
  ],
});
```

This can prevent malicious API users executing GraphQL operations with deeply nested selection sets. You need to tweak the maximum depth an operation selection set is allowed to have based on your schema and needs, as it could vary between users.

## Alerting and Monitoring

If something is not working as it should within your GraphQL server you would not want it to go unnoticed. Envelop has a wide variety of plugins for different error tracking and performance monitoring services.

### Sentry

Sentry is the biggest player regarding error tracking within JavaScript land. With the [`useSentry` plugin](/plugins/use-sentry) any error can be tracked with a proper context, containing important information for tracking down the root cause of the error.

![Example reported error on sentry](https://raw.githubusercontent.com/dotansimha/envelop/HEAD/packages/plugins/sentry/error2.png)

As with any other envelop plugin the setup is easy as pie!

```ts
import { envelop } from '@envelop/core';
import { useSentry } from '@envelop/sentry';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useSentry(),
  ],
});
```

### OpenTelemetry

OpenTelemetry is a possible alternative for Sentry that allows tracking errors as exceptions. [Learn more about the `useOpenTelemetry` plugin](https://www.envelop.dev/plugins/use-open-telemetry)

### Tracing

Apollo introduced the apollo-tracing specification and implemented it in apollo-server. With envelop it is possible to use apollo-tracing for tracking down slow resolvers with any server.

```ts
import { envelop } from '@envelop/core';
import { useApolloTracing } from '@envelop/apollo-tracing';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useApolloTracing(),
  ],
});
```
