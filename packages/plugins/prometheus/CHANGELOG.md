# @envelop/prometheus

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
