# @envelop/newrelic

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
