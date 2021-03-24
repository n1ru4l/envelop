## `@envelop/sentry`

This plugins collects errors and performance tracing for your execution flow, and reports it to [Sentry](https://sentry.io/).

This is how it looks like in Sentry for error tracking:

![Example](./error1.png)
![Example](./error2.png)

> The operation name, document, variables are collected on errors, and the breadcrumbs that led to the error. You can also add any custom values that you need.

And for performance tracking:

![Example](./perf1.png)
![Example](./perf2.png)

> You can get information about each resolver (including field and type names), it's execution time and arguments. Also, in case of an error, the performance log and info are attached automatically to the reported Sentry error.

## Getting Started

```
yarn add @sentry/node @sentry/tracing @envelop/sentry
```

1. Start by creating an account and a project in https://sentry.io/
2. Follow the instructions to setup your Sentry instance in your application.
3. Setup Sentry global instance configuration.
4. Setup the Envelop plugin.

## Usage Example

```ts
import { envelop } from '@envelop/core';
import { useSentry } from '@envelop/sentry';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useSentry({
      includeRawResult: false // set to `true` in order to include the execution result in the metadata collected
      includeResolverArgs: false, // set to `true` in order to include the args passed to resolvers
      includeExecuteVariables: false, // set to `true` in order to include the operation variables values
      appendTags: (args) => { return { ... }} // if you wish to add custom "tags" to the Sentry transaction created per operation
    }),
  ],
});
```
