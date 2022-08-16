import { Plugin } from '@envelop/core';
import { print } from 'graphql';
import { NoLiveMixedWithDeferStreamRule, GraphQLLiveDirective } from '@n1ru4l/graphql-live-query';
import type { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import type { createApplyLiveQueryPatchGenerator } from '@n1ru4l/graphql-live-query-patch';
import { astFromDirective } from '@graphql-tools/utils';

export type UseLiveQueryOptions = {
  liveQueryStore: InMemoryLiveQueryStore;
  applyLiveQueryPatchGenerator?: ReturnType<typeof createApplyLiveQueryPatchGenerator>;
};

export { GraphQLLiveDirective };

export const GraphQLLiveDirectiveAST = astFromDirective(GraphQLLiveDirective);
export const GraphQLLiveDirectiveSDL = print(GraphQLLiveDirectiveAST);

export const useLiveQuery = (opts: UseLiveQueryOptions): Plugin => {
  return {
    onExecute: ({ executeFn, setExecuteFn }) => {
      const execute = opts.liveQueryStore.makeExecute(executeFn);
      if (opts.applyLiveQueryPatchGenerator) {
        const { applyLiveQueryPatchGenerator } = opts;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore execute typings do not include AsyncIterable return right now
        setExecuteFn((...args) => applyLiveQueryPatchGenerator(execute(...args)));
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore execute typings do not include AsyncIterable return right now
        setExecuteFn(execute);
      }
    },
    onValidate: ({ addValidationRule }) => {
      addValidationRule(NoLiveMixedWithDeferStreamRule);
    },
    onContextBuilding: ({ extendContext }) => {
      extendContext({
        liveQueryStore: opts.liveQueryStore,
      });
    },
  };
};
