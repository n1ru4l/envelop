# @envelop/newrelic

## 4.0.2

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 4.0.1

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 4.0.0

### Major Changes

- 6106340: Set a custom operation name through a function that reads from context

  ## 🚀 Breaking Change:

  In order to set a custom operation name, you can no longer use the `operationNameProperty` option.
  You will, instead, be able to use the new function `extractOperationName` which receives the context and so allows for greater customisation by accessing nested properties or context extensions from other Envelop plugins.

  ```ts
  const getEnveloped = envelop({
    plugins: [
      // ... other plugins ...
      useNewRelic({
        ...
        extractOperationName: (context) => context.request.body.customOperationName
      }),
    ],
  });
  ```

### Patch Changes

- Updated dependencies [d5c2c9a]
  - @envelop/core@2.3.1

## 3.4.0

### Minor Changes

- Updated dependencies [af23408]
  - @envelop/core@2.3.0

## 3.3.0

### Minor Changes

- Updated dependencies [ada7fb0]
- Updated dependencies [d5115b4]
- Updated dependencies [d5115b4]
  - @envelop/core@2.2.0

## 3.2.1

### Patch Changes

- cfd45e1: Fix skipError function implementation by applying it to onExecuteDone

## 3.2.0

### Minor Changes

- 64d83a2: feat(newrelic): support async iterable results

### Patch Changes

- 64d83a2: enhance(newrelic): import newrelic only if plugin is enabled

## 3.1.0

### Minor Changes

- Updated dependencies [78b3db2]
- Updated dependencies [f5eb436]
  - @envelop/core@2.1.0

## 3.0.0

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
- Updated dependencies [4106e08]
  - @envelop/core@2.0.0

## 2.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

## 1.3.0

### Minor Changes

- 5679a70: Respect Envelop errors in NewRelic plugin

## 1.2.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 1.2.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 1.1.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 1.0.3

### Patch Changes

- 422a6c6: fix ESM

## 1.0.2

### Patch Changes

- 94db02d: Update usage of plugins to use the correct `isAsyncIterable` and new helper `handleStreamOrSingleExecutionResult`

## 1.0.1

### Patch Changes

- 8021229: fix ESM graphql import

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

## 0.0.4

### Patch Changes

- 932f6a8: Better type-safety for hooks

## 0.0.3

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.0.2

### Patch Changes

- 5c69373: Fixed retrieval of root operation from Envelop context

  NOTE: There is a breaking behaviour. When using the `operationNameProperty` option, this will be checked against the `document` object rather than the `operation` object as in initial version.

## 0.0.1

### Patch Changes

- 12c16bd: Initial New Relic plugin implementation
