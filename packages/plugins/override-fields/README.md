## `@envelop/override-fields`

This plugin allows you to target specific fields and override their default behavior.  
This is useful when you want to control parts of your schema, f.i. if they are sensible for your business or incur an extra cost from underlying data sources.  
With this plugin, you can define conditions to replace the resolver functions of your targeted fields to return arbitrary values.

## Getting Started

```
yarn add @envelop/override-fields
```

## Basic Usage

You can target fields either by referencing them as plain strings or by using a Regular Expression.  
You can access subfields with a "dot" notation, as you would do when accessing properties of an object.

```ts
import { envelop } from '@envelop/core';
import { useOverrideFields } from '@envelop/override-fields';

const getEnveloped = envelop({
  plugins: [
    useOverrideFields({
      fields: ['continents', 'country.callingCodes.countries', /country\.aplhaCode.*/],
    }),
    // ... other plugins
  ],
});
```

> NOTE: Where possible, prefer using plain strings for targeting fields.  
Matching by a plain string is more performant since it requires just as a direct lookup, with an O(1) cost.  
Matching with a Regular Expression requires testing all the patterns you define, on each resolver hit by your operation; hence you probably want to make sure your patterns are as simple as possible.

## Advanced usage

```ts
  useOverrideFields({
    fields: ['continents', 'country.callingCodes.countries', /country\.aplhaCode.*/],
    shouldOverride: context => context.request.headers.illictTraffic === 'true',
    overrideFn: (root, args, context, info) => !info.path.length : context.cache[info.fieldName] : null,
  }),
```

Describe the following:
- `shouldOverride` to define logic for when to activate the override; default implementaiton is "always active"
- `overrideFn` to set the replacement function for the the targeted fields; default implementation is to return `null` value
