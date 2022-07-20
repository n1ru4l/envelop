## `@envelop/graphql-modules`

This plugins integrates [`graphql-modules`](https://github.com/Urigo/graphql-modules) execution lifecycle into the GraphQL execution flow.

If you are using `graphql-modules` dependency injection - this setup is needed in order to make sure `Injector` is created and destroyed at the right time.

## Getting Started

```
yarn add @envelop/graphql-modules
```

## Usage Example

```ts
import { envelop } from '@envelop/core'
import { createApplication } from 'graphql-modules'
import { useGraphQLModules } from '@envelop/graphql-modules'

const myApp = createApplication({
  modules: [
    /* ... */
  ]
})

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useGraphQLModules(myApp)
  ]
})
```

Then, you can use GraphQL-Modules `injector` in your resolvers:

```ts
const resolvers = {
  Query: {
    foo: (root, args, context, info) => {
      const myProviderInstance = context.injector.get(/* ... */)
    }
  }
}
```
