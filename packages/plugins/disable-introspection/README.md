## `@envelop/disable-introspection`

This plugin injects the `NoSchemaIntrospectionCustomRule` validation rule exported from the `graphql` module to the validation phase for disabling introspection.

## Getting Started

```
yarn add @envelop/disable-introspection
```

## Usage Example

```ts
import { envelop } from '@envelop/core';
import { useDisableIntrospection } from '@envelop/disable-introspection';

const getEnveloped = envelop({
  plugins: [useDisableIntrospection()],
});
```
