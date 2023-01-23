# useInngest

`useInngest` is an [Envelop]((https://envelop.dev/) plugin for [GraphQL Yoga](https://envelop.dev/) and servers or frameworks powered by Yoda, such as [RedwoodJS](https://www.redwoodjs.com).

It's philosophy is to "instrument everything" by sending events for each GraphQL execution results to [Inngest](https://www.inngest.com) to effortlessly build event-driven applications.

## About Inngest

Inngest makes it simple for you to write delayed or background jobs by triggering functions from events — decoupling your code from your application.

- You send events from your application via HTTP (or via third party webhooks, e.g. Stripe)
- Inngest runs your serverless functions that are configured to be triggered by those events, either immediately, or delayed.

Inngest brings the benefits of event-driven systems to all developers, without having to write any code themselves.

Inngest believes that:

- Event-driven systems should be easy to build and adopt
- Event-driven systems are better than regular, procedural systems and queues
- Developer experience matters
- Serverless scheduling enables scalable, reliable systems that are both cheaper and better for compliance

## About Yoga and Envelop

[GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) is a batteries-included cross-platform GraphQL over HTTP spec-compliant GraphQL server powered by[Envelop](https://envelop.dev/) and [GraphQL Tools](https://graphql-tools.com/).

Yoga uses Envelop under the hood so you can easily extend your server's capabilities with the plugins from Envelop Ecosystem.

[`Envelop`](https://envelop.dev/) is a lightweight JavaScript (/TypeScript) library for wrapping GraphQL execution layer and flow, allowing developers to develop, share and collaborate on GraphQL-related plugins while filling the missing pieces in GraphQL implementations.

Envelop aims to extend the GraphQL execution flow by adding plugins that enriches the feature set of your application.

Envelop provides a low-level hook-based plugin API for developers. By combining plugins, you can compose your own GraphQL "framework", and get a modified version of GraphQL with the capabilities you need.

Envelop is created and maintained by [The Guild](https://the-guild.dev/).

## What's Possible

TODO

## Setup and Installation

TODO

## Configuration Options

TODO

## Future Considerations

- Consider sending `graphql/operation-mutation` or `graphql/operation-query` or `graphql/operation-subscription` for operation events where, fo example the mutation with teh typename and operation and variables could be used for cache invalidation
- Consider using `__typename` for nouns in event
