# @envelop/live-query

## 2.0.1

### Patch Changes

- 3dfddb5: Bump graphql-tools/utils to v8.6.1 to address a bug in getArgumentsValues
- Updated dependencies [3dfddb5]
  - @envelop/core@1.7.1

## 2.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

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

## 1.0.1

### Patch Changes

- 452af8f: Update dependencies of graphql-tools to latest

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

## 0.0.2

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.0.1

### Patch Changes

- 266dc9f: Add live query plugin
