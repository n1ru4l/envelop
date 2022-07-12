## `@envelop/graphql-executor`

A customizable GraphQL Spec compliant Executor.

GraphQL Executor provides:

1. A way to fork the GraphQL.JS executor without introducing multiple versions of graphql-js into your project. graphql-executor is a smart fork of only the execution module of graphql-js. You can safely fork graphql-executor to customize your execution flow as needed.
2. A code-only method of customizing the executor by subclassing the exported internal Executor class as above.
3. Direct benefits from our own customizations! GraphQL Executor is spec-compliant, but aims to support experimental features (such as @defer/@stream support) and provide other improvements as possible. See (https://github.com/yaacovCR/graphql-executor/releases) to track any new features.

## Getting Started

Start by installing the plugin:

```
yarn add @envelop/graphql-executor
```

Then, use the plugin with your validation rules:

```ts
import { useGraphQLExecutor } from '@envelop/extended-validation'

const getEnveloped = envelop({
  plugins: [useGraphQLExecutor()]
})
```
