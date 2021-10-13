# @envelop/types

## 1.2.0

### Minor Changes

- d65e35d: add enableIf utility to enable plugins conditionally
- 26475c9: useErrorHandler: Pass in the execution arguments to the error handler callbacks.

## 1.1.0

### Minor Changes

- 7704fc3: Add API for registering a context creation error handler.

  ```ts
  export const useMyHook = (): Plugin => {
    return {
      onPluginInit(context) {
        context.registerContextErrorHandler(({ error, setError }) => {
          console.error('Error occurred during context creation.', error);
          setError(new Error('Something went wrong :('));
        });
      },
    };
  };
  ```

## 1.0.2

### Patch Changes

- 94db02d: Added new helper `handleStreamOrSingleExecutionResult`
- 94db02d: Update usage of plugins to use the correct `isAsyncIterable` and new helper `handleStreamOrSingleExecutionResult`

## 1.0.1

### Patch Changes

- c24a8fd: re-use graphql "execute" & "subscribe" types
- adca399: add jsdoc comments for hook types

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

### Minor Changes

- dbb241d: allow hooking into published subscribe values

## 0.4.2

### Patch Changes

- a7321e1: Fix issues with compiled d.ts

## 0.4.1

### Patch Changes

- 932f6a8: Added better type-safety for contextValue in OnExecute hook

## 0.4.0

### Minor Changes

- 50dffaa: Added new hook for onEnveloped

### Patch Changes

- 778c207: Better type safety for OnEnveloped hook

## 0.3.0

### Minor Changes

- 2113527: Extend Envelop plugin API with the ability to access and replace resolver function

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.2.1

### Patch Changes

- 7f4901d: Fix issues with contextFactory and missing context coming from GraphQL pipeline orchestrator

## 0.2.0

### Minor Changes

- a5bee94: \* Allow access to context in all phases
  - Improve usage of `getEnveloped` function and allow to pass initial context there
- eb6f53b: ESM Support for all plugins and envelop core

## 0.1.4

### Patch Changes

- ced704e: Allow plugins to stop execution and return errors

## 0.1.3

### Patch Changes

- 5fc65a4: Improve type safety for plugins context

## 0.1.2

### Patch Changes

- f5177eb: Added `setResult` to the result of onResolverCalled

## 0.1.1

### Patch Changes

- 925a1ea: Extend `onSchemaChange` and allow to override schema. Make sure to avoid infinite loops.

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
