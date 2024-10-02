## `@envelop/apollo-client`

Lets you use Envelop with Apollo client via a SchemaLink. Useful when you want to re-use your server
graphql setup, while avoiding network calls during server-side rendering.

## Getting Started

```
yarn add graphql-middleware @envelop/apollo-client
```

## Usage Example

```ts
import * as graphqlJs from 'graphql'
import { ApolloClient, gql, InMemoryCache } from '@apollo/client'
import { EnvelopSchemaLink } from '@envelop/apollo-client'
import { envelop, useEngine, useSchema } from '@envelop/core'
import { makeExecutableSchema } from '@graphql-tools/schema'

let schema = makeExecutableSchema({
  typeDefs: `type Query { hello: String! }`,
  resolvers: {
    Query: {
      hello: () => 'world'
    }
  }
})

// Use any enveloped setup
let getEnveloped = envelop({
  plugins: [useEngine(graphqlJs), useSchema(schema)]
})
let envelope = getEnveloped()

let apollo = new ApolloClient({
  cache: new InMemoryCache(),
  // Pass it to EnvelopSchemaLink, this is the key
  link: new EnvelopSchemaLink(envelope)
})

// Use Apollo
let result = await apollo.query({
  query: gql`
    query {
      hello
    }
  `
})

console.log(result)
```
