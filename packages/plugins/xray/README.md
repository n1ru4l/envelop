## `@envelop/xray`

This plugin adds aws xray trace segments for resolvers using [`aws-xray-sdk`](https://github.com/aws/aws-xray-sdk-node).

## Getting Started

```
yarn add @envelop/xray
```

## Usage Example

```ts
import { envelop } from '@envelop/core';
import { useXRay } from '@envelop/xray';

const getEnveloped = envelop({
  plugins: [
    // ... other plugins ...
    useXRay(),
  ],
});
```
