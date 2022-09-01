# @envelop/core

## 2.6.0

### Minor Changes

- [#1499](https://github.com/n1ru4l/envelop/pull/1499) [`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6) Thanks [@viniciuspalma](https://github.com/viniciuspalma)! - Adding tslib to package dependencies

  Projects that currently are using yarn Berry with PnP or any strict dependency
  resolver, that requires that all dependencies are specified on
  package.json otherwise it would endue in an error if not treated correct

  Since https://www.typescriptlang.org/tsconfig#importHelpers is currently
  being used, tslib should be exported as a dependency to external runners
  get the proper import.

  Change on each package:

  ```json
  // package.json
  {
    "dependencies": {
      "tslib": "^2.4.0"
    }
  }
  ```

### Patch Changes

- [#1496](https://github.com/n1ru4l/envelop/pull/1496) [`ae7bc9a3`](https://github.com/n1ru4l/envelop/commit/ae7bc9a36abd595b0a91f7b4e133017d3eb99a4a) Thanks [@ardatan](https://github.com/ardatan)! - Fix isIntrospectionDocument and isIntrospectionOperation for fragment tricks

- Updated dependencies [[`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6)]:
  - @envelop/types@2.4.0

## 2.5.0

### Minor Changes

- [#1473](https://github.com/n1ru4l/envelop/pull/1473) [`d828f129`](https://github.com/n1ru4l/envelop/commit/d828f1291254a0f9dfdc3654611087859e4c9708) Thanks [@n1ru4l](https://github.com/n1ru4l)! - handle subscription resolver errors in useErrorHandler

### Patch Changes

- [#1471](https://github.com/n1ru4l/envelop/pull/1471) [`5a5f5c04`](https://github.com/n1ru4l/envelop/commit/5a5f5c04177b9e1379fd77db5d6383160879d449) Thanks [@n1ru4l](https://github.com/n1ru4l)! - Ensure error thrown from the context factory is wrapped within a GraphQLError for proper formatting. Previously this caused an unexpected error to be swallowed completly when error masking is enabled.

## 2.4.2

### Patch Changes

- 071f946: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [071f946]
  - @envelop/types@2.3.1

## 2.4.1

### Patch Changes

- 787d28a2: Use the custom error formatter for the errors thrown when building the context and the subscription

## 2.4.0

### Minor Changes

- 8bb2738: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [8bb2738]
  - @envelop/types@2.3.0

## 2.3.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/types@2.2.1

## 2.3.2

### Patch Changes

- 07d029b: use the correct `GraphQLErrorExtensions` interface for the `extensions` constructor option on `EnvelopError`.

## 2.3.1

### Patch Changes

- d5c2c9a: fix immediate introspection for subscription and mutation

## 2.3.0

### Minor Changes

- af23408: Pass context to registerContextErrorHandler

  ```ts
  export const useMyHook = (): Plugin => {
    return {
      onPluginInit(context) {
        context.registerContextErrorHandler(({ context }) => {
          console.error('Error occurred during context creation but at least I have the  context so far', context)
        })
      }
    }
  }
  ```

### Patch Changes

- Updated dependencies [af23408]
  - @envelop/types@2.2.0

## 2.2.0

### Minor Changes

- d5115b4: allow masking validation and parse errors with `useMaskedErrors`.

  ```ts
  useMaskedErrors({
    handleParseErrors: true,
    handleValidateErrors: true
  })
  ```

  This option is disabled by default as validation and parse errors are expected errors that help the API consumer instead of leaking secret information.

  If you want to avoid leaking schema suggestions, we recommend using persisted operations.

- d5115b4: add `setResult` to `AfterValidateEventPayload` for altering the validation errors.

### Patch Changes

- ada7fb0: correctly identify introspection only operations in `useImmediateIntrospection`
- Updated dependencies [d5115b4]
  - @envelop/types@2.1.0

## 2.1.0

### Minor Changes

- 78b3db2: Add `setResultAndStopExecution` to the `onSubscribe` context.

### Patch Changes

- f5eb436: always invoke `onExecutDone` hooks

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
  import type { Plugin } from '@envelop/core'

  const sharedStateSymbol = Symbol('sharedState')

  const plugin: Plugin = {
    onExecute({ extendContext }) {
      extendContext({ [sharedStateSymbol]: { value: 1 } })
    },
    onResolverCalled({ context }) {
      const sharedState = context[sharedStateSymbol]
      // logs 1
      console.log(sharedState.value)
    }
  }
  ```

### Minor Changes

- 4106e08: Add new option `breakContextBuilding` to `OnContextBuildingEventPayload`.

  This allows short-circuiting the context building phase. Please use this with care as careless usage of it can result in severe errors during the execution phase, as the context might not include all the fields your schema resolvers need.

- 4106e08: Add new plugin `useImmediateIntrospection` for speeding up introspection only operations by skipping context building.

  ```ts
  import { envelop, useImmediateIntrospection } from '@envelop/core'
  import { schema } from './schema'

  const getEnveloped = envelop({
    plugins: [
      useSchema(schema),
      useImmediateIntrospection()
      // additional plugins
    ]
  })
  ```

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
  - @envelop/types@2.0.0

## 1.7.1

### Patch Changes

- 3dfddb5: Bump graphql-tools/utils to v8.6.1 to address a bug in getArgumentsValues

## 1.7.0

### Minor Changes

- d9cfb7c: Support including the original error stack for masked errors within the error extensions via the `isDev` option and the `defaultErrorFormatter`.

  ```ts
  useMaskedErrors({ isDev: true })
  ```

  On Node.js environments the `isDev` default value is `true` if `globalThis.process.env["NODE_ENV"]` is equal to `"development"`. Otherwise, the default value is ALWAYS `false`.

  ***

  The `FormatErrorHandler` now has a third argument `isDev` which is forwarded from the configuration and can be used for customizing the formatter behavior in development mode.

## 1.6.6

### Patch Changes

- 8e365c2: fix potential memory leak when using `onEnd` and `onNext` stream handlers for hooking into `subscribe` and `execute`.

  This has been caused by AsyncGenerators being blocked until the next value is published. Now disposed result streams (AsyncIterables) will properly cleanup the underlying stream source.

- fd14339: feat(usePayloadFormatter): add second argument with execution arguments
- 128c5d3: Fix context type inference with enableIf helper

## 1.6.5

### Patch Changes

- d1a0e4e: Allow userland code to specify type of currentContext in ContextFactoryFn

## 1.6.4

### Patch Changes

- d30ef6a: fix issue that caused calculating negative tracing durations

## 1.6.3

### Patch Changes

- 521ecb8: Prefer `globalThis.performance.now` for tracing if available. Fallback to `Date.now`.

  Using tracing no longer raises an error on browser, deno and cloudflare worker environments.

## 1.6.2

### Patch Changes

- f272b28: useTiming: Fix a typo in onSubscriptionMeasurement

## 1.6.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/types@1.5.1

## 1.6.0

### Minor Changes

- 090cae4: GraphQL v16 support

### Patch Changes

- Updated dependencies [090cae4]
  - @envelop/types@1.5.0

## 1.5.0

### Minor Changes

- 3458917: Allow functions returning a plugin in `enableIf` and lazy load plugin by avoiding running the init flow of plugin if value is false.
- 04120de: add support for GraphQL.js 16

### Patch Changes

- Updated dependencies [04120de]
  - @envelop/types@1.4.0

## 1.4.0

### Minor Changes

- 365a982: Allow async OnExecuteDone hook

### Patch Changes

- Updated dependencies [365a982]
  - @envelop/types@1.3.0

## 1.3.0

### Minor Changes

- d65e35d: add enableIf utility to enable plugins conditionally
- 26475c9: useErrorHandler: Pass in the execution arguments to the error handler callbacks.

### Patch Changes

- Updated dependencies [d65e35d]
- Updated dependencies [26475c9]
  - @envelop/types@1.2.0

## 1.2.0

### Minor Changes

- eb0a4bd: Adds a custom message option used when masking errors

## 1.1.0

### Minor Changes

- 7704fc3: Add API for registering a context creation error handler.

  ```ts
  export const useMyHook = (): Plugin => {
    return {
      onPluginInit(context) {
        context.registerContextErrorHandler(({ error, setError }) => {
          console.error('Error occurred during context creation.', error)
          setError(new Error('Something went wrong :('))
        })
      }
    }
  }
  ```

- 7704fc3: `useMaskedErrors` now masks errors thrown during context creation (calling `contextFactory`).

  It might be possible that you need to load some data during context creation from a remote source that could be unavailable and thus yield in an error being thrown. `useMaskedErrors` now handles such scenarios and prevents leaking such information to clients.

  ✅ context error will be masked

  ```ts
  const getEnveloped = envelop({
    plugins: [
      useExtendContext(() => {
        throw new Error('Oooooops.')
      }),
      useMaskedErrors()
    ]
  })
  ```

- 7704fc3: useMaskedErrors now also handles errors that are occurring during subscriptions.

### Patch Changes

- Updated dependencies [7704fc3]
  - @envelop/types@1.1.0

## 1.0.4

### Patch Changes

- 35c85a7: ensure legacy graphql execute parameters are passed properly.

  ```ts
  // deprecated (removed in GraphQL.js 16)
  execute(schema, ...args)
  // how it should be done
  execute({ schema, ...args })
  ```

  This fixes an edge-case with graphql frameworks that call execute with the old and deprecated signature.

  Thus, Envelop allows developers using server frameworks that hard-core the legacy v15 call signature to immediately use v16 without waiting for framework developers to adjusting it or fork/patch it.

## 1.0.3

### Patch Changes

- 452af8f: Update dependencies of graphql-tools to latest

## 1.0.2

### Patch Changes

- 94db02d: Added new helper `handleStreamOrSingleExecutionResult`
- 94db02d: Update usage of plugins to use the correct `isAsyncIterable` and new helper `handleStreamOrSingleExecutionResult`
- Updated dependencies [94db02d]
- Updated dependencies [94db02d]
  - @envelop/types@1.0.2

## 1.0.1

### Patch Changes

- c24a8fd: re-use graphql "execute" & "subscribe" types
- f45c0bf: Include README and documentation as part of the package
- 8021229: fix ESM graphql import
- adca399: add jsdoc comments for hook types
- Updated dependencies [c24a8fd]
- Updated dependencies [adca399]
  - @envelop/types@1.0.1

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

### Minor Changes

- dbb241d: allow hooking into published subscribe values

### Patch Changes

- Updated dependencies [dbb241d]
- Updated dependencies [40bc444]
  - @envelop/types@1.0.0

## 0.5.2

### Patch Changes

- bcbaccb: Fix issues with incorrect types generated in d.ts
- Updated dependencies [a7321e1]
  - @envelop/types@0.4.2

## 0.5.1

### Patch Changes

- 932f6a8: Better type-safety for hooks
- Updated dependencies [932f6a8]
  - @envelop/types@0.4.1

## 0.5.0

### Minor Changes

- 50dffaa: Added new hook for onEnveloped

### Patch Changes

- cca1e39: Added built-in plugin: useAsyncSchema
- 778c207: Better type safety for OnEnveloped hook
- Updated dependencies [50dffaa]
- Updated dependencies [778c207]
  - @envelop/types@0.4.0

## 0.4.0

### Minor Changes

- d82e2d0: Added utils: isOperationDefinition, isIntrospectionOperation, isIntrospectionDocument, isIntrospectionOperationString
- 2113527: Extend Envelop plugin API with the ability to access and replace resolver function
- d82e2d0: Added config flag `skipIntrospection` for useLogger plugin

### Patch Changes

- 28ad742: Cleanup for some traces related to the tracedOrchestrator
- d82e2d0: useTiming: Allow to specify skipIntrospection configuration
- 28ad742: Improve TypeScript types
- 28ad742: Improve runtime performance by reducing calls to prepareSchema
- Updated dependencies [28ad742]
- Updated dependencies [2113527]
  - @envelop/types@0.3.0

## 0.3.1

### Patch Changes

- 7f4901d: Fix issues with contextFactory and missing context coming from GraphQL pipeline orchestrator
- Updated dependencies [7f4901d]
  - @envelop/types@0.2.1

## 0.3.0

### Minor Changes

- a5bee94: \* Allow access to context in all phases
  - Improve usage of `getEnveloped` function and allow to pass initial context there
- eb6f53b: ESM Support for all plugins and envelop core

### Patch Changes

- Updated dependencies [a5bee94]
- Updated dependencies [eb6f53b]
  - @envelop/types@0.2.0

## 0.2.2

### Patch Changes

- fd76b26: add missing useEnvelop plugin export

## 0.2.1

### Patch Changes

- 8fa4ae2: Add useMaskedErrors plugin.

## 0.2.0

### Minor Changes

- d4c8f90: Allow plugins to manage and load other plugins
- d4c8f90: Improve execution times by simplifying some parts of `envelop` code
- d4c8f90: Remove `extends` and replaces with `useEnvelop` plugin

### Patch Changes

- d4c8f90: useTiming: improve plugin creation based on config
- d4c8f90: Introduce TS strict mode

## 0.1.4

### Patch Changes

- ced704e: Allow plugins to stop execution and return errors
- Updated dependencies [ced704e]
  - @envelop/types@0.1.4

## 0.1.3

### Patch Changes

- 5fc65a4: Improve type safety for plugins context
- Updated dependencies [5fc65a4]
  - @envelop/types@0.1.3

## 0.1.2

### Patch Changes

- f5177eb: Added `setResult` to the result of onResolverCalled
- Updated dependencies [f5177eb]
  - @envelop/types@0.1.2

## 0.1.1

### Patch Changes

- 925a1ea: Extend `onSchemaChange` and allow to override schema. Make sure to avoid infinite loops.
- 3b92779: Fix missing exports for built-in plugins
- Updated dependencies [925a1ea]
  - @envelop/types@0.1.1

## 0.1.0

### Minor Changes

- 2fba0b4: Initial version bump

### Patch Changes

- Updated dependencies [2fba0b4]
  - @envelop/types@0.1.0

## 0.0.2

### Patch Changes

- b1333b0: Initial packages release
- Updated dependencies [b1333b0]
  - @envelop/types@0.0.2

## 0.0.1

### Patch Changes

- c499ae8: First bump as envelop
- 2cfc726: Fixes
- Updated dependencies [c499ae8]
- Updated dependencies [2cfc726]
  - @envelop/types@0.0.1
