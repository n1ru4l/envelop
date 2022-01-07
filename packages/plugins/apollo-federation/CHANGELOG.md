# @envelop/apollo-federation

## 1.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

## 0.2.2

### Patch Changes

- 25b8ae8: fix(federation): do not cache parse if document is already parsed

## 0.2.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 0.2.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 0.1.1

### Patch Changes

- bf5e2fd: Bump release to fix package info

## 0.1.0

### Minor Changes

- 8838240: New Apollo Federation Plugin
