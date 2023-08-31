# @envelop/response-cache-redis

## 3.2.0

### Patch Changes

- Updated dependencies
  [[`834e1e39`](https://github.com/n1ru4l/envelop/commit/834e1e396c5f4b055fce52e61927a99cde6f7a6c),
  [`58174743`](https://github.com/n1ru4l/envelop/commit/58174743ad0f638423cea2d7f100147e0317c72a),
  [`834e1e39`](https://github.com/n1ru4l/envelop/commit/834e1e396c5f4b055fce52e61927a99cde6f7a6c)]:
  - @envelop/response-cache@5.2.0

## 3.1.0

### Patch Changes

- Updated dependencies
  [[`d3ecee35`](https://github.com/n1ru4l/envelop/commit/d3ecee350883eabd99fd9fe4fa58c72a616cc6b5),
  [`ea907c60`](https://github.com/n1ru4l/envelop/commit/ea907c609b97242510fa78b2848a98e4b26108bc),
  [`84eb5b46`](https://github.com/n1ru4l/envelop/commit/84eb5b464a9ec89391aa52d2296700fcc5d4763c)]:
  - @envelop/response-cache@5.1.0

## 3.0.1

### Patch Changes

- Updated dependencies
  [[`914d78c3`](https://github.com/n1ru4l/envelop/commit/914d78c33d527137f4b7c69982b30044e91fda33)]:
  - @envelop/response-cache@5.0.1

## 3.0.0

### Major Changes

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 and require Node 16 or higher

### Patch Changes

- Updated dependencies
  [[`0b127cc4`](https://github.com/n1ru4l/envelop/commit/0b127cc40f2e6a003a05cbeb0b6f004a08ada9d2),
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`0b127cc4`](https://github.com/n1ru4l/envelop/commit/0b127cc40f2e6a003a05cbeb0b6f004a08ada9d2),
  [`a36925c7`](https://github.com/n1ru4l/envelop/commit/a36925c7df0538f88b51682e4e23f4b16f6fae2b)]:
  - @envelop/response-cache@5.0.0

## 2.0.8

### Patch Changes

- Updated dependencies
  [[`972c087f`](https://github.com/n1ru4l/envelop/commit/972c087fb3a47076588121cc6079278276654377)]:
  - @envelop/response-cache@4.0.8

## 2.0.7

### Patch Changes

- [#1725](https://github.com/n1ru4l/envelop/pull/1725)
  [`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:

  - Updated dependency [`tslib@^2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)]:
  - @envelop/response-cache@4.0.7

## 2.0.6

### Patch Changes

- Updated dependencies
  [[`94e39a5d`](https://github.com/n1ru4l/envelop/commit/94e39a5de56409fdda58e9dd5c9472366e95171a)]:
  - @envelop/response-cache@4.0.6

## 2.0.5

### Patch Changes

- Updated dependencies
  [[`d50fa6f0`](https://github.com/n1ru4l/envelop/commit/d50fa6f0b71e9ceb13b492e3a0961a6e9d75824f),
  [`8a90f541`](https://github.com/n1ru4l/envelop/commit/8a90f5411dce07ae23915cced951708517bb6da5),
  [`d50fa6f0`](https://github.com/n1ru4l/envelop/commit/d50fa6f0b71e9ceb13b492e3a0961a6e9d75824f)]:
  - @envelop/response-cache@4.0.5

## 2.0.4

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@4.0.4

## 2.0.3

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@4.0.3

## 2.0.2

### Patch Changes

- Updated dependencies
  [[`22f5ccfb`](https://github.com/n1ru4l/envelop/commit/22f5ccfbe69eb052cda6c1908425b63e3d906243)]:
  - @envelop/response-cache@4.0.2

## 2.0.0

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@4.0.0

## 1.2.0

### Minor Changes

- [#1499](https://github.com/n1ru4l/envelop/pull/1499)
  [`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6)
  Thanks [@viniciuspalma](https://github.com/viniciuspalma)! - Adding tslib to package dependencies

  Projects that currently are using yarn Berry with PnP or any strict dependency resolver, that
  requires that all dependencies are specified on package.json otherwise it would endue in an error
  if not treated correct

  Since https://www.typescriptlang.org/tsconfig#importHelpers is currently being used, tslib should
  be exported as a dependency to external runners get the proper import.

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

- Updated dependencies
  [[`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6)]:
  - @envelop/response-cache@3.2.0

## 1.1.0

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@3.1.0

## 1.0.2

### Patch Changes

- 071f946: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [071f946]
  - @envelop/response-cache@3.0.2

## 1.0.1

### Patch Changes

- @envelop/response-cache@3.0.1

## 1.0.0

### Patch Changes

- Updated dependencies [887fc07]
- Updated dependencies [a5d8dcb]
  - @envelop/response-cache@3.0.0

## 0.5.0

### Minor Changes

- 8bb2738: Support TypeScript module resolution.

### Patch Changes

- Updated dependencies [8bb2738]
  - @envelop/response-cache@2.4.0

## 0.4.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/response-cache@2.3.3

## 0.4.2

### Patch Changes

- @envelop/response-cache@2.3.2

## 0.4.1

### Patch Changes

- @envelop/response-cache@2.3.1

## 0.4.0

### Patch Changes

- @envelop/response-cache@2.3.0

## 0.3.0

### Patch Changes

- @envelop/response-cache@2.2.0

## 0.2.1

### Patch Changes

- Updated dependencies [5400c3f]
  - @envelop/response-cache@2.1.1

## 0.2.0

### Patch Changes

- @envelop/response-cache@2.1.0

## 0.1.7

### Patch Changes

- @envelop/response-cache@2.0.0

## 0.1.6

### Patch Changes

- @envelop/response-cache@1.0.0

## 0.1.5

### Patch Changes

- Updated dependencies [b919b21]
  - @envelop/response-cache@0.6.0

## 0.1.4

### Patch Changes

- 7f72996: Delete keys only if there are keys since calling del on empty causes errors and server to
  halt. See https://github.com/n1ru4l/envelop/issues/1090

## 0.1.3

### Patch Changes

- Updated dependencies [090cae4]
  - @envelop/response-cache@0.5.0

## 0.1.2

### Patch Changes

- Updated dependencies [04120de]
  - @envelop/response-cache@0.4.0

## 0.1.1

### Patch Changes

- Updated dependencies [0623cf7]
  - @envelop/response-cache@0.3.0

## 0.1.0

### Minor Changes

- 9938e8e: Initial release

### Patch Changes

- Updated dependencies [9688945]
- Updated dependencies [a749ec0]
  - @envelop/response-cache@0.2.1
