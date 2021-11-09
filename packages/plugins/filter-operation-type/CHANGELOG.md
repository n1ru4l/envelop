# @envelop/filter-operation-type

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

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

## 0.1.1

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.1.0

### Minor Changes

- eb6f53b: ESM Support for all plugins and envelop core

### Patch Changes

- 070dc4d: Export type `AllowedOperations`

## 0.0.1

### Patch Changes

- 219c41e: Initial implementation of the plugin.
