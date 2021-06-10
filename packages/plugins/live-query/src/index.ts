import { Plugin } from '@envelop/types';
import type { GraphQLSchema } from 'graphql';
import { NoLiveMixedWithDeferStreamRule, GraphQLLiveDirective } from '@n1ru4l/graphql-live-query';
import type { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { addTypes } from '@graphql-tools/utils';

export type UseLiveQueryOptions = {
  liveQueryStore: InMemoryLiveQueryStore;
};

const preparedSchemas = new WeakMap<GraphQLSchema, GraphQLSchema>();

export const useLiveQuery = (opts: UseLiveQueryOptions): Plugin => {
  return {
    onExecute: ({ executeFn, setExecuteFn }) => {
      // @ts-expect-error: execute typings do not include AsyncIterable return right now
      setExecuteFn(opts.liveQueryStore.makeExecute(executeFn));
    },
    onValidate: ({ addValidationRule }) => {
      addValidationRule(NoLiveMixedWithDeferStreamRule);
    },
    onSchemaChange: ({ schema, replaceSchema }) => {
      let patchedSchema = preparedSchemas.get(schema);
      if (!patchedSchema) {
        patchedSchema = addTypes(schema, [GraphQLLiveDirective]);
        preparedSchemas.set(schema, patchedSchema);
      }
      replaceSchema(patchedSchema);
    },
    onContextBuilding: ({ extendContext }) => {
      extendContext({
        liveQueryStore: opts.liveQueryStore,
      });
    },
  };
};
