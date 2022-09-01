# @envelop/apollo-datasources

## 1.3.0

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

- Updated dependencies [[`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6), [`ae7bc9a3`](https://github.com/n1ru4l/envelop/commit/ae7bc9a36abd595b0a91f7b4e133017d3eb99a4a)]:
  - @envelop/core@2.6.0

## 1.2.0

### Minor Changes

- Updated dependencies [[`5a5f5c04`](https://github.com/n1ru4l/envelop/commit/5a5f5c04177b9e1379fd77db5d6383160879d449), [`d828f129`](https://github.com/n1ru4l/envelop/commit/d828f1291254a0f9dfdc3654611087859e4c9708)]:
  - @envelop/core@2.5.0

## 1.1.2

### Patch Changes

- 071f946: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [071f946]
  - @envelop/core@2.4.2

## 1.1.1

### Patch Changes

- Updated dependencies [787d28a2]
  - @envelop/core@2.4.1

## 1.1.0

### Minor Changes

- 8bb2738: Support TypeScript module resolution.
- Updated dependencies [8bb2738]
  - @envelop/core@2.4.0

## 1.0.2

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 1.0.1

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 1.0.0

### Major Changes

- 29fab6e: Introduce useApolloDataSources
