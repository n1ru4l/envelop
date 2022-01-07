# @envelop/newrelic

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
