# @envelop/sentry

## 3.1.1

### Patch Changes

- b96ca65: Handle errors in async iterables, defer and stream queries.
  Better grouping of errors in lists by mapping the index number to a constant: `$index`

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

## 1.5.1

### Patch Changes

- ccd86fe: Patch for defaultSkipError, which should return true if the error is an EnvelopError instance.

## 1.5.0

### Minor Changes

- 450abd4: Adds a new `skipError` option, which allows users to skip certain errors.

  It's useful in the case where a user has defined custom error types, such as `ValidationError` which may be used to validate resolver arguments.

## 1.4.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 1.4.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 1.3.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 1.2.1

### Patch Changes

- 016bbe2: do not report Envelop Error to sentry

## 1.2.0

### Minor Changes

- 1e2be95: Add configureScope option

## 1.1.0

### Minor Changes

- b5bdcad: Adds "skip" to indicate whether or not to skip the entire Sentry flow for given GraphQL operation

## 1.0.2

### Patch Changes

- 94db02d: Update usage of plugins to use the correct `isAsyncIterable` and new helper `handleStreamOrSingleExecutionResult`

## 1.0.1

### Patch Changes

- 8021229: fix ESM graphql import

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

## 0.3.1

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.3.0

### Minor Changes

- eb6f53b: ESM Support for all plugins and envelop core

## 0.2.1

### Patch Changes

- f4924c7: Fix defaults

## 0.2.0

### Minor Changes

- e55c50a: Add trackResolvers
- e55c50a: Allow to reuse existing transaction

## 0.1.1

### Patch Changes

- 5fc65a4: Improved type-safety for internal context

## 0.1.0

### Minor Changes

- 2fba0b4: Initial version bump

## 0.0.2

### Patch Changes

- b1333b0: Initial packages release

## 0.0.1

### Patch Changes

- c499ae8: First bump as envelop
- 2cfc726: Fixes
