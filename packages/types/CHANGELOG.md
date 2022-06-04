# @envelop/types

## 2.2.1

### Patch Changes

- fbf6155: update package.json repository links to point to the new home

## 2.2.0

### Minor Changes

- af23408: Pass context to registerContextErrorHandler

  ```ts
  export const useMyHook = (): Plugin => {
    return {
      onPluginInit(context) {
        context.registerContextErrorHandler(({ context }) => {
          console.error('Error occurred during context creation but at least I have the  context so far', context);
        });
      },
    };
  };
  ```

## 2.1.0

### Minor Changes

- d5115b4: add `setResult` to `AfterValidateEventPayload` for altering the validation errors.

## 2.0.0

### Major Changes

- aac65ef: Move `onResolverCalled` from within `OnExecuteHookResult` and `OnSubscribeHookResult` to the `Plugin` type.

  ```diff
  import type { Plugin } from "@envelop/core";

  const plugin: Plugin = {
    onExecute() {
  -    return {
  -      onResolverCalled() {}
  -    }
  -  }
  +  },
  +  onResolverCalled() {},
  }
  ```

  We highly recommend avoiding to use any plugins that use `onResolverCalled` within your production environment as it has severe impact on the performance of the individual resolver functions within your schema.

  The schema resolver functions are now ONLY wrapped if any plugin in your envelop setup uses the `onResolverCalled` hook.

  If you need any shared state between `onExecute` and `onResolverCalled` you can share it by extending the context object.

  ```ts
  import type { Plugin } from '@envelop/core';

  const sharedStateSymbol = Symbol('sharedState');

  const plugin: Plugin = {
    onExecute({ extendContext }) {
      extendContext({ [sharedStateSymbol]: { value: 1 } });
    },
    onResolverCalled({ context }) {
      const sharedState = context[sharedStateSymbol];
      // logs 1
      console.log(sharedState.value);
    },
  };
  ```

### Minor Changes

- 4106e08: Add new option `breakContextBuilding` to `OnContextBuildingEventPayload`.

  This allows short-circuiting the context building phase. Please use this with care as careless usage of it can result in severe errors during the execution phase, as the context might not include all the fields your schema resolvers need.

## 1.5.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

## 1.5.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 1.4.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 1.3.0

### Minor Changes

- 365a982: Allow async OnExecuteDone hook

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
