# Contributing

## How To Build

`yarn build`

## How to Run Tests

### Test All Plugins

`yarn test`

### Test Just Inngest Plugin

`yarn test packages/plugins/inngest`

### Test Particular Inngest Plugin Spec

`yarn test packages/plugins/inngest/tests/event-helpers.spec.ts`

## Before Submitting PR

1. Build via `yarn build`
2. Run full test suite via `yarn test`
3. Run type check via `yarn ts:check`
4. Test ESM & CJS exports integrity via `yarn bob check`

Do above for both current GraphQL version and also 16 and 15.

You can switch between GraphQL versions by running:

`node ./scripts/match-graphql.js 16` or `node ./scripts/match-graphql.js 15`

and then `yarn` and then build, test, and run type check.

Be sure to restore current packages for latest GraphQL dependency.

## All

```terminal
yarn build && yarn lint && yarn test && yarn ts:check && yarn bob check
```
