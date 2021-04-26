## Envelop

Envelop is a lightweight JavaScript library for wrapping GraphQL execution layer and flow, allowing developers to develop, share and collaborate on GraphQL-related plugins, while filling the missing pieces in GraphQL implementations.

<p align="left">
  <img height="150" src="./logo.png">
</p>

`@envelop/core`: [![npm version](https://badge.fury.io/js/%40envelop%2Fcore.svg)](https://badge.fury.io/js/%40envelop%2Fcore)

> Envelop is created and maintained by [The Guild](https://the-guild.dev/), and used in production by our clients.

### In depth

Our goal is to allow developers keep the original GraphQL interfaces, while adding plugins to enrich the feature set of you application quickly, while sharing ideas, code and plugins with other developers.

Envelop is agnostic to the HTTP server you use, so it's not a traditional server. We do not aim to provide a complete server, you can use Envelop with any environment (NodeJS or browser) and any type of GraphQL workflow (client / server, client-side execute, or server to server). So any piece of code that uses GraphQL's `execute` can benfit from that layer.

The core of Envelop is zero-dependency, and will only apply changes to your GraphQL execution based on the plugins you wish to use. It can be integrated with any GraphQL server that follows [the execution phase, as defined in the GraphQL spec](https://spec.graphql.org/June2018/#sec-Executing-Requests) and let you provide your own lifecycle methods.

Separating the execution workflow and the logic that it runs in each phase allow you to write reusable piece of code, like logging, metric collection, error handling, custom validations, resolvers tracing (and integration with any external), authentication, authorization and much more, without the needs to write it explicitly every time, or in any project or microservice. With Envelop, you can easily create a wrapper around your common logics, and share it with others.

## Getting Started

Start by adding the core of Envelop to your codebase:

```
yarn add graphql @envelop/core
```

Then, create a simple Envelop based on your GraphQL schema:

```ts
import { envelop, useSchema } from '@envelop/core';

const mySchema = buildSchema( ... ); // GraphQLSchema

const getEnveloped = envelop({
  plugins: [
    useSchema(mySchema)
  ],
});
```

The result of `envelop` is a function, that allow you to get everything you need for the GraphQL execution: `parse`, `validate`, `contextBuilder` and `execute`. Use that to run the client's GraphQL queries. Here's a pseudo-code of how it should looks like:

```ts
const httpServer = createServer();

httpServer.on('request', (req, res) => {
  // Here you get the alternative methods that are bundled with your plugins
  const { parse, validate, contextFactory, execute, schema } = getEnveloped();

  // Parse the initial request and validate it
  const { query, variables } = JSON.parse(req.payload);
  const document = parse(query);
  const validationErrors = validate(schema, document);

  if (validationErrors.length > 0) {
    return res.end(JSON.stringify({ errors: validationErrors }));
  }

  // Build the context and execute
  const context = await contextFactory(req);
  const result = await execute({
    document,
    schema,
    variableValues: variables,
    contextValue: context,
  });

  // Send the response
  res.end(JSON.stringify(result));
});

httpServer.listen(3000);
```

Behind the scenes, this simple workflow allow you to use **Envelop plugins** and hook into the entire request handling flow.

Here's a simple example for collecting metrics and log all incoming requests, using the built-in plugins:

```ts
const getEnveloped = envelop({
  plugins: [useSchema(schema), useLogger(), useTiming()],
});
```

> Envelop `plugins` are based on a simple event-based contact, that allow you easily to add more logic to your app. You can easily share and collaborate on plugins that you find generic.

## Integrations / Examples

Envelop provides a low-level API at consumption of the output, but a rich API while using it with plugins. Based on that, it's possible to integrate Envelop with many tools.

We recommend on using [`graphql-helix`](https://github.com/contrawork/graphql-helix) as request pipeline orchestrator, as it allows the maximum flexibility and you can easily override/manage every part of the pipeline with Envelop.

Here's a list of integrations and examples:

| Server/Framework | Fully supported? | Example                                     |
| ---------------- | ---------------- | ------------------------------------------- |
| Node's `http`    | V                | [`basic-http`](./examples/simple-http)      |
| GraphQL-Helix    | V                | [`graphql-helix`](./examples/graphql-helix) |
| Apollo-Server    | Almost           | [`apollo-server`](./examples/apollo-server) |

> Since Envelop is not a HTTP server, and just a wrapper around GraphQL request pipeline - it's possible to integrate it with any server/framework, if it's flexible enough and allow you to specify the pipeline methods\*.

## Available Plugins

We provide a few built-in plugins within the `@envelop/core`, and many more plugins as standalone packages.

| Name                       | Package                                                                      | Description                                                                    |
| -------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| useSchema                  | [`@envelop/core`](./packages/core#useschema)                                 | Simplest plugin to provide your GraphQL schema.                                |
| useErrorHandler            | [`@envelop/core`](./packages/core#useerrorhandler)                           | Get notified when any execution error occurs.                                  |
| useExtendContext           | [`@envelop/core`](./packages/core#useextendcontext)                          | Extend execution context based on your needs.                                  |
| useLogger                  | [`@envelop/core`](./packages/core#uselogger)                                 | Simple, yet powerful logging for GraphQL execution.                            |
| usePayloadFormatter        | [`@envelop/core`](./packages/core#usepayloadformatter)                       | Format, clean and customize execution result.                                  |
| useTiming                  | [`@envelop/core`](./packages/core#usetiming)                                 | Simple timing/tracing mechanism for your execution.                            |
| useGraphQLJit              | [`@envelop/graphql-jit`](./packages/plugins/graphql-jit)                     | Custom executor based on GraphQL-JIT.                                          |
| useParserCache             | [`@envelop/parser-cache`](./packages/plugins/parser-cache)                   | Simple LRU for caching `parse` results.                                        |
| useValidationCache         | [`@envelop/validation-cache`](./packages/plugins/validation-cache)           | Simple LRU for caching `validate` results.                                     |
| useDepthLimit              | [`@envelop/depth-limit`](./packages/plugins/depth-limit)                     | Limits the depth of your GraphQL selection sets.                               |
| useDataLoader              | [`@envelop/dataloader`](./packages/plugins/dataloader)                       | Simply injects a DataLoader instance into your context.                        |
| useApolloTracing           | [`@envelop/apollo-tracing`](./packages/plugins/apollo-tracing)               | Integrates timing with Apollo-Tracing format (for GraphQL Playground)          |
| useSentry                  | [`@envelop/sentry`](./packages/plugins/sentry)                               | Tracks performance, timing and errors and reports it to Sentry.                |
| useOpenTelemetry           | [`@envelop/opentelemetry`](./packages/plugins/opentelemetry)                 | Tracks performance, timing and errors and reports in OpenTelemetry structure.  |
| useGenericAuth             | [`@envelop/generic-auth`](./packages/plugins/generic-auth)                   | Super flexible authentication, also supports `@auth` directive .               |
| useAuth0                   | [`@envelop/auth0`](./packages/plugins/auth0)                                 | Validates Auth0 JWT tokens and injects the authenticated user to your context. |
| useGraphQLModules          | [`@envelop/graphql-modules`](./packages/plugins/graphql-modules)             | Integrates the execution lifecycle of GraphQL-Modules.                         |
| useGraphQLMiddleware       | [`@envelop/graphql-middleware`](./packages/plugins/graphql-middleware)       | Integrates middlewares written for `graphql-middleware`                        |
| useRateLimiter             | [`@envelop/rate-limiter`](./packages/plugins/rate-limiter)                   | Limit request rate via `@rateLimit` directive                                  |
| useDisableIntrospection    | [`@envelop/disable-introspection`](./packages/plugins/disable-introspection) | Disables introspection by adding a validation rule                             |
| useFilterAllowedOperations | [`@envelop/filter-operation-type`](./packages/plugins/filter-operation-type) | Only allow execution of specific operation types                               |

## Sharing `envelop`s

After an `envelop` has been created, you can share it with others as a complete layer of plugins. This is useful if you wish to create a predefined layer of plugins, and share it with others. You can use the as a shell and as a base for writing sharable pieces of servers.

Here's a small exmple for sharing envelops:

```ts
// Somewhere where you wish to create the basics of what you wish to share
// This defined the base plugins you wish to use as base.
const myBaseEnvelop = envelop({
  plugins: [useOrgAuth(), useOrgTracing(), useOrgLogsCollector()],
});

// Later, when you create your own Envelop, you can extend that and add custom plugins.
// You can also specify the schema only at this point
const myEnvelop = envelop({
  extends: [myBaseEnvelop],
  plugins: [useSchema(myServerSchema), useMyCustomPlugin()],
});
```

This approach allow developers to create a base Envelop and share it across the organization: you can define your monitoring setup, logging, authentication, etc, only once in a common package, and share it with others without losing the ability to extend it.

## Write your own plugin!

Envelop plugins are just object with functions, that provides contextual implementation for before/after of each phase, with a flexible API.

Here's a simple example that allow you print the execution params:

```ts
const myPlugin = {
  onExecute({ args }) {
    console.log('Execution started!', { args });

    return {
      onExecuteDone: ({ result }) => {
        console.log('Execution done!', { result });
      },
    };
  },
};

const getEnveloped = envelop({
  plugins: [
    /// ... other plugins ...,
    myPlugin,
  ],
});
```

> Feel free to share you plugin with us, or with the community. Sharing = Caring!

#### The plugin interface

You can find it here: https://github.com/dotansimha/envelop/blob/main/packages/types/src/index.ts#L50

#### Execution Lifecycle

By extending the GraphQL execution pipeline, we allow developers to write reusable plugins, that can be shared with others easily, as NPM packages. So instead of delivering a bloated GraphQL server with tons of features, we allow you to choose the HTTP server you prefer, the request pipeline you prefer, and the features you prefer.

We wrap the execution pipeline of GraphQL operation, and allow Envelop plugins to do the following:

- `parse`
  - Hook into the before/after of this phase
  - Override the parse function
  - Access to the parsed result
  - Modify the parsed result
- `validate`
  - Hook into the before/after of this phase
  - Override the validation function
  - Access to the validation error results
  - Modify the validation results
  - Add custom validation rules
- `contextFactory`
  - Hook into the before/after of this phase
  - Access to the initial HTTP request context
  - Extend the context with custom data
  - Replace the context object
- `execute`
  - Hook into the before/after of this phase
  - Extend the execution context
  - Access to all execution parameters
  - Replace the execute function
  - Access to the results / error of the execution
  - Access to before / after resolvers calls
  - Extend resolvers behavior
  - Access resolvers parameters
  - Replace / modify the execution result
- `subscribe`
  - Hook into the before/after of this phase
  - Extend the execution context
  - Access to all execution parameters
  - Replace the execute function
  - Access to the results / error of the execution
  - Access to before / after resolvers calls
  - Extend resolvers behavior
  - Access resolvers parameters
  - Replace / modify the subscription result

We also allow you to change the GraphQL schema during execution - so if your server has a schema that could change dynamically, you can always update it. As a result, we trigger `schemaChange` event that allow plugins respond accordingly.

### Contributing

If this is your first time contributing to this project, please do read our [Contributor Workflow Guide](https://github.com/the-guild-org/Stack/blob/master/CONTRIBUTING.md) before you get started off.

Feel free to open issues and pull requests. We're always welcome support from the community.

For a contribution guide specific to this project, please refer to: http://graphql-code-generator.com/docs/custom-codegen/contributing

### Code of Conduct

Help us keep GraphQL Codegenerator open and inclusive. Please read and follow our [Code of Conduct](https://github.com/the-guild-org/Stack/blob/master/CODE_OF_CONDUCT.md) as adopted from [Contributor Covenant](https://www.contributor-covenant.org/)

### License

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)](https://raw.githubusercontent.com/apollostack/apollo-ios/master/LICENSE)

MIT
