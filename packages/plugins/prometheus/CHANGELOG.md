# @envelop/prometheus

## 6.3.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 6.3.2

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 6.3.1

### Patch Changes

- Updated dependencies [d5c2c9a]
  - @envelop/core@2.3.1

## 6.3.0

### Minor Changes

- Updated dependencies [af23408]
  - @envelop/core@2.3.0

## 6.2.0

### Minor Changes

- Updated dependencies [ada7fb0]
- Updated dependencies [d5115b4]
- Updated dependencies [d5115b4]
  - @envelop/core@2.2.0

## 6.1.0

### Minor Changes

- Updated dependencies [78b3db2]
- Updated dependencies [f5eb436]
  - @envelop/core@2.1.0

## 6.0.1

### Patch Changes

- f102d38: move `@envelop/core` dependency to peerDependencies

## 6.0.0

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
- Updated dependencies [4106e08]
  - @envelop/core@2.0.0

## 5.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

## 4.2.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 4.2.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 4.1.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 4.0.0

### Patch Changes

- Updated dependencies [d65e35d]
- Updated dependencies [26475c9]
  - @envelop/core@1.3.0

## 3.0.0

### Patch Changes

- Updated dependencies [eb0a4bd]
  - @envelop/core@1.2.0

## 2.0.0

### Patch Changes

- Updated dependencies [7704fc3]
- Updated dependencies [7704fc3]
- Updated dependencies [7704fc3]
  - @envelop/core@1.1.0

## 1.0.3

### Patch Changes

- 452af8f: Update dependencies of graphql-tools to latest
- Updated dependencies [452af8f]
  - @envelop/core@1.0.3

## 1.0.2

### Patch Changes

- 94db02d: Update usage of plugins to use the correct `isAsyncIterable` and new helper `handleStreamOrSingleExecutionResult`
- Updated dependencies [94db02d]
- Updated dependencies [94db02d]
  - @envelop/core@1.0.2

## 1.0.1

### Patch Changes

- 8021229: fix ESM graphql import
- Updated dependencies [c24a8fd]
- Updated dependencies [f45c0bf]
- Updated dependencies [8021229]
- Updated dependencies [adca399]
  - @envelop/core@1.0.1

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

### Patch Changes

- Updated dependencies [dbb241d]
- Updated dependencies [40bc444]
  - @envelop/core@1.0.0

## 0.2.0

### Minor Changes

- e151100: Add support for tracking amount of requests
- e151100: Expose entire `context` object as part of the FillParams fn
- e151100: Added option to skipIntrospection
- e151100: Add support for tracking total "graphql" time

### Patch Changes

- e151100: Set the defualt options to `{}`
- e151100: Use static checking with TypeInfo for "deprecatedFields" counter
- e151100: Fix issues with serialized [Object object] in some built-ins
- e151100: Cleanup, fix some implementation details

## 0.1.0

### Minor Changes

- ccc6cfa: New plugin for prometheus metrics
