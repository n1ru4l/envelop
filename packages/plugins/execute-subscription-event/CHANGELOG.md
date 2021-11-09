# @envelop/execute-subscription-event

## 0.2.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 0.2.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 0.1.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 0.0.5

### Patch Changes

- 422a6c6: fix ESM

## 0.0.4

### Patch Changes

- 01c8171: fix: await execute before calling "onEnd"

## 0.0.3

### Patch Changes

- 94db02d: Update usage of plugins to use the correct `isAsyncIterable` and new helper `handleStreamOrSingleExecutionResult`

## 0.0.2

### Patch Changes

- 8021229: fix ESM graphql import

## 0.0.1

### Patch Changes

- dbb241d: initial release
