## `@envelop/newrelic`

Instrument your GraphQL application with New Relic reporting.  
Take advantage of Distributed tracing to monitor performance and errors whilst ultimately getting to the root cause of issues.

## Getting Started

```
yarn add newrelic @envelop/newrelic
```

TODO: Describe setting up newrelic config.

## Usage Example

```ts
import { envelop } from '@envelop/core';
import { useNewRelic } from '@envelop/newrelic';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useNewRelic({
      includeExecuteVariables: false, // default `false`. When set to `true`, includes the operation variables values
      includeRawResult: false, // default: `false`. When set to `true`, includes the execution result
      trackResolvers: true, // default `false`. When set to `true`, track resolvers as segments to monitor their performance
      includeResolverArgs: false, // default `false`. When set to `true`, include the args passed to resolvers
      rootFieldsNaming: true, // default `false`. When set to `true` appent the names of operation root fields to the transaction name
      operationNameProperty: 'hash' // default empty. When passed will check the property passed in the operation objejct and use its value as operation name. Useful for custom query id properties
    }),
  ],
});
```
