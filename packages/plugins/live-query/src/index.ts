import { Plugin } from '@envelop/core';
import { print, GraphQLError, DefinitionNode, DirectiveNode } from '@graphql-tools/graphql';
import { GraphQLLiveDirective } from '@n1ru4l/graphql-live-query';
import type { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { astFromDirective } from '@graphql-tools/utils';

type None = null | undefined;
const isNone = (input: unknown): input is None => input == null;
type Maybe<T> = T | None;

export type UseLiveQueryOptions = {
  liveQueryStore: InMemoryLiveQueryStore;
};

export { GraphQLLiveDirective };
export const GraphQLLiveDirectiveAST = astFromDirective(GraphQLLiveDirective);
export const GraphQLLiveDirectiveSDL = print(GraphQLLiveDirectiveAST);

export const getLiveDirectiveNode = (input: DefinitionNode): Maybe<DirectiveNode> => {
  if (input.kind !== 'OperationDefinition' || input.operation !== 'query') {
    return null;
  }
  const liveDirective = input.directives?.find(d => d.name.value === 'live');
  if (isNone(liveDirective)) {
    return null;
  }

  return liveDirective;
};

export const useLiveQuery = (opts: UseLiveQueryOptions): Plugin => {
  return {
    onExecute: ({ executeFn, setExecuteFn }) => {
      setExecuteFn(opts.liveQueryStore.makeExecute(executeFn));
    },
    onValidate: ({ addValidationRule }) => {
      addValidationRule(context => {
        return {
          OperationDefinition(operationDefinitionNode) {
            if (isNone(getLiveDirectiveNode(operationDefinitionNode))) {
              return false;
            }
            return undefined;
          },
          Directive(directiveNode) {
            if (directiveNode.name.value === 'defer' || directiveNode.name.value === 'stream') {
              context.reportError(
                new GraphQLError(`Cannot mix "@${directiveNode.name.value}" with "@live".`, directiveNode.name)
              );
            }
          },
        };
      });
    },
    onContextBuilding: ({ extendContext }) => {
      extendContext({
        liveQueryStore: opts.liveQueryStore,
      });
    },
  };
};
