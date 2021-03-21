## Envelop

### TL;DR:

Envelop is a lightweight JavaScript library for wrapping GraphQL execution layer and flow, allowing developers to develop, share and collaborate on GraphQL-related plugins, while filling the missing pieces in GraphQL implementations.

### In depth

Our goal is to allow developers keep the original GraphQL interfaces, while adding plugins to enrich the feature set of you application quickly, while sharing ideas, code and plugins with other developers.

Envelop is agnostic to the HTTP server you use, so it's not a traditional server. We do not aim to provide a complete server, you can use Envelop with any environment (NodeJS or browser) and any type of GraphQL workflow (client / server, client-side execute, or server to server). So any piece of code that uses GraphQL's `execute` can benfit from that layer.

The core of Envelop is zero-dependency, and will only apply changes to your GraphQL execution based on the plugins you wish to use. It can be integrated with any GraphQL server that follows [the execution phase, as defined in the GraphQL spec](https://spec.graphql.org/June2018/#sec-Executing-Requests) and let you provide your own lifecycle methods.

Separating the execution workflow and the logic that it runs in each phase allow you to write reusable piece of code, like logging, metric collection, error handling, custom validations, resolvers tracing (and integration with any external), authentication, authorization and much more, without the needs to write it explictly every time, or in any project or microservice. With Envelop, you can easily create a wrapper around your common logics, and share it with others.

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

The result of `envelop` is a function, that allow you to get everything you need for the GraphQL execution: `parse`, `validate`, `contextBuilder` and `execute`. Use that to run the client's GraphQL queries. Here's a psuedo-code of how it should looks like:

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

## Integrations

Envelop provides a low-level API at consumpion of the output, but a rich API while using it with plugins. Based on that, it's possible to integrate Envelop with many tools.

Here's a list of integrations and examples:

| Server/Framework | Fully supported? | Example                                     |
| ---------------- | ---------------- | ------------------------------------------- |
| Node's HTTP      | V                | [`basic-http`](./examples/simple-http)      |
| GraphQL-Helix    | V                | [`graphql-helix`](./examples/graphql-helix) |
| Apollo-Server    | Almost           | [`apollo-server`](./examples/apollo-server) |
| Mercurius        | Almost           | -                                           |

## Available Plugins

We provide a few built-in plugins within the `@envelop/core`:

And much more as standalone packages:

## Execution Lifecycle

## Write your own plugin!

## License

MIT
